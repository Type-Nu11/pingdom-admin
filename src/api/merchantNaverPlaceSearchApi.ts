import customAxios, { isApiError } from './customAxios'
import { getAuthErrorMessage } from './authError'
import type { AuthErrorResponse } from '../types/auth.types'
import { isValidMapCoordinate } from '../components/map/map.types'

export interface NaverPlaceSearchItem {
  name: string
  roadAddress: string
  jibunAddress: string
  latitude: number
  longitude: number
}

export async function searchMerchantNaverPlaces(query: string, signal?: AbortSignal): Promise<NaverPlaceSearchItem[]> {
  const keyword = query.trim()
  if (!keyword || keyword.length > 100) throw new Error('검색어를 1~100자로 입력해주세요.')
  const { data } = await customAxios.get<{ items: NaverPlaceSearchItem[] }>(
    '/users/me/merchant-place-applications/naver-place-search',
    { params: { query: keyword }, signal },
  )
  if (!Array.isArray(data?.items) || data.items.some(item => !item
    || typeof item.name !== 'string' || !item.name.trim()
    || typeof item.roadAddress !== 'string' || typeof item.jibunAddress !== 'string'
    || !isValidMapCoordinate(item))) throw new Error('검색 결과 형식을 확인하지 못했습니다. 다시 시도해주세요.')
  return data.items.slice(0, 5)
}

export function getNaverPlaceSearchError(error: unknown): string {
  if (isApiError<AuthErrorResponse>(error)) return getAuthErrorMessage(error, {
    fallbackMessage: '업체를 검색하지 못했습니다. 다시 시도하거나 직접 입력해주세요.',
    codeMessages: {
      NAVER_PLACE_SEARCH_UNAVAILABLE: '업체명 검색 서비스를 사용할 수 없습니다. 잠시 후 다시 시도하거나 직접 입력해주세요.',
      NAVER_PLACE_SEARCH_FAILED: '네이버 업체명 검색에 실패했습니다. 다시 시도하거나 직접 입력해주세요.',
      PLACE_SEARCH_CONDITION_INVALID: '검색어를 1~100자로 입력해주세요.',
    },
  })
  return error instanceof Error ? error.message : '업체를 검색하지 못했습니다. 다시 시도해주세요.'
}
