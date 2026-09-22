import { isValidMapCoordinate, type MapHandle, type MapProps, type MapMarker } from './map.types'
import type { NaverMaps, NaverOverlay } from './naverMaps.types'
import { createNaverMarkerButton, updateNaverMarker } from './naverMarker'

const MIN_ZOOM = 7
const MAX_ZOOM = 21
const ZOOM_INTERVAL_MS = 200

export function createNaverMapController(maps: NaverMaps, container: HTMLElement, viewport: HTMLElement, callbacks: Pick<MapProps, 'onMarkerClick' | 'onMapClick'>) {
  const map = new maps.Map(container, {
    center: new maps.LatLng(37.5665, 126.978), zoom: 16,
    minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM, scrollWheel: false, keyboardShortcuts: true,
  })
  let props: MapProps = {}
  let disposed = false
  let lastZoomAt = -Infinity
  const zoomBy = (step: number) => {
    if (disposed) return
    const now = performance.now()
    if (now - lastZoomAt < ZOOM_INTERVAL_MS) return
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, map.getZoom() + step))
    if (next === map.getZoom()) return
    lastZoomAt = now
    map.setZoom(next, false)
  }
  const onWheel = (event: WheelEvent) => {
    // Trackpad pinch is delivered as ctrl+wheel: contain it within the map.
    // The listener is scoped to the viewport, so browser zoom elsewhere is unchanged.
    if (event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
    event.preventDefault()
    zoomBy(event.deltaY < 0 ? 1 : -1)
  }
  viewport.addEventListener('wheel', onWheel, { passive: false })
  let lastFitKey = ''
  let frame: number | null = null
  let lastSize: { width: number; height: number } | null = null
  const entries = new Map<number, { overlay: NaverOverlay; button: HTMLButtonElement; marker: MapMarker }>()
  const validMarkers = () => (props.markers ?? []).filter(isValidMapCoordinate)
  const refreshMarkerStyles = () => {
    entries.forEach(entry => updateNaverMarker(entry.button, entry.marker, entry.marker.id === props.activeMarkerId, map.getZoom(), container.clientWidth))
  }
  const fit = () => {
    const coordinates = validMarkers().map(marker => new maps.LatLng(marker.latitude, marker.longitude))
    if (coordinates.length === 1) map.setCenter(coordinates[0])
    else if (coordinates.length > 1) map.fitBounds(coordinates)
  }
  const resize = () => {
    if (disposed) return
    const width = viewport.clientWidth
    const height = viewport.clientHeight
    if (width === 0 || height === 0) return
    if (lastSize?.width === width && lastSize.height === height) return
    map.setSize({ width, height })
    lastSize = { width, height }
    refreshMarkerStyles()
    if (props.fitBoundsKey && props.activeMarkerId == null) fit()
  }
  const listeners = [
    maps.Event.addListener(map, 'zoom_changed', refreshMarkerStyles),
    maps.Event.addListener(map, 'click', event => {
      const coord = (event as { coord?: { lat(): number; lng(): number } } | undefined)?.coord
      if (!coord) return
      const coordinate = { latitude: coord.lat(), longitude: coord.lng() }
      if (isValidMapCoordinate(coordinate)) callbacks.onMapClick?.(coordinate)
    }),
  ]
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
    if (disposed) return
    if (frame !== null) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => { frame = null; resize() })
  })
  observer?.observe(viewport)
  resize()

  const handle: MapHandle = {
    zoomIn: () => zoomBy(1),
    zoomOut: () => zoomBy(-1),
    relayout: resize,
    moveTo(latitude, longitude, options) {
      if (disposed || !isValidMapCoordinate({ latitude, longitude })) return
      const coord = new maps.LatLng(latitude, longitude)
      map.setCenter(coord)
      const offset = options?.offsetX ?? 0
      if (!Number.isFinite(offset) || offset === 0) return
      const projection = map.getProjection()
      const point = projection.fromCoordToOffset(coord)
      map.setCenter(projection.fromOffsetToCoord(new maps.Point(point.x - offset, point.y)))
    },
    fitToMarkers: () => { if (!disposed) fit() },
  }
  return {
    handle,
    update(next: MapProps) {
      if (disposed) return
      props = next
      const markers = validMarkers()
      const ids = new Set(markers.map(marker => marker.id))
      entries.forEach((entry, id) => {
        if (!ids.has(id)) { entry.overlay.setMap(null); entries.delete(id) }
      })
      for (const marker of markers) {
        let entry = entries.get(marker.id)
        if (!entry) {
          const button = createNaverMarkerButton(() => callbacks.onMarkerClick?.(marker.id))
          // OverlayView retains the native button, including focus, between updates.
          class PlaceOverlay extends maps.OverlayView {
            onAdd() { this.getPanes().overlayLayer.append(button) }
            onRemove() {
              button.remove()
              button.onclick = button.onpointerdown = button.onmousedown = button.ontouchstart = button.onkeydown = button.onkeyup = null
            }
            draw() {
              const current = entries.get(marker.id)?.marker ?? marker
              const point = this.getProjection().fromCoordToOffset(new maps.LatLng(current.latitude, current.longitude))
              button.style.left = point.x + 'px'
              button.style.top = point.y + 'px'
            }
          }
          entry = { overlay: new PlaceOverlay(), button, marker }
          entries.set(marker.id, entry)
          entry.overlay.setMap(map)
        } else {
          entry.marker = marker
          entry.overlay.draw()
        }
      }
      refreshMarkerStyles()
      if (next.fitBoundsKey && next.activeMarkerId == null && lastFitKey !== next.fitBoundsKey) {
        fit()
        lastFitKey = next.fitBoundsKey
      }
    },
    destroy() {
      if (disposed) return
      disposed = true
      viewport.removeEventListener('wheel', onWheel)
      observer?.disconnect()
      if (frame !== null) cancelAnimationFrame(frame)
      listeners.forEach(listener => maps.Event.removeListener(listener))
      entries.forEach(entry => entry.overlay.setMap(null))
      entries.clear()
      map.destroy()
    },
  }
}

export type NaverMapController = ReturnType<typeof createNaverMapController>
