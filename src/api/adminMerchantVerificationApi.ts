import customAxios from './customAxios'
import type {
  AdminMerchantVerificationDetail,
  AdminMerchantVerificationPageResponse,
  AdminMerchantVerificationReviewRequest,
  MerchantVerificationStatus,
} from '../types/adminMerchantVerification.types'

const PATH = '/admin/merchant-verifications'

export async function getAdminMerchantVerifications(params: {
  identityStatus?: MerchantVerificationStatus
  businessStatus?: MerchantVerificationStatus
  page?: number
  limit?: number
}) {
  const { data } = await customAxios.get<AdminMerchantVerificationPageResponse>(PATH, { params })
  return data
}

export async function getAdminMerchantVerification(userId: number) {
  const { data } = await customAxios.get<AdminMerchantVerificationDetail>(`${PATH}/${userId}`)
  return data
}

export async function reviewAdminMerchantVerification(
  userId: number,
  request: AdminMerchantVerificationReviewRequest
) {
  const { data } = await customAxios.post<AdminMerchantVerificationDetail>(
    `${PATH}/${userId}/review`,
    request
  )
  return data
}
