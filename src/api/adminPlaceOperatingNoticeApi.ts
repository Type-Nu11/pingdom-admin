import customAxios from './customAxios'
import type {
  AdminPlaceOperatingNoticeCancelRequest,
  AdminPlaceOperatingNoticeCreateRequest,
  AdminPlaceOperatingNoticeExpireResponse,
  AdminPlaceOperatingNoticeResponse,
  AdminPlaceOperatingNoticeUpdateRequest,
} from '../types/adminPlace.types'

const ADMIN_PLACE_OPERATING_NOTICES_PATH = '/admin/place-operating-notices'

export async function createAdminPlaceOperatingNotice(
  placeId: number,
  payload: AdminPlaceOperatingNoticeCreateRequest
) {
  const { data } = await customAxios.post<AdminPlaceOperatingNoticeResponse>(
    `/admin/places/${placeId}/operating-notices`,
    payload
  )

  return data
}

export async function updateAdminPlaceOperatingNotice(
  placeId: number,
  noticeId: number,
  payload: AdminPlaceOperatingNoticeUpdateRequest
) {
  const { data } = await customAxios.patch<AdminPlaceOperatingNoticeResponse>(
    `/admin/places/${placeId}/operating-notices/${noticeId}`,
    payload
  )

  return data
}

export async function cancelAdminPlaceOperatingNotice(
  placeId: number,
  noticeId: number,
  payload: AdminPlaceOperatingNoticeCancelRequest
) {
  const { data } = await customAxios.post<AdminPlaceOperatingNoticeResponse>(
    `/admin/places/${placeId}/operating-notices/${noticeId}/cancel`,
    payload
  )

  return data
}

export async function expireAdminPlaceOperatingNotices() {
  const { data } = await customAxios.post<AdminPlaceOperatingNoticeExpireResponse>(
    `${ADMIN_PLACE_OPERATING_NOTICES_PATH}/expire`
  )

  return data
}
