import customAxios from './customAxios'
import type { AdminDataQualityIssuePageResponse } from '../types/adminDataQuality.types'

const PATH = '/admin/data-quality/issues'

export async function getAdminDataQualityIssues(page = 1, limit = 20) {
  const { data } = await customAxios.get<AdminDataQualityIssuePageResponse>(PATH, {
    params: { page, limit },
  })
  return data
}
