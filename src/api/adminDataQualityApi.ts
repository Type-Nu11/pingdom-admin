import customAxios from './customAxios'
import type {
  AdminDataQualityIssuePageResponse,
} from '../types/adminDataQuality.types'

const PATH = '/admin/data-quality/issues'

export async function getAdminDataQualityIssues(page = 1, limit = 20) {
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('데이터 품질 조회 페이지와 크기를 확인해주세요.')
  }
  const { data } = await customAxios.get<AdminDataQualityIssuePageResponse>(PATH, {
    params: { page, limit },
  })
  // The server returns one page object, never a legacy array. Do not invent totals.
  if (!data || Array.isArray(data) || !Array.isArray(data.items)
    || data.page !== page || data.limit !== limit
    || !Number.isSafeInteger(data.total) || data.total < 0
    || !Number.isSafeInteger(data.totalPages) || data.totalPages < 0
    || data.totalPages !== Math.ceil(data.total / data.limit)
    || typeof data.hasNext !== 'boolean' || data.hasNext !== (data.page < data.totalPages)
    || data.items.length > data.limit || data.items.length > data.total
    || data.items.length !== Math.max(0, Math.min(data.limit, data.total - (data.page - 1) * data.limit))
    || data.items.some(item => !item || typeof item.entityType !== 'string' || !item.entityType.trim()
      || !Number.isSafeInteger(item.entityId) || item.entityId < 1
      || typeof item.ruleCode !== 'string' || !item.ruleCode.trim()
      || !['INFO', 'WARNING', 'ERROR'].includes(item.severity) || item.status !== 'OPEN'
      || (item.details !== null && typeof item.details !== 'string') || typeof item.detectedAt !== 'string')) {
    throw new Error('데이터 품질 이슈 응답 형식을 확인할 수 없습니다.')
  }
  return data
}
