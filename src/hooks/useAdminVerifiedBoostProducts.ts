import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/adminVerifiedBoostProductApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminVerifiedBoostProductErrorResponse,
  VerifiedBoostProduct,
  VerifiedBoostProductCreateRequest,
} from '../types/adminVerifiedBoostProduct.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': '인증 부스트 상품을 찾을 수 없습니다.',
  conflict: '현재 상품 상태에서는 요청한 작업을 처리할 수 없습니다.',
  network: '서버에 연결할 수 없습니다.',
  'request-blocked': '서버 응답을 읽지 못했습니다.',
  timeout: '응답이 지연되고 있습니다.',
  server: '서버 오류가 발생했습니다.',
}

export function useAdminVerifiedBoostProducts() {
  const { clearAuth } = useAuth()
  const [products, setProducts] = useState<VerifiedBoostProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState<VerifiedBoostProduct | null>(null)
  const [page, setPage] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<'create' | 'status' | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const actionRef = useRef(false)

  const errorText = useCallback((error: unknown, fallback: string) => {
    if (!isApiError<AdminVerifiedBoostProductErrorResponse>(error)) return fallback
    if (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized') clearAuth()
    return getAuthErrorMessage(error, { fallbackMessage: fallback, categoryMessages: CATEGORY_MESSAGES })
  }, [clearAuth])

  const fetchProducts = useCallback(async (nextPage = 1) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await api.getAdminVerifiedBoostProducts(nextPage, 20)
      setProducts(data.products)
      setPage(data.page)
      setTotalElements(data.totalElements)
      setTotalPages(data.totalPages)
      setHasNext(data.hasNext)
      return true
    } catch (error) {
      setProducts([])
      setErrorMessage(errorText(error, '인증 부스트 상품 목록을 불러오지 못했습니다.'))
      logDebugError('관리자 인증 부스트 상품 목록 조회 실패', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [errorText])

  const fetchProduct = useCallback(async (productId: number) => {
    setIsDetailLoading(true)
    setErrorMessage('')
    try {
      const data = await api.getAdminVerifiedBoostProduct(productId)
      setSelectedProduct(data)
      return data
    } catch (error) {
      setSelectedProduct(null)
      setErrorMessage(errorText(error, '인증 부스트 상품 상세를 불러오지 못했습니다.'))
      logDebugError('관리자 인증 부스트 상품 상세 조회 실패', error)
      return null
    } finally {
      setIsDetailLoading(false)
    }
  }, [errorText])

  const createProduct = useCallback(async (request: VerifiedBoostProductCreateRequest) => {
    if (actionRef.current) return null
    actionRef.current = true
    setActiveAction('create')
    setActionErrorMessage('')
    setSuccessMessage('')
    try {
      const data = await api.createAdminVerifiedBoostProduct(request)
      setSuccessMessage('인증 부스트 상품을 등록했습니다.')
      await fetchProducts(1)
      setSelectedProduct(data)
      return data
    } catch (error) {
      setActionErrorMessage(errorText(error, '인증 부스트 상품을 등록하지 못했습니다.'))
      logDebugError('관리자 인증 부스트 상품 등록 실패', error)
      return null
    } finally {
      actionRef.current = false
      setActiveAction(null)
    }
  }, [errorText, fetchProducts])

  const changeStatus = useCallback(async (productId: number, action: 'activate' | 'deactivate') => {
    if (actionRef.current) return null
    actionRef.current = true
    setActiveAction('status')
    setActionErrorMessage('')
    setSuccessMessage('')
    try {
      const data = action === 'activate'
        ? await api.activateAdminVerifiedBoostProduct(productId)
        : await api.deactivateAdminVerifiedBoostProduct(productId)
      setSuccessMessage(action === 'activate' ? '상품을 활성화했습니다.' : '상품을 비활성화했습니다.')
      await fetchProducts(page)
      setSelectedProduct(data)
      return data
    } catch (error) {
      setActionErrorMessage(errorText(error, '상품 상태를 변경하지 못했습니다.'))
      logDebugError('관리자 인증 부스트 상품 상태 변경 실패', error)
      return null
    } finally {
      actionRef.current = false
      setActiveAction(null)
    }
  }, [errorText, fetchProducts, page])

  useEffect(() => { void fetchProducts(1) }, [fetchProducts])

  return {
    products, selectedProduct, page, totalElements, totalPages, hasNext,
    isLoading, isDetailLoading, activeAction, errorMessage, actionErrorMessage,
    successMessage, fetchProducts, fetchProduct, createProduct, changeStatus,
  }
}
