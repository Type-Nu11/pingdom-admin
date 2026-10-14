import { useContext, useEffect } from 'react'
import { MerchantPlaceIdentityContext } from '../app/providers/MerchantPlaceIdentityContext'

export function useMerchantPlaceIdentity(placeIds: number[]) {
  const context = useContext(MerchantPlaceIdentityContext)
  const ensurePlaces = context?.ensurePlaces
  const key = placeIds.join(',')
  useEffect(() => { if (key) ensurePlaces?.(key.split(',').map(Number)) }, [key, ensurePlaces])
  const label = (id: number, includeAddress = false) => {
    const place = context?.places[id]
    if (!context) return `연결 장소 #${id}`
    if (place?.status === 'ready') return `${place.name}${includeAddress && place.address ? ` · ${place.address}` : ''} · #${id}`
    return `장소 #${id} · ${place?.status === 'error' ? '조회 실패' : '확인 중'}`
  }
  return { places: context?.places ?? {}, label, retry: (id: number) => ensurePlaces?.([id], true) }
}
