import { useCallback, useEffect, useRef, useState } from 'react'
import {
  activateMerchantReservableProduct,
  createMerchantReservableProduct,
  deactivateMerchantReservableProduct,
  getMerchantAvailabilities,
  getMerchantOwnerProfile,
  getMerchantReservableProducts,
} from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { useMerchantPlaceSelection } from '../app/providers/MerchantPlaceContext'
import { isApiError } from '../api/customAxios'
import type {
  MerchantAvailability,
  MerchantOwnerProfile,
  MerchantReservableProduct,
  MerchantReservableProductCreateRequest,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type LoadStatus = 'loading' | 'ready' | 'error'
type ProductAction = 'create' | 'activate' | 'deactivate' | null

function replaceById<T extends { id: number }>(items: T[], next: T) {
  const index = items.findIndex((item) => item.id === next.id)
  return index === -1 ? [next, ...items] : items.map((item) => (item.id === next.id ? next : item))
}

export function useMerchantReservationProducts() {
  const { clearAuth } = useAuth()
  const { selectedPlaceId, selectPlace, syncPlaces } = useMerchantPlaceSelection()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const [products, setProducts] = useState<MerchantReservableProduct[]>([])
  const [availabilities, setAvailabilities] = useState<MerchantAvailability[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sectionErrorMessage, setSectionErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeAction, setActiveAction] = useState<ProductAction>(null)
  const mountedRef = useRef(true)
  const actionRef = useRef<ProductAction>(null)
  const requestRef = useRef(0)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (error.category === 'unauthorized') clearAuth()

    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '상점주 권한이 필요합니다.',
        PLACE_NOT_FOUND: '연결된 장소 정보를 찾을 수 없습니다.',
        RESERVABLE_PRODUCT_NOT_FOUND: '예약 상품을 찾을 수 없습니다.',
      },
    })
  }, [clearAuth])

  const fetchProducts = useCallback(async () => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setIsLoading(true)
    setSectionErrorMessage('')

    const [productResult, availabilityResult] = await Promise.allSettled([
      getMerchantReservableProducts(),
      getMerchantAvailabilities(),
    ])

    if (!mountedRef.current || requestId !== requestRef.current) return false
    if (productResult.status === 'fulfilled') setProducts(productResult.value)
    if (availabilityResult.status === 'fulfilled') setAvailabilities(availabilityResult.value)

    const failures = [productResult, availabilityResult].filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )
    if (failures.length > 0) {
      failures.forEach((result) => {
        if (isApiError(result.reason) && result.reason.category === 'unauthorized') clearAuth()
        logDebugError('상점주 예약 상품 조회 실패', result.reason)
      })
      setSectionErrorMessage('일부 예약 상품 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.')
    }

    setIsLoading(false)
    return productResult.status === 'fulfilled' && availabilityResult.status === 'fulfilled'
  }, [clearAuth])

  const fetchInitialData = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')

    try {
      const nextProfile = await getMerchantOwnerProfile()
      if (!mountedRef.current) return

      setProfile(nextProfile)
      if (!syncPlaces(nextProfile.placeIds)) {
        setStatus('ready')
        return
      }

      const loaded = await fetchProducts()
      if (mountedRef.current) setStatus(loaded ? 'ready' : 'error')
    } catch (error) {
      if (!mountedRef.current) return
      setStatus('error')
      setErrorMessage(getErrorMessage(error, '예약 상품 정보를 불러오지 못했습니다.'))
      logDebugError('상점주 예약 상품 초기 조회 실패', error)
    }
  }, [fetchProducts, getErrorMessage, syncPlaces])

  useEffect(() => {
    mountedRef.current = true
    void fetchInitialData()
    return () => { mountedRef.current = false }
  }, [fetchInitialData])

  const runAction = useCallback(async <T,>(
    action: Exclude<ProductAction, null>,
    request: () => Promise<T>,
    apply: (value: T) => void,
    successText: string,
    fallbackMessage: string,
  ) => {
    if (actionRef.current) return null
    actionRef.current = action
    setActiveAction(action)
    setActionErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await request()
      if (!mountedRef.current) return null
      apply(result)
      setSuccessMessage(successText)
      return result
    } catch (error) {
      if (mountedRef.current) {
        setActionErrorMessage(getErrorMessage(error, fallbackMessage))
        logDebugError(`상점주 예약 상품 ${action} 실패`, error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setActiveAction(null)
    }
  }, [getErrorMessage])

  const createProduct = useCallback((request: MerchantReservableProductCreateRequest) => runAction(
    'create',
    () => createMerchantReservableProduct(request),
    (next) => setProducts((current) => replaceById(current, next)),
    '예약 상품을 등록했습니다.',
    '예약 상품을 등록하지 못했습니다.',
  ), [runAction])

  const setProductActive = useCallback((product: MerchantReservableProduct, active: boolean) => {
    const activeAvailabilityCount = availabilities.filter(
      (availability) => availability.productId === product.id && availability.status === 'ACTIVE',
    ).length

    if (!active && activeAvailabilityCount > 0) {
      setActionErrorMessage(`연결된 활성 예약 시간 ${activeAvailabilityCount}개를 먼저 비활성화해주세요.`)
      setSuccessMessage('')
      return Promise.resolve(null)
    }

    return runAction(
      active ? 'activate' : 'deactivate',
      () => active ? activateMerchantReservableProduct(product.id) : deactivateMerchantReservableProduct(product.id),
      (next) => setProducts((current) => replaceById(current, next)),
      active ? '예약 상품을 활성화했습니다.' : '예약 상품을 비활성화했습니다.',
      active ? '예약 상품을 활성화하지 못했습니다.' : '예약 상품을 비활성화하지 못했습니다.',
    )
  }, [availabilities, runAction])

  return {
    status,
    profile,
    selectedPlaceId,
    products,
    isLoading,
    errorMessage,
    sectionErrorMessage,
    actionErrorMessage,
    successMessage,
    activeAction,
    selectPlace,
    fetchInitialData,
    fetchProducts,
    createProduct,
    setProductActive,
  }
}
