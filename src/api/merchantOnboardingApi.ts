import customAxios from './customAxios'
import type {
  MerchantOwnerApplicationProfile,
  MerchantOwnerApplicationRequest,
  MerchantVerification,
  MerchantVerificationRequest,
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

export async function getMerchantVerification() {
  const { data } = await customAxios.get<MerchantVerification>(
    `${MY_ACCOUNT_PATH}/merchant-verification`,
  )
  return data
}

export async function createMerchantVerification(request: MerchantVerificationRequest) {
  const { data } = await customAxios.post<MerchantVerification>(
    `${MY_ACCOUNT_PATH}/merchant-verification`,
    request,
  )
  return data
}

export async function updateMerchantVerification(request: MerchantVerificationRequest) {
  const { data } = await customAxios.put<MerchantVerification>(
    `${MY_ACCOUNT_PATH}/merchant-verification`,
    request,
  )
  return data
}
