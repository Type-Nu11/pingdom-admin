import { useEffect, useRef, useState } from 'react'
import { completeMerchantSearchCandidate, searchMerchantPlacesAndAddresses, type MerchantSearchCandidate } from '../api/merchantUnifiedPlaceSearchApi'

export function useMerchantUnifiedPlaceSearch() {
  const [results, setResults] = useState<MerchantSearchCandidate[]>([])
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'search' | 'complete'>('idle')
  const scheduledSearch = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestKeyword = useRef<string | null>(null)
  const request = useRef<{ id: number; query: string | null; controller: AbortController | null }>({ id: 0, query: null, controller: null })

  const reset = () => {
    if (scheduledSearch.current !== null) clearTimeout(scheduledSearch.current)
    scheduledSearch.current = null
    latestKeyword.current = null
    request.current.controller?.abort()
    request.current = { id: request.current.id + 1, query: null, controller: null }
    setResults([])
    setMessage('')
    setIsError(false)
    setPhase('idle')
  }

  useEffect(() => () => {
    if (scheduledSearch.current !== null) clearTimeout(scheduledSearch.current)
    request.current.id += 1
    request.current.controller?.abort()
  }, [])

  const start = (query: string | null) => {
    reset()
    const controller = new AbortController()
    const id = request.current.id
    request.current = { id, query, controller }
    return { controller, isCurrent: () => request.current.id === id && !controller.signal.aborted }
  }

  const search = async (query: string) => {
    const keyword = query.trim()
    if (request.current.controller && request.current.query === keyword) return
    const { controller, isCurrent } = start(keyword)
    latestKeyword.current = keyword
    setPhase('search')
    try {
      const next = await searchMerchantPlacesAndAddresses(keyword, controller.signal)
      if (!isCurrent()) return
      setResults(next)
      setMessage(next.length ? '주소를 확인한 뒤 적용할 후보를 선택해주세요.' : '검색 결과가 없습니다. 지역명을 포함해 다시 검색하거나 직접 입력해주세요.')
    } catch (error) {
      if (!isCurrent()) return
      setIsError(true)
      setMessage(error instanceof Error ? error.message : '검색하지 못했습니다. 다시 시도해주세요.')
    } finally {
      if (isCurrent()) { request.current.controller = null; request.current.query = null; setPhase('idle') }
    }
  }

  const prepareSelection = async (candidate: MerchantSearchCandidate) => {
    const { controller, isCurrent } = start(null)
    setPhase('complete')
    try {
      const next = await completeMerchantSearchCandidate(candidate, controller.signal)
      if (!isCurrent()) return null
      setMessage(next.message)
      return next
    } catch (error) {
      if (isCurrent()) {
        setIsError(true)
        setMessage(error instanceof Error ? error.message : '선택한 주소를 확인하지 못했습니다.')
      }
      return null
    } finally {
      if (isCurrent()) { request.current.controller = null; setPhase('idle') }
    }
  }

  const scheduleSearch = (query: string) => {
    const keyword = query.trim()
    // IME compositionend/input can repeat the same value after a manual search.
    // Do not cancel that request or restart an unchanged debounce timer.
    if (latestKeyword.current === keyword) return
    reset()
    if (keyword.length < 2) return
    latestKeyword.current = keyword
    setPhase('waiting')
    scheduledSearch.current = setTimeout(() => { void search(keyword) }, 200)
  }

  return { results, message, isError, phase, reset, search, scheduleSearch, prepareSelection }
}
