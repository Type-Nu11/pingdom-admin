import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/adminMerchantPlaceApplicationApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminMerchantPlaceApplication,
  AdminMerchantPlaceApplicationAttachment,
  AdminMerchantPlaceApplicationErrorResponse,
  AdminMerchantPlaceApplicationListItem,
} from '../types/adminMerchantPlaceApplication.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': '장소 신청을 찾을 수 없습니다.',
  conflict: '다른 관리자가 먼저 처리했습니다. 목록을 새로고침해주세요.',
  network: '서버에 연결할 수 없습니다.',
  'request-blocked': '서버 응답을 읽지 못했습니다.',
  timeout: '응답이 지연되고 있습니다.',
  server: '서버 오류가 발생했습니다.',
} as const

export function useAdminMerchantPlaceApplications() {
  const { clearAuth } = useAuth()
  const [items, setItems] = useState<AdminMerchantPlaceApplicationListItem[]>([])
  const [detail, setDetail] = useState<AdminMerchantPlaceApplication | null>(null)
  const [attachments, setAttachments] = useState<AdminMerchantPlaceApplicationAttachment[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [attachmentErrorMessage, setAttachmentErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const reviewRef = useRef(false)
  const pageRef = useRef(1)
  const detailRequestRef = useRef(0)

  const message = useCallback((error: unknown, fallback: string) => {
    if (!isApiError<AdminMerchantPlaceApplicationErrorResponse>(error)) return fallback
    if (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized') clearAuth()
    return getAuthErrorMessage(error, { fallbackMessage: fallback, categoryMessages: CATEGORY_MESSAGES })
  }, [clearAuth])

  const fetchApplications = useCallback(async (nextPage = pageRef.current) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await api.getAdminMerchantPlaceApplications({ status: 'PENDING', page: nextPage, limit: 10 })
      setItems(data.items)
      setPage(data.page)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setHasNext(data.hasNext)
      pageRef.current = data.page
      return true
    } catch (error) {
      setErrorMessage(message(error, '장소 신청 목록을 불러오지 못했습니다.'))
      logDebugError('관리자 Merchant 장소 신청 목록 조회 실패', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [message])

  const fetchDetail = useCallback(async (applicationId: number) => {
    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId
    setIsDetailLoading(true)
    setDetailErrorMessage('')
    setAttachmentErrorMessage('')
    try {
      const [applicationResult, attachmentResult] = await Promise.allSettled([
        api.getAdminMerchantPlaceApplication(applicationId),
        api.getAdminMerchantPlaceApplicationAttachments(applicationId),
      ])
      if (applicationResult.status === 'rejected') throw applicationResult.reason
      if (requestId !== detailRequestRef.current) return null

      setDetail(applicationResult.value)
      setAttachments(
        attachmentResult.status === 'fulfilled'
          ? attachmentResult.value
          : applicationResult.value.attachments,
      )
      if (attachmentResult.status === 'rejected') {
        setAttachmentErrorMessage(message(attachmentResult.reason, '첨부파일 목록을 불러오지 못했습니다.'))
        logDebugError('관리자 Merchant 장소 신청 첨부파일 목록 조회 실패', attachmentResult.reason)
      }
      return applicationResult.value
    } catch (error) {
      if (requestId !== detailRequestRef.current) return null

      setDetail(null)
      setAttachments([])
      setDetailErrorMessage(message(error, '장소 신청 상세를 불러오지 못했습니다.'))
      logDebugError('관리자 Merchant 장소 신청 상세 조회 실패', error)
      return null
    } finally {
      if (requestId === detailRequestRef.current) setIsDetailLoading(false)
    }
  }, [message])

  const downloadAttachment = useCallback(async (
    applicationId: number,
    attachment: AdminMerchantPlaceApplicationAttachment,
  ) => {
    if (downloadingAttachmentId !== null) return false
    setDownloadingAttachmentId(attachment.id)
    setActionErrorMessage('')
    try {
      const file = await api.downloadAdminMerchantPlaceApplicationAttachment(applicationId, attachment.id)
      const href = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = href
      link.download = attachment.originalFilename || `application-${applicationId}-attachment-${attachment.id}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(href)
      return true
    } catch (error) {
      setActionErrorMessage(message(error, '첨부파일을 다운로드하지 못했습니다.'))
      logDebugError('관리자 Merchant 장소 신청 첨부파일 다운로드 실패', error)
      return false
    } finally {
      setDownloadingAttachmentId(null)
    }
  }, [downloadingAttachmentId, message])

  const review = useCallback(async (approved: boolean, reason: string) => {
    if (!detail || reviewRef.current) return null
    reviewRef.current = true
    setIsReviewing(true)
    setActionErrorMessage('')
    setSuccessMessage('')
    try {
      const reviewed = approved
        ? await api.approveAdminMerchantPlaceApplication(detail.id, { reviewedVersion: detail.version, reason })
        : await api.rejectAdminMerchantPlaceApplication(detail.id, { reviewedVersion: detail.version, reason })
      setDetail(reviewed)
      setAttachments(reviewed.attachments)
      await fetchApplications(1)
      setSuccessMessage(approved ? '장소 신청을 승인했습니다.' : '장소 신청을 반려했습니다.')
      return reviewed
    } catch (error) {
      setActionErrorMessage(message(error, '장소 신청 심사를 처리하지 못했습니다.'))
      logDebugError('관리자 Merchant 장소 신청 심사 실패', error)
      if (isApiError(error) && error.category === 'conflict') void fetchDetail(detail.id)
      return null
    } finally {
      reviewRef.current = false
      setIsReviewing(false)
    }
  }, [detail, fetchApplications, fetchDetail, message])

  useEffect(() => { void fetchApplications(1) }, [fetchApplications])

  return {
    items,
    detail,
    attachments,
    page,
    total,
    totalPages,
    hasNext,
    isLoading,
    isDetailLoading,
    downloadingAttachmentId,
    isReviewing,
    errorMessage,
    detailErrorMessage,
    attachmentErrorMessage,
    actionErrorMessage,
    successMessage,
    fetchApplications,
    fetchDetail,
    downloadAttachment,
    review,
  }
}
