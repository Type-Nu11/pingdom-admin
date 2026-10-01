import { createContext } from 'react'

export type MerchantPlaceIdentity = {
  status: 'loading' | 'ready' | 'error'
  name?: string
  address?: string
}

export const MerchantPlaceIdentityContext = createContext<{
  places: Record<number, MerchantPlaceIdentity>
  ensurePlaces: (ids: number[], retry?: boolean) => void
} | null>(null)
