import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import {
  getMerchantPayments,
  getMerchantSettlementLedger,
  refundMerchantPayment,
} from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantPayment,
  MerchantPaymentPageResponse,
  MerchantSettlementLedgerEntry,
  MerchantSettlementLedgerPageResponse,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const PAGE_LIMIT = 20

function replacePayment(items: MerchantPayment[], next: MerchantPayment) {
  return items.map((item) => (item.id === next.id ? next : item))
}

export function useMerchantPayments() {
  const { clearAuth } = useAuth()
  const [payments, setPayments] = useState<MerchantPayment[]>([])
  const [paymentPageInfo, setPaymentPageInfo] = useState<Omit<MerchantPaymentPageResponse, 'payments'>>({
    page: 1,
    limit: PAGE_LIMIT,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
  })
  const [settlements, setSettlements] = useState<MerchantSettlementLedgerEntry[]>([])
  const [settlementPageInfo, setSettlementPageInfo] = useState<Omit<MerchantSettlementLedgerPageResponse, 'entries'>>({
    page: 1,
    limit: PAGE_LIMIT,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
  })
  const [hasLoadedPayments, setHasLoadedPayments] = useState(false)
  const [hasLoadedSettlements, setHasLoadedSettlements] = useState(false)
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(false)
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('')
  const [settlementErrorMessage, setSettlementErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  const [successMessage, setSuccessMessage] = useState('')
  useAutoDismissMessage(successMessage, setSuccessMessage)
  const [refundingPaymentId, setRefundingPaymentId] = useState<number | null>(null)
  const mountedRef = useRef(true)
  const paymentRequestRef = useRef(0)
  const settlementRequestRef = useRef(0)
  const refundingRef = useRef<number | null>(null)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (error.category === 'unauthorized') clearAuth()

    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '상점주 권한이 필요합니다.',
        PAYMENT_NOT_FOUND: '결제 정보를 찾을 수 없습니다.',
        INVALID_PAYMENT_STATUS: '현재 상태에서는 환불할 수 없습니다.',
      },
    })
  }, [clearAuth])

  const fetchPayments = useCallback(async (page = 1) => {
    const requestId = paymentRequestRef.current + 1
    paymentRequestRef.current = requestId
    setIsLoadingPayments(true)
    setPaymentErrorMessage('')

    try {
      const data = await getMerchantPayments(page, PAGE_LIMIT)
      if (!mountedRef.current || requestId !== paymentRequestRef.current) return

      setPayments(data.payments)
      setPaymentPageInfo({
        page: data.page,
        limit: data.limit,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        hasNext: data.hasNext,
      })
    } catch (error) {
      if (!mountedRef.current || requestId !== paymentRequestRef.current) return

      setPaymentErrorMessage(getErrorMessage(error, '결제 목록을 불러오지 못했습니다.'))
      logDebugError('상점주 결제 목록 조회 실패', error)
    } finally {
      if (mountedRef.current && requestId === paymentRequestRef.current) {
        setHasLoadedPayments(true)
        setIsLoadingPayments(false)
      }
    }
  }, [getErrorMessage])

  const fetchSettlements = useCallback(async (page = 1) => {
    const requestId = settlementRequestRef.current + 1
    settlementRequestRef.current = requestId
    setIsLoadingSettlements(true)
    setSettlementErrorMessage('')

    try {
      const data = await getMerchantSettlementLedger(page, PAGE_LIMIT)
      if (!mountedRef.current || requestId !== settlementRequestRef.current) return

      setSettlements(data.entries)
      setSettlementPageInfo({
        page: data.page,
        limit: data.limit,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        hasNext: data.hasNext,
      })
    } catch (error) {
      if (!mountedRef.current || requestId !== settlementRequestRef.current) return

      setSettlementErrorMessage(getErrorMessage(error, '정산 원장을 불러오지 못했습니다.'))
      logDebugError('상점주 정산 원장 조회 실패', error)
    } finally {
      if (mountedRef.current && requestId === settlementRequestRef.current) {
        setHasLoadedSettlements(true)
        setIsLoadingSettlements(false)
      }
    }
  }, [getErrorMessage])

  useEffect(() => {
    mountedRef.current = true
    void fetchPayments(1)
    void fetchSettlements(1)

    return () => {
      mountedRef.current = false
    }
  }, [fetchPayments, fetchSettlements])

  const refundPayment = useCallback(async (payment: MerchantPayment) => {
    if (payment.status !== 'PAID' || refundingRef.current !== null) return null

    refundingRef.current = payment.id
    setRefundingPaymentId(payment.id)
    setActionErrorMessage('')
    setSuccessMessage('')

    try {
      const next = await refundMerchantPayment(payment.id)
      if (!mountedRef.current) return null

      setPayments((items) => replacePayment(items, next))
      setSuccessMessage('결제를 전액 환불했습니다.')
      void fetchSettlements(settlementPageInfo.page)
      return next
    } catch (error) {
      if (mountedRef.current) {
        setActionErrorMessage(getErrorMessage(error, '결제를 환불하지 못했습니다.'))
        logDebugError('상점주 결제 환불 실패', error)
      }
      return null
    } finally {
      refundingRef.current = null
      if (mountedRef.current) setRefundingPaymentId(null)
    }
  }, [fetchSettlements, getErrorMessage, settlementPageInfo.page])

  return {
    payments,
    paymentPageInfo,
    settlements,
    settlementPageInfo,
    hasLoadedPayments,
    hasLoadedSettlements,
    isLoadingPayments,
    isLoadingSettlements,
    paymentErrorMessage,
    settlementErrorMessage,
    actionErrorMessage,
    successMessage,
    refundingPaymentId,
    fetchPayments,
    fetchSettlements,
    refundPayment,
  }
}
