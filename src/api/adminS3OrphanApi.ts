import customAxios from './customAxios'
import type { S3OrphanDeleteResult,S3OrphanDryRun,S3OrphanReport,S3OrphanReportStatus } from '../types/adminS3Orphan.types'
export async function getAdminS3OrphanDryRun(prefix='map/',limit=1000){const{data}=await customAxios.get<S3OrphanDryRun>('/admin/s3/orphan-objects',{params:{prefix,limit}});return data}
export async function getAdminS3OrphanReport(reportId?:string,page=1,limit=20){const{data}=await customAxios.get<S3OrphanReport>('/admin/posts/s3/orphans/report',{params:{reportId,page,limit}});return data}
export async function getAdminS3OrphanReportStatus(reportId?:string){const{data}=await customAxios.get<S3OrphanReportStatus>('/admin/posts/s3/orphans/report/status',{params:{reportId}});return data}
export async function refreshAdminS3OrphanReport(){const{data}=await customAxios.post<S3OrphanReportStatus>('/admin/posts/s3/orphans/report/refresh');return data}
export async function deleteAdminS3Orphans(reportId:string,keys:string[]){const{data}=await customAxios.delete<S3OrphanDeleteResult>('/admin/posts/s3/orphans',{data:{reportId,keys,confirmed:true}});return data}
