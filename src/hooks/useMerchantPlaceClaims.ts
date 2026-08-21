import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelMerchantPlaceClaim,
  createMerchantPlaceClaim,
  deleteMerchantPlaceClaimAttachment,
  getMerchantPlaceClaim,
  getMerchantPlaceClaimAttachments,
  getMerchantPlaceClaims,
  reorderMerchantPlaceClaimAttachments,
  uploadMerchantPlaceClaimAttachment,
} from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantPlaceClaim,
  MerchantPlaceClaimAttachment,
  MerchantPlaceClaimCreateRequest,
  MerchantPlaceClaimDocumentType,
  MerchantPlaceClaimPageResponse,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type LoadStatus = 'loading' | 'ready' | 'error'
type Action = 'create' | 'cancel' | 'upload' | 'delete-attachment' | 'reorder' | null

const PAGE_LIMIT = 20

function replaceClaim(claims: MerchantPlaceClaim[], next: MerchantPlaceClaim) {
  const index = claims.findIndex((claim) => claim.id === next.id)
  return index === -1 ? [next, ...claims] : claims.map((claim) => (claim.id === next.id ? next : claim))
}

export function useMerchantPlaceClaims() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [claims, setClaims] = useState<MerchantPlaceClaim[]>([])
  const [selectedClaim, setSelectedClaim] = useState<MerchantPlaceClaim | null>(null)
  const [attachments, setAttachments] = useState<MerchantPlaceClaimAttachment[]>([])
  const [pageInfo, setPageInfo] = useState<Omit<MerchantPlaceClaimPageResponse, 'claims'>>({
    page: 1, limit: PAGE_LIMIT, totalElements: 0, totalPages: 0, hasNext: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sectionErrorMessage, setSectionErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeAction, setActiveAction] = useState<Action>(null)
  const mountedRef = useRef(true)
  const listRequestRef = useRef(0)
  const detailRequestRef = useRef(0)
  const actionRef = useRef<Action>(null)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (error.category === 'unauthorized') clearAuth()
    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '상점주 권한이 필요합니다.',
        MERCHANT_PLACE_CLAIM_NOT_FOUND: '장소 Claim 요청을 찾을 수 없습니다.',
        INVALID_MERCHANT_PLACE_CLAIM_STATUS: '현재 상태에서는 이 작업을 할 수 없습니다.',
      },
    })
  }, [clearAuth])

  const fetchClaims = useCallback(async (page = 1, initial = false) => {
    const requestId = listRequestRef.current + 1
    listRequestRef.current = requestId
    if (initial) setStatus('loading')
    setIsLoading(true)
    setErrorMessage('')
    setSectionErrorMessage('')
    try {
      const data = await getMerchantPlaceClaims(page, PAGE_LIMIT)
      if (!mountedRef.current || requestId !== listRequestRef.current) return
      setClaims(data.claims)
      setPageInfo({
        page: data.page,
        limit: data.limit,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        hasNext: data.hasNext,
      })
      setStatus('ready')
    } catch (error) {
      if (!mountedRef.current || requestId !== listRequestRef.current) return
      const nextMessage = getErrorMessage(error, '장소 Claim 내역을 불러오지 못했습니다.')
      if (initial) {
        setStatus('error')
        setErrorMessage(nextMessage)
      } else {
        setSectionErrorMessage(nextMessage)
      }
      logDebugError('상점주 장소 Claim 목록 조회 실패', error)
    } finally {
      if (mountedRef.current && requestId === listRequestRef.current) setIsLoading(false)
    }
  }, [getErrorMessage])

  const fetchClaimDetail = useCallback(async (claimId: number) => {
    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId
    setIsDetailLoading(true)
    setActionErrorMessage('')
    try {
      const [claim, nextAttachments] = await Promise.all([
        getMerchantPlaceClaim(claimId),
        getMerchantPlaceClaimAttachments(claimId),
      ])
      if (!mountedRef.current || requestId !== detailRequestRef.current) return
      setSelectedClaim(claim)
      setAttachments([...nextAttachments].sort((a, b) => a.displayOrder - b.displayOrder))
      setClaims((items) => replaceClaim(items, claim))
    } catch (error) {
      if (!mountedRef.current || requestId !== detailRequestRef.current) return
      setActionErrorMessage(getErrorMessage(error, '장소 Claim 상세를 불러오지 못했습니다.'))
      logDebugError('상점주 장소 Claim 상세 조회 실패', error)
    } finally {
      if (mountedRef.current && requestId === detailRequestRef.current) setIsDetailLoading(false)
    }
  }, [getErrorMessage])

  useEffect(() => {
    mountedRef.current = true
    void fetchClaims(1, true)
    return () => { mountedRef.current = false }
  }, [fetchClaims])

  const runAction = useCallback(async <T,>(
    action: Exclude<Action, null>,
    task: () => Promise<T>,
    apply: (result: T) => void,
    success: string,
    fallback: string,
  ) => {
    if (actionRef.current !== null) return null
    actionRef.current = action
    setActiveAction(action)
    setActionErrorMessage('')
    setSuccessMessage('')
    try {
      const result = await task()
      if (!mountedRef.current) return null
      apply(result)
      setSuccessMessage(success)
      return result
    } catch (error) {
      if (mountedRef.current) {
        setActionErrorMessage(getErrorMessage(error, fallback))
        logDebugError(`상점주 장소 Claim ${action} 실패`, error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setActiveAction(null)
    }
  }, [getErrorMessage])

  const createClaim = useCallback((request: MerchantPlaceClaimCreateRequest) => runAction(
    'create',
    () => createMerchantPlaceClaim(request),
    (next) => {
      setSelectedClaim(next)
      setAttachments([])
      if (pageInfo.page === 1) setClaims((items) => replaceClaim(items, next))
      setPageInfo((current) => ({ ...current, totalElements: current.totalElements + 1 }))
    },
    '장소 Claim 요청을 등록했습니다. 증빙 파일을 추가한 뒤 심사 결과를 확인해주세요.',
    '장소 Claim 요청을 등록하지 못했습니다.',
  ), [pageInfo.page, runAction])

  const cancelClaim = useCallback((claim: MerchantPlaceClaim) => {
    if (claim.status !== 'PENDING') return Promise.resolve(null)
    return runAction(
      'cancel',
      () => cancelMerchantPlaceClaim(claim.id),
      (next) => {
        setSelectedClaim(next)
        setClaims((items) => replaceClaim(items, next))
      },
      '장소 Claim 요청을 취소했습니다.',
      '장소 Claim 요청을 취소하지 못했습니다.',
    )
  }, [runAction])

  const uploadAttachment = useCallback((
    claim: MerchantPlaceClaim,
    documentType: MerchantPlaceClaimDocumentType,
    file: File,
  ) => {
    if (claim.status !== 'PENDING') return Promise.resolve(null)
    return runAction(
      'upload',
      () => uploadMerchantPlaceClaimAttachment(claim.id, documentType, file),
      (next) => setAttachments((items) => [...items, next].sort((a, b) => a.displayOrder - b.displayOrder)),
      '증빙 파일을 추가했습니다.',
      '증빙 파일을 추가하지 못했습니다.',
    )
  }, [runAction])

  const deleteAttachment = useCallback((claim: MerchantPlaceClaim, attachmentId: number) => {
    if (claim.status !== 'PENDING') return Promise.resolve(null)
    return runAction(
      'delete-attachment',
      () => deleteMerchantPlaceClaimAttachment(claim.id, attachmentId),
      () => setAttachments((items) => items.filter((attachment) => attachment.id !== attachmentId)),
      '증빙 파일을 삭제했습니다.',
      '증빙 파일을 삭제하지 못했습니다.',
    )
  }, [runAction])

  const reorderAttachments = useCallback((claim: MerchantPlaceClaim, attachmentIds: number[]) => {
    if (claim.status !== 'PENDING') return Promise.resolve(null)
    return runAction(
      'reorder',
      () => reorderMerchantPlaceClaimAttachments(claim.id, attachmentIds),
      () => setAttachments((items) => attachmentIds.map((id, index) => {
        const item = items.find((attachment) => attachment.id === id)
        return item ? { ...item, displayOrder: index } : null
      }).filter((item): item is MerchantPlaceClaimAttachment => item !== null)),
      '증빙 파일 순서를 변경했습니다.',
      '증빙 파일 순서를 변경하지 못했습니다.',
    )
  }, [runAction])

  return {
    status, claims, selectedClaim, attachments, pageInfo, isLoading, isDetailLoading,
    errorMessage, sectionErrorMessage, actionErrorMessage, successMessage, activeAction,
    fetchClaims, fetchClaimDetail, createClaim, cancelClaim, uploadAttachment, deleteAttachment,
    reorderAttachments,
  }
}
