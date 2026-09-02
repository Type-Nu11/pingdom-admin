import { createContext, useContext } from 'react'

export type MerchantPlaceContextValue = {
  selectedPlaceId: number | null
  selectPlace: (placeId: number) => void
  syncPlaces: (placeIds: number[]) => number | null
}

export const MerchantPlaceContext = createContext<MerchantPlaceContextValue | null>(null)

export function useMerchantPlaceSelection() {
  const context = useContext(MerchantPlaceContext)

  if (!context) {
    throw new Error('useMerchantPlaceSelection must be used within MerchantPlaceProvider')
  }

  return context
}
