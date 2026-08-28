import customAxios from './customAxios'
import type {
  MerchantPlaceApplication,
  MerchantPlaceApplicationPageResponse,
  MerchantPlaceApplicationRequest,
  MerchantPlaceAutocompleteResponse,
} from '../types/merchantPlaceApplication.types'

const APPLICATIONS_PATH = '/users/me/merchant-place-applications'

export async function getMerchantPlaceApplications(params: { page?: number; limit?: number } = {}) {
  const { data } = await customAxios.get<MerchantPlaceApplicationPageResponse>(
    APPLICATIONS_PATH,
    { params: { page: 1, limit: 20, ...params } },
  )
  return data
}

export async function getAllMerchantPlaceApplications() {
  const applications: MerchantPlaceApplication[] = []
  let page = 1

  while (true) {
    const response = await getMerchantPlaceApplications({ page, limit: 100 })
    applications.push(...response.items)
    if (!response.hasNext) return applications
    page = response.page + 1
  }
}

export async function getMerchantPlaceApplication(applicationId: number) {
  const { data } = await customAxios.get<MerchantPlaceApplication>(
    `${APPLICATIONS_PATH}/${applicationId}`,
  )
  return data
}

export async function createMerchantPlaceApplication(request: MerchantPlaceApplicationRequest) {
  const { data } = await customAxios.post<MerchantPlaceApplication>(APPLICATIONS_PATH, request)
  return data
}

export async function updateMerchantPlaceApplication(
  applicationId: number,
  request: MerchantPlaceApplicationRequest,
) {
  const { data } = await customAxios.put<MerchantPlaceApplication>(
    `${APPLICATIONS_PATH}/${applicationId}`,
    request,
  )
  return data
}

export async function submitMerchantPlaceApplication(applicationId: number) {
  const { data } = await customAxios.post<MerchantPlaceApplication>(
    `${APPLICATIONS_PATH}/${applicationId}/submit`,
  )
  return data
}

export async function reopenMerchantPlaceApplication(applicationId: number) {
  const { data } = await customAxios.post<MerchantPlaceApplication>(
    `${APPLICATIONS_PATH}/${applicationId}/reopen`,
  )
  return data
}

export async function cancelMerchantPlaceApplication(applicationId: number) {
  const { data } = await customAxios.post<MerchantPlaceApplication>(
    `${APPLICATIONS_PATH}/${applicationId}/cancel`,
  )
  return data
}

export async function getMerchantPlaceApplicationAttachments(applicationId: number) {
  const { data } = await customAxios.get<MerchantPlaceApplication['attachments']>(
    `${APPLICATIONS_PATH}/${applicationId}/attachments`,
  )
  return data
}

export async function uploadMerchantPlaceApplicationAttachment(
  applicationId: number,
  documentType: MerchantPlaceApplication['attachments'][number]['documentType'],
  file: File,
) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await customAxios.post<MerchantPlaceApplication['attachments'][number]>(
    `${APPLICATIONS_PATH}/${applicationId}/attachments`,
    formData,
    { params: { documentType } },
  )
  return data
}

export async function deleteMerchantPlaceApplicationAttachment(applicationId: number, attachmentId: number) {
  await customAxios.delete<void>(`${APPLICATIONS_PATH}/${applicationId}/attachments/${attachmentId}`)
}

export async function reorderMerchantPlaceApplicationAttachments(applicationId: number, attachmentIds: number[]) {
  await customAxios.post<void>(
    `${APPLICATIONS_PATH}/${applicationId}/attachments/reorder`,
    undefined,
    { params: { attachmentIds }, paramsSerializer: { indexes: null } },
  )
}

export async function getMerchantPlaceSuggestions(keyword: string) {
  const { data } = await customAxios.get<MerchantPlaceAutocompleteResponse>('/places/autocomplete', {
    params: { keyword, limit: 8 },
  })
  return data
}
