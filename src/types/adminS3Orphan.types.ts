import type { AuthErrorResponse } from './auth.types'
export interface S3OrphanDryRun { prefix:string; scanLimit:number; dryRun:boolean; truncated:boolean; dbKeyCount:number; s3ObjectCount:number; orphanObjectCount:number; orphanKeys:string[] }
export type S3OrphanReportState = 'RUNNING'|'COMPLETED'|'FAILED'
export interface S3OrphanReportStatus { reportId:string; status:S3OrphanReportState; generatedAt:string; completedAt:string|null; dbKeyCount:number; s3KeyCount:number; deleteCandidateCount:number; errorMessage:string|null }
export interface S3OrphanCandidate { key:string; reason:string }
export interface S3OrphanReport extends S3OrphanReportStatus { deleteCandidates:S3OrphanCandidate[]; page:number; limit:number; totalCount:number; totalPages:number; hasNext:boolean }
export interface S3OrphanDeleteFailure { key:string; reason:string }
export interface S3OrphanDeleteResult { requestedKeyCount:number; deletedKeyCount:number; failedKeyCount:number; deletedKeys:string[]; failedKeys:S3OrphanDeleteFailure[] }
export type AdminS3OrphanErrorResponse = AuthErrorResponse<string>
