import type { MapMarker } from './map.types'
import {
  getPlaceCategoryFlameMarkerImageUrl, getPlaceCategoryMarkerImageUrl,
  getPlaceCategoryLabel,
} from '../../utils/placeCategory'

const renderedStyles = new WeakMap<HTMLButtonElement, string>()

export function updateNaverMarker(button: HTMLButtonElement, marker: MapMarker, active: boolean, zoom: number, width: number) {
  const widthScale = width > 0 ? Math.min(1.08, Math.max(0.82, width / 960)) : 1
  // Preserve the existing marker hierarchy; NAVER zoom increases when zooming in.
  const normalized = (Math.min(12, Math.max(1, 19 - zoom)) - 1) / 11
  const level = Number.isFinite(marker.level) ? marker.level! : 0
  const levelScale = level >= 20 ? 1.2 ** 3 : level >= 15 ? 1.2 ** 2 : level >= 5 ? 1.2 : 1
  const scale = Math.min(1.18, Math.max(0.7, (1.14 - normalized * 0.36) * widthScale)) * levelScale
  const w = Math.round((active ? 50 : 44) * scale)
  const h = Math.round((active ? 67 : 59) * scale)
  const category = getPlaceCategoryLabel(marker)
  const label = category === '카테고리 없음' ? marker.label : marker.label + ' · ' + category
  const imageUrl = level >= 10 ? getPlaceCategoryFlameMarkerImageUrl(marker) : getPlaceCategoryMarkerImageUrl(marker)
  const styleKey = JSON.stringify([label, active, w, h, imageUrl])
  if (renderedStyles.get(button) === styleKey) return
  renderedStyles.set(button, styleKey)
  button.setAttribute('aria-label', label + ' 위치 선택')
  button.setAttribute('aria-pressed', String(active))
  button.title = label
  button.style.width = w + 'px'
  button.style.height = h + 'px'
  button.style.zIndex = active ? '30' : '20'
  button.style.filter = active ? 'drop-shadow(0 4px 8px rgba(255,25,86,.4))' : 'drop-shadow(0 3px 6px rgba(255,25,86,.2))'
  const image = button.firstElementChild as HTMLImageElement
  image.src = imageUrl
  image.width = w
  image.height = h
}

export function createNaverMarkerButton(onClick: () => void) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'pingdom-map-marker'
  Object.assign(button.style, {
    position: 'absolute', padding: '0', border: '0', background: 'transparent',
    cursor: 'pointer', transform: 'translate(-50%, -62%)',
  })
  button.onclick = event => { event.stopPropagation(); onClick() }
  button.onpointerdown = event => event.stopPropagation()
  button.onmousedown = event => event.stopPropagation()
  button.ontouchstart = event => event.stopPropagation()
  button.onkeydown = event => event.stopPropagation()
  button.onkeyup = event => event.stopPropagation()
  const image = document.createElement('img')
  image.alt = ''
  image.draggable = false
  image.setAttribute('aria-hidden', 'true')
  Object.assign(image.style, { width: '100%', height: '100%', display: 'block', pointerEvents: 'none' })
  button.append(image)
  return button
}
