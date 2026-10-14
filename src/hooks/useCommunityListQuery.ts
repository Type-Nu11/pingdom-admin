import { useCallback, useEffect, useRef, useState } from 'react'
import { shouldClearAuth } from '../api/authError'
import { useAuth } from './useAuth'
import { communityError } from './useCommunityQuery'
import type { CommunityPage } from '../types/adminCommunity.types'

interface ListState<T> {
  scope: string
  page: number
  data: T | null
  pagination: CommunityPage | null
  loading: boolean
  error: string
}

// Retain only pagination while loading, never stale selectable records.
export function useCommunityListQuery<T extends CommunityPage>(scope: string, loader: (page: number, signal: AbortSignal) => Promise<T>) {
  const { clearAuth } = useAuth()
  const [state, setState] = useState<ListState<T>>({ scope, page: 1, data: null, pagination: null, loading: true, error: '' })
  const request = useRef<AbortController | null>(null)
  const selection = useRef({ scope, page: 1 })
  const fetchPage = useCallback(async (requestedPage: number) => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    selection.current = { scope, page: requestedPage }
    setState(previous => ({ scope, page: requestedPage, data: null, pagination: previous.scope === scope ? previous.pagination : null, loading: true, error: '' }))
    try {
      let data = await loader(requestedPage, controller.signal)
      if (controller.signal.aborted) return false
      const lastPage = Math.max(1, data.totalPages)
      if (requestedPage > lastPage) {
        // Correct once; do not walk every removed page or leave an empty last page.
        selection.current = { scope, page: lastPage }
        setState(previous => ({ ...previous, page: lastPage }))
        data = await loader(lastPage, controller.signal)
        if (controller.signal.aborted) return false
      }
      selection.current = { scope, page: data.page }
      const { page, limit, totalCount, totalPages, hasNext } = data
      setState({ scope, page, data, pagination: { page, limit, totalCount, totalPages, hasNext }, loading: false, error: '' })
      return true
    } catch (error) {
      if (controller.signal.aborted) return false
      if (shouldClearAuth(error)) clearAuth()
      setState(previous => ({ ...previous, data: null, loading: false, error: communityError(error) }))
      return false
    }
  }, [scope, loader, clearAuth])
  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) void fetchPage(1) })
    return () => { active = false; request.current?.abort() }
  }, [fetchPage])
  const refresh = useCallback(() => fetchPage(selection.current.scope === scope ? selection.current.page : 1), [fetchPage, scope])
  const current = state.scope === scope
  return {
    data: current ? state.data : null,
    pagination: current ? state.pagination : null,
    page: current ? state.page : 1,
    loading: !current || state.loading,
    error: current ? state.error : '',
    refresh,
    changePage: fetchPage,
  }
}
