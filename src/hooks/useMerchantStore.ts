import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getMerchantCampaigns,
  getMerchantOffers,
  getMerchantOperatingNotices,
  getMerchantOwnerProfile,
  getMerchantPerformance,
  getMerchantPlaceInformation,
  getMerchantReservableProducts,
  updateMerchantPlaceInformation,
} from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantCampaign,
  MerchantOffer,
  MerchantOperatingNotice,
  MerchantOwnerProfile,
  MerchantPerformance,
  MerchantPlaceInformation,
  MerchantPlaceInformationUpdateRequest,
  MerchantReservableProduct,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type MerchantStoreLoadState = 'loading' | 'ready' | 'error'

function getMerchantStoreErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isApiError<MerchantStoreErrorResponse>(error)) {
    return fallbackMessage
  }

  return getAuthErrorMessage(error, {
    fallbackMessage,
    codeMessages: {
      INVALID_TOKEN: '로그인이 만료되었습니다. 다시 로그인해주세요.',
      ACCESS_DENIED: '상점주 권한이 필요합니다.',
      PLACE_NOT_FOUND: '연결된 장소 정보를 찾을 수 없습니다.',
    },
  })
}

function isMissingPlaceInformation(error: unknown) {
  return (
    isApiError<MerchantStoreErrorResponse>(error) &&
    error.response?.data?.code === 'PLACE_INFORMATION_NOT_FOUND'
  )
}

function emptyOptionalValue(value: string) {
  const trimmed = value.trim()
  return trimmed || null
}

export function useMerchantStore() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<MerchantStoreLoadState>('loading')
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const [performance, setPerformance] = useState<MerchantPerformance | null>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null)
  const [placeInformation, setPlaceInformation] = useState<MerchantPlaceInformation | null>(null)
  const [campaigns, setCampaigns] = useState<MerchantCampaign[]>([])
  const [offers, setOffers] = useState<MerchantOffer[]>([])
  const [operatingNotices, setOperatingNotices] = useState<MerchantOperatingNotice[]>([])
  const [reservableProducts, setReservableProducts] = useState<MerchantReservableProduct[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [sectionErrorMessage, setSectionErrorMessage] = useState('')
  const [performanceErrorMessage, setPerformanceErrorMessage] = useState('')
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false)
  const [isSavingInformation, setIsSavingInformation] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const mountedRef = useRef(true)
  const saveInFlightRef = useRef(false)

  const clearUnauthorizedSession = useCallback(
    (error: unknown) => {
      if (isApiError<MerchantStoreErrorResponse>(error) && error.category === 'unauthorized') {
        clearAuth()
      }
    },
    [clearAuth]
  )

  const fetchPerformance = useCallback(async () => {
    setIsLoadingPerformance(true)
    setPerformanceErrorMessage('')

    try {
      const nextPerformance = await getMerchantPerformance()
      if (!mountedRef.current) return

      setPerformance(nextPerformance)
    } catch (error) {
      if (!mountedRef.current) return

      clearUnauthorizedSession(error)
      setPerformanceErrorMessage(
        getMerchantStoreErrorMessage(error, '성과 요약을 불러오지 못했습니다.')
      )
      logDebugError('상점주 성과 요약 조회 실패', error)
    } finally {
      if (mountedRef.current) {
        setIsLoadingPerformance(false)
      }
    }
  }, [clearUnauthorizedSession])

  const fetchStore = useCallback(async () => {
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'))
    setErrorMessage('')
    setSectionErrorMessage('')

    try {
      const nextProfile = await getMerchantOwnerProfile()
      if (!mountedRef.current) return

      setProfile(nextProfile)
      setSelectedPlaceId((current) =>
        current && nextProfile.placeIds.includes(current) ? current : (nextProfile.placeIds[0] ?? null)
      )
      setStatus('ready')
      void fetchPerformance()
    } catch (error) {
      if (!mountedRef.current) return

      clearUnauthorizedSession(error)
      setStatus('error')
      setErrorMessage(getMerchantStoreErrorMessage(error, '내 가게 정보를 불러오지 못했습니다.'))
      logDebugError('상점주 프로필 조회 실패', error)
    }
  }, [clearUnauthorizedSession, fetchPerformance])

  const fetchPlaceData = useCallback(
    async (placeId: number) => {
      setPlaceInformation(null)
      setCampaigns([])
      setOffers([])
      setOperatingNotices([])
      setReservableProducts([])
      setSectionErrorMessage('')

      const [informationResult, campaignsResult, offersResult, productsResult, noticesResult] = await Promise.allSettled([
        getMerchantPlaceInformation(placeId),
        getMerchantCampaigns(),
        getMerchantOffers(),
        getMerchantReservableProducts(),
        getMerchantOperatingNotices(placeId),
      ])

      if (!mountedRef.current) return

      const failures = [informationResult, campaignsResult, offersResult, productsResult, noticesResult].filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected' && !isMissingPlaceInformation(result.reason)
      )

      if (informationResult.status === 'fulfilled') {
        setPlaceInformation(informationResult.value)
      }
      if (campaignsResult.status === 'fulfilled') {
        setCampaigns(campaignsResult.value.items.filter((campaign) => campaign.placeId === placeId))
      }
      if (offersResult.status === 'fulfilled') {
        setOffers(offersResult.value.offers.filter((offer) => offer.placeId === placeId))
      }
      if (productsResult.status === 'fulfilled') {
        setReservableProducts(productsResult.value.filter((product) => product.placeId === placeId))
      }
      if (noticesResult.status === 'fulfilled') {
        setOperatingNotices(noticesResult.value.notices)
      }

      if (failures.length > 0) {
        failures.forEach((result) => {
          clearUnauthorizedSession(result.reason)
          logDebugError('상점주 가게 데이터 조회 실패', result.reason)
        })
        setSectionErrorMessage('일부 가게 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      }
    },
    [clearUnauthorizedSession]
  )

  useEffect(() => {
    mountedRef.current = true
    void fetchStore()

    return () => {
      mountedRef.current = false
    }
  }, [fetchStore])

  useEffect(() => {
    if (selectedPlaceId) {
      void fetchPlaceData(selectedPlaceId)
    }
  }, [fetchPlaceData, selectedPlaceId])

  const saveInformation = useCallback(
    async (values: {
      description: string
      contactPhone: string
      websiteUrl: string
      reservationUrl: string
    }) => {
      if (!selectedPlaceId || saveInFlightRef.current) return false

      saveInFlightRef.current = true
      setIsSavingInformation(true)
      setSuccessMessage('')
      setSectionErrorMessage('')

      const request: MerchantPlaceInformationUpdateRequest = {
        description: emptyOptionalValue(values.description),
        contactPhone: emptyOptionalValue(values.contactPhone),
        websiteUrl: emptyOptionalValue(values.websiteUrl),
        reservationUrl: emptyOptionalValue(values.reservationUrl),
      }

      try {
        const nextInformation = await updateMerchantPlaceInformation(selectedPlaceId, request)
        if (!mountedRef.current) return false

        setPlaceInformation(nextInformation)
        setSuccessMessage('가게 정보를 저장했습니다.')
        return true
      } catch (error) {
        if (mountedRef.current) {
          clearUnauthorizedSession(error)
          setSectionErrorMessage(
            getMerchantStoreErrorMessage(error, '가게 정보를 저장하지 못했습니다.')
          )
          logDebugError('상점주 가게 정보 저장 실패', error)
        }
        return false
      } finally {
        saveInFlightRef.current = false
        if (mountedRef.current) {
          setIsSavingInformation(false)
        }
      }
    },
    [clearUnauthorizedSession, selectedPlaceId]
  )

  return {
    status,
    profile,
    performance,
    selectedPlaceId,
    placeInformation,
    campaigns,
    offers,
    operatingNotices,
    reservableProducts,
    errorMessage,
    sectionErrorMessage,
    performanceErrorMessage,
    isLoadingPerformance,
    successMessage,
    isSavingInformation,
    selectPlace: setSelectedPlaceId,
    fetchStore,
    fetchPerformance,
    fetchPlaceData,
    saveInformation,
  }
}
