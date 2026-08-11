import customAxios from './customAxios'
import type {
  AdminPlaceDetail,
  AdminPlaceDetailRequest,
  AdminPlaceDiscoveryStatusUpdateRequest,
  AdminPlaceDiscoveryStatusUpdateResponse,
  AdminPlaceItem,
  AdminPlaceListRequest,
  AdminPlaceListResponse,
  AdminPlaceOperatingScheduleUpdateRequest,
  AdminPlaceOperatingScheduleUpdateResponse,
  AdminPlaceOperatingStatusUpdateRequest,
  AdminPlaceOperatingStatusUpdateResponse,
} from '../types/adminPlace.types'

const ADMIN_PLACES_API_PATH = '/admin/places'
const DEFAULT_ADMIN_PLACE_PAGE = 1
const DEFAULT_ADMIN_PLACE_LIMIT = 10
const DEFAULT_ADMIN_PLACE_SORT_PARAM = 'LATEST'
const DEFAULT_ADMIN_PLACE_KEYWORD = ''

export async function getAdminPlaces({
  page = DEFAULT_ADMIN_PLACE_PAGE,
  limit = DEFAULT_ADMIN_PLACE_LIMIT,
  sortParam = DEFAULT_ADMIN_PLACE_SORT_PARAM,
  keyword = DEFAULT_ADMIN_PLACE_KEYWORD,
}: AdminPlaceListRequest = {}) {
  const { data } = await customAxios.get<AdminPlaceListResponse>(
    ADMIN_PLACES_API_PATH,
    {
      params: {
        page,
        limit,
        sortParam,
        keyword,
      },
    }
  )

  return data
}

export async function getAdminPlace(
  placeId: number,
  { sortParam = 'LATEST', keyword = '' }: AdminPlaceDetailRequest = {}
) {
  const { data } = await customAxios.get<AdminPlaceDetail>(
    `${ADMIN_PLACES_API_PATH}/${placeId}`,
    {
      params: {
        sortParam,
        keyword,
      },
    }
  )

  return data
}

export async function deleteAdminPlace(placeId: number) {
  await customAxios.delete<void>(`${ADMIN_PLACES_API_PATH}/${placeId}/delete`)
}

export async function updateAdminPlaceOperatingStatus(
  placeId: number,
  payload: AdminPlaceOperatingStatusUpdateRequest
) {
  const { data } = await customAxios.patch<AdminPlaceOperatingStatusUpdateResponse>(
    `${ADMIN_PLACES_API_PATH}/${placeId}/operating-status`,
    payload
  )

  return data
}

export async function updateAdminPlaceOperatingSchedule(
  placeId: number,
  payload: AdminPlaceOperatingScheduleUpdateRequest
) {
  const { data } = await customAxios.patch<AdminPlaceOperatingScheduleUpdateResponse>(
    `${ADMIN_PLACES_API_PATH}/${placeId}/operating-schedule`,
    payload
  )

  return data
}

export async function updateAdminPlaceDiscoveryStatus(
  placeId: number,
  payload: AdminPlaceDiscoveryStatusUpdateRequest
) {
  const { data } = await customAxios.patch<AdminPlaceDiscoveryStatusUpdateResponse>(
    `${ADMIN_PLACES_API_PATH}/${placeId}/discovery-status`,
    payload
  )

  return data
}

export type { AdminPlaceItem }
