import type { AuthErrorResponse } from './auth.types'

export type AdminPlaceEventType = 'POP_UP' | 'PERFORMANCE' | 'EXHIBITION'
export type AdminPlaceEventPublicationStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED'
export type AdminPlaceEventScheduleStatus = 'UPCOMING' | 'ONGOING' | 'ENDED'

export interface AdminPlaceEventListItem {
  eventId: number
  placeId: number
  placeName: string
  placeAddress: string
  title: string
  description?: string | null
  eventType: AdminPlaceEventType
  publicationStatus: AdminPlaceEventPublicationStatus
  scheduleStatus: AdminPlaceEventScheduleStatus
  startAt: string
  endAt: string
  createdAt: string
  updatedAt: string
}

export interface AdminPlaceEventListResponse {
  events: AdminPlaceEventListItem[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface AdminPlaceEventRequest {
  placeId: number
  title: string
  description?: string
  eventType: AdminPlaceEventType
  startAt: string
  endAt: string
  reason: string
}

export interface AdminPlaceEventActionRequest {
  reason: string
}

export interface AdminPlaceEventResponse extends AdminPlaceEventListItem {
  message?: string
}

export interface AdminPlaceEventListParams {
  page?: number
  limit?: number
  keyword?: string
  placeId?: number
  eventType?: AdminPlaceEventType
  publicationStatus?: AdminPlaceEventPublicationStatus
  scheduleStatus?: AdminPlaceEventScheduleStatus
}

export type AdminPlaceEventErrorResponse = AuthErrorResponse<string>
