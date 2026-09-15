import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import {
  activateMerchantAvailability,
  createMerchantAvailability,
  deactivateMerchantAvailability,
  getMerchantAvailabilities,
  getMerchantOwnerProfile,
  getMerchantReservableProducts,
  updateMerchantAvailability,
} from '../api/merchantStoreApi'
import { shouldClearAuth, getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantAvailability,
  MerchantAvailabilityUpsertRequest,
  MerchantOwnerProfile,
  MerchantReservableProduct,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useMerchantPlaceSelection } from '../app/providers/MerchantPlaceContext'
import { useAuth } from './useAuth'

type LoadStatus = 'loading' | 'ready' | 'error'
type ReservationSetupAction =
  | 'create-availability'
  | 'update-availability'
  | 'activate-availability'
  | 'deactivate-availability'
  | null

function replaceById<T extends { id: number }>(items: T[], next: T) {
  const index = items.findIndex((item) => item.id === next.id)
  return index === -1 ? [next, ...items] : items.map((item) => item.id === next.id ? next : item)
}

function sortAvailabilities(items: MerchantAvailability[]) {
  return [...items].sort((left, right) => left.startsAt.localeCompare(right.startsAt))
}

export function useMerchantReservationSetup() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const { selectedPlaceId, selectPlace: selectSharedPlace, syncPlaces } = useMerchantPlaceSelection()
  const [products, setProducts] = useState<MerchantReservableProduct[]>([])
  const [availabilities, setAvailabilities] = useState<MerchantAvailability[]>([])
  const [productStatus, setProductStatus] = useState<LoadStatus>('loading')
  const [availabilityStatus, setAvailabilityStatus] = useState<LoadStatus>('loading')
  const [productError, setProductError] = useState('')
  const [availabilityError, setAvailabilityError] = useState('')
  const [hasAvailabilityResult, setHasAvailabilityResult] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  const [successMessage, setSuccessMessage] = useState('')
  useAutoDismissMessage(successMessage, setSuccessMessage)
  const [activeAction, setActiveAction] = useState<ReservationSetupAction>(null)
  const mountedRef = useRef(true)
  const actionRef = useRef<ReservationSetupAction>(null)
  const requestRef = useRef(0)
  const productRequestRef = useRef(0)
  const initialRequestRef = useRef(0)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (shouldClearAuth(error)) clearAuth()

    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '상점주 권한이 필요합니다.',
        PLACE_NOT_FOUND: '연결된 장소 정보를 찾을 수 없습니다.',
        RESERVABLE_PRODUCT_NOT_FOUND: '예약 상품을 찾을 수 없습니다.',
        AVAILABILITY_NOT_FOUND: '예약 가능 시간을 찾을 수 없습니다.',
      },
    })
  }, [clearAuth])

  const fetchProducts = useCallback(async () => {
    if (actionRef.current) return false
    const requestId = ++productRequestRef.current
    setProductStatus('loading')
    setProductError('')
    try {
      const next = await getMerchantReservableProducts()
      if (!mountedRef.current || requestId !== productRequestRef.current) return false
      setProducts(next)
      setProductStatus('ready')
      return true
    } catch (error) {
      if (!mountedRef.current || requestId !== productRequestRef.current) return false
      setProducts([])
      setProductStatus('error')
      setProductError(getErrorMessage(error, '예약 상품을 불러오지 못했습니다.'))
      return false
    }
  }, [getErrorMessage])

  const fetchAvailabilities = useCallback(async () => {
    if (actionRef.current) return false
    const requestId = ++requestRef.current
    setAvailabilityStatus('loading')
    setAvailabilityError('')
    try {
      const next = await getMerchantAvailabilities()
      if (!mountedRef.current || requestId !== requestRef.current) return false
      setAvailabilities(sortAvailabilities(next))
      setHasAvailabilityResult(true)
      setAvailabilityStatus('ready')
      return true
    } catch (error) {
      if (!mountedRef.current || requestId !== requestRef.current) return false
      if (isApiError(error) && (shouldClearAuth(error) || error.category === 'forbidden')) {
        setAvailabilities([])
        setHasAvailabilityResult(false)
      }
      setAvailabilityStatus('error')
      setAvailabilityError(getErrorMessage(error, '예약 가능 시간을 불러오지 못했습니다.'))
      return false
    }
  }, [getErrorMessage])

  const fetchReservationSetup = useCallback(async () => {
    const results = await Promise.all([fetchProducts(), fetchAvailabilities()])
    return results.every(Boolean)
  }, [fetchProducts, fetchAvailabilities])

  const fetchInitialData = useCallback(async () => {
    if (actionRef.current) return
    const requestId = ++initialRequestRef.current
    productRequestRef.current += 1
    requestRef.current += 1
    setStatus('loading')
    setErrorMessage('')
    try {
      const nextProfile = await getMerchantOwnerProfile()
      if (!mountedRef.current || requestId !== initialRequestRef.current) return
      setProfile(nextProfile)
      if (!syncPlaces(nextProfile.placeIds)) {
        setProductError('')
        setAvailabilityError('')
        setProducts([])
        setAvailabilities([])
        setHasAvailabilityResult(false)
        setProductStatus('ready')
        setAvailabilityStatus('ready')
        setStatus('ready')
        return
      }
      void fetchReservationSetup()
      setStatus('ready')
    } catch (error) {
      if (!mountedRef.current || requestId !== initialRequestRef.current) return
      setProfile(null)
      setStatus('error')
      setErrorMessage(getErrorMessage(error, '예약 운영 정보를 불러오지 못했습니다.'))
      logDebugError('상점주 예약 운영 초기 조회 실패', error)
    }
  }, [fetchReservationSetup, getErrorMessage, syncPlaces])

  useEffect(() => {
    mountedRef.current = true
    void fetchInitialData()
    return () => {
      mountedRef.current = false
      initialRequestRef.current += 1
      productRequestRef.current += 1
      requestRef.current += 1
    }
  }, [fetchInitialData])

  const selectPlace = useCallback((placeId: number) => {
    if (!profile?.placeIds.includes(placeId) || placeId === selectedPlaceId) return
    selectSharedPlace(placeId)
  }, [profile?.placeIds, selectSharedPlace, selectedPlaceId])

  const runAction = useCallback(async <T,>(
    action: Exclude<ReservationSetupAction, null>,
    request: () => Promise<T>,
    apply: (value: T) => void,
    successText: string,
    fallbackMessage: string,
  ) => {
    if (actionRef.current || status !== 'ready' || productStatus !== 'ready' || availabilityStatus !== 'ready') return null
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
        logDebugError(`상점주 예약 운영 ${action} 실패`, error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setActiveAction(null)
    }
  }, [getErrorMessage, status, productStatus, availabilityStatus])

  const createAvailability = useCallback((request: MerchantAvailabilityUpsertRequest) => runAction(
    'create-availability',
    () => createMerchantAvailability(request),
    (next) => setAvailabilities((current) => sortAvailabilities(replaceById(current, next))),
    '예약 가능 시간을 등록했습니다.',
    '예약 가능 시간을 등록하지 못했습니다.',
  ), [runAction])

  const saveAvailability = useCallback((availabilityId: number, request: MerchantAvailabilityUpsertRequest) => runAction(
    'update-availability',
    () => updateMerchantAvailability(availabilityId, request),
    (next) => setAvailabilities((current) => sortAvailabilities(replaceById(current, next))),
    '예약 가능 시간을 저장했습니다.',
    '예약 가능 시간을 저장하지 못했습니다.',
  ), [runAction])

  const setAvailabilityActive = useCallback((availability: MerchantAvailability, active: boolean) => runAction(
    active ? 'activate-availability' : 'deactivate-availability',
    () => active ? activateMerchantAvailability(availability.id) : deactivateMerchantAvailability(availability.id),
    (next) => setAvailabilities((current) => sortAvailabilities(replaceById(current, next))),
    active ? '예약 가능 시간을 활성화했습니다.' : '예약 가능 시간을 비활성화했습니다.',
    active ? '예약 가능 시간을 활성화하지 못했습니다.' : '예약 가능 시간을 비활성화하지 못했습니다.',
  ), [runAction])

  return {
    status,
    profile,
    selectedPlaceId,
    products,
    availabilities,
    isLoading: productStatus === 'loading' || availabilityStatus === 'loading',
    productStatus,
    availabilityStatus,
    productError,
    availabilityError,
    hasAvailabilityResult,
    errorMessage,
    actionErrorMessage,
    successMessage,
    activeAction,
    selectPlace,
    fetchInitialData,
    fetchReservationSetup,
    fetchProducts,
    fetchAvailabilities,
    createAvailability,
    saveAvailability,
    setAvailabilityActive,
  }
}
