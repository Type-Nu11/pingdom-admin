import customAxios from './customAxios'
import type {
  MerchantPlaceRegistration,
  MerchantPlaceRegistrationPageResponse,
  MerchantPlaceRegistrationRequest,
} from '../types/merchantPlaceRegistration.types'

const REGISTRATION_PATH = '/users/me/place-registration-applications'

export async function getMerchantPlaceRegistrations() {
  const { data } = await customAxios.get<MerchantPlaceRegistrationPageResponse>(
    REGISTRATION_PATH,
    { params: { page: 1, limit: 20 } },
  )
  return data
}

export async function getMerchantPlaceRegistration(applicationId: number) {
  const { data } = await customAxios.get<MerchantPlaceRegistration>(
    `${REGISTRATION_PATH}/${applicationId}`,
  )
  return data
}

export async function createMerchantPlaceRegistration(request: MerchantPlaceRegistrationRequest) {
  const { data } = await customAxios.post<MerchantPlaceRegistration>(REGISTRATION_PATH, request)
  return data
}

export async function updateMerchantPlaceRegistration(
  applicationId: number,
  request: MerchantPlaceRegistrationRequest,
) {
  const { data } = await customAxios.put<MerchantPlaceRegistration>(
    `${REGISTRATION_PATH}/${applicationId}`,
    request,
  )
  return data
}

export async function submitMerchantPlaceRegistration(applicationId: number) {
  const { data } = await customAxios.post<MerchantPlaceRegistration>(
    `${REGISTRATION_PATH}/${applicationId}/submit`,
  )
  return data
}

export async function reopenMerchantPlaceRegistration(applicationId: number) {
  const { data } = await customAxios.post<MerchantPlaceRegistration>(
    `${REGISTRATION_PATH}/${applicationId}/reopen`,
  )
  return data
}

export async function completeMerchantPlaceRegistration(applicationId: number) {
  const { data } = await customAxios.post<MerchantPlaceRegistration>(
    `${REGISTRATION_PATH}/${applicationId}/complete`,
  )
  return data
}

export async function cancelMerchantPlaceRegistration(applicationId: number) {
  const { data } = await customAxios.post<MerchantPlaceRegistration>(
    `${REGISTRATION_PATH}/${applicationId}/cancel`,
  )
  return data
}
