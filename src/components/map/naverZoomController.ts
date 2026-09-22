import type { NaverMapInstance } from './naverMaps.types'

// Coalesce a burst into one destination, never a queue of individual animations.
export function createNaverZoomController(map: NaverMapInstance, min: number, max: number) {
  let target: number | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let disposed = false
  let applying = false
  let animating = false
  let destination: number | null = null
  let idleDuringApply = false
  const finish = () => {
    animating = false
    if (target === destination) target = null
    if (target !== null) schedule()
  }
  const schedule = () => {
    if (disposed || animating || timer !== null) return
    timer = setTimeout(() => {
      timer = null
      if (disposed || target === null) return
      const current = map.getZoom()
      // Large jumps stretch raster tiles until replacement tiles arrive.
      // Keep one latest destination, but animate at most one zoom level at a time.
      const next = current + Math.max(-1, Math.min(1, target - current))
      // A clamped or cancelled-out intent may not emit an SDK idle event.
      if (next === map.getZoom()) { target = null; return }
      applying = true
      try {
        destination = next
        animating = true
        idleDuringApply = false
        map.setZoom(next, true)
      } finally { applying = false }
      if (idleDuringApply) finish()
    }, 16)
  }
  const request = (step: number) => {
    if (disposed) return
    target = Math.max(min, Math.min(max, (target ?? map.getZoom()) + step))
    schedule()
  }
  const cancel = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    target = null
    animating = false
    destination = null
    map.stop()
  }
  return {
    discardPending() {
      if (timer !== null) clearTimeout(timer)
      timer = null
      target = null
    },
    button(step: number) { request(step) },
    idle() {
      if (applying) { idleDuringApply = true; return }
      if (animating) finish()
    },
    cancel,
    destroy() { disposed = true; cancel() },
  }
}
