import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import {
  createMerchantVerifiedBoostSelection,
  getMerchantOwnerProfile,
  getMerchantVerifiedBoostExecutions,
  getMerchantVerifiedBoostProducts,
  getMerchantVerifiedBoostSelections,
  startMerchantVerifiedBoostExecution,
  stopMerchantVerifiedBoostExecution,
} from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantStoreErrorResponse,
  MerchantOwnerProfile,
  MerchantVerifiedBoostExecution,
  MerchantVerifiedBoostExecutionPageResponse,
  MerchantVerifiedBoostProduct,
  MerchantVerifiedBoostSelection,
  MerchantVerifiedBoostSelectionCreateRequest,
  MerchantVerifiedBoostSelectionPageResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type LoadState = 'loading' | 'ready' | 'error'
type BoostAction = 'select' | 'start' | 'stop' | null

const PAGE_LIMIT = 20
const PRODUCT_LIMIT = 100

function replaceExecution(items: MerchantVerifiedBoostExecution[], next: MerchantVerifiedBoostExecution) {
  return items.map((item) => (item.id === next.id ? next : item))
}

export function useMerchantVerifiedBoost() {
  const { clearAuth } = useAuth()
  const [selectionState, setSelectionState] = useState<LoadState>('loading')
  const [executionState, setExecutionState] = useState<LoadState>('loading')
  const [productState, setProductState] = useState<LoadState>('loading')
  const [profileState, setProfileState] = useState<LoadState>('loading')
  const [selections, setSelections] = useState<MerchantVerifiedBoostSelection[]>([])
  const [executions, setExecutions] = useState<MerchantVerifiedBoostExecution[]>([])
  const [products, setProducts] = useState<MerchantVerifiedBoostProduct[]>([])
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const [selectionPageInfo, setSelectionPageInfo] = useState<Omit<MerchantVerifiedBoostSelectionPageResponse, 'selections'>>({
    page: 1,
    limit: PAGE_LIMIT,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
  })
  const [executionPageInfo, setExecutionPageInfo] = useState<Omit<MerchantVerifiedBoostExecutionPageResponse, 'executions'>>({
    page: 1,
    limit: PAGE_LIMIT,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
  })
  const [selectionErrorMessage, setSelectionErrorMessage] = useState('')
  const [executionErrorMessage, setExecutionErrorMessage] = useState('')
  const [productErrorMessage, setProductErrorMessage] = useState('')
  const [profileErrorMessage, setProfileErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  const [successMessage, setSuccessMessage] = useState('')
  useAutoDismissMessage(successMessage, setSuccessMessage)
  const [activeAction, setActiveAction] = useState<BoostAction>(null)
  const [activeTargetId, setActiveTargetId] = useState<number | null>(null)
  const mountedRef = useRef(true)
  const selectionRequestRef = useRef(0)
  const executionRequestRef = useRef(0)
  const actionRef = useRef(false)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (error.category === 'unauthorized') clearAuth()

    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '상점주 권한이 필요합니다.',
        VERIFIED_BOOST_SELECTION_NOT_FOUND: '선택한 부스트 정보를 찾을 수 없습니다.',
        VERIFIED_BOOST_EXECUTION_NOT_FOUND: '집행 정보를 찾을 수 없습니다.',
        INVALID_VERIFIED_BOOST_EXECUTION_STATUS: '현재 상태에서는 집행을 중단할 수 없습니다.',
        PRODUCT_NOT_ACTIVE: '선택한 상품은 현재 이용할 수 없습니다.',
        PLACE_NOT_OWNED: '관리 권한이 없는 장소입니다.',
        QUALITY_GUARDRAIL_BLOCKED: '장소 운영 품질 조건을 충족한 뒤 다시 시도해주세요.',
        IDEMPOTENCY_KEY_CONFLICT: '이 선택 요청은 이미 다른 내용으로 처리되었습니다. 다시 열어 시도해주세요.',
      },
    })
  }, [clearAuth])

  const fetchSelections = useCallback(async (page = 1, initial = false) => {
    const requestId = selectionRequestRef.current + 1
    selectionRequestRef.current = requestId
    if (initial) setSelectionState('loading')
    setSelectionErrorMessage('')

    try {
      const data = await getMerchantVerifiedBoostSelections(page, PAGE_LIMIT)
      if (!mountedRef.current || requestId !== selectionRequestRef.current) return

      setSelections(data.selections)
      setSelectionPageInfo({
        page: data.page,
        limit: data.limit,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        hasNext: data.hasNext,
      })
      setSelectionState('ready')
    } catch (error) {
      if (!mountedRef.current || requestId !== selectionRequestRef.current) return

      setSelectionState('error')
      setSelectionErrorMessage(getErrorMessage(error, '선택한 부스트 목록을 불러오지 못했습니다.'))
      logDebugError('상점주 Verified Boost 선택 목록 조회 실패', error)
    }
  }, [getErrorMessage])

  const fetchExecutions = useCallback(async (page = 1, initial = false) => {
    const requestId = executionRequestRef.current + 1
    executionRequestRef.current = requestId
    if (initial) setExecutionState('loading')
    setExecutionErrorMessage('')

    try {
      const data = await getMerchantVerifiedBoostExecutions(page, PAGE_LIMIT)
      if (!mountedRef.current || requestId !== executionRequestRef.current) return

      setExecutions(data.executions)
      setExecutionPageInfo({
        page: data.page,
        limit: data.limit,
        totalCount: data.totalCount,
        totalPages: data.totalPages,
        hasNext: data.hasNext,
      })
      setExecutionState('ready')
    } catch (error) {
      if (!mountedRef.current || requestId !== executionRequestRef.current) return

      setExecutionState('error')
      setExecutionErrorMessage(getErrorMessage(error, 'Verified Boost 집행 목록을 불러오지 못했습니다.'))
      logDebugError('상점주 Verified Boost 집행 목록 조회 실패', error)
    }
  }, [getErrorMessage])

  const fetchProducts = useCallback(async (initial = false) => {
    if (initial) setProductState('loading')
    setProductErrorMessage('')

    try {
      const data = await getMerchantVerifiedBoostProducts(1, PRODUCT_LIMIT)
      if (!mountedRef.current) return

      setProducts(data.products)
      setProductState('ready')
    } catch (error) {
      if (!mountedRef.current) return

      setProductState('error')
      setProductErrorMessage(getErrorMessage(error, '선택 가능한 Verified Boost 상품을 불러오지 못했습니다.'))
      logDebugError('상점주 Verified Boost 상품 목록 조회 실패', error)
    }
  }, [getErrorMessage])

  const fetchProfile = useCallback(async (initial = false) => {
    if (initial) setProfileState('loading')
    setProfileErrorMessage('')

    try {
      const data = await getMerchantOwnerProfile()
      if (!mountedRef.current) return

      setProfile(data)
      setProfileState('ready')
    } catch (error) {
      if (!mountedRef.current) return

      setProfileState('error')
      setProfileErrorMessage(getErrorMessage(error, '관리 가능한 장소를 불러오지 못했습니다.'))
      logDebugError('상점주 Verified Boost 장소 목록 조회 실패', error)
    }
  }, [getErrorMessage])

  useEffect(() => {
    mountedRef.current = true
    void fetchSelections(1, true)
    void fetchExecutions(1, true)
    void fetchProducts(true)
    void fetchProfile(true)

    return () => {
      mountedRef.current = false
    }
  }, [fetchExecutions, fetchProducts, fetchProfile, fetchSelections])

  const createSelection = useCallback(async (request: MerchantVerifiedBoostSelectionCreateRequest) => {
    if (actionRef.current) return null

    actionRef.current = true
    setActiveAction('select')
    setActiveTargetId(null)
    setActionErrorMessage('')
    setSuccessMessage('')

    try {
      const selection = await createMerchantVerifiedBoostSelection(request)
      if (!mountedRef.current) return null

      setSuccessMessage('Verified Boost 상품을 선택했습니다. 이제 집행을 시작할 수 있습니다.')
      void fetchSelections(1)
      return selection
    } catch (error) {
      if (mountedRef.current) {
        setActionErrorMessage(getErrorMessage(error, 'Verified Boost 상품을 선택하지 못했습니다.'))
        logDebugError('상점주 Verified Boost 상품 선택 실패', error)
      }
      return null
    } finally {
      actionRef.current = false
      if (mountedRef.current) {
        setActiveAction(null)
        setActiveTargetId(null)
      }
    }
  }, [fetchSelections, getErrorMessage])

  const startExecution = useCallback(async (selection: MerchantVerifiedBoostSelection) => {
    if (actionRef.current) return false

    actionRef.current = true
    setActiveAction('start')
    setActiveTargetId(selection.id)
    setActionErrorMessage('')
    setSuccessMessage('')

    try {
      const nextExecution = await startMerchantVerifiedBoostExecution(selection.id)
      if (!mountedRef.current) return false

      setExecutions((items) => [
        nextExecution,
        ...items.filter((item) => item.id !== nextExecution.id),
      ].slice(0, PAGE_LIMIT))
      void fetchExecutions(1)

      if (nextExecution.status !== 'ACTIVE') {
        setActionErrorMessage('이 선택의 집행은 이미 종료되었거나 중단되었습니다. 새 상품 선택이 필요합니다.')
        return false
      }

      setSuccessMessage(`장소 #${selection.placeId}의 Verified Boost가 현재 집행 중입니다.`)
      return true
    } catch (error) {
      if (mountedRef.current) {
        setActionErrorMessage(getErrorMessage(error, 'Verified Boost 집행을 시작하지 못했습니다.'))
        logDebugError('상점주 Verified Boost 집행 시작 실패', error)
      }
      return false
    } finally {
      actionRef.current = false
      if (mountedRef.current) {
        setActiveAction(null)
        setActiveTargetId(null)
      }
    }
  }, [fetchExecutions, getErrorMessage])

  const stopExecution = useCallback(async (execution: MerchantVerifiedBoostExecution) => {
    if (actionRef.current) return false

    actionRef.current = true
    setActiveAction('stop')
    setActiveTargetId(execution.id)
    setActionErrorMessage('')
    setSuccessMessage('')

    try {
      const nextExecution = await stopMerchantVerifiedBoostExecution(execution.id)
      if (!mountedRef.current) return false

      setExecutions((items) => replaceExecution(items, nextExecution))
      setSuccessMessage(`장소 #${execution.placeId}의 Verified Boost 집행을 중단했습니다.`)
      return true
    } catch (error) {
      if (mountedRef.current) {
        setActionErrorMessage(getErrorMessage(error, 'Verified Boost 집행을 중단하지 못했습니다.'))
        logDebugError('상점주 Verified Boost 집행 중단 실패', error)
      }
      return false
    } finally {
      actionRef.current = false
      if (mountedRef.current) {
        setActiveAction(null)
        setActiveTargetId(null)
      }
    }
  }, [getErrorMessage])

  return {
    selectionState,
    executionState,
    productState,
    profileState,
    selections,
    executions,
    products,
    profile,
    selectionPageInfo,
    executionPageInfo,
    selectionErrorMessage,
    executionErrorMessage,
    productErrorMessage,
    profileErrorMessage,
    actionErrorMessage,
    successMessage,
    activeAction,
    activeTargetId,
    fetchSelections,
    fetchExecutions,
    fetchProducts,
    fetchProfile,
    createSelection,
    startExecution,
    stopExecution,
  }
}
