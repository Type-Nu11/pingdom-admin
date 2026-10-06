// Keep dependencies inside this function: Playwright serializes it into the page.
// Measures uniform CSS color surfaces, not images, gradients or glyph antialiasing.
export function measureElementContrast(element) {
  const view = element.ownerDocument.defaultView
  const rgba = value => {
    if (value === 'transparent') return [0, 0, 0, 0]
    const match = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/)
    if (!match) throw new Error(`Unsupported contrast color: ${value}`)
    return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4] ?? 1)]
  }
  const over = (foreground, background) => {
    const alpha = foreground[3] + background[3] * (1 - foreground[3])
    if (alpha === 0) return [0, 0, 0, 0]
    return [...foreground.slice(0, 3).map((value, i) =>
      (value * foreground[3] + background[i] * background[3] * (1 - foreground[3])) / alpha), alpha]
  }
  let foreground = rgba(view.getComputedStyle(element).color)
  let background = [0, 0, 0, 0]
  // Compose each group's contents first, then apply its filter and opacity.
  // Traversing outward keeps parent opacity from being applied separately to
  // the child's text and opaque surface (which would incorrectly double-blend).
  for (let node = element; node; node = node.parentElement) {
    const style = view.getComputedStyle(node)
    const surface = rgba(style.backgroundColor)
    foreground = over(foreground, surface)
    background = over(background, surface)
    const filter = style.filter || 'none'
    if (filter !== 'none') {
      const brightness = filter.match(/^brightness\(([\d.]+)(%)?\)$/)
      if (!brightness) throw new Error(`Unsupported contrast filter: ${filter}`)
      const factor = Number(brightness[1]) / (brightness[2] ? 100 : 1)
      const apply = pixel => [...pixel.slice(0, 3).map(value => Math.min(255, value * factor)), pixel[3]]
      foreground = apply(foreground)
      background = apply(background)
    }
    const opacity = style.opacity === '' ? 1 : Number(style.opacity)
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw new Error(`Unsupported contrast opacity: ${style.opacity}`)
    foreground[3] *= opacity
    background[3] *= opacity
  }
  const canvas = [255, 255, 255, 1]
  const fg = over(foreground, canvas).slice(0, 3)
  const bg = over(background, canvas).slice(0, 3)
  const luminance = color => color.map(value => {
    const s = value / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0)
  const a = luminance(fg), b = luminance(bg)
  return { name: element.dataset.contrast, foreground: fg, background: bg, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }
}
