import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import {
  createMerchantPlaceMedia,
  deleteMerchantPlaceMedia,
  getMerchantOwnerProfile,
  getMerchantPlaceDetail,
  getMerchantPlaceMedia,
  getMerchantPlaceOperating,
  requestMerchantPlaceMediaUploadUrl,
  updateMerchantPlaceOperatingSchedule,
  updateMerchantPlaceOperatingStatus,
  updateMerchantPlaceMediaOrder,
  updateMerchantRepresentativeMedia,
} from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantOwnerProfile,
  MerchantPlaceDetail,
  MerchantPlaceMediaResponse,
  MerchantPlaceOperating,
  MerchantPlaceOperatingScheduleUpdateRequest,
  MerchantPlaceOperatingStatus,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useMerchantPlaceSelection } from '../app/providers/MerchantPlaceContext'
import { useAuth } from './useAuth'

type LoadStatus = 'loading' | 'ready' | 'error'
type OperationAction =
  | 'status'
  | 'schedule'
  | 'representative'
  | 'upload-media'
  | 'move-media'
  | 'delete-media'
  | null

const MAX_MEDIA_FILE_SIZE = 10 * 1024 * 1024

function sortMedia(response: MerchantPlaceMediaResponse) {
  return {
    ...response,
    media: [...response.media].sort((left, right) => left.displayOrder - right.displayOrder),
  }
}

export function useMerchantPlaceOperations() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const { selectedPlaceId, selectPlace: selectSharedPlace, syncPlaces } = useMerchantPlaceSelection()
  const [place, setPlace] = useState<MerchantPlaceDetail | null>(null)
  const [operating, setOperating] = useState<MerchantPlaceOperating | null>(null)
  const [media, setMedia] = useState<MerchantPlaceMediaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sectionErrorMessage, setSectionErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  const [successMessage, setSuccessMessage] = useState('')
  useAutoDismissMessage(successMessage, setSuccessMessage)
  const [activeAction, setActiveAction] = useState<OperationAction>(null)
  const mountedRef = useRef(true)
  const actionRef = useRef<OperationAction>(null)
  const requestRef = useRef(0)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (error.category === 'unauthorized') clearAuth()

    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '상점주 권한이 필요합니다.',
        PLACE_NOT_FOUND: '연결된 장소 정보를 찾을 수 없습니다.',
        MEDIA_NOT_FOUND: '미디어 정보를 찾을 수 없습니다.',
      },
    })
  }, [clearAuth])

  const fetchPlaceOperations = useCallback(async (placeId: number) => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setIsLoading(true)
    setSectionErrorMessage('')

    const [placeResult, operatingResult, mediaResult] = await Promise.allSettled([
      getMerchantPlaceDetail(placeId),
      getMerchantPlaceOperating(placeId),
      getMerchantPlaceMedia(placeId),
    ])

    if (!mountedRef.current || requestId !== requestRef.current) return false

    if (placeResult.status === 'fulfilled') setPlace(placeResult.value)
    if (operatingResult.status === 'fulfilled') setOperating(operatingResult.value)
    if (mediaResult.status === 'fulfilled') setMedia(sortMedia(mediaResult.value))

    const failures = [placeResult, operatingResult, mediaResult].filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    )
    if (failures.length > 0) {
      failures.forEach((result) => {
        if (isApiError(result.reason) && result.reason.category === 'unauthorized') clearAuth()
        logDebugError('상점주 장소 운영 정보 조회 실패', result.reason)
      })
      setSectionErrorMessage('일부 장소 운영 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.')
    }

    setIsLoading(false)
    return operatingResult.status === 'fulfilled'
  }, [clearAuth])

  const fetchInitialData = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')

    try {
      const nextProfile = await getMerchantOwnerProfile()
      if (!mountedRef.current) return

      setProfile(nextProfile)
      const initialPlaceId = syncPlaces(nextProfile.placeIds)
      if (!initialPlaceId) {
        setStatus('ready')
        return
      }

      const loaded = await fetchPlaceOperations(initialPlaceId)
      if (mountedRef.current) setStatus(loaded ? 'ready' : 'error')
    } catch (error) {
      if (!mountedRef.current) return
      setStatus('error')
      setErrorMessage(getErrorMessage(error, '장소 운영 정보를 불러오지 못했습니다.'))
      logDebugError('상점주 장소 운영 초기 조회 실패', error)
    }
  }, [fetchPlaceOperations, getErrorMessage, syncPlaces])

  useEffect(() => {
    mountedRef.current = true
    void fetchInitialData()
    return () => { mountedRef.current = false }
  }, [fetchInitialData])

  const selectPlace = useCallback((placeId: number) => {
    if (!profile?.placeIds.includes(placeId) || placeId === selectedPlaceId) return
    selectSharedPlace(placeId)
    setPlace(null)
    setOperating(null)
    setMedia(null)
    void fetchPlaceOperations(placeId)
  }, [fetchPlaceOperations, profile?.placeIds, selectSharedPlace, selectedPlaceId])

  const runAction = useCallback(async <T,>(
    action: Exclude<OperationAction, null>,
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
        logDebugError(`상점주 장소 운영 ${action} 실패`, error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setActiveAction(null)
    }
  }, [getErrorMessage])

  const updateOperatingStatus = useCallback((operatingStatus: MerchantPlaceOperatingStatus) => {
    if (!selectedPlaceId) return Promise.resolve(null)
    return runAction(
      'status',
      () => updateMerchantPlaceOperatingStatus(selectedPlaceId, { operatingStatus }),
      (next) => {
        setOperating(next)
        setPlace((current) => current ? { ...current, operatingStatus: next.operatingStatus, operatingStatusCheckedAt: next.operatingStatusCheckedAt } : current)
      },
      '장소 운영 상태를 변경했습니다.',
      '장소 운영 상태를 변경하지 못했습니다.',
    )
  }, [runAction, selectedPlaceId])

  const updateOperatingSchedule = useCallback((request: MerchantPlaceOperatingScheduleUpdateRequest) => {
    if (!selectedPlaceId) return Promise.resolve(null)
    return runAction(
      'schedule',
      () => updateMerchantPlaceOperatingSchedule(selectedPlaceId, request),
      (next) => {
        setOperating((current) => current ? {
          ...current,
          regularHours: next.regularHours,
          operatingExceptions: next.operatingExceptions,
        } : current)
        setPlace((current) => current ? { ...current, regularHours: next.regularHours, operatingExceptions: next.operatingExceptions } : current)
      },
      '영업시간을 저장했습니다.',
      '영업시간을 저장하지 못했습니다.',
    )
  }, [runAction, selectedPlaceId])

  const updateRepresentativeMedia = useCallback((mediaId: number) => {
    if (!selectedPlaceId) return Promise.resolve(null)
    return runAction(
      'representative',
      () => updateMerchantRepresentativeMedia(selectedPlaceId, mediaId),
      (next) => setMedia(sortMedia(next)),
      '대표 이미지를 변경했습니다.',
      '대표 이미지를 변경하지 못했습니다.',
    )
  }, [runAction, selectedPlaceId])

  const uploadMedia = useCallback((file: File) => {
    if (!selectedPlaceId) return Promise.resolve(null)

    if (!file.type.startsWith('image/')) {
      setActionErrorMessage('이미지 파일만 업로드할 수 있습니다.')
      return Promise.resolve(null)
    }

    if (file.size === 0 || file.size > MAX_MEDIA_FILE_SIZE) {
      setActionErrorMessage('이미지는 10MB 이하의 파일만 업로드할 수 있습니다.')
      return Promise.resolve(null)
    }

    return runAction(
      'upload-media',
      async () => {
        const upload = await requestMerchantPlaceMediaUploadUrl(selectedPlaceId, {
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        })
        const uploadResult = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        if (!uploadResult.ok) {
          throw new Error(`탐색 미디어 파일 업로드 실패: ${uploadResult.status}`)
        }

        await createMerchantPlaceMedia(selectedPlaceId, {
          s3Key: upload.s3Key,
        })

        return getMerchantPlaceMedia(selectedPlaceId)
      },
      (next) => setMedia(sortMedia(next)),
      '탐색 미디어를 등록했습니다.',
      '탐색 미디어를 업로드하지 못했습니다.',
    )
  }, [runAction, selectedPlaceId])

  const moveMedia = useCallback((mediaId: number, direction: 'previous' | 'next') => {
    if (!selectedPlaceId || !media) return Promise.resolve(null)

    const orderedMedia = [...media.media].sort((left, right) => left.displayOrder - right.displayOrder)
    const currentIndex = orderedMedia.findIndex((item) => item.id === mediaId)
    const targetIndex = direction === 'previous' ? currentIndex - 1 : currentIndex + 1

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedMedia.length) {
      return Promise.resolve(null)
    }

    return runAction(
      'move-media',
      async () => {
        await updateMerchantPlaceMediaOrder(selectedPlaceId, mediaId, {
          displayOrder: targetIndex,
        })
        return getMerchantPlaceMedia(selectedPlaceId)
      },
      (next) => setMedia(sortMedia(next)),
      '탐색 미디어 순서를 변경했습니다.',
      '탐색 미디어 순서를 변경하지 못했습니다.',
    )
  }, [media, runAction, selectedPlaceId])

  const deleteMedia = useCallback((mediaId: number) => {
    if (!selectedPlaceId) return Promise.resolve(false)
    return runAction(
      'delete-media',
      async () => {
        await deleteMerchantPlaceMedia(selectedPlaceId, mediaId)
        return mediaId
      },
      () => { if (selectedPlaceId) void fetchPlaceOperations(selectedPlaceId) },
      '미디어를 삭제했습니다.',
      '미디어를 삭제하지 못했습니다.',
    )
  }, [fetchPlaceOperations, runAction, selectedPlaceId])

  return {
    status,
    profile,
    selectedPlaceId,
    place,
    operating,
    media,
    isLoading,
    errorMessage,
    sectionErrorMessage,
    actionErrorMessage,
    successMessage,
    activeAction,
    selectPlace,
    fetchInitialData,
    fetchPlaceOperations,
    updateOperatingStatus,
    updateOperatingSchedule,
    updateRepresentativeMedia,
    uploadMedia,
    moveMedia,
    deleteMedia,
  }
}
