import customAxios from './customAxios'
import type {
  VerifiedBoostProduct,
  VerifiedBoostProductCreateRequest,
  VerifiedBoostProductPage,
} from '../types/adminVerifiedBoostProduct.types'

const PATH = '/admin/verified-boost-products'

export async function getAdminVerifiedBoostProducts(page = 1, limit = 20) {
  const { data } = await customAxios.get<VerifiedBoostProductPage>(PATH, {
    params: { page, limit },
  })
  return data
}

export async function getAdminVerifiedBoostProduct(productId: number) {
  const { data } = await customAxios.get<VerifiedBoostProduct>(`${PATH}/${productId}`)
  return data
}

export async function createAdminVerifiedBoostProduct(
  request: VerifiedBoostProductCreateRequest,
) {
  const { data } = await customAxios.post<VerifiedBoostProduct>(PATH, request)
  return data
}

export async function activateAdminVerifiedBoostProduct(productId: number) {
  const { data } = await customAxios.post<VerifiedBoostProduct>(
    `${PATH}/${productId}/activate`,
  )
  return data
}

export async function deactivateAdminVerifiedBoostProduct(productId: number) {
  const { data } = await customAxios.post<VerifiedBoostProduct>(
    `${PATH}/${productId}/deactivate`,
  )
  return data
}
