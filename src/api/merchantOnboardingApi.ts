import customAxios, { isApiError } from './customAxios'
import type { MerchantOwnerApplicationProfile } from '../types/merchantOnboarding.types'

const MY_ACCOUNT_PATH = '/users/me'

export async function getMerchantOwnerApplicationProfile() {
  const { data } = await customAxios.get<MerchantOwnerApplicationProfile>(
    `${MY_ACCOUNT_PATH}/merchant-owner-profile`,
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
