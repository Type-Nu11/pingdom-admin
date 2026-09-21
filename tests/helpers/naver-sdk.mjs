// Deterministic SDK double: verifies adapter behavior, not real NAVER tile rendering.
export function installNaverSdk() {
  const stats = { maps: [], overlays: [], listeners: new Set(), centers: [], fits: [], sizes: [], destroyed: 0 }
  const emit = (target, name, event) => {
    for (const item of [...stats.listeners]) if (item.target === target && item.name === name) item.handler(event)
  }
  class LatLng {
    constructor(lat, lng) { this.latitude = lat; this.longitude = lng }
    lat() { return this.latitude }
    lng() { return this.longitude }
  }
  class Point { constructor(x, y) { this.x = x; this.y = y } }
  class MapInstance {
    constructor(element, options) {
      this.element = element; this.options = options; this.center = options.center; this.zoom = options.zoom
      this.pane = document.createElement('div')
      this.pane.style.cssText = 'position:absolute;inset:0;background:#e9efed'
      element.append(this.pane)
      stats.maps.push(this)
      this.click = event => {
        if (event.target.closest('button')) return
        emit(this, 'click', { coord: new LatLng(37.57, 126.98) })
      }
      element.addEventListener('click', this.click)
    }
    getZoom() { return this.zoom }
    setZoom(zoom) { this.zoom = zoom; emit(this, 'zoom_changed') }
    redraw() { stats.overlays.filter(o => o.map === this).forEach(o => o.draw()) }
    setCenter(coord) { this.center = coord; stats.centers.push(coord); this.redraw() }
    fitBounds(coords) { stats.fits.push(coords); this.setCenter(coords[0]) }
    setSize(size) { stats.sizes.push(size); this.redraw() }
    getProjection() {
      return {
        fromCoordToOffset: c => new Point(this.element.clientWidth / 2 + (c.lng() - this.center.lng()) * 10000, this.element.clientHeight / 2 - (c.lat() - this.center.lat()) * 10000),
        fromOffsetToCoord: p => new LatLng(this.center.lat() - (p.y - this.element.clientHeight / 2) / 10000, this.center.lng() + (p.x - this.element.clientWidth / 2) / 10000),
      }
    }
    destroy() { stats.destroyed++; this.element.removeEventListener('click', this.click); this.pane.remove() }
  }
  class OverlayView {
    constructor() { stats.overlays.push(this) }
    setMap(map) {
      if (this.map) this.onRemove()
      this.map = map
      if (map) { this.onAdd(); this.draw() }
    }
    getPanes() { return { overlayLayer: this.map.pane } }
    getProjection() { return this.map.getProjection() }
  }
  window.naver = { maps: {
    LatLng, Point, Map: MapInstance, OverlayView,
    Event: {
      addListener(target, name, handler) { const item = { target, name, handler }; stats.listeners.add(item); return item },
      removeListener(item) { stats.listeners.delete(item) },
    },
  } }
  window.naverTest = { stats, emit }
  return window.naver.maps
}
