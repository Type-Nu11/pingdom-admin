import customAxios from './customAxios'
import type {
  AdminPlaceEventActionRequest,
  AdminPlaceEventListItem,
  AdminPlaceEventListParams,
  AdminPlaceEventListResponse,
  AdminPlaceEventRequest,
  AdminPlaceEventResponse,
} from '../types/adminPlaceEvent.types'

const PATH = '/admin/place-events'

export async function getAdminPlaceEvents(params: AdminPlaceEventListParams) {
  const { data } = await customAxios.get<AdminPlaceEventListResponse>(PATH, { params })
  return data
}

export async function getAdminPlaceEvent(eventId: number) {
  const { data } = await customAxios.get<AdminPlaceEventListItem>(`${PATH}/${eventId}`)
  return data
}

export async function createAdminPlaceEvent(request: AdminPlaceEventRequest) {
  const { data } = await customAxios.post<AdminPlaceEventResponse>(PATH, request)
  return data
}

export async function updateAdminPlaceEvent(eventId: number, request: AdminPlaceEventRequest) {
  const { data } = await customAxios.patch<AdminPlaceEventResponse>(`${PATH}/${eventId}`, request)
  return data
}

export async function publishAdminPlaceEvent(
  eventId: number,
  request: AdminPlaceEventActionRequest
) {
  const { data } = await customAxios.post<AdminPlaceEventResponse>(
    `${PATH}/${eventId}/publish`,
    request
  )
  return data
}

export async function cancelAdminPlaceEvent(
  eventId: number,
  request: AdminPlaceEventActionRequest
) {
  const { data } = await customAxios.post<AdminPlaceEventResponse>(
    `${PATH}/${eventId}/cancel`,
    request
  )
  return data
}
