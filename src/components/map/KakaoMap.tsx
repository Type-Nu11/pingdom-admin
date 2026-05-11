import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

type KakaoMaps = {
  load: (callback: () => void) => void
  LatLng: new (latitude: number, longitude: number) => unknown
  Map: new (
    container: HTMLElement,
    options: {
      center: unknown
      level: number
    }
  ) => unknown
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
const DEFAULT_CENTER = {
  latitude: 37.5665,
  longitude: 126.978,
}
let kakaoMapScriptPromise: Promise<void> | null = null

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

function KakaoMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true
    let loadingFallbackTimer: number | undefined

    async function initializeMap() {
      if (!KAKAO_MAP_APP_KEY) {
        setErrorMessage('카카오 지도 키가 설정되지 않았습니다.')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setErrorMessage('')
        await loadKakaoMapScript(KAKAO_MAP_APP_KEY)

        if (!isMounted || !mapContainerRef.current || !window.kakao?.maps) {
          return
        }

        const center = new window.kakao.maps.LatLng(
          DEFAULT_CENTER.latitude,
          DEFAULT_CENTER.longitude
        )

        const map = new window.kakao.maps.Map(mapContainerRef.current, {
          center,
          level: 3,
        })

        loadingFallbackTimer = window.setTimeout(() => {
          if (isMounted) {
            setIsLoading(false)
          }
        }, 1500)

        window.kakao.maps.event.addListener(map, 'tilesloaded', () => {
          if (loadingFallbackTimer) {
            window.clearTimeout(loadingFallbackTimer)
          }

          if (isMounted) {
            setIsLoading(false)
          }
        })
      } catch (error) {
        console.error('카카오 지도 로드 실패', error)

        if (isMounted) {
          setIsLoading(false)
          setErrorMessage('카카오 지도 서비스 설정을 확인해주세요.')
        }
      }
    }

    void initializeMap()

    return () => {
      isMounted = false

      if (loadingFallbackTimer) {
        window.clearTimeout(loadingFallbackTimer)
      }
    }
  }, [])

  return (
    <MapFrame>
      <MapCanvas ref={mapContainerRef} />
      {isLoading ? <MapMessage>카카오 지도를 불러오는 중입니다.</MapMessage> : null}
      {errorMessage ? <MapMessage>{errorMessage}</MapMessage> : null}
    </MapFrame>
  )
}

const MapFrame = styled.div`
  position: relative;
  width: 500px;
  height: 500px;
  max-width: 100%;
`

const MapCanvas = styled.div`
  width: 100%;
  height: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
`

const MapMessage = styled.p`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1;
  margin: 0;
  padding: 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  color: #b91c1c;
`

export default KakaoMap
