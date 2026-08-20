import customAxios from './customAxios'
import type {
  MerchantCampaignPageResponse,
  MerchantCampaign,
  MerchantCampaignRequest,
  MerchantBrandPageResponse,
  MerchantBrandRequest,
  MerchantBrand,
  MerchantOfferPageResponse,
  MerchantOperatingNotice,
  MerchantOperatingNoticeCancelRequest,
  MerchantOperatingNoticeListResponse,
  MerchantOperatingNoticeRequest,
  MerchantOperatingNoticeUpdateRequest,
  MerchantPlaceDetail,
  MerchantPlaceMediaItem,
  MerchantPlaceMediaOrderUpdateRequest,
  MerchantPlaceMediaResponse,
  MerchantPlaceMediaUploadRequest,
  MerchantPlaceMediaUploadResponse,
  MerchantPlaceOperating,
  MerchantPlaceOperatingScheduleResponse,
  MerchantPlaceOperatingScheduleUpdateRequest,
  MerchantPlaceOperatingStatusUpdateRequest,
  MerchantOwnerProfile,
  MerchantPlaceInformation,
  MerchantPlaceInformationUpdateRequest,
  MerchantReservableProduct,
} from '../types/merchantStore.types'

const MERCHANT_OWNER_PATH = '/merchant-owner'

export async function getMerchantOwnerProfile() {
  const { data } = await customAxios.get<MerchantOwnerProfile>(`${MERCHANT_OWNER_PATH}/me`)
  return data
}

export async function getMerchantPlaceInformation(placeId: number) {
  const { data } = await customAxios.get<MerchantPlaceInformation>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/information`
  )
  return data
}

export async function updateMerchantPlaceInformation(
  placeId: number,
  request: MerchantPlaceInformationUpdateRequest
) {
  const { data } = await customAxios.put<MerchantPlaceInformation>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/information`,
    request
  )
  return data
}

export async function getMerchantPlaceDetail(placeId: number) {
  const { data } = await customAxios.get<MerchantPlaceDetail>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}`
  )
  return data
}

export async function getMerchantPlaceOperating(placeId: number) {
  const { data } = await customAxios.get<MerchantPlaceOperating>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/operating`
  )
  return data
}

export async function updateMerchantPlaceOperatingStatus(
  placeId: number,
  request: MerchantPlaceOperatingStatusUpdateRequest
) {
  const { data } = await customAxios.patch<MerchantPlaceOperating>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/operating-status`,
    request
  )
  return data
}

export async function updateMerchantPlaceOperatingSchedule(
  placeId: number,
  request: MerchantPlaceOperatingScheduleUpdateRequest
) {
  const { data } = await customAxios.put<MerchantPlaceOperatingScheduleResponse>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/operating-schedule`,
    request
  )
  return data
}

export async function getMerchantPlaceMedia(placeId: number) {
  const { data } = await customAxios.get<MerchantPlaceMediaResponse>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/media`
  )
  return data
}

export async function requestMerchantPlaceMediaUploadUrl(
  placeId: number,
  request: MerchantPlaceMediaUploadRequest
) {
  const { data } = await customAxios.post<MerchantPlaceMediaUploadResponse>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/media/upload-url`,
    request
  )
  return data
}

export async function updateMerchantPlaceMediaOrder(
  placeId: number,
  mediaId: number,
  request: MerchantPlaceMediaOrderUpdateRequest
) {
  const { data } = await customAxios.patch<MerchantPlaceMediaItem>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/media/${mediaId}`,
    request
  )
  return data
}

export async function updateMerchantRepresentativeMedia(placeId: number, mediaId: number) {
  const { data } = await customAxios.put<MerchantPlaceMediaResponse>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/media/representative`,
    { mediaId }
  )
  return data
}

export async function deleteMerchantPlaceMedia(placeId: number, mediaId: number) {
  await customAxios.delete<void>(`${MERCHANT_OWNER_PATH}/places/${placeId}/media/${mediaId}`)
}

export async function getMerchantCampaigns(params: { page?: number; limit?: number } = {}) {
  const { data } = await customAxios.get<MerchantCampaignPageResponse>(
    `${MERCHANT_OWNER_PATH}/campaigns`,
    { params: { page: 1, limit: 20, ...params } }
  )
  return data
}

export async function createMerchantCampaign(request: MerchantCampaignRequest) {
  const { data } = await customAxios.post<MerchantCampaign>(
    `${MERCHANT_OWNER_PATH}/campaigns`,
    request,
  )
  return data
}

export async function updateMerchantCampaign(campaignId: number, request: MerchantCampaignRequest) {
  const { data } = await customAxios.patch<MerchantCampaign>(
    `${MERCHANT_OWNER_PATH}/campaigns/${campaignId}`,
    request,
  )
  return data
}

export async function publishMerchantCampaign(campaignId: number) {
  const { data } = await customAxios.post<MerchantCampaign>(
    `${MERCHANT_OWNER_PATH}/campaigns/${campaignId}/publish`,
  )
  return data
}

export async function closeMerchantCampaign(campaignId: number) {
  const { data } = await customAxios.post<MerchantCampaign>(
    `${MERCHANT_OWNER_PATH}/campaigns/${campaignId}/close`,
  )
  return data
}

export async function getMerchantBrands(params: { page?: number; limit?: number } = {}) {
  const { data } = await customAxios.get<MerchantBrandPageResponse>(
    `${MERCHANT_OWNER_PATH}/campaigns/brands`,
    { params: { page: 1, limit: 100, ...params } },
  )
  return data
}

export async function createMerchantBrand(request: MerchantBrandRequest) {
  const { data } = await customAxios.post<MerchantBrand>(
    `${MERCHANT_OWNER_PATH}/campaigns/brands`,
    request,
  )
  return data
}

export async function updateMerchantBrand(brandId: number, request: MerchantBrandRequest) {
  const { data } = await customAxios.patch<MerchantBrand>(
    `${MERCHANT_OWNER_PATH}/campaigns/brands/${brandId}`,
    request,
  )
  return data
}

export async function getMerchantOffers() {
  const { data } = await customAxios.get<MerchantOfferPageResponse>(
    `${MERCHANT_OWNER_PATH}/offers`,
    { params: { page: 1, limit: 20 } }
  )
  return data
}

export async function getMerchantReservableProducts() {
  const { data } = await customAxios.get<MerchantReservableProduct[]>(
    `${MERCHANT_OWNER_PATH}/reservable-products`
  )
  return data
}

export async function getMerchantOperatingNotices(placeId: number) {
  const { data } = await customAxios.get<MerchantOperatingNoticeListResponse>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/operating-notices`
  )
  return data
}

export async function createMerchantOperatingNotice(
  placeId: number,
  request: MerchantOperatingNoticeRequest
) {
  const { data } = await customAxios.post<MerchantOperatingNotice>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/operating-notices`,
    request
  )
  return data
}

export async function updateMerchantOperatingNotice(
  placeId: number,
  noticeId: number,
  request: MerchantOperatingNoticeUpdateRequest
) {
  const { data } = await customAxios.patch<MerchantOperatingNotice>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/operating-notices/${noticeId}`,
    request
  )
  return data
}

export async function cancelMerchantOperatingNotice(
  placeId: number,
  noticeId: number,
  request: MerchantOperatingNoticeCancelRequest
) {
  const { data } = await customAxios.post<MerchantOperatingNotice>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/operating-notices/${noticeId}/cancel`,
    request
  )
  return data
}
