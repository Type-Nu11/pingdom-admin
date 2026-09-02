import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelMerchantOperatingNotice,
  createMerchantOperatingNotice,
  getMerchantOperatingNotices,
  getMerchantOwnerProfile,
  updateMerchantOperatingNotice,
} from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantOperatingNotice,
  MerchantOperatingNoticeCancelRequest,
  MerchantOperatingNoticeRequest,
  MerchantOperatingNoticeUpdateRequest,
  MerchantOwnerProfile,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useMerchantPlaceSelection } from '../app/providers/MerchantPlaceContext'
import { useAuth } from './useAuth'

type LoadStatus = 'loading' | 'ready' | 'error'
type NoticeAction = 'create' | 'update' | 'cancel' | null

function replaceNotice(notices: MerchantOperatingNotice[], next: MerchantOperatingNotice) {
  const index = notices.findIndex((notice) => notice.id === next.id)
  return index === -1 ? [next, ...notices] : notices.map((notice) => (notice.id === next.id ? next : notice))
}

export function useMerchantOperatingNotices() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const { selectedPlaceId, selectPlace: selectSharedPlace, syncPlaces } = useMerchantPlaceSelection()
  const [notices, setNotices] = useState<MerchantOperatingNotice[]>([])
  const [currentlyOperating, setCurrentlyOperating] = useState<boolean | null>(null)
  const [isListLoading, setIsListLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeAction, setActiveAction] = useState<NoticeAction>(null)
  const mountedRef = useRef(true)
  const actionRef = useRef<NoticeAction>(null)
  const requestRef = useRef(0)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (error.category === 'unauthorized') clearAuth()

    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '상점주 권한이 필요합니다.',
        PLACE_NOT_FOUND: '연결된 장소 정보를 찾을 수 없습니다.',
        OPERATING_NOTICE_NOT_FOUND: '운영 공지 정보를 찾을 수 없습니다.',
      },
    })
  }, [clearAuth])

  const fetchNotices = useCallback(async (placeId: number) => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setIsListLoading(true)
    setErrorMessage('')

    try {
      const response = await getMerchantOperatingNotices(placeId)
      if (!mountedRef.current || requestId !== requestRef.current) return false

      setNotices(response.notices)
      setCurrentlyOperating(response.currentlyOperating)
      return true
    } catch (error) {
      if (mountedRef.current && requestId === requestRef.current) {
        setErrorMessage(getErrorMessage(error, '운영 공지 목록을 불러오지 못했습니다.'))
        logDebugError('상점주 운영 공지 목록 조회 실패', error)
      }
      return false
    } finally {
      if (mountedRef.current && requestId === requestRef.current) setIsListLoading(false)
    }
  }, [getErrorMessage])

  const fetchInitialData = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')

    try {
      const nextProfile = await getMerchantOwnerProfile()
      if (!mountedRef.current) return

      setProfile(nextProfile)
      const initialPlaceId = syncPlaces(nextProfile.placeIds)
      if (!initialPlaceId) {
        setCurrentlyOperating(null)
        setNotices([])
        setStatus('ready')
        return
      }

      const loaded = await fetchNotices(initialPlaceId)
      if (mountedRef.current) setStatus(loaded ? 'ready' : 'error')
    } catch (error) {
      if (!mountedRef.current) return
      setStatus('error')
      setErrorMessage(getErrorMessage(error, '운영 공지 관리 정보를 불러오지 못했습니다.'))
      logDebugError('상점주 운영 공지 초기 조회 실패', error)
    }
  }, [fetchNotices, getErrorMessage, syncPlaces])

  useEffect(() => {
    mountedRef.current = true
    void fetchInitialData()
    return () => { mountedRef.current = false }
  }, [fetchInitialData])

  const selectPlace = useCallback((placeId: number) => {
    if (!profile?.placeIds.includes(placeId) || placeId === selectedPlaceId) return
    selectSharedPlace(placeId)
    setNotices([])
    setCurrentlyOperating(null)
    void fetchNotices(placeId)
  }, [fetchNotices, profile?.placeIds, selectSharedPlace, selectedPlaceId])

  const runAction = useCallback(async <T,>(
    action: Exclude<NoticeAction, null>,
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
      const next = await request()
      if (!mountedRef.current) return null
      apply(next)
      setSuccessMessage(successText)
      return next
    } catch (error) {
      if (mountedRef.current) {
        setActionErrorMessage(getErrorMessage(error, fallbackMessage))
        logDebugError(`상점주 운영 공지 ${action} 실패`, error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setActiveAction(null)
    }
  }, [getErrorMessage])

  const createNotice = useCallback((request: MerchantOperatingNoticeRequest) => {
    if (!selectedPlaceId) return Promise.resolve(null)
    return runAction(
      'create',
      () => createMerchantOperatingNotice(selectedPlaceId, request),
      (next) => setNotices((current) => replaceNotice(current, next)),
      '운영 공지를 등록했습니다.',
      '운영 공지를 등록하지 못했습니다.',
    )
  }, [runAction, selectedPlaceId])

  const updateNotice = useCallback((noticeId: number, request: MerchantOperatingNoticeUpdateRequest) => {
    if (!selectedPlaceId) return Promise.resolve(null)
    return runAction(
      'update',
      () => updateMerchantOperatingNotice(selectedPlaceId, noticeId, request),
      (next) => setNotices((current) => replaceNotice(current, next)),
      '운영 공지를 수정했습니다.',
      '운영 공지를 수정하지 못했습니다.',
    )
  }, [runAction, selectedPlaceId])

  const cancelNotice = useCallback((noticeId: number, request: MerchantOperatingNoticeCancelRequest) => {
    if (!selectedPlaceId) return Promise.resolve(null)
    return runAction(
      'cancel',
      () => cancelMerchantOperatingNotice(selectedPlaceId, noticeId, request),
      (next) => setNotices((current) => replaceNotice(current, next)),
      '운영 공지를 취소했습니다.',
      '운영 공지를 취소하지 못했습니다.',
    )
  }, [runAction, selectedPlaceId])

  return {
    status,
    profile,
    selectedPlaceId,
    notices,
    currentlyOperating,
    isListLoading,
    errorMessage,
    actionErrorMessage,
    successMessage,
    activeAction,
    selectPlace,
    fetchInitialData,
    fetchNotices,
    createNotice,
    updateNotice,
    cancelNotice,
  }
}
