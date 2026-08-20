import customAxios from './customAxios'
import type {
  MerchantPlaceApplication,
  MerchantPlaceApplicationPageResponse,
  MerchantPlaceApplicationRequest,
  MerchantPlaceAutocompleteResponse,
} from '../types/merchantPlaceApplication.types'

const APPLICATIONS_PATH = '/users/me/merchant-place-applications'

export async function getMerchantPlaceApplications() {
  const { data } = await customAxios.get<MerchantPlaceApplicationPageResponse>(
    APPLICATIONS_PATH,
    { params: { page: 1, limit: 20 } },
  )
  return data
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

export async function getMerchantPlaceSuggestions(keyword: string) {
  const { data } = await customAxios.get<MerchantPlaceAutocompleteResponse>('/places/autocomplete', {
    params: { keyword, limit: 8 },
  })
  return data
}
