import { isCancel } from 'axios'
import { getNaverPlaceSearchError, searchMerchantNaverPlaces, type NaverPlaceSearchItem } from './merchantNaverPlaceSearchApi'
import { getNaverAddressSearchError, searchNaverAddresses, type AddressCandidate } from './merchantNaverAddressSearchApi'
import { isApiError } from './customAxios'
import { isValidMapCoordinate } from '../components/map/map.types'

export type MerchantSearchCandidate =
  | (NaverPlaceSearchItem & { kind: 'place'; postalCode: string })
  | (AddressCandidate & { kind: 'address' })

// A successful empty primary search is not the same as a fully empty search.
// Retain the failure's scope instead of losing it in a plain message wrapper.
export class MerchantSearchFailure extends Error {
  constructor(message: string, readonly isPartial: boolean, readonly originalError: unknown) {
    super(message)
    this.name = 'MerchantSearchFailure'
  }
}

export function isMerchantSearchCancellation(error: unknown): boolean {
  return isCancel(error) || (error instanceof Error && error.name === 'AbortError')
}

function authenticationMessage(error: unknown): string | null {
  if (!isApiError(error)) return null
  const status = error.response?.status ?? error.status
  if (status === 401 || error.category === 'unauthorized') return '로그인 상태를 확인하지 못했습니다. 다시 로그인한 뒤 검색해주세요.'
  if (status === 403 || error.category === 'forbidden') return '검색 권한이 없습니다. 계정 권한을 확인해주세요.'
  if (error.isRefreshFailure) return '인증 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'
  return null
}

export function prefersAddressSearch(query: string): boolean {
  // A locality name alone is ambiguous. Require a road/lot number, not just digits in a brand.
  return /(?:대로|로|길)(?:\d+(?:번길|길))?\s*\d+(?:-\d+)?(?:\s|$|,)/u.test(query.trim())
    || /(?:읍|면|동|리|가)\s+(?:산\s*)?\d+(?:-\d+)?(?:\s|$|,)/u.test(query.trim())
}

export function sameSearchAddress(first: Pick<AddressCandidate, 'roadAddress' | 'jibunAddress'>, second: Pick<AddressCandidate, 'roadAddress' | 'jibunAddress'>): boolean {
  const normalize = (value: string) => value.normalize('NFC').replace(/\s+/gu, '').trim()
  // Prefer road addresses when both exist; a shared lot alone must not override a different road address.
  if (first.roadAddress.trim() && second.roadAddress.trim()) return normalize(first.roadAddress) === normalize(second.roadAddress)
  return Boolean(first.jibunAddress.trim() && second.jibunAddress.trim()
    && normalize(first.jibunAddress) === normalize(second.jibunAddress))
}

async function searchByKind(kind: MerchantSearchCandidate['kind'], query: string, signal: AbortSignal, emptyPrimary?: MerchantSearchCandidate['kind']): Promise<MerchantSearchCandidate[]> {
  signal.throwIfAborted()
  try {
    const items: MerchantSearchCandidate[] = kind === 'address'
      ? (await searchNaverAddresses(query, signal)).map(item => ({ ...item, kind: 'address' as const }))
      : (await searchMerchantNaverPlaces(query, signal)).map(item => ({ ...item, kind: 'place' as const, postalCode: '' }))
    signal.throwIfAborted()
    return items
  } catch (error) {
    signal.throwIfAborted()
    if (isMerchantSearchCancellation(error)) throw error
    const authMessage = authenticationMessage(error)
    if (authMessage) throw new MerchantSearchFailure(authMessage, false, error)
    const failureMessage = kind === 'address' ? getNaverAddressSearchError(error) : getNaverPlaceSearchError(error)
    const message = emptyPrimary
      ? `${emptyPrimary === 'place' ? '업체명' : '주소'} 검색 결과는 0건입니다. 추가 ${kind === 'place' ? '업체명' : '주소'} 검색을 완료하지 못했습니다. ${failureMessage}`
      : failureMessage
    throw new MerchantSearchFailure(message, Boolean(emptyPrimary), error)
  }
}

export async function searchMerchantPlacesAndAddresses(query: string, signal: AbortSignal): Promise<MerchantSearchCandidate[]> {
  const keyword = query.trim()
  if (!keyword || keyword.length > 100) throw new Error('검색어를 1~100자로 입력해주세요.')
  const first = prefersAddressSearch(keyword) ? 'address' : 'place'
  const results = await searchByKind(first, keyword, signal)
  // A failed request is not an empty result. Only a valid empty response triggers the other API.
  return results.length ? results : searchByKind(first === 'address' ? 'place' : 'address', keyword, signal, first)
}

export async function completeMerchantSearchCandidate(candidate: MerchantSearchCandidate, signal: AbortSignal): Promise<{ candidate: MerchantSearchCandidate; message: string }> {
  signal.throwIfAborted()
  if (candidate.kind === 'address') return { candidate, message: candidate.postalCode ? '' : '우편번호가 없는 주소입니다. 직접 입력으로 보완해주세요.' }
  try {
    const addresses = await searchNaverAddresses(candidate.roadAddress || candidate.jibunAddress, signal)
    signal.throwIfAborted()
    const matching = addresses.filter(address => sameSearchAddress(candidate, address))
    const postalCodes = new Set(matching.map(address => address.postalCode).filter(Boolean))
    if (postalCodes.size === 1) return { candidate: { ...candidate, postalCode: [...postalCodes][0] }, message: '' }
    return { candidate, message: '일치하는 우편번호를 확인하지 못했습니다. 직접 입력으로 보완해주세요.' }
  } catch (error) {
    signal.throwIfAborted()
    if (isMerchantSearchCancellation(error)) throw error
    const authMessage = authenticationMessage(error)
    if (authMessage) throw new MerchantSearchFailure(authMessage, false, error)
    return { candidate, message: `${getNaverAddressSearchError(error)} 업체 위치는 유지됩니다. 우편번호는 직접 입력해주세요.` }
  }
}

export function getMerchantSearchSelection(candidate: MerchantSearchCandidate, current: {
  placeName: string; roadAddress: string; jibunAddress: string; postalCode: string
  latitude: string; longitude: string; pinAdjusted: boolean
}) {
  const sameAddress = sameSearchAddress(candidate, current)
  // Address-only supplementation of the same place must not move its chosen entrance/marker.
  const preserveCoordinates = candidate.kind === 'address' && sameAddress
    && current.latitude.trim() !== '' && current.longitude.trim() !== ''
    && isValidMapCoordinate({ latitude: Number(current.latitude), longitude: Number(current.longitude) })
  const latitude = preserveCoordinates ? current.latitude : candidate.latitude.toFixed(6)
  const longitude = preserveCoordinates ? current.longitude : candidate.longitude.toFixed(6)
  const movesPin = Math.abs(Number(current.latitude) - Number(latitude)) > 0.0000005
    || Math.abs(Number(current.longitude) - Number(longitude)) > 0.0000005
  return {
    placeName: candidate.kind === 'place' ? candidate.name : current.placeName,
    roadAddress: candidate.roadAddress,
    jibunAddress: candidate.jibunAddress,
    postalCode: candidate.postalCode || (sameAddress ? current.postalCode : ''),
    latitude, longitude,
    pinAdjusted: preserveCoordinates && current.pinAdjusted,
    needsPinConfirmation: current.pinAdjusted && movesPin,
  }
}
