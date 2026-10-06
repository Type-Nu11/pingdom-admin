import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { startAccessibilityServer } from './ui-accessibility-server.mjs'

const { server, url } = await startAccessibilityServer()
let browser
// This is a repeatable regression of production CSS/DOM, including hover/focus.
function measure(element) {
  const rgba = value => {
    const values = value.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 0]
    return [...values.slice(0, 3), values[3] ?? 1]
  }
  const blend = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]))
  const ancestors = []
  for (let node = element; node; node = node.parentElement) ancestors.unshift(node)
  let bg = ancestors.reduce((color, node) => blend(rgba(getComputedStyle(node).backgroundColor), color), [255, 255, 255])
  let fg = blend(rgba(getComputedStyle(element).color), bg)
  const style = getComputedStyle(element)
  if (style.filter !== 'none') {
    const brightness = style.filter.match(/^brightness\(([\d.]+)\)$/)
    if (!brightness) throw new Error(`Unsupported contrast filter: ${style.filter}`)
    const factor = Number(brightness[1])
    fg = fg.map(value => Math.min(255, value * factor))
    // These cases have opaque surfaces, so the filter also darkens that surface.
    if (rgba(style.backgroundColor)[3] !== 1) throw new Error('Filtered transparent surface requires pixel verification')
    bg = bg.map(value => Math.min(255, value * factor))
  }
  const luminance = color => color.map(v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
  const a = luminance(fg), b = luminance(bg)
  return { name: element.dataset.contrast, foreground: fg, background: bg, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }
}
try {
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const errors = [], unexpectedRequests = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    // Only the two deliberately failed visitor GETs are expected in this scenario.
    const text = message.text()
    if (page.url().includes('scenario=failure') && /^관리자 방문자 검증 (reports|corrections) 조회 실패/.test(text) && text.includes('합성 조회 실패')) return
    if (message.type() === 'error' || message.type() === 'warning') errors.push(text)
  })
  await page.route('**/*', route => {
    const requested = new URL(route.request().url())
    if (['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(requested.hostname)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    if (requested.origin === new URL(url).origin && !requested.pathname.startsWith('/api/')) return route.continue()
    unexpectedRequests.push(requested.pathname)
    return route.abort()
  })
  await page.goto(url + '?scenario=catalog')
  await page.locator('[data-contrast]').first().waitFor()
  const results = []
  for (const element of await page.locator('[data-contrast]').all()) {
    await page.getByRole('heading', { name: '실제 컴포넌트 대비 QA' }).click()
    await page.mouse.move(0, 0)
    results.push({ state: 'normal', ...await element.evaluate(measure) })
    await element.hover()
    results.push({ state: 'hover', ...await element.evaluate(measure) })
    await page.mouse.move(0, 0)
    await page.keyboard.press('Tab')
    await element.focus()
    results.push({ state: 'focus', ...await element.evaluate(measure) })
  }
  const failures = results.filter(result => result.ratio < 4.5)
  assert.deepEqual(failures, [], JSON.stringify(failures))
  console.log(`Actual CSS contrast: ${results.length} normal/hover/focus cases >= 4.5:1; minimum ${Math.min(...results.map(x => x.ratio)).toFixed(2)}:1`)

  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    await page.setViewportSize({ width, height })
    for (const scenario of ['login', 'visitor', 'empty', 'failure']) {
      await page.goto(url + '?scenario=' + scenario)
      await page.getByRole('heading', { name: scenario === 'login' ? '관리자 로그인' : '방문자 제보·정정 심사', exact: true, level: 1 }).waitFor()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${scenario} overflow at ${width}`)
      if (scenario === 'login') {
        const inactiveRole = page.getByRole('button', { name: '상점주', exact: true })
        assert.ok((await inactiveRole.evaluate(measure)).ratio >= 4.5)
        const submit = page.getByRole('button', { name: '로그인', exact: true })
        assert.ok((await submit.evaluate(measure)).ratio >= 4.5)
      } else {
        const report = page.getByRole('tab', { name: /검증 제보/ }), correction = page.getByRole('tab', { name: /정정 요청/ })
        await report.focus()
        const requests = await page.evaluate(() => document.documentElement.dataset.requests)
        await report.press('ArrowRight')
        assert.equal(await correction.evaluate(node => node === document.activeElement), true)
        assert.equal(await report.getAttribute('aria-selected'), 'true')
        assert.equal(await page.evaluate(() => document.documentElement.dataset.requests), requests)
        const outline = await correction.evaluate(node => getComputedStyle(node).outlineStyle)
        assert.notEqual(outline, 'none')
        await correction.press('Enter')
        await page.waitForFunction(() => document.querySelector('#visitor-verification-panel-tab-1')?.getAttribute('aria-selected') === 'true')
        assert.equal(await correction.getAttribute('aria-selected'), 'true')
        assert.equal(await page.getByRole('tabpanel').getAttribute('aria-labelledby'), await correction.getAttribute('id'))
        if (scenario === 'visitor') {
          await page.getByRole('button', { name: /정정 #1/ }).click()
          await page.getByRole('tabpanel').getByText('합성 QA 정정 요청 내용', { exact: true }).last().waitFor()
        }
        await correction.press('ArrowLeft')
        await report.press('Space')
        await page.waitForFunction(() => document.querySelector('#visitor-verification-panel-tab-0')?.getAttribute('aria-selected') === 'true')
        assert.equal(await report.getAttribute('aria-selected'), 'true')
        if (scenario === 'failure') await page.getByRole('alert').filter({ hasText: /^합성 조회 실패$/ }).waitFor()
        else if (scenario === 'empty') await page.getByText('조건에 맞는 항목이 없습니다.').waitFor()
        else {
          await page.getByRole('button', { name: /제보 #1/ }).click()
          await page.getByRole('tabpanel').getByText('합성 QA 위치 제보 내용', { exact: true }).last().waitFor()
        }
      }
    }
    console.log(`Login/normal/empty/error layout, details and keyboard: ${width}×${height} PASS`)
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(unexpectedRequests, [])
  console.log('No runtime/console errors or real API requests; no operation data changed.')
} finally {
  await browser?.close()
  await server.close()
}
