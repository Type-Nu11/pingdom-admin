import { isApiError } from '../api/customAxios'
import type { AdminS3OrphanErrorResponse } from '../types/adminS3Orphan.types'

/** The optional-id endpoint's known absence is not the same as an arbitrary 404. */
export function isMissingLatestS3Report(error: unknown, reportId?: string) {
  if (reportId || !isApiError<AdminS3OrphanErrorResponse>(error) || error.isRefreshFailure) return false
  if (error.response?.status !== 404) return false
  const data = error.response.data
  return data?.message === '생성된 S3 고아 파일 리포트가 없습니다.'
    || data?.detail === '생성된 S3 고아 파일 리포트가 없습니다.'
}
