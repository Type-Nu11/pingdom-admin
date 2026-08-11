import type { AuthErrorResponse } from './auth.types'

export type AdminPlaceListSortParam = 'LATEST' | 'OLDEST' | 'LEVEL_DESC'
export type AdminPlacePostSortParam = 'LATEST' | 'OLDEST' | 'MOST_LIKED'
export type AdminPlaceGeocodingSource = 'KAKAO' | 'USER_PIN' | 'ADMIN' | 'LEGACY'
export type AdminPlaceOperatingStatus =
  | 'OPERATING'
  | 'TEMPORARILY_CLOSED'
  | 'PERMANENTLY_CLOSED'
export type AdminPlaceDiscoveryStatus = 'VISIBLE' | 'HIDDEN'
export type AdminPlaceDayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'
export type AdminPlaceTouristCategory =
  | 'K_POP'
  | 'BEAUTY'
  | 'FASHION'
  | 'CAFE'
  | 'FOOD'
  | 'POP_UP'
  | 'EXHIBITION'
  | 'NIGHTLIFE'
  | 'OTHER'

export interface PlaceGrowthSnapshot {
  photoCount?: number
  level?: number
  currentLevelMinPhotoCount?: number
  nextLevelMinPhotoCount?: number
  progressPercent?: number
}

export interface AdminPlaceOperatingTimeRange {
  opensAt: string
  closesAt: string
}

export interface AdminPlaceRegularOperatingHour {
  dayOfWeek: AdminPlaceDayOfWeek
  opensAt: string
  closesAt: string
}

export interface AdminPlaceOperatingException {
  date: string
  closed: boolean
  hours: AdminPlaceOperatingTimeRange[]
}

export interface AdminPlaceItem {
  id: number
  name: string
  address: string
  roadAddress?: string | null
  jibunAddress?: string | null
  postalCode?: string | null
  geocodingSource?: AdminPlaceGeocodingSource
  operatingStatus?: AdminPlaceOperatingStatus
  operatingStatusCheckedAt?: string | null
  latitude: number
  longitude: number
  userId: number
  category?: string
  categoryName?: string
  englishName?: string | null
  touristSummary?: string | null
  touristCategories?: AdminPlaceTouristCategory[]
  registrant?: string
  placeGrowth?: PlaceGrowthSnapshot
}

export interface AdminPlacePostItem {
  id: number
  imageUrl: string
  thumbnailUrl?: string | null
  title: string
  description: string
  userId: number
  username: string
  createdAt: string
  likeCount: number
}

export interface AdminPlaceDetail {
  id: number
  name: string
  address: string
  roadAddress?: string | null
  jibunAddress?: string | null
  postalCode?: string | null
  geocodingSource?: AdminPlaceGeocodingSource
  operatingStatus?: AdminPlaceOperatingStatus
  operatingStatusCheckedAt?: string | null
  regularHours?: AdminPlaceRegularOperatingHour[]
  operatingExceptions?: AdminPlaceOperatingException[]
  latitude: number
  longitude: number
  userId: number
  username: string
  category?: string
  categoryName?: string
  englishName?: string | null
  touristSummary?: string | null
  touristCategories?: AdminPlaceTouristCategory[]
  sortParam: AdminPlacePostSortParam
  postCount: number
  placeGrowth?: PlaceGrowthSnapshot
  posts: AdminPlacePostItem[]
}

export interface AdminPlaceOperatingStatusUpdateRequest {
  operatingStatus: AdminPlaceOperatingStatus
  reason: string
}

export interface AdminPlaceOperatingStatusUpdateResponse {
  placeId: number
  operatingStatus: AdminPlaceOperatingStatus
  operatingStatusCheckedAt: string
  message: string
}

export interface AdminPlaceOperatingTimeRangeRequest {
  opensAt: string
  closesAt: string
}

export interface AdminPlaceRegularOperatingHourRequest {
  dayOfWeek: AdminPlaceDayOfWeek
  opensAt: string
  closesAt: string
}

export interface AdminPlaceOperatingExceptionRequest {
  date: string
  closed?: boolean
  hours?: AdminPlaceOperatingTimeRangeRequest[]
}

export interface AdminPlaceOperatingScheduleUpdateRequest {
  regularHours?: AdminPlaceRegularOperatingHourRequest[]
  exceptions?: AdminPlaceOperatingExceptionRequest[]
  reason: string
}

export interface AdminPlaceOperatingScheduleUpdateResponse {
  placeId: number
  regularHours: AdminPlaceRegularOperatingHour[]
  exceptions: AdminPlaceOperatingException[]
  message: string
}

export interface AdminPlaceDiscoveryStatusUpdateRequest {
  discoveryStatus: AdminPlaceDiscoveryStatus
  reason: string
}

export interface AdminPlaceDiscoveryStatusUpdateResponse {
  placeId: number
  discoveryStatus: AdminPlaceDiscoveryStatus
  message: string
}

export interface AdminPlaceListRequest {
  page?: number
  limit?: number
  sortParam?: AdminPlaceListSortParam
  keyword?: string
}

export interface AdminPlaceListResponse {
  places: AdminPlaceItem[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export type AdminPlaceListErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED' | 'PLACE_NOT_FOUND'
>

export interface AdminPlaceDetailRequest {
  sortParam?: AdminPlacePostSortParam
  keyword?: string
}

export type AdminPlaceDetailErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED' | 'PLACE_NOT_FOUND'
>

export type AdminPlaceDeleteErrorResponse = AuthErrorResponse<
  | 'INVALID_TOKEN'
  | 'ACCESS_DENIED'
  | 'PLACE_NOT_FOUND'
  | 'PLACE_EVENT_CONNECTED'
  | 'PLACE_CHECK_IN_CONNECTED'
  | 'PLACE_SCOUT_FIELD_REPORT_CONNECTED'
>

export type AdminPlaceUpdateErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED' | 'PLACE_NOT_FOUND'
>
