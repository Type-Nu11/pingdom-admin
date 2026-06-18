import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

type KakaoMapInstance = {
  getLevel: () => number
  setLevel: (level: number) => void
  setCenter: (center: unknown) => void
}

type KakaoMaps = {
  load: (callback: () => void) => void
  LatLng: new (latitude: number, longitude: number) => unknown
  Map: new (
    container: HTMLElement,
    options: {
      center: unknown
      level: number
    }
  ) => KakaoMapInstance
  event: {
    addListener: (target: unknown, eventName: string, handler: () => void) => void
  }
}

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMaps
    }
  }
}

const KAKAO_MAP_SCRIPT_ID = 'kakao-map-sdk'
const KAKAO_MAP_APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY
const MIN_MAP_LEVEL = 1
const MAX_MAP_LEVEL = 14
const DEFAULT_CENTER = {
  latitude: 37.5665,
  longitude: 126.978,
}
const neutral = adminColors
let kakaoMapScriptPromise: Promise<void> | null = null

interface KakaoMapProps {
  className?: string
}

export interface KakaoMapHandle {
  zoomIn: () => void
  zoomOut: () => void
  moveTo: (latitude: number, longitude: number) => void
}

function loadKakaoMapScript(appKey: string) {
  if (kakaoMapScriptPromise) {
    return kakaoMapScriptPromise
  }

  kakaoMapScriptPromise = new Promise<void>((resolve, reject) => {
    if (window.kakao?.maps) {
      window.kakao.maps.load(resolve)
      return
    }

    const existingScript = document.getElementById(
      KAKAO_MAP_SCRIPT_ID
    ) as HTMLScriptElement | null

    const handleLoad = () => {
      if (!window.kakao?.maps) {
        reject(new Error('카카오 지도 SDK를 찾을 수 없습니다.'))
        return
      }

      window.kakao.maps.load(resolve)
    }

    const handleError = () => {
      reject(new Error('카카오 지도 서비스 설정을 확인해주세요.'))
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = KAKAO_MAP_SCRIPT_ID
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`
    script.async = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })

    document.head.appendChild(script)
  })

  kakaoMapScriptPromise = kakaoMapScriptPromise.catch((error) => {
    kakaoMapScriptPromise = null
    throw error
  })

  return kakaoMapScriptPromise
}

const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(function KakaoMap(
  { className },
  ref
) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<KakaoMapInstance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDelayed, setIsDelayed] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useImperativeHandle(ref, () => ({
    zoomIn() {
      const map = mapInstanceRef.current

      if (!map) {
        return
      }

      map.setLevel(Math.max(MIN_MAP_LEVEL, map.getLevel() - 1))
    },
    zoomOut() {
      const map = mapInstanceRef.current

      if (!map) {
        return
      }

      map.setLevel(Math.min(MAX_MAP_LEVEL, map.getLevel() + 1))
    },
    moveTo(latitude: number, longitude: number) {
      const map = mapInstanceRef.current
      const kakao = window.kakao

      if (!map || !kakao?.maps) {
        return
      }

      map.setCenter(new kakao.maps.LatLng(latitude, longitude))
    },
  }))

  useEffect(() => {
    let isMounted = true
    let delayedMessageTimer: number | undefined

    async function initializeMap() {
      if (!KAKAO_MAP_APP_KEY) {
        setErrorMessage('카카오 지도 키가 설정되지 않았습니다.')
        setIsLoading(false)
        setIsDelayed(false)
        return
      }

      try {
        setIsLoading(true)
        setIsDelayed(false)
        setErrorMessage('')
        await loadKakaoMapScript(KAKAO_MAP_APP_KEY)

        const kakao = window.kakao

        if (!isMounted || !mapContainerRef.current || !kakao?.maps) {
          return
        }

        const center = new kakao.maps.LatLng(
          DEFAULT_CENTER.latitude,
          DEFAULT_CENTER.longitude
        )

        const map = new kakao.maps.Map(mapContainerRef.current, {
          center,
          level: 3,
        })
        mapInstanceRef.current = map

        delayedMessageTimer = window.setTimeout(() => {
          if (isMounted) {
            setIsDelayed(true)
          }
        }, 3000)

        kakao.maps.event.addListener(map, 'tilesloaded', () => {
          if (delayedMessageTimer) {
            window.clearTimeout(delayedMessageTimer)
          }

          if (isMounted) {
            setIsLoading(false)
            setIsDelayed(false)
          }
        })
      } catch (error) {
        console.error('카카오 지도 로드 실패', error)

        if (isMounted) {
          setIsLoading(false)
          setIsDelayed(false)
          setErrorMessage('카카오 지도 서비스 설정을 확인해주세요.')
        }
      }
    }

    void initializeMap()

    return () => {
      isMounted = false
      mapInstanceRef.current = null

      if (delayedMessageTimer) {
        window.clearTimeout(delayedMessageTimer)
      }
    }
  }, [])

  return (
    <MapFrame className={className}>
      <MapCanvas ref={mapContainerRef} />
      {isLoading ? (
        <MapMessage>
          {isDelayed
            ? '지도 로딩이 지연되고 있습니다. 네트워크 상태를 확인해주세요.'
            : '카카오 지도를 불러오는 중입니다.'}
        </MapMessage>
      ) : null}
      {errorMessage ? <MapMessage>{errorMessage}</MapMessage> : null}
    </MapFrame>
  )
})

const MapFrame = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 360px;
  max-width: 100%;
`

const MapCanvas = styled.div`
  width: 100%;
  height: 100%;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  overflow: hidden;
  background: ${neutral.surfaceLow};
`

const MapMessage = styled.p`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1;
  margin: 0;
  padding: 16px;
  border-radius: 8px;
  background: ${neutral.softOverlay};
  color: ${neutral.error};
`

export default KakaoMap
