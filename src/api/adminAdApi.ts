import customAxios from './customAxios'
import type {
  AdminAdCreateRequest,
  AdminAdCreateResponse,
  AdminAdListItem,
  AdminAdListParams,
  AdminAdListResponse,
} from '../types/adminAd.types'

const PATH = '/admin/ad'

export async function getAdminAds(params: AdminAdListParams) {
  const { data } = await customAxios.get<AdminAdListResponse>(PATH, { params })
  return data
}

export async function getAdminAd(adId: number) {
  const { data } = await customAxios.get<AdminAdListItem>(`${PATH}/${adId}`)
  return data
}

export async function createAdminAd(request: AdminAdCreateRequest) {
  const { data } = await customAxios.post<AdminAdCreateResponse>(PATH, request)
  return data
}

export async function deleteAdminAd(adId: number) {
  await customAxios.delete(`${PATH}/${adId}`)
}
