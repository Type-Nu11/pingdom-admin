import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import {
  closeMerchantCampaign,
  createMerchantBrand,
  createMerchantCampaign,
  getMerchantBrands,
  getMerchantCampaigns,
  getMerchantOwnerProfile,
  publishMerchantCampaign,
  updateMerchantBrand,
  updateMerchantCampaign,
} from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantBrand,
  MerchantBrandRequest,
  MerchantCampaign,
  MerchantCampaignRequest,
  MerchantOwnerProfile,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

export const MERCHANT_CAMPAIGN_PAGE_LIMIT = 20

type LoadStatus = 'loading' | 'ready' | 'error'
type CampaignAction = 'create' | 'update' | 'publish' | 'close' | 'create-brand' | 'update-brand' | null

function replaceById<T extends { id: number }>(items: T[], next: T) {
  const index = items.findIndex((item) => item.id === next.id)
  if (index === -1) return [next, ...items]
  return items.map((item) => (item.id === next.id ? next : item))
}

async function getAllMerchantCampaigns() {
  const firstPage = await getMerchantCampaigns({
    page: 1,
    limit: MERCHANT_CAMPAIGN_PAGE_LIMIT,
  })

  if (firstPage.totalPages <= 1) {
    return firstPage.items
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      getMerchantCampaigns({
        page: index + 2,
        limit: MERCHANT_CAMPAIGN_PAGE_LIMIT,
      })
    )
  )

  return [firstPage.items, ...remainingPages.map((page) => page.items)].flat()
}

async function getAllMerchantBrands() {
  const firstPage = await getMerchantBrands({ page: 1, limit: 100 })

  if (firstPage.totalPages <= 1) {
    return firstPage.items
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      getMerchantBrands({ page: index + 2, limit: 100 })
    )
  )

  return [firstPage.items, ...remainingPages.map((page) => page.items)].flat()
}

export function useMerchantCampaigns() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const [campaigns, setCampaigns] = useState<MerchantCampaign[]>([])
  const [brands, setBrands] = useState<MerchantBrand[]>([])
  const [page, setPage] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isListLoading, setIsListLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  const [successMessage, setSuccessMessage] = useState('')
  useAutoDismissMessage(successMessage, setSuccessMessage)
  const [activeAction, setActiveAction] = useState<CampaignAction>(null)
  const mountedRef = useRef(true)
  const actionRef = useRef<CampaignAction>(null)
  const listRequestRef = useRef(0)

  const applyCampaigns = useCallback((items: MerchantCampaign[], requestedPage = 1) => {
    const nextTotalPages = Math.max(1, Math.ceil(items.length / MERCHANT_CAMPAIGN_PAGE_LIMIT))
    const nextPage = Math.min(Math.max(requestedPage, 1), nextTotalPages)

    setCampaigns(items)
    setPage(nextPage)
    setTotalElements(items.length)
    setTotalPages(nextTotalPages)
    setHasNext(nextPage < nextTotalPages)
  }, [])

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (error.category === 'unauthorized') clearAuth()

    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '상점주 권한이 필요합니다.',
        PLACE_NOT_FOUND: '연결된 장소 정보를 찾을 수 없습니다.',
        BRAND_NOT_FOUND: '선택한 브랜드를 찾을 수 없습니다.',
        POPUP_CAMPAIGN_NOT_FOUND: '이벤트 정보를 찾을 수 없습니다.',
      },
    })
  }, [clearAuth])

  const fetchCampaigns = useCallback(async (nextPage = 1) => {
    const requestId = listRequestRef.current + 1
    listRequestRef.current = requestId
    setIsListLoading(true)
    setErrorMessage('')

    try {
      const items = await getAllMerchantCampaigns()
      if (!mountedRef.current || requestId !== listRequestRef.current) return false
      applyCampaigns(items, nextPage)
      return true
    } catch (error) {
      if (mountedRef.current && requestId === listRequestRef.current) {
        setErrorMessage(getErrorMessage(error, '이벤트 목록을 불러오지 못했습니다.'))
        logDebugError('상점주 이벤트 목록 조회 실패', error)
      }
      return false
    } finally {
      if (mountedRef.current && requestId === listRequestRef.current) setIsListLoading(false)
    }
  }, [applyCampaigns, getErrorMessage])

  const fetchInitialData = useCallback(async () => {
    setStatus('loading')
    setIsListLoading(true)
    setErrorMessage('')
    const [profileResult, campaignResult, brandResult] = await Promise.allSettled([
      getMerchantOwnerProfile(),
      getAllMerchantCampaigns(),
      getAllMerchantBrands(),
    ])

    if (!mountedRef.current) return
    if (profileResult.status === 'fulfilled') setProfile(profileResult.value)
    if (campaignResult.status === 'fulfilled') applyCampaigns(campaignResult.value, 1)
    if (brandResult.status === 'fulfilled') setBrands(brandResult.value)

    if (profileResult.status === 'rejected' || campaignResult.status === 'rejected') {
      ;[profileResult, campaignResult, brandResult].forEach((result) => {
        if (result.status === 'rejected') {
          if (isApiError(result.reason) && result.reason.category === 'unauthorized') clearAuth()
          logDebugError('상점주 이벤트 초기 조회 실패', result.reason)
        }
      })
      setIsListLoading(false)
      setStatus('error')
      setErrorMessage('이벤트 관리 정보를 불러오지 못했습니다.')
      return
    }

    setStatus('ready')
    setIsListLoading(false)
    if (brandResult.status === 'rejected') {
      logDebugError('상점주 브랜드 목록 조회 실패', brandResult.reason)
      setErrorMessage('브랜드 목록을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.')
    }
  }, [applyCampaigns, clearAuth])

  useEffect(() => {
    mountedRef.current = true
    void fetchInitialData()
    return () => { mountedRef.current = false }
  }, [fetchInitialData])

  const runAction = useCallback(async <T,>(
    action: Exclude<CampaignAction, null>,
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
        logDebugError(`상점주 이벤트 ${action} 실패`, error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setActiveAction(null)
    }
  }, [getErrorMessage])

  const createCampaign = useCallback(async (request: MerchantCampaignRequest) => {
    const next = await runAction(
      'create',
      () => createMerchantCampaign(request),
      () => undefined,
      '이벤트 초안을 등록했습니다.',
      '이벤트 초안을 등록하지 못했습니다.',
    )

    if (next) await fetchCampaigns(1)
    return next
  }, [fetchCampaigns, runAction])

  const updateCampaign = useCallback((campaignId: number, request: MerchantCampaignRequest) => runAction(
    'update',
    () => updateMerchantCampaign(campaignId, request),
    (next) => setCampaigns((current) => replaceById(current, next)),
    '이벤트 초안을 저장했습니다.',
    '이벤트 초안을 저장하지 못했습니다.',
  ), [runAction])

  const publishCampaign = useCallback((campaignId: number) => runAction(
    'publish',
    () => publishMerchantCampaign(campaignId),
    (next) => setCampaigns((current) => replaceById(current, next)),
    '이벤트를 공개했습니다.',
    '이벤트를 공개하지 못했습니다.',
  ), [runAction])

  const closeCampaign = useCallback((campaignId: number) => runAction(
    'close',
    () => closeMerchantCampaign(campaignId),
    (next) => setCampaigns((current) => replaceById(current, next)),
    '이벤트를 종료했습니다.',
    '이벤트를 종료하지 못했습니다.',
  ), [runAction])

  const createBrand = useCallback((request: MerchantBrandRequest) => runAction(
    'create-brand',
    () => createMerchantBrand(request),
    (next) => setBrands((current) => [next, ...current]),
    '브랜드를 등록했습니다.',
    '브랜드를 등록하지 못했습니다.',
  ), [runAction])

  const updateBrand = useCallback((brandId: number, request: MerchantBrandRequest) => runAction(
    'update-brand',
    () => updateMerchantBrand(brandId, request),
    (next) => setBrands((current) => replaceById(current, next)),
    '브랜드 정보를 저장했습니다.',
    '브랜드 정보를 저장하지 못했습니다.',
  ), [runAction])

  const goToPage = useCallback((nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages || 1))
  }, [totalPages])

  return {
    status, profile, campaigns, brands, page, totalElements, totalPages, hasNext,
    isListLoading, errorMessage, actionErrorMessage, successMessage, activeAction,
    fetchInitialData, fetchCampaigns, goToPage, createCampaign, updateCampaign, publishCampaign,
    closeCampaign, createBrand, updateBrand,
  }
}
