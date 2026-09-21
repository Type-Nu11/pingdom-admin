import { loadNaverMaps, hasNaverAuthFailure } from './loadNaverMaps'
import { isValidMapCoordinate } from './map.types'
import type { NaverAddress } from './naverMaps.types'

export interface AddressCandidate {
  roadAddress: string
  jibunAddress: string
  postalCode: string
  latitude: number
  longitude: number
}

export function normalizeAddress(value: NaverAddress): AddressCandidate | null {
  const latitude = Number(value.y)
  const longitude = Number(value.x)
  if (!value.y?.trim() || !value.x?.trim() || !isValidMapCoordinate({ latitude, longitude })) return null
  if (!value.roadAddress && !value.jibunAddress) return null
  return {
    roadAddress: value.roadAddress || '', jibunAddress: value.jibunAddress || '',
    postalCode: value.addressElements?.find(element => element.types.includes('POSTAL_CODE'))?.longName || '',
    latitude, longitude,
  }
}

export async function searchNaverAddresses(query: string, clientId: string, timeoutMs = 10000): Promise<AddressCandidate[]> {
  if (!query.trim()) return []
  const maps = await loadNaverMaps(clientId)
  const service = maps.Service
  if (!service || hasNaverAuthFailure()) throw new Error('주소 검색을 사용할 수 없습니다. 지도 설정을 확인하거나 직접 입력해주세요.')
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('주소 검색 시간이 초과됐습니다. 다시 검색하거나 직접 입력해주세요.')), timeoutMs)
    try {
      service.geocode({ query: query.trim() }, (status, response) => {
        window.clearTimeout(timer)
        if (status !== service.Status.OK || hasNaverAuthFailure()) {
          reject(new Error('주소를 조회하지 못했습니다. 다시 검색하거나 직접 입력해주세요.'))
          return
        }
        resolve((response.v2?.addresses || []).map(normalizeAddress).filter((value): value is AddressCandidate => value !== null))
      })
    } catch (error) { window.clearTimeout(timer); reject(error) }
  })
}
