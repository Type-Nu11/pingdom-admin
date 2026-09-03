import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createMerchantPlaceMenu,
  deactivateMerchantPlaceMenu,
  getMerchantOwnerProfile,
  getMerchantPlaceMenus,
  updateMerchantPlaceMenu,
  updateMerchantPlaceMenuOrder,
  updateMerchantPlaceMenuStatus,
} from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { useMerchantPlaceSelection } from '../app/providers/MerchantPlaceContext'
import { isApiError } from '../api/customAxios'
import type {
  MerchantOwnerProfile,
  MerchantPlaceMenu,
  MerchantPlaceMenuCreateRequest,
  MerchantPlaceMenuStatus,
  MerchantPlaceMenuUpdateRequest,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'
import { useAutoDismissMessage } from './useAutoDismissMessage'

type LoadStatus = 'loading' | 'ready' | 'error'
type MenuAction = 'create' | 'update' | 'status' | 'order' | 'deactivate' | null

function sortMenus(items: MerchantPlaceMenu[]) {
  return [...items].sort((first, second) => first.displayOrder - second.displayOrder || first.id - second.id)
}

function replaceById(items: MerchantPlaceMenu[], next: MerchantPlaceMenu) {
  return sortMenus(items.some((item) => item.id === next.id)
    ? items.map((item) => item.id === next.id ? next : item)
    : [...items, next])
}

export function useMerchantPlaceMenus() {
  const { clearAuth } = useAuth()
  const { selectedPlaceId, selectPlace: selectSharedPlace, syncPlaces } = useMerchantPlaceSelection()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const [menus, setMenus] = useState<MerchantPlaceMenu[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sectionErrorMessage, setSectionErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeAction, setActiveAction] = useState<MenuAction>(null)
  const mountedRef = useRef(true)
  const requestRef = useRef(0)
  const actionRef = useRef<MenuAction>(null)

  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  useAutoDismissMessage(successMessage, setSuccessMessage)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (error.category === 'unauthorized') clearAuth()

    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '메뉴 관리 권한이 필요합니다.',
        PLACE_NOT_FOUND: '연결된 장소 정보를 찾을 수 없습니다.',
        MENU_NOT_FOUND: '메뉴 정보를 찾을 수 없습니다.',
      },
    })
  }, [clearAuth])

  const fetchMenusForPlace = useCallback(async (placeId: number) => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setIsLoading(true)
    setSectionErrorMessage('')

    try {
      const next = await getMerchantPlaceMenus(placeId)
      if (!mountedRef.current || requestId !== requestRef.current) return false
      setMenus(sortMenus(next))
      return true
    } catch (error) {
      if (mountedRef.current && requestId === requestRef.current) {
        setSectionErrorMessage(getErrorMessage(error, '메뉴 목록을 불러오지 못했습니다.'))
        logDebugError('상점주 메뉴 목록 조회 실패', error)
      }
      return false
    } finally {
      if (mountedRef.current && requestId === requestRef.current) setIsLoading(false)
    }
  }, [getErrorMessage])

  const fetchMenus = useCallback(async () => {
    if (!selectedPlaceId) {
      setMenus([])
      return false
    }
    return fetchMenusForPlace(selectedPlaceId)
  }, [fetchMenusForPlace, selectedPlaceId])

  const fetchInitialData = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')

    try {
      const nextProfile = await getMerchantOwnerProfile()
      if (!mountedRef.current) return
      setProfile(nextProfile)
      const placeId = syncPlaces(nextProfile.placeIds)
      if (!placeId) {
        setMenus([])
        setStatus('ready')
        return
      }

      const loaded = await fetchMenusForPlace(placeId)
      if (mountedRef.current) setStatus(loaded ? 'ready' : 'error')
    } catch (error) {
      if (!mountedRef.current) return
      setStatus('error')
      setErrorMessage(getErrorMessage(error, '메뉴 관리 정보를 불러오지 못했습니다.'))
      logDebugError('상점주 메뉴 관리 초기 조회 실패', error)
    }
  }, [fetchMenusForPlace, getErrorMessage, syncPlaces])

  useEffect(() => {
    mountedRef.current = true
    void fetchInitialData()
    return () => { mountedRef.current = false }
  }, [fetchInitialData])

  const runAction = useCallback(async <T,>(
    action: Exclude<MenuAction, null>,
    request: () => Promise<T>,
    apply: (value: T) => void | Promise<void>,
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
      await apply(result)
      if (mountedRef.current) setSuccessMessage(successText)
      return result
    } catch (error) {
      if (mountedRef.current) {
        setActionErrorMessage(getErrorMessage(error, fallbackMessage))
        logDebugError(`상점주 메뉴 ${action} 실패`, error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setActiveAction(null)
    }
  }, [getErrorMessage])

  const selectPlace = useCallback((placeId: number) => {
    if (!profile?.placeIds.includes(placeId) || placeId === selectedPlaceId) return
    selectSharedPlace(placeId)
    requestRef.current += 1
    setMenus([])
    void fetchMenusForPlace(placeId)
  }, [fetchMenusForPlace, profile?.placeIds, selectSharedPlace, selectedPlaceId])

  const createMenu = useCallback((request: MerchantPlaceMenuCreateRequest) => {
    if (!selectedPlaceId) return Promise.resolve(null)
    return runAction(
      'create',
      () => createMerchantPlaceMenu(selectedPlaceId, request),
      (next) => setMenus((current) => replaceById(current, next)),
      '메뉴를 등록했습니다.',
      '메뉴를 등록하지 못했습니다.',
    )
  }, [runAction, selectedPlaceId])

  const updateMenu = useCallback((menuId: number, request: MerchantPlaceMenuUpdateRequest) => {
    if (!selectedPlaceId) return Promise.resolve(null)
    return runAction(
      'update',
      () => updateMerchantPlaceMenu(selectedPlaceId, menuId, request),
      (next) => setMenus((current) => replaceById(current, next)),
      '메뉴 정보를 저장했습니다.',
      '메뉴 정보를 저장하지 못했습니다.',
    )
  }, [runAction, selectedPlaceId])

  const updateMenuStatus = useCallback((menuId: number, nextStatus: Exclude<MerchantPlaceMenuStatus, 'INACTIVE'>) => {
    if (!selectedPlaceId) return Promise.resolve(null)
    return runAction(
      'status',
      () => updateMerchantPlaceMenuStatus(selectedPlaceId, menuId, nextStatus),
      (next) => setMenus((current) => replaceById(current, next)),
      '메뉴 노출 상태를 변경했습니다.',
      '메뉴 노출 상태를 변경하지 못했습니다.',
    )
  }, [runAction, selectedPlaceId])

  const moveMenu = useCallback((menu: MerchantPlaceMenu, displayOrder: number) => {
    if (!selectedPlaceId || displayOrder < 0) return Promise.resolve(null)
    return runAction(
      'order',
      () => updateMerchantPlaceMenuOrder(selectedPlaceId, menu.id, displayOrder),
      async () => { await fetchMenusForPlace(selectedPlaceId) },
      '메뉴 표시 순서를 변경했습니다.',
      '메뉴 표시 순서를 변경하지 못했습니다.',
    )
  }, [fetchMenusForPlace, runAction, selectedPlaceId])

  const deactivateMenu = useCallback((menuId: number) => {
    if (!selectedPlaceId) return Promise.resolve(null)
    return runAction(
      'deactivate',
      async () => {
        await deactivateMerchantPlaceMenu(selectedPlaceId, menuId)
        return true
      },
      async () => { await fetchMenusForPlace(selectedPlaceId) },
      '메뉴를 비활성화했습니다.',
      '메뉴를 비활성화하지 못했습니다.',
    )
  }, [fetchMenusForPlace, runAction, selectedPlaceId])

  return {
    status,
    profile,
    selectedPlaceId,
    menus,
    isLoading,
    errorMessage,
    sectionErrorMessage,
    actionErrorMessage,
    successMessage,
    activeAction,
    selectPlace,
    fetchInitialData,
    fetchMenus,
    createMenu,
    updateMenu,
    updateMenuStatus,
    moveMenu,
    deactivateMenu,
  }
}
