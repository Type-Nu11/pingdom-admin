import type { NaverLatLng, NaverMapInstance } from './naverMaps.types'

// Trial values for the public GL SDK, not NAVER service's internal settings.
export const GL_BUTTON_STEP = 0.5
const MAX_FRAME_STEP = 0.5
const WHEEL_PIXEL_SCALE = 0.005

export function glWheelStep(deltaY: number, deltaMode: number, height: number) {
  if (!Number.isFinite(deltaY)) return 0
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? Math.max(1, height) : 1)
  return Math.max(-MAX_FRAME_STEP, Math.min(MAX_FRAME_STEP, -pixels * WHEEL_PIXEL_SCALE))
}

// One small camera change per paint. No idle-driven destination queue and no
// competing SDK animations: input stops after the next frame, including reversal.
export function createNaverGlZoomController(map: NaverMapInstance, min: number, max: number) {
  let frame: number | null = null
  let delta = 0
  let origin: (() => NaverLatLng) | undefined
  let disposed = false
  let rasterWheelDelta = 0
  const discardPending = () => {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
    delta = 0
    origin = undefined
    rasterWheelDelta = 0
  }
  const request = (step: number, anchor?: () => NaverLatLng) => {
    if (disposed || !Number.isFinite(step) || step === 0) return
    if (!anchor || Math.sign(rasterWheelDelta) !== Math.sign(step)) rasterWheelDelta = 0
    // A new direction supersedes old intent; wheel/button origins never mix.
    if (Math.sign(delta) !== Math.sign(step) || Boolean(origin) !== Boolean(anchor)) delta = 0
    delta = Math.max(-MAX_FRAME_STEP, Math.min(MAX_FRAME_STEP, delta + step))
    origin = anchor
    if (frame !== null) return
    frame = requestAnimationFrame(() => {
      frame = null
      const step = delta
      const anchor = origin
      delta = 0
      origin = undefined
      if (disposed) return
      map.stop()
      // Read the actual renderer, not the requested `gl` option: the SDK can
      // fall back to image tiles, whose zoomBy rounds fractional deltas.
      let zoomDelta = step
      if (map.get('renderMode') !== 2) {
        if (anchor) {
          rasterWheelDelta += step
          if (Math.abs(rasterWheelDelta) < GL_BUTTON_STEP) return
          zoomDelta = Math.sign(rasterWheelDelta)
          rasterWheelDelta -= zoomDelta * GL_BUTTON_STEP
        } else zoomDelta = Math.sign(step)
      } else rasterWheelDelta = 0
      const current = map.getZoom()
      const next = Math.max(min, Math.min(max, current + zoomDelta))
      if (!Number.isFinite(current) || next === current) return
      map.zoomBy(next - current, anchor?.(), false)
    })
  }
  return {
    button: (direction: number) => request(direction * GL_BUTTON_STEP),
    wheel: (step: number, anchor: () => NaverLatLng) => request(step, anchor),
    idle() { /* GL input is paint-driven, not tile/idle-driven. */ },
    discardPending,
    cancel() { discardPending(); map.stop() },
    destroy() { disposed = true; discardPending(); map.stop() },
  }
}
