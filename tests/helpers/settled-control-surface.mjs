// Read the final CSS value, not the rgba interpolation of an active transition.
// This does not change styles, finish animations early, or relax assertions.
export function settledControlSurface(locator, timeoutMs = 2000) {
  return locator.evaluate(async (element, timeout) => {
    const snapshot = () => {
      const css = getComputedStyle(element)
      return { background: css.backgroundColor, border: css.borderTopWidth, outline: css.outlineStyle,
        label: element.getAttribute('aria-label'), hovered: element.matches(':hover'), disabled: element.matches(':disabled') }
    }
    const started = performance.now()
    for (;;) {
      const active = element.getAnimations().filter(animation => animation.pending || animation.playState === 'running')
      if (active.length === 0) return snapshot()
      if (performance.now() - started >= timeout) {
        throw new Error(`Control transitions did not settle within ${timeout}ms: ${JSON.stringify(snapshot())}`)
      }
      await new Promise(resolve => setTimeout(resolve, 16))
    }
  }, timeoutMs)
}
