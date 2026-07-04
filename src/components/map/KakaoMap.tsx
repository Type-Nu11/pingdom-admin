import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import type { MutableRefObject } from 'react'
import styled from 'styled-components'
import { adminColors } from '../../styles/theme'
import {
  getPlaceCategoryLabel,
  getPlaceCategoryMarkerImageUrl,
  PLACE_CATEGORY_ACCENT_COLOR,
} from '../../utils/placeCategory'

type KakaoMapInstance = {
  getLevel: () => number
  setLevel: (level: number) => void
  setZoomable: (zoomable: boolean) => void
  relayout: () => void
  setCenter: (center: unknown) => void
  setBounds: (bounds: unknown) => void
  getProjection?: () => {
    coordsFromContainerPoint?: (point: unknown) => unknown
  }
}

type KakaoMapOverlay = {
  setMap: (map: KakaoMapInstance | null) => void
}

type KakaoMaps = {
  load: (callback: () => void) => void
  LatLng: new (latitude: number, longitude: number) => unknown
  Point: new (x: number, y: number) => unknown
  LatLngBounds: new () => {
    extend: (position: unknown) => void
  }
  Map: new (
    container: HTMLElement,
    options: {
      center: unknown
      level: number
    }
  ) => KakaoMapInstance
  CustomOverlay: new (options: {
    position: unknown
    content: HTMLElement
    xAnchor: number
    yAnchor: number
    zIndex: number
  }) => KakaoMapOverlay
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
const INITIAL_MAP_LEVEL = 3
const WHEEL_ZOOM_THROTTLE_MS = 140
const DEFAULT_MAP_WIDTH = 960
const DEFAULT_CENTER = {
  latitude: 37.5665,
  longitude: 126.978,
}
const neutral = adminColors
let kakaoMapScriptPromise: Promise<void> | null = null

interface KakaoMapProps {
  className?: string
  markers?: KakaoMapMarker[]
  activeMarkerId?: number | null
  fitBoundsKey?: string
  onMarkerClick?: (markerId: number) => void
}

type MarkerClickRef = MutableRefObject<KakaoMapProps['onMarkerClick']>

export interface KakaoMapMarker {
  id: number
  latitude: number
  longitude: number
  label: string
  category?: string
  categoryName?: string
}

export interface KakaoMapHandle {
  zoomIn: () => void
  zoomOut: () => void
  relayout: () => void
  moveTo: (
    latitude: number,
    longitude: number,
    options?: {
      offsetX?: number
    }
  ) => void
  fitToMarkers: () => void
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
  {
    activeMarkerId = null,
    className,
    fitBoundsKey = '',
    markers = [],
    onMarkerClick,
  },
  ref
) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<KakaoMapInstance | null>(null)
  const markerOverlayRefs = useRef<KakaoMapOverlay[]>([])
  const onMarkerClickRef = useRef<KakaoMapProps['onMarkerClick']>(onMarkerClick)
  const lastFitBoundsKeyRef = useRef('')
  const wheelZoomTimerRef = useRef<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDelayed, setIsDelayed] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapLevel, setMapLevel] = useState(INITIAL_MAP_LEVEL)
  const [mapWidthScale, setMapWidthScale] = useState(1)

  const updateMapLevel = useCallback((levelDelta: number) => {
    const map = mapInstanceRef.current

    if (!map) {
      return
    }

    const currentLevel = map.getLevel()
    const nextLevel = clampMapLevel(currentLevel + levelDelta)

    if (nextLevel !== currentLevel) {
      map.setLevel(nextLevel)
    }
  }, [])

  const fitCurrentMarkersToMap = useCallback(() => {
    const map = mapInstanceRef.current
    const kakao = window.kakao
    const validMarkers = markers.filter(hasValidMarkerCoordinate)

    if (!map || !kakao?.maps || validMarkers.length === 0) {
      return
    }

    if (validMarkers.length === 1) {
      const [marker] = validMarkers
      map.setCenter(new kakao.maps.LatLng(marker.latitude, marker.longitude))

      return
    }

    const bounds = new kakao.maps.LatLngBounds()

    validMarkers.forEach((marker) => {
      bounds.extend(new kakao.maps.LatLng(marker.latitude, marker.longitude))
    })

    map.setBounds(bounds)
  }, [markers])

  useImperativeHandle(ref, () => ({
    zoomIn() {
      updateMapLevel(-1)
    },
    zoomOut() {
      updateMapLevel(1)
    },
    relayout() {
      mapInstanceRef.current?.relayout()
    },
    moveTo(latitude: number, longitude: number, options) {
      const map = mapInstanceRef.current
      const kakao = window.kakao

      if (!map || !kakao?.maps) {
        return
      }

      const position = new kakao.maps.LatLng(latitude, longitude)
      map.setCenter(position)

      const offsetX = options?.offsetX ?? 0

      if (offsetX === 0 || !mapContainerRef.current) {
        return
      }

      const projection = map.getProjection?.()

      if (!projection?.coordsFromContainerPoint) {
        return
      }

      const containerWidth = mapContainerRef.current.clientWidth
      const containerHeight = mapContainerRef.current.clientHeight
      const adjustedCenterPoint = new kakao.maps.Point(
        containerWidth / 2 - offsetX,
        containerHeight / 2
      )
      const adjustedCenter = projection.coordsFromContainerPoint(adjustedCenterPoint)

      map.setCenter(adjustedCenter)
    },
    fitToMarkers() {
      fitCurrentMarkersToMap()
    },
  }), [fitCurrentMarkersToMap, updateMapLevel])

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick
  }, [onMarkerClick])

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
          level: INITIAL_MAP_LEVEL,
        })
        map.setZoomable(false)
        mapInstanceRef.current = map
        setMapLevel(map.getLevel())
        setIsMapReady(true)

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

        kakao.maps.event.addListener(map, 'zoom_changed', () => {
          if (isMounted) {
            setMapLevel(map.getLevel())
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
      setIsMapReady(false)
      markerOverlayRefs.current.forEach((overlay) => overlay.setMap(null))
      markerOverlayRefs.current = []
      mapInstanceRef.current = null
      clearWheelZoomTimer(wheelZoomTimerRef)

      if (delayedMessageTimer) {
        window.clearTimeout(delayedMessageTimer)
      }
    }
  }, [])

  useEffect(() => {
    const mapContainer = mapContainerRef.current

    if (!isMapReady || !mapContainer) {
      return
    }

    const handleWheelZoom = (event: WheelEvent) => {
      event.preventDefault()

      if (wheelZoomTimerRef.current !== null || event.deltaY === 0) {
        return
      }

      updateMapLevel(event.deltaY > 0 ? 1 : -1)

      wheelZoomTimerRef.current = window.setTimeout(() => {
        wheelZoomTimerRef.current = null
      }, WHEEL_ZOOM_THROTTLE_MS)
    }

    mapContainer.addEventListener('wheel', handleWheelZoom, { passive: false })

    return () => {
      mapContainer.removeEventListener('wheel', handleWheelZoom)
      clearWheelZoomTimer(wheelZoomTimerRef)
    }
  }, [isMapReady, updateMapLevel])

  useEffect(() => {
    const mapContainer = mapContainerRef.current
    const map = mapInstanceRef.current

    if (!isMapReady || !mapContainer || !map || typeof ResizeObserver === 'undefined') {
      return
    }

    let resizeAnimationFrameId: number | null = null

    const resizeObserver = new ResizeObserver(() => {
      if (resizeAnimationFrameId !== null) {
        window.cancelAnimationFrame(resizeAnimationFrameId)
      }

      resizeAnimationFrameId = window.requestAnimationFrame(() => {
        resizeAnimationFrameId = null
        map.relayout()
        setMapWidthScale(getMapWidthScale(mapContainer.clientWidth))
      })
    })

    resizeObserver.observe(mapContainer)
    setMapWidthScale(getMapWidthScale(mapContainer.clientWidth))

    return () => {
      resizeObserver.disconnect()

      if (resizeAnimationFrameId !== null) {
        window.cancelAnimationFrame(resizeAnimationFrameId)
      }
    }
  }, [isMapReady])

  useEffect(() => {
    const map = mapInstanceRef.current
    const kakao = window.kakao

    markerOverlayRefs.current.forEach((overlay) => overlay.setMap(null))
    markerOverlayRefs.current = []

    if (!isMapReady || !map || !kakao?.maps) {
      return
    }

    let fitBoundsAnimationFrameId: number | null = null
    const validMarkers = markers.filter(hasValidMarkerCoordinate)

    validMarkers.forEach((marker) => {
      const isActive = marker.id === activeMarkerId
      const position = new kakao.maps.LatLng(marker.latitude, marker.longitude)
      const content = createMarkerContent(
        marker,
        isActive,
        mapLevel,
        mapWidthScale,
        onMarkerClickRef
      )
      const overlay = new kakao.maps.CustomOverlay({
        position,
        content,
        xAnchor: 0.5,
        yAnchor: 0.62,
        zIndex: isActive ? 30 : 20,
      })

      overlay.setMap(map)
      markerOverlayRefs.current.push(overlay)
    })

    if (fitBoundsKey && lastFitBoundsKeyRef.current !== fitBoundsKey) {
      lastFitBoundsKeyRef.current = fitBoundsKey

      fitBoundsAnimationFrameId = window.requestAnimationFrame(() => {
        fitBoundsAnimationFrameId = null
        fitCurrentMarkersToMap()
      })
    }

    return () => {
      if (fitBoundsAnimationFrameId !== null) {
        window.cancelAnimationFrame(fitBoundsAnimationFrameId)
      }

      markerOverlayRefs.current.forEach((overlay) => overlay.setMap(null))
      markerOverlayRefs.current = []
    }
  }, [
    activeMarkerId,
    fitBoundsKey,
    fitCurrentMarkersToMap,
    isMapReady,
    mapLevel,
    mapWidthScale,
    markers,
  ])

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

function hasValidMarkerCoordinate(marker: KakaoMapMarker) {
  return (
    typeof marker.latitude === 'number' &&
    typeof marker.longitude === 'number' &&
    Number.isFinite(marker.latitude) &&
    Number.isFinite(marker.longitude)
  )
}

function clampMapLevel(level: number) {
  return Math.min(MAX_MAP_LEVEL, Math.max(MIN_MAP_LEVEL, level))
}

function getMapWidthScale(width: number) {
  if (!Number.isFinite(width) || width <= 0) {
    return 1
  }

  return Math.min(1.08, Math.max(0.82, width / DEFAULT_MAP_WIDTH))
}

function getMarkerScale(mapLevel: number, mapWidthScale: number) {
  const normalizedLevel =
    (clampMapLevel(mapLevel) - MIN_MAP_LEVEL) / (MAX_MAP_LEVEL - MIN_MAP_LEVEL)
  const zoomScale = 1.14 - normalizedLevel * 0.36

  return Math.min(1.18, Math.max(0.7, zoomScale * mapWidthScale))
}

function getMarkerDimensions(
  isActive: boolean,
  mapLevel: number,
  mapWidthScale: number
) {
  const scale = getMarkerScale(mapLevel, mapWidthScale)

  return {
    imageWidth: Math.round((isActive ? 50 : 44) * scale),
    imageHeight: Math.round((isActive ? 67 : 59) * scale),
  }
}

function clearWheelZoomTimer(timerRef: MutableRefObject<number | null>) {
  if (timerRef.current === null) {
    return
  }

  window.clearTimeout(timerRef.current)
  timerRef.current = null
}

function createMarkerContent(
  marker: KakaoMapMarker,
  isActive: boolean,
  mapLevel: number,
  mapWidthScale: number,
  onMarkerClickRef: MarkerClickRef
) {
  const markerDimensions = getMarkerDimensions(isActive, mapLevel, mapWidthScale)
  const categoryLabel = getPlaceCategoryLabel(marker)
  const markerImageUrl = getPlaceCategoryMarkerImageUrl(marker)
  const markerLabel =
    categoryLabel === '카테고리 없음'
      ? marker.label
      : `${marker.label} · ${categoryLabel}`
  const markerButton = document.createElement('button')
  markerButton.type = 'button'
  markerButton.setAttribute('aria-label', `${markerLabel} 위치 선택`)
  markerButton.title = markerLabel
  markerButton.style.position = 'relative'
  markerButton.style.display = 'inline-flex'
  markerButton.style.alignItems = 'flex-end'
  markerButton.style.justifyContent = 'center'
  markerButton.style.width = `${markerDimensions.imageWidth}px`
  markerButton.style.height = `${markerDimensions.imageHeight}px`
  markerButton.style.padding = '0'
  markerButton.style.border = '0'
  markerButton.style.background = 'transparent'
  markerButton.style.color = PLACE_CATEGORY_ACCENT_COLOR
  markerButton.style.cursor = 'pointer'
  markerButton.style.fontFamily =
    "'Hanken Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  markerButton.style.lineHeight = '1'
  markerButton.style.transition = 'opacity 160ms ease, transform 160ms ease'

  markerButton.addEventListener('mouseenter', () => {
    markerButton.style.transform = 'translateY(-2px)'
  })

  markerButton.addEventListener('mouseleave', () => {
    markerButton.style.transform = 'translateY(0)'
  })

  markerButton.addEventListener('click', () => {
    onMarkerClickRef.current?.(marker.id)
  })

  const markerImage = document.createElement('img')
  markerImage.setAttribute('aria-hidden', 'true')
  markerImage.draggable = false
  markerImage.src = markerImageUrl
  markerImage.alt = ''
  markerImage.width = markerDimensions.imageWidth
  markerImage.height = markerDimensions.imageHeight
  markerImage.style.display = 'block'
  markerImage.style.width = '100%'
  markerImage.style.height = '100%'
  markerImage.style.objectFit = 'contain'
  markerImage.style.pointerEvents = 'none'
  markerImage.style.transformOrigin = '50% 62%'

  if (isActive) {
    markerImage.animate(
      [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-10px) scale(1.04)' },
        { transform: 'translateY(0) scale(0.98)' },
        { transform: 'translateY(-4px) scale(1.02)' },
        { transform: 'translateY(0) scale(1)' },
      ],
      {
        duration: 540,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    )
  }

  markerButton.appendChild(markerImage)

  return markerButton
}

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
