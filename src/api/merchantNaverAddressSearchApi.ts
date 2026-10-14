import customAxios, { isApiError } from './customAxios'
import { getAuthErrorMessage } from './authError'
import type { AuthErrorResponse } from '../types/auth.types'
import { isValidMapCoordinate } from '../components/map/map.types'

export interface AddressCandidate {
  roadAddress: string
  jibunAddress: string
  postalCode: string
  latitude: number
  longitude: number
}

export async function searchNaverAddresses(query: string, signal?: AbortSignal): Promise<AddressCandidate[]> {
  const keyword = query.trim()
  if (!keyword || keyword.length > 100) throw new Error('검색할 주소를 1~100자로 입력해주세요.')
  const { data } = await customAxios.get<{ items: Array<Omit<AddressCandidate, 'postalCode'> & { postalCode?: string | null }> }>(
    '/users/me/merchant-place-applications/naver-address-search',
    { params: { query: keyword }, signal, timeout: 10000 },
  )
  if (!Array.isArray(data?.items) || data.items.some(item => !item
    || typeof item.roadAddress !== 'string' || typeof item.jibunAddress !== 'string'
    || (!item.roadAddress.trim() && !item.jibunAddress.trim())
    || (item.postalCode != null && typeof item.postalCode !== 'string')
    || !isValidMapCoordinate(item))) throw new Error('주소 검색 결과 형식을 확인하지 못했습니다. 다시 검색하거나 직접 입력해주세요.')
  return data.items.slice(0, 10).map(item => ({
    roadAddress: item.roadAddress, jibunAddress: item.jibunAddress,
    postalCode: item.postalCode ?? '', latitude: item.latitude, longitude: item.longitude,
  }))
}

export function getNaverAddressSearchError(error: unknown): string {
  if (isApiError<AuthErrorResponse>(error)) {
    if (!error.isRefreshFailure && (error.response?.status === 404 || error.response?.status === 405)) {
      return '서버 주소 검색 API를 사용할 수 없습니다. 배포 상태를 확인하거나 주소와 좌표를 직접 입력해주세요.'
    }
    return getAuthErrorMessage(error, {
      fallbackMessage: '주소를 조회하지 못했습니다. 다시 검색하거나 직접 입력해주세요.',
      codeMessages: {
        PLACE_SEARCH_CONDITION_INVALID: '검색할 주소를 1~100자로 입력해주세요.',
        NAVER_ADDRESS_SEARCH_UNAVAILABLE: '주소 검색 서비스를 사용할 수 없습니다. 잠시 후 다시 검색하거나 직접 입력해주세요.',
        NAVER_ADDRESS_SEARCH_TIMEOUT: '주소 검색 시간이 초과됐습니다. 다시 검색하거나 직접 입력해주세요.',
        NAVER_ADDRESS_SEARCH_RATE_LIMITED: '주소 검색 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        NAVER_ADDRESS_SEARCH_FAILED: '주소를 조회하지 못했습니다. 다시 검색하거나 직접 입력해주세요.',
      },
    })
  }
  return error instanceof Error ? error.message : '주소 검색에 실패했습니다. 직접 입력해주세요.'
}
