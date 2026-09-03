import customAxios from './customAxios'
import type {
  AdminMerchantOnboardingUpdateRequest,
  AdminMerchantOwnerPageResponse,
  AdminMerchantOwnerPlace,
  AdminMerchantOwnerPlaceQualityUpdateRequest,
  AdminMerchantOwnerPlaceUpdateRequest,
  AdminMerchantOwnerProfile,
  AdminMerchantOwnerReviewRequest,
  MerchantOwnerStatus,
} from '../types/adminMerchantOwner.types'

const PATH = '/admin/merchant-owners'

export async function getAdminMerchantOwners(params: {
  status?: MerchantOwnerStatus
  page?: number
  limit?: number
}) {
  const { data } = await customAxios.get<AdminMerchantOwnerPageResponse>(PATH, { params })
  return data
}

export async function getAdminMerchantOwner(userId: number) {
  const { data } = await customAxios.get<AdminMerchantOwnerProfile>(`${PATH}/${userId}`)
  return data
}

export async function getAdminMerchantOwnerPlaces(userId: number) {
  const { data } = await customAxios.get<AdminMerchantOwnerPlace[]>(`${PATH}/${userId}/places`)
  return data
}

async function reviewMerchantOwner(
  userId: number,
  action: 'approve' | 'reject' | 'revoke',
  request: AdminMerchantOwnerReviewRequest,
) {
  const { data } = await customAxios.post<AdminMerchantOwnerProfile>(
    `${PATH}/${userId}/${action}`,
    request,
  )
  return data
}

export const approveAdminMerchantOwner = (userId: number, request: AdminMerchantOwnerReviewRequest) =>
  reviewMerchantOwner(userId, 'approve', request)
export const rejectAdminMerchantOwner = (userId: number, request: AdminMerchantOwnerReviewRequest) =>
  reviewMerchantOwner(userId, 'reject', request)
export const revokeAdminMerchantOwner = (userId: number, request: AdminMerchantOwnerReviewRequest) =>
  reviewMerchantOwner(userId, 'revoke', request)

export async function replaceAdminMerchantOwnerPlaces(
  userId: number,
  request: AdminMerchantOwnerPlaceUpdateRequest
) {
  const { data } = await customAxios.put<AdminMerchantOwnerProfile>(
    `${PATH}/${userId}/places`, request
  )
  return data
}

export async function updateAdminMerchantOwnerOnboarding(
  userId: number,
  request: AdminMerchantOnboardingUpdateRequest
) {
  const { data } = await customAxios.put<AdminMerchantOwnerProfile>(
    `${PATH}/${userId}/onboarding`, request
  )
  return data
}

export async function updateAdminMerchantOwnerPlaceQuality(
  userId: number,
  placeId: number,
  request: AdminMerchantOwnerPlaceQualityUpdateRequest
) {
  const { data } = await customAxios.put<AdminMerchantOwnerPlace>(
    `${PATH}/${userId}/places/${placeId}/quality`, request
  )
  return data
}
