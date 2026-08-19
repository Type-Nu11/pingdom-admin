import customAxios from './customAxios'
import type {
  MerchantCampaignPageResponse,
  MerchantOfferPageResponse,
  MerchantOwnerProfile,
  MerchantPlaceInformation,
  MerchantPlaceInformationUpdateRequest,
  MerchantReservableProduct,
} from '../types/merchantStore.types'

const MERCHANT_OWNER_PATH = '/merchant-owner'

export async function getMerchantOwnerProfile() {
  const { data } = await customAxios.get<MerchantOwnerProfile>(`${MERCHANT_OWNER_PATH}/me`)
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

export async function getMerchantCampaigns() {
  const { data } = await customAxios.get<MerchantCampaignPageResponse>(
    `${MERCHANT_OWNER_PATH}/campaigns`,
    { params: { page: 1, limit: 20 } }
  )
  return data
}

export async function getMerchantOffers() {
  const { data } = await customAxios.get<MerchantOfferPageResponse>(
    `${MERCHANT_OWNER_PATH}/offers`,
    { params: { page: 1, limit: 20 } }
  )
  return data
}

export async function getMerchantReservableProducts() {
  const { data } = await customAxios.get<MerchantReservableProduct[]>(
    `${MERCHANT_OWNER_PATH}/reservable-products`
  )
  return data
}
