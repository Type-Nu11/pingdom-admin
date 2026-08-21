import customAxios from './customAxios'
import type {
  MerchantCampaignPageResponse,
  MerchantCampaign,
  MerchantCampaignRequest,
  MerchantBrandPageResponse,
  MerchantBrandRequest,
  MerchantBrand,
  MerchantCoupon,
  MerchantCouponRedeemRequest,
  MerchantOfferPageResponse,
  MerchantOffer,
  MerchantOfferCreateRequest,
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
  MerchantAvailability,
  MerchantAvailabilityUpsertRequest,
  MerchantReservableProduct,
  MerchantReservableProductCreateRequest,
  MerchantReservation,
  MerchantReservationPageResponse,
  MerchantPlaceReverificationPageResponse,
  MerchantPlaceReverificationRequest,
  MerchantPlaceReverificationResponseRequest,
  MerchantPlaceClaim,
  MerchantPlaceClaimAttachment,
  MerchantPlaceClaimCreateRequest,
  MerchantPlaceClaimDocumentType,
  MerchantPlaceClaimPageResponse,
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

export async function getMerchantOffers(params: { page?: number; limit?: number } = {}) {
  const { data } = await customAxios.get<MerchantOfferPageResponse>(
    `${MERCHANT_OWNER_PATH}/offers`,
    { params: { page: 1, limit: 20, ...params } }
  )
  return data
}

export async function getMerchantOffer(offerId: number) {
  const { data } = await customAxios.get<MerchantOffer>(
    `${MERCHANT_OWNER_PATH}/offers/${offerId}`,
  )
  return data
}

export async function createMerchantOffer(request: MerchantOfferCreateRequest) {
  const { data } = await customAxios.post<MerchantOffer>(
    `${MERCHANT_OWNER_PATH}/offers`,
    request,
  )
  return data
}

export async function publishMerchantOffer(offerId: number) {
  const { data } = await customAxios.post<MerchantOffer>(
    `${MERCHANT_OWNER_PATH}/offers/${offerId}/publish`,
  )
  return data
}

export async function closeMerchantOffer(offerId: number) {
  const { data } = await customAxios.post<MerchantOffer>(
    `${MERCHANT_OWNER_PATH}/offers/${offerId}/close`,
  )
  return data
}

export async function redeemMerchantCoupon(request: MerchantCouponRedeemRequest) {
  const { data } = await customAxios.post<MerchantCoupon>(
    `${MERCHANT_OWNER_PATH}/offers/coupons/redeem`,
    request,
  )
  return data
}

export async function getMerchantReservableProducts() {
  const { data } = await customAxios.get<MerchantReservableProduct[]>(
    `${MERCHANT_OWNER_PATH}/reservable-products`
  )
  return data
}

export async function createMerchantReservableProduct(
  request: MerchantReservableProductCreateRequest,
) {
  const { data } = await customAxios.post<MerchantReservableProduct>(
    `${MERCHANT_OWNER_PATH}/reservable-products`,
    request,
  )
  return data
}

export async function activateMerchantReservableProduct(productId: number) {
  const { data } = await customAxios.post<MerchantReservableProduct>(
    `${MERCHANT_OWNER_PATH}/reservable-products/${productId}/activate`,
  )
  return data
}

export async function deactivateMerchantReservableProduct(productId: number) {
  const { data } = await customAxios.post<MerchantReservableProduct>(
    `${MERCHANT_OWNER_PATH}/reservable-products/${productId}/deactivate`,
  )
  return data
}

export async function getMerchantAvailabilities() {
  const { data } = await customAxios.get<MerchantAvailability[]>(
    `${MERCHANT_OWNER_PATH}/availabilities`,
  )
  return data
}

export async function createMerchantAvailability(request: MerchantAvailabilityUpsertRequest) {
  const { data } = await customAxios.post<MerchantAvailability>(
    `${MERCHANT_OWNER_PATH}/availabilities`,
    request,
  )
  return data
}

export async function updateMerchantAvailability(
  availabilityId: number,
  request: MerchantAvailabilityUpsertRequest,
) {
  const { data } = await customAxios.put<MerchantAvailability>(
    `${MERCHANT_OWNER_PATH}/availabilities/${availabilityId}`,
    request,
  )
  return data
}

export async function activateMerchantAvailability(availabilityId: number) {
  const { data } = await customAxios.post<MerchantAvailability>(
    `${MERCHANT_OWNER_PATH}/availabilities/${availabilityId}/activate`,
  )
  return data
}

export async function deactivateMerchantAvailability(availabilityId: number) {
  const { data } = await customAxios.post<MerchantAvailability>(
    `${MERCHANT_OWNER_PATH}/availabilities/${availabilityId}/deactivate`,
  )
  return data
}

export async function getMerchantReservations(page = 1, limit = 20) {
  const { data } = await customAxios.get<MerchantReservationPageResponse>(
    `${MERCHANT_OWNER_PATH}/reservations`,
    { params: { page, limit } },
  )
  return data
}

export async function confirmMerchantReservation(reservationId: number) {
  const { data } = await customAxios.post<MerchantReservation>(
    `${MERCHANT_OWNER_PATH}/reservations/${reservationId}/confirm`,
  )
  return data
}

export async function cancelMerchantReservation(reservationId: number) {
  const { data } = await customAxios.post<MerchantReservation>(
    `${MERCHANT_OWNER_PATH}/reservations/${reservationId}/cancel`,
  )
  return data
}

export async function getMerchantPlaceReverificationRequests(page = 1, limit = 20) {
  const { data } = await customAxios.get<MerchantPlaceReverificationPageResponse>(
    `${MERCHANT_OWNER_PATH}/place-information-reverification-requests`,
    { params: { page, limit } },
  )
  return data
}

export async function respondMerchantPlaceReverificationRequest(
  requestId: number,
  request: MerchantPlaceReverificationResponseRequest,
) {
  const { data } = await customAxios.post<MerchantPlaceReverificationRequest>(
    `${MERCHANT_OWNER_PATH}/place-information-reverification-requests/${requestId}/responses`,
    request,
  )
  return data
}

export async function getMerchantPlaceClaims(page = 1, limit = 20) {
  const { data } = await customAxios.get<MerchantPlaceClaimPageResponse>(
    `${MERCHANT_OWNER_PATH}/place-claims`,
    { params: { page, limit } },
  )
  return data
}

export async function getMerchantPlaceClaim(claimId: number) {
  const { data } = await customAxios.get<MerchantPlaceClaim>(
    `${MERCHANT_OWNER_PATH}/place-claims/${claimId}`,
  )
  return data
}

export async function createMerchantPlaceClaim(request: MerchantPlaceClaimCreateRequest) {
  const { data } = await customAxios.post<MerchantPlaceClaim>(
    `${MERCHANT_OWNER_PATH}/place-claims`,
    request,
  )
  return data
}

export async function cancelMerchantPlaceClaim(claimId: number) {
  const { data } = await customAxios.post<MerchantPlaceClaim>(
    `${MERCHANT_OWNER_PATH}/place-claims/${claimId}/cancel`,
  )
  return data
}

export async function getMerchantPlaceClaimAttachments(claimId: number) {
  const { data } = await customAxios.get<MerchantPlaceClaimAttachment[]>(
    `${MERCHANT_OWNER_PATH}/place-claims/${claimId}/attachments`,
  )
  return data
}

export async function uploadMerchantPlaceClaimAttachment(
  claimId: number,
  documentType: MerchantPlaceClaimDocumentType,
  file: File,
) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await customAxios.post<MerchantPlaceClaimAttachment>(
    `${MERCHANT_OWNER_PATH}/place-claims/${claimId}/attachments`,
    formData,
    { params: { documentType } },
  )
  return data
}

export async function reorderMerchantPlaceClaimAttachments(
  claimId: number,
  attachmentIds: number[],
) {
  const params = new URLSearchParams()
  attachmentIds.forEach((attachmentId) => params.append('attachmentIds', String(attachmentId)))
  await customAxios.post<void>(
    `${MERCHANT_OWNER_PATH}/place-claims/${claimId}/attachments/reorder`,
    undefined,
    { params },
  )
}

export async function deleteMerchantPlaceClaimAttachment(claimId: number, attachmentId: number) {
  await customAxios.delete<void>(
    `${MERCHANT_OWNER_PATH}/place-claims/${claimId}/attachments/${attachmentId}`,
  )
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
