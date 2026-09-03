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
  MerchantPlaceMenu,
  MerchantPlaceMenuCreateRequest,
  MerchantPlaceMenuStatus,
  MerchantPlaceMenuUpdateRequest,
  MerchantOperatingNotice,
  MerchantOperatingNoticeCancelRequest,
  MerchantOperatingNoticeListResponse,
  MerchantOperatingNoticeRequest,
  MerchantOperatingNoticeUpdateRequest,
  MerchantPlaceDetail,
  MerchantPlaceMediaItem,
  MerchantPlaceMediaCreateRequest,
  MerchantPlaceMediaOrderUpdateRequest,
  MerchantPlaceMediaResponse,
  MerchantPlaceMediaUploadRequest,
  MerchantPlaceMediaUploadResponse,
  MerchantPlaceReviewDeletionRequestCreateRequest,
  MerchantPlaceReviewDeletionRequestResponse,
  MerchantPlaceReviewPageResponse,
  MerchantPlaceOperating,
  MerchantPlaceOperatingScheduleResponse,
  MerchantPlaceOperatingScheduleUpdateRequest,
  MerchantPlaceOperatingStatusUpdateRequest,
  MerchantOwnerProfile,
  MerchantPlaceInformation,
  MerchantPlaceInformationUpdateRequest,
  MerchantPerformance,
  MerchantPayment,
  MerchantPaymentPageResponse,
  MerchantSettlementLedgerPageResponse,
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
  MerchantVerifiedBoostExecution,
  MerchantVerifiedBoostExecutionPageResponse,
  MerchantVerifiedBoostProductPageResponse,
  MerchantVerifiedBoostSelectionPageResponse,
  MerchantVerifiedBoostSelection,
  MerchantVerifiedBoostSelectionCreateRequest,
} from '../types/merchantStore.types'

const MERCHANT_OWNER_PATH = '/merchant-owner'

export async function getMerchantOwnerProfile() {
  const { data } = await customAxios.get<MerchantOwnerProfile>(`${MERCHANT_OWNER_PATH}/me`)
  return data
}

export async function getMerchantPerformance() {
  const { data } = await customAxios.get<MerchantPerformance>(`${MERCHANT_OWNER_PATH}/performance`)
  return data
}

export async function getMerchantPayments(page = 1, limit = 20) {
  const { data } = await customAxios.get<MerchantPaymentPageResponse>(
    `${MERCHANT_OWNER_PATH}/payments`,
    { params: { page, limit } },
  )
  return data
}

export async function getMerchantSettlementLedger(page = 1, limit = 20) {
  const { data } = await customAxios.get<MerchantSettlementLedgerPageResponse>(
    `${MERCHANT_OWNER_PATH}/payments/settlements`,
    { params: { page, limit } },
  )
  return data
}

export async function refundMerchantPayment(paymentId: number) {
  const { data } = await customAxios.post<MerchantPayment>(
    `${MERCHANT_OWNER_PATH}/payments/${paymentId}/refund`,
  )
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

export async function createMerchantPlaceMedia(
  placeId: number,
  request: MerchantPlaceMediaCreateRequest
) {
  const { data } = await customAxios.post<MerchantPlaceMediaItem>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/media`,
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

export async function getMerchantPlaceReviews(placeId: number, page = 1, limit = 20) {
  const { data } = await customAxios.get<MerchantPlaceReviewPageResponse>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/reviews`,
    { params: { page, limit } },
  )
  return data
}

export async function createMerchantPlaceReviewDeletionRequest(
  placeId: number,
  reviewId: number,
  request: MerchantPlaceReviewDeletionRequestCreateRequest,
) {
  const { data } = await customAxios.post<MerchantPlaceReviewDeletionRequestResponse>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/reviews/${reviewId}/deletion-requests`,
    request,
  )
  return data
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

export async function getMerchantPlaceMenus(placeId: number) {
  const { data } = await customAxios.get<MerchantPlaceMenu[]>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/menus`,
  )
  return data
}

export async function createMerchantPlaceMenu(
  placeId: number,
  request: MerchantPlaceMenuCreateRequest,
) {
  const { data } = await customAxios.post<MerchantPlaceMenu>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/menus`,
    request,
  )
  return data
}

export async function updateMerchantPlaceMenu(
  placeId: number,
  menuId: number,
  request: MerchantPlaceMenuUpdateRequest,
) {
  const { data } = await customAxios.patch<MerchantPlaceMenu>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/menus/${menuId}`,
    request,
  )
  return data
}

export async function updateMerchantPlaceMenuStatus(
  placeId: number,
  menuId: number,
  status: Exclude<MerchantPlaceMenuStatus, 'INACTIVE'>,
) {
  const { data } = await customAxios.patch<MerchantPlaceMenu>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/menus/${menuId}/status`,
    { status },
  )
  return data
}

export async function updateMerchantPlaceMenuOrder(
  placeId: number,
  menuId: number,
  displayOrder: number,
) {
  const { data } = await customAxios.patch<MerchantPlaceMenu>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/menus/${menuId}/order`,
    { displayOrder },
  )
  return data
}

export async function deactivateMerchantPlaceMenu(placeId: number, menuId: number) {
  await customAxios.post<void>(
    `${MERCHANT_OWNER_PATH}/places/${placeId}/menus/${menuId}/deactivate`,
  )
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

export async function getMerchantVerifiedBoostSelections(page = 1, limit = 20) {
  const { data } = await customAxios.get<MerchantVerifiedBoostSelectionPageResponse>(
    `${MERCHANT_OWNER_PATH}/verified-boost-selections`,
    { params: { page, limit } },
  )
  return data
}

export async function getMerchantVerifiedBoostProducts(page = 1, limit = 20) {
  const { data } = await customAxios.get<MerchantVerifiedBoostProductPageResponse>(
    `${MERCHANT_OWNER_PATH}/verified-boost-products`,
    { params: { page, limit } },
  )
  return data
}

export async function createMerchantVerifiedBoostSelection(
  request: MerchantVerifiedBoostSelectionCreateRequest,
) {
  const { data } = await customAxios.post<MerchantVerifiedBoostSelection>(
    `${MERCHANT_OWNER_PATH}/verified-boost-selections`,
    request,
  )
  return data
}

export async function getMerchantVerifiedBoostExecutions(page = 1, limit = 20) {
  const { data } = await customAxios.get<MerchantVerifiedBoostExecutionPageResponse>(
    `${MERCHANT_OWNER_PATH}/verified-boost-executions`,
    { params: { page, limit } },
  )
  return data
}

export async function startMerchantVerifiedBoostExecution(selectionId: number) {
  const { data } = await customAxios.post<MerchantVerifiedBoostExecution>(
    `${MERCHANT_OWNER_PATH}/verified-boost-executions`,
    { selectionId },
  )
  return data
}

export async function stopMerchantVerifiedBoostExecution(executionId: number) {
  const { data } = await customAxios.post<MerchantVerifiedBoostExecution>(
    `${MERCHANT_OWNER_PATH}/verified-boost-executions/${executionId}/stop`,
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
  formData.append('documentType', documentType)
  const { data } = await customAxios.post<MerchantPlaceClaimAttachment>(
    `${MERCHANT_OWNER_PATH}/place-claims/${claimId}/attachments`,
    formData,
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
