import { useCallback, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { MerchantPlaceContext } from './MerchantPlaceContext'

export function MerchantPlaceProvider({ children }: PropsWithChildren) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null)
  const selectedPlaceIdRef = useRef<number | null>(null)

  const selectPlace = useCallback((placeId: number) => {
    selectedPlaceIdRef.current = placeId
    setSelectedPlaceId(placeId)
  }, [])

  const syncPlaces = useCallback((placeIds: number[]) => {
    const nextPlaceId = selectedPlaceIdRef.current !== null && placeIds.includes(selectedPlaceIdRef.current)
      ? selectedPlaceIdRef.current
      : (placeIds[0] ?? null)

    selectedPlaceIdRef.current = nextPlaceId
    setSelectedPlaceId(nextPlaceId)
    return nextPlaceId
  }, [])

  const value = useMemo(
    () => ({ selectedPlaceId, selectPlace, syncPlaces }),
    [selectedPlaceId, selectPlace, syncPlaces],
  )

  return <MerchantPlaceContext.Provider value={value}>{children}</MerchantPlaceContext.Provider>
}
