import type { AuthErrorResponse } from './auth.types'

export type MerchantPlaceClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED'
export type MerchantPlaceClaimType = 'INITIAL' | 'OWNERSHIP_TRANSFER'
export type MerchantPlaceClaimAttachmentType = 'BUSINESS_LICENSE' | 'RESIDENT_REGISTRATION' | 'REPRESENTATIVE_IMAGE'
export interface MerchantPlaceClaimListItem { id: number; merchantOwnerUserId: number; placeId: number; claimType: MerchantPlaceClaimType; previousOwnerUserId: number | null; status: MerchantPlaceClaimStatus; createdAt: string; updatedAt: string }
export interface MerchantPlaceClaimAttachment { id: number; documentType: MerchantPlaceClaimAttachmentType; contentType: string; fileSize: number; displayOrder: number }
export interface MerchantPlaceClaimPlace { id: number; name: string; address: string; category: string; latitude: number; longitude: number; imageUrl: string | null; attachments: MerchantPlaceClaimAttachment[]; duplicateCandidates: unknown | null }
export interface MerchantPlaceClaim extends MerchantPlaceClaimListItem { claimReason: string; reviewReason: string | null; reviewedBy: number | null; version: number; reviewedAt: string | null; place: MerchantPlaceClaimPlace | null }
export interface MerchantPlaceClaimPage { claims: MerchantPlaceClaimListItem[]; page: number; limit: number; totalElements: number; totalPages: number; hasNext: boolean }
export type AdminMerchantPlaceClaimErrorResponse = AuthErrorResponse<string>
