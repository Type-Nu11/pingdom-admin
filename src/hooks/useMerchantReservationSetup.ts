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
import { getAuthErrorMessage } from '../api/authError'
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
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sectionErrorMessage, setSectionErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  const [successMessage, setSuccessMessage] = useState('')
  useAutoDismissMessage(successMessage, setSuccessMessage)
  const [activeAction, setActiveAction] = useState<ReservationSetupAction>(null)
  const mountedRef = useRef(true)
  const actionRef = useRef<ReservationSetupAction>(null)
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
        AVAILABILITY_NOT_FOUND: '예약 가능 시간을 찾을 수 없습니다.',
      },
    })
  }, [clearAuth])

  const fetchReservationSetup = useCallback(async () => {
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
    if (availabilityResult.status === 'fulfilled') setAvailabilities(sortAvailabilities(availabilityResult.value))

    const failures = [productResult, availabilityResult].filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )
    if (failures.length > 0) {
      failures.forEach((result) => {
        if (isApiError(result.reason) && result.reason.category === 'unauthorized') clearAuth()
        logDebugError('상점주 예약 운영 정보 조회 실패', result.reason)
      })
      setSectionErrorMessage('일부 예약 운영 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.')
    }

    setIsLoading(false)
    return availabilityResult.status === 'fulfilled'
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
      const loaded = await fetchReservationSetup()
      if (mountedRef.current) setStatus(loaded ? 'ready' : 'error')
    } catch (error) {
      if (!mountedRef.current) return
      setStatus('error')
      setErrorMessage(getErrorMessage(error, '예약 운영 정보를 불러오지 못했습니다.'))
      logDebugError('상점주 예약 운영 초기 조회 실패', error)
    }
  }, [fetchReservationSetup, getErrorMessage, syncPlaces])

  useEffect(() => {
    mountedRef.current = true
    void fetchInitialData()
    return () => { mountedRef.current = false }
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
        logDebugError(`상점주 예약 운영 ${action} 실패`, error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setActiveAction(null)
    }
  }, [getErrorMessage])

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
    isLoading,
    errorMessage,
    sectionErrorMessage,
    actionErrorMessage,
    successMessage,
    activeAction,
    selectPlace,
    fetchInitialData,
    fetchReservationSetup,
    createAvailability,
    saveAvailability,
    setAvailabilityActive,
  }
}
