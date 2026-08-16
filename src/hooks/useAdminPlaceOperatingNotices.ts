import { useCallback, useRef, useState } from 'react'
import {
  cancelAdminPlaceOperatingNotice,
  createAdminPlaceOperatingNotice,
  expireAdminPlaceOperatingNotices,
  updateAdminPlaceOperatingNotice,
} from '../api/adminPlaceOperatingNoticeApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminPlaceUpdateErrorResponse,
  AdminPlaceOperatingNoticeCancelRequest,
  AdminPlaceOperatingNoticeCreateRequest,
  AdminPlaceOperatingNoticeResponse,
  AdminPlaceOperatingNoticeUpdateRequest,
} from '../types/adminPlace.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

export type AdminPlaceNoticeAction = 'create' | 'update' | 'cancel' | 'expire'

type NoticeActionState<T> = Record<AdminPlaceNoticeAction, T>

const EMPTY_RUNNING_ACTIONS: NoticeActionState<boolean> = {
  create: false,
  update: false,
  cancel: false,
  expire: false,
}

const EMPTY_ACTION_ERRORS: NoticeActionState<string> = {
  create: '',
  update: '',
  cancel: '',
  expire: '',
}

function getNoticeErrorMessage(error: unknown) {
  if (!isApiError<AdminPlaceUpdateErrorResponse>(error)) {
    return '운영 공지를 처리하는 중 오류가 발생했습니다.'
  }

  return getAuthErrorMessage(error, {
    fallbackMessage: '운영 공지를 처리하는 중 오류가 발생했습니다.',
    codeMessages: {
      INVALID_TOKEN: '로그인이 필요합니다. 다시 로그인해주세요.',
      ACCESS_DENIED: '관리자 권한이 필요합니다.',
      PLACE_NOT_FOUND: '장소를 찾을 수 없습니다.',
    },
    categoryMessages: {
      unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
      forbidden: '관리자 권한이 필요합니다.',
      network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
      'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.',
      timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
      server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    },
  })
}

export function useAdminPlaceOperatingNotices() {
  const { clearAuth } = useAuth()
  const [runningActions, setRunningActions] =
    useState<NoticeActionState<boolean>>(EMPTY_RUNNING_ACTIONS)
  const [actionErrors, setActionErrors] =
    useState<NoticeActionState<string>>(EMPTY_ACTION_ERRORS)
  const runningActionsRef = useRef<NoticeActionState<boolean>>({
    ...EMPTY_RUNNING_ACTIONS,
  })

  const clearActionError = useCallback((action: AdminPlaceNoticeAction) => {
    setActionErrors((current) => ({ ...current, [action]: '' }))
  }, [])

  const runAction = useCallback(
    async <T,>(
      action: AdminPlaceNoticeAction,
      request: () => Promise<T>,
      debugLabel: string
    ): Promise<T | null> => {
      if (runningActionsRef.current[action]) {
        return null
      }

      runningActionsRef.current[action] = true
      setRunningActions((current) => ({ ...current, [action]: true }))
      setActionErrors((current) => ({ ...current, [action]: '' }))

      try {
        return await request()
      } catch (error) {
        setActionErrors((current) => ({
          ...current,
          [action]: getNoticeErrorMessage(error),
        }))

        if (
          isApiError<AdminPlaceUpdateErrorResponse>(error) &&
          (error.response?.data?.code === 'INVALID_TOKEN' ||
            error.category === 'unauthorized')
        ) {
          clearAuth()
        }

        logDebugError(debugLabel, error)
        return null
      } finally {
        runningActionsRef.current[action] = false
        setRunningActions((current) => ({ ...current, [action]: false }))
      }
    },
    [clearAuth]
  )

  const createNotice = useCallback(
    (placeId: number, payload: AdminPlaceOperatingNoticeCreateRequest) =>
      runAction<AdminPlaceOperatingNoticeResponse>(
        'create',
        () => createAdminPlaceOperatingNotice(placeId, payload),
        '관리자 장소 운영 공지 생성 실패'
      ),
    [runAction]
  )

  const updateNotice = useCallback(
    (
      placeId: number,
      noticeId: number,
      payload: AdminPlaceOperatingNoticeUpdateRequest
    ) =>
      runAction<AdminPlaceOperatingNoticeResponse>(
        'update',
        () => updateAdminPlaceOperatingNotice(placeId, noticeId, payload),
        '관리자 장소 운영 공지 수정 실패'
      ),
    [runAction]
  )

  const cancelNotice = useCallback(
    (
      placeId: number,
      noticeId: number,
      payload: AdminPlaceOperatingNoticeCancelRequest
    ) =>
      runAction<AdminPlaceOperatingNoticeResponse>(
        'cancel',
        () => cancelAdminPlaceOperatingNotice(placeId, noticeId, payload),
        '관리자 장소 운영 공지 취소 실패'
      ),
    [runAction]
  )

  const expireNotices = useCallback(
    () =>
      runAction(
        'expire',
        expireAdminPlaceOperatingNotices,
        '관리자 장소 운영 공지 만료 처리 실패'
      ),
    [runAction]
  )

  return {
    runningActions,
    actionErrors,
    clearActionError,
    createNotice,
    updateNotice,
    cancelNotice,
    expireNotices,
  }
}
