import type { AuthErrorResponse } from './auth.types'

export type VerifiedBoostProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE'

export interface VerifiedBoostProduct {
  id: number
  name: string
  description: string
  priceAmount: number
  durationDays: number
  status: VerifiedBoostProductStatus
  createdAt: string
  updatedAt: string
}

export interface VerifiedBoostProductPage {
  products: VerifiedBoostProduct[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface VerifiedBoostProductCreateRequest {
  name: string
  description: string
  priceAmount: number
  durationDays: number
}

export type AdminVerifiedBoostProductErrorResponse = AuthErrorResponse<string>
