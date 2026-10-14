import { useCallback, useEffect, useRef, useState } from 'react'
import { shouldClearAuth, getAuthErrorMessage } from '../api/authError'
import { useAuth } from './useAuth'
import { isApiError } from '../api/customAxios'
import type { AuthErrorResponse } from '../types/auth.types'

export function communityError(error: unknown) {
  if (!isApiError<AuthErrorResponse>(error)) return '요청을 처리하지 못했습니다. 다시 시도해주세요.'
  return getAuthErrorMessage(error, {
    fallbackMessage: '요청을 처리하지 못했습니다. 다시 시도해주세요.',
    categoryMessages: {
      unauthorized: '로그인이 필요합니다.', forbidden: '관리자 권한이 필요합니다.',
      'not-found': '대상을 찾을 수 없습니다. 삭제되었거나 접근할 수 없는 상태입니다.',
      conflict: '이미 처리됐거나 상태가 변경된 신고입니다. 다시 조회해주세요.',
    },
  })
}

// Key-tagged results prevent an old selection from rendering before effect cleanup.
export function useCommunityQuery<T>(key: string | null, loader: (signal: AbortSignal) => Promise<T>) {
  const { clearAuth } = useAuth()
  const [state, setState] = useState<{ key: string | null; data: T | null; loading: boolean; error: string }>({ key: null, data: null, loading: false, error: '' })
  const request = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    if (key === null) return false
    setState({ key, data: null, loading: true, error: '' })
    try {
      const data = await loader(controller.signal)
      if (controller.signal.aborted) return false
      setState({ key, data, loading: false, error: '' })
      return true
    } catch (error) {
      if (controller.signal.aborted) return false
      if (shouldClearAuth(error)) clearAuth()
      setState({ key, data: null, loading: false, error: communityError(error) })
      return false
    }
  }, [key, loader, clearAuth])
  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) void refresh() })
    return () => { active = false; request.current?.abort() }
  }, [refresh])
  const current = key !== null && state.key === key
  return { data: current ? state.data : null, error: current ? state.error : '', loading: key !== null && (!current || state.loading), refresh }
}
