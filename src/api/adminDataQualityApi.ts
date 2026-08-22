import customAxios from './customAxios'
import type { AdminDataQualityIssue } from '../types/adminDataQuality.types'

const PATH = '/admin/data-quality/issues'

export async function getAdminDataQualityIssues() {
  const { data } = await customAxios.get<AdminDataQualityIssue[]>(PATH)
  return data
}
