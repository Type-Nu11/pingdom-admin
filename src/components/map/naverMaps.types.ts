// Narrow structural types for the SDK surface used by this adapter.
export interface NaverLatLng { lat(): number; lng(): number }
export interface NaverPoint { x: number; y: number }
export interface NaverMapInstance {
  getZoom(): number
  setZoom(zoom: number, animate?: boolean): void
  zoomBy(delta: number, origin?: NaverLatLng, animate?: boolean): void
  stop(): void
  setCenter(center: NaverLatLng): void
  fitBounds(bounds: NaverLatLng[]): void
  setSize(size: { width: number; height: number }): void
  getProjection(): {
    fromCoordToOffset(coord: NaverLatLng): NaverPoint
    fromOffsetToCoord(point: NaverPoint): NaverLatLng
  }
  destroy(): void
}
export interface NaverOverlay {
  onAdd(): void
  onRemove(): void
  draw(): void
  setMap(map: NaverMapInstance | null): void
  getPanes(): { overlayLayer: HTMLElement }
  getProjection(): { fromCoordToOffset(coord: NaverLatLng): NaverPoint }
}
export interface NaverMaps {
  Service?: {
    Status: { OK: number }
    geocode(options: { query: string }, callback: (status: number, response: { v2?: { addresses?: NaverAddress[] } }) => void): void
  }
  LatLng: new (latitude: number, longitude: number) => NaverLatLng
  Point: new (x: number, y: number) => NaverPoint
  Map: new (element: HTMLElement, options: {
    center: NaverLatLng; zoom: number; minZoom: number; maxZoom: number
    scrollWheel: boolean; keyboardShortcuts: boolean
    tileTransition: boolean
  }) => NaverMapInstance
  OverlayView: new () => NaverOverlay
  Event: {
    addListener(target: object, event: string, handler: (event?: unknown) => void): object
    removeListener(listener: object): void
  }
}
export interface NaverAddress {
  roadAddress: string
  jibunAddress: string
  x: string
  y: string
  addressElements?: Array<{ types: string[]; longName: string }>
}
declare global {
  interface Window {
    naver?: { maps: NaverMaps }
    navermap_authFailure?: () => void
  }
}
