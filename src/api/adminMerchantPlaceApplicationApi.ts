import customAxios from './customAxios'
import type {
  AdminMerchantPlaceApplication,
  AdminMerchantPlaceApplicationAttachment,
  AdminMerchantPlaceApplicationPage,
  MerchantPlaceApplicationReviewRequest,
} from '../types/adminMerchantPlaceApplication.types'

const PATH = '/admin/merchant-place-applications'

export async function getAdminMerchantPlaceApplications(params: { page?: number; limit?: number }) {
  const { data } = await customAxios.get<AdminMerchantPlaceApplicationPage>(PATH, { params })
  return data
}

export async function getAdminMerchantPlaceApplication(applicationId: number) {
  const { data } = await customAxios.get<AdminMerchantPlaceApplication>(`${PATH}/${applicationId}`)
  return data
}

export async function getAdminMerchantPlaceApplicationAttachments(applicationId: number) {
  const { data } = await customAxios.get<AdminMerchantPlaceApplicationAttachment[]>(
    `${PATH}/${applicationId}/attachments`,
  )
  return data
}

export async function downloadAdminMerchantPlaceApplicationAttachment(
  applicationId: number,
  attachmentId: number,
) {
  const response = await customAxios.get<Blob>(
    `${PATH}/${applicationId}/attachments/${attachmentId}/content`,
    { responseType: 'blob' },
  )

  const contentType = response.headers['content-type']

  return new Blob([response.data], {
    type: typeof contentType === 'string' ? contentType : response.data.type,
  })
}

export async function approveAdminMerchantPlaceApplication(
  applicationId: number,
  request: MerchantPlaceApplicationReviewRequest,
) {
  const { data } = await customAxios.post<AdminMerchantPlaceApplication>(
    `${PATH}/${applicationId}/approve`,
    request,
  )
  return data
}

export async function rejectAdminMerchantPlaceApplication(
  applicationId: number,
  request: MerchantPlaceApplicationReviewRequest,
) {
  const { data } = await customAxios.post<AdminMerchantPlaceApplication>(
    `${PATH}/${applicationId}/reject`,
    request,
  )
  return data
}
