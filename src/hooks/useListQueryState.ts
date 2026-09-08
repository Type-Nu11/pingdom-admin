import { useCallback, useRef, useState } from 'react'
import { isApiError } from '../api/customAxios'

export function useListQueryState() {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [hasResult, setHasResult] = useState(false)
  const [restricted, setRestricted] = useState(false)
  const [filtered, setFiltered] = useState(false)
  const resultKey = useRef<string | null>(null)

  const begin = useCallback((key: string, hasFilters: boolean) => {
    const retain = resultKey.current === key
    if (!retain) resultKey.current = null
    setHasResult(retain)
    setFiltered(hasFilters)
    setRestricted(false)
    setPhase('loading')
    return retain
  }, [])
  const succeed = useCallback((key: string) => {
    resultKey.current = key
    setHasResult(true)
    setPhase('success')
  }, [])
  const fail = useCallback((error: unknown) => {
    const denied = isApiError(error) && (error.category === 'forbidden' || error.category === 'unauthorized')
    setRestricted(denied)
    if (denied) {
      resultKey.current = null
      setHasResult(false)
    }
    setPhase('error')
  }, [])
  return { phase, hasResult, restricted, filtered, begin, succeed, fail }
}

export function listQueryKey(query: object) {
  return JSON.stringify(Object.entries(query).filter(([, value]) => value !== undefined && value !== '').sort(([a], [b]) => a.localeCompare(b)))
}
