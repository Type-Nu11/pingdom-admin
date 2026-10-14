import customAxios from './customAxios'
import { isApiError } from './customAxios'
import type {
  MerchantOwnerApplicationProfile,
  MerchantOwnerApplicationRequest,
} from '../types/merchantOnboarding.types'

const MY_ACCOUNT_PATH = '/users/me'

export async function getMerchantOwnerApplicationProfile() {
  const { data } = await customAxios.get<MerchantOwnerApplicationProfile>(
    `${MY_ACCOUNT_PATH}/merchant-owner-profile`,
  )
  return data
}

export async function createMerchantOwnerApplicationProfile(
  request: MerchantOwnerApplicationRequest,
) {
  const { data } = await customAxios.post<MerchantOwnerApplicationProfile>(
    `${MY_ACCOUNT_PATH}/merchant-owner-profile`,
    request,
  )
  return data
}

export async function updateMerchantOwnerApplicationProfile(
  request: MerchantOwnerApplicationRequest,
) {
  const { data } = await customAxios.put<MerchantOwnerApplicationProfile>(
    `${MY_ACCOUNT_PATH}/merchant-owner-profile`,
    request,
  )
  return data
}

export async function getOptionalMerchantApplicationProfile() {
  try {
    return await getMerchantOwnerApplicationProfile()
  } catch (error) {
    if (isApiError<{ code?: string }>(error) && !error.isRefreshFailure
      && error.response?.status === 404 && error.response.data?.code === 'PROFILE_NOT_FOUND') return null
    throw error
  }
}
