import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { getMerchantPlaceDetail } from '../../api/merchantStoreApi'
import { shouldClearAuth } from '../../api/authError'
import { useAuth } from '../../hooks/useAuth'
import { MerchantPlaceIdentityContext, type MerchantPlaceIdentity } from './MerchantPlaceIdentityContext'

export function MerchantPlaceIdentityProvider({ children }: PropsWithChildren) {
  const { clearAuth } = useAuth()
  const [places, setPlaces] = useState<Record<number, MerchantPlaceIdentity>>({})
  const requested = useRef(new Set<number>())
  const requests = useRef(new Map<number, number>())
  const generation = useRef(0)
  useEffect(() => {
    const lifecycle = generation
    const seen = requested.current
    return () => { lifecycle.current++; seen.clear() }
  }, [])

  const ensurePlaces = useCallback((ids: number[], retry = false) => {
    for (const id of new Set(ids)) {
      if (!Number.isSafeInteger(id) || id <= 0 || (!retry && requested.current.has(id))) continue
      requested.current.add(id)
      const current = generation.current
      const request = (requests.current.get(id) ?? 0) + 1
      requests.current.set(id, request)
      setPlaces(previous => ({ ...previous, [id]: { status: 'loading' } }))
      void getMerchantPlaceDetail(id).then(place => {
        if (generation.current !== current || requests.current.get(id) !== request) return
        if (place.id !== id || !place.name?.trim()) throw new Error('Invalid place identity')
        setPlaces(previous => ({ ...previous, [id]: { status: 'ready', name: place.name, address: place.roadAddress || place.address || place.jibunAddress || '' } }))
      }).catch(error => {
        if (generation.current !== current || requests.current.get(id) !== request) return
        if (shouldClearAuth(error)) clearAuth()
        setPlaces(previous => ({ ...previous, [id]: { status: 'error' } }))
      })
    }
  }, [clearAuth])
  const value = useMemo(() => ({ places, ensurePlaces }), [places, ensurePlaces])
  return <MerchantPlaceIdentityContext.Provider value={value}>{children}</MerchantPlaceIdentityContext.Provider>
}
