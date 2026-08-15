import customAxios from './customAxios'
import type { MerchantPlaceClaim, MerchantPlaceClaimPage, MerchantPlaceClaimStatus } from '../types/adminMerchantPlaceClaim.types'
const PATH = '/admin/merchant-place-claims'
export async function getAdminMerchantPlaceClaims(params: { status?: MerchantPlaceClaimStatus; page?: number; limit?: number }) { const { data } = await customAxios.get<MerchantPlaceClaimPage>(PATH, { params }); return data }
export async function getAdminMerchantPlaceClaim(claimId: number) { const { data } = await customAxios.get<MerchantPlaceClaim>(`${PATH}/${claimId}`); return data }
export async function reviewAdminMerchantPlaceClaim(claimId: number, approved: boolean, reason: string, reviewedVersion: number) { const { data } = await customAxios.post<MerchantPlaceClaim>(`${PATH}/${claimId}/review`, { approved, reason, reviewedVersion }); return data }
