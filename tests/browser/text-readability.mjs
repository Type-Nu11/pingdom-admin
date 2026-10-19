import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-text-readability-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { port: 0, host: '127.0.0.1' }, plugins: [{ name: 'text-readability-qa', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (!req.url?.startsWith('/__qa/text')) return next()
    const fixture = req.url.startsWith('/__qa/text/form') ? 'merchant-draft' : 'text-readability'
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', `/tests/browser/${fixture}-fixture.jsx`)))
  })
} }] })
const readable = el => {
  const s = getComputedStyle(el), r = el.getBoundingClientRect()
  return { width: r.width, height: r.height, clipped: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1, ellipsis: s.textOverflow === 'ellipsis', weight: Number(s.fontWeight) }
}
let browser
try {
  await server.listen(); browser = await chromium.launch()
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`
  for (const [width, height] of [[1920, 1080], [1449, 772], [1366, 768], [620, 844], [390, 844], [320, 768]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    const guard = await guardBrowserPage(page, origin)
    await page.goto(`${origin}/__qa/text`)
    await page.getByTestId('phone-example').waitFor()
    for (const id of ['phone-hint', 'claim-hint', 'field-hint', 'file-help', 'filename-0', 'filename-1', 'search-address', 'resource-title', 'resource-meta', 'admin-title', 'place-title', 'email', 'hours', 'merge-title', 'merge-address', 'merge-confirm-title', 'review-filename', 'filter-label']) {
      const result = await page.getByTestId(id).evaluate(readable)
      assert.equal(result.clipped, false, `${id} clips at ${width}: ${JSON.stringify(result)}`)
      assert.equal(result.ellipsis, false, `${id} ellipsis at ${width}`)
    }
    for (const id of ['phone-hint', 'claim-hint', 'field-hint']) assert.equal((await page.getByTestId(id).evaluate(readable)).weight, 400, id)
    const example = await page.getByTestId('phone-example').evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); return { lines: new Set([...range.getClientRects()].map(r => r.top)).size, width: el.getBoundingClientRect().width, parent: el.parentElement.clientWidth } })
    assert.equal(example.lines, 1, `phone example splits at ${width}`)
    assert.ok(example.width <= example.parent, `phone example overflows at ${width}`)
    for (const [role, label] of [['combobox', '처리 상태'], ['button', '증빙 종류'], ['button', /^방문 일시,/]]) {
      const trigger = page.getByRole(role, { name: label, exact: true })
      const result = await trigger.locator('span').first().evaluate(readable)
      assert.equal(result.clipped, false, `${label} clips at ${width}`)
      assert.equal(result.ellipsis, false, label)
    }
    const status = page.getByRole('combobox', { name: '처리 상태', exact: true })
    await status.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
    assert.ok((await status.textContent()).includes('전체'))
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('button[aria-label="처리 상태"]')), true)
    await page.getByRole('button', { name: '증빙 종류', exact: true }).click()
    await page.getByRole('option', { name: '신분증', exact: true }).click()
    assert.ok((await page.getByRole('button', { name: '증빙 종류', exact: true }).textContent()).includes('신분증'))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(output, `readability-${width}.png`), fullPage: true })
    guard.assertClean(); await page.close()
    // Real registration/claim forms with an in-memory API adapter; no live operations.
    for (const kind of ['new', 'claim']) {
      const form = await browser.newPage({ viewport: { width, height } })
      const formGuard = await guardBrowserPage(form, origin)
      await form.goto(`${origin}/__qa/text/form?${kind}`)
      await form.getByRole('button', { name: /합성 신청 장소/ }).click()
      await form.getByLabel(/법적 성명/).waitFor()
      if (width === 1449 && kind === 'new') await form.screenshot({ path: join(output, 'registration-desktop.png') })
      const hint = form.getByText('국가번호를 포함해 입력하세요.', { exact: false })
      assert.equal((await hint.evaluate(readable)).weight, 400)
      assert.equal((await hint.evaluate(readable)).clipped, false)
      assert.equal(await hint.locator('span').evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); return new Set([...range.getClientRects()].map(r => r.top)).size }), 1)
      if (width === 1449 && kind === 'new') await hint.locator('..').screenshot({ path: join(output, 'phone-field.png') })
      const overflow = await form.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, elements: [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 1 && r.right > innerWidth + 1 }).slice(0, 12).map(el => ({ tag: el.tagName, className: el.className, text: el.textContent?.slice(0, 50), width: el.getBoundingClientRect().width })) }))
      assert.equal(overflow.overflow, false, `${kind} form overflows at ${width}: ${JSON.stringify(overflow.elements)}`)
      await form.getByLabel(/법적 성명/).fill('입력 보존 확인')
      await form.setViewportSize({ width: Math.max(320, width - 30), height })
      assert.equal(await form.getByLabel(/법적 성명/).inputValue(), '입력 보존 확인')
      await form.screenshot({ path: join(output, `${kind}-${width}.png`), fullPage: true })
      formGuard.assertClean(); await form.close()
    }
    console.log(`PASS full text, atomic examples, filters, real forms/input preservation: ${width}×${height}`)
  }
  // The real sidebar and map reduce field width even at desktop breakpoints.
  for (const width of [1920, 1366, 1280, 1100, 1024, 981, 980, 901, 900, 620, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const guard = await guardBrowserPage(page, origin)
    await page.goto(`${origin}/__qa/text/form?new&shell`)
    await page.getByRole('button', { name: /합성 신청 장소/ }).click()
    const hint = page.getByText('국가번호를 포함해 입력하세요.', { exact: false })
    await hint.waitFor()
    const phone = await hint.evaluate(el => {
      const example = el.querySelector('span').getBoundingClientRect(), field = el.getBoundingClientRect()
      const section = el.closest('fieldset')
      const fieldColumns = new Set([...section.children].filter(child => child.tagName === 'LABEL').map(child => Math.round(child.getBoundingClientRect().left)))
      return { fieldWidth: field.width, exampleWidth: example.width, contained: example.left >= field.left - 1 && example.right <= field.right + 1,
        columns: fieldColumns.size, sectionWidth: section.clientWidth }
    })
    assert.equal(phone.contained, true, `sidebar/map phone example overflows at ${width}: ${JSON.stringify(phone)}`)
    assert.equal(phone.columns, width <= 620 || phone.sectionWidth < 496 ? 1 : 2, `fields use one or two readable columns at ${width}: ${JSON.stringify(phone)}`)
    const name = page.getByLabel(/법적 성명/)
    await name.fill('화면 크기 변경 입력 보존')
    await page.setViewportSize({ width: width === 981 ? 1366 : 981, height: 900 })
    assert.equal(await name.inputValue(), '화면 크기 변경 입력 보존')
    await page.setViewportSize({ width, height: 900 })
    assert.equal(await name.inputValue(), '화면 크기 변경 입력 보존')
    if ([1920, 1024, 981, 390].includes(width)) await page.screenshot({ path: join(output, `registration-sidebar-${width}.png`), fullPage: true })
    assert.ok((await page.evaluate(() => window.qaCalls)).every(call => call.method === 'get'), 'layout verification never submits an application')
    guard.assertClean(); await page.close()
    console.log(`PASS actual merchant sidebar/map, phone containment and resize input preservation: ${width}px`)
  }
  console.log(`Screenshots: ${output}`)
} finally { await browser?.close(); await server.close() }
