import customAxios from './customAxios'
import type { AdminMerchantPlaceClaimAttachment, MerchantPlaceClaim, MerchantPlaceClaimPage, MerchantPlaceClaimStatus } from '../types/adminMerchantPlaceClaim.types'
const PATH = '/admin/merchant-place-claims'
export async function getAdminMerchantPlaceClaims(params: { status?: MerchantPlaceClaimStatus; page?: number; limit?: number }) { const { data } = await customAxios.get<MerchantPlaceClaimPage>(PATH, { params }); return data }
export async function getAdminMerchantPlaceClaim(claimId: number) { const { data } = await customAxios.get<MerchantPlaceClaim>(`${PATH}/${claimId}`); return data }
export async function getAdminMerchantPlaceClaimAttachments(claimId: number) { const { data } = await customAxios.get<AdminMerchantPlaceClaimAttachment[]>(`${PATH}/${claimId}/attachments`); return data }
export async function downloadAdminMerchantPlaceClaimAttachment(claimId: number, attachmentId: number) { const response = await customAxios.get<Blob>(`${PATH}/${claimId}/attachments/${attachmentId}/content`, { responseType: 'blob' }); const contentType = response.headers['content-type']; return new Blob([response.data], { type: typeof contentType === 'string' ? contentType : response.data.type }) }
export async function reviewAdminMerchantPlaceClaim(claimId: number, approved: boolean, reason: string, reviewedVersion: number) { const { data } = await customAxios.post<MerchantPlaceClaim>(`${PATH}/${claimId}/review`, { approved, reason, reviewedVersion }); return data }
