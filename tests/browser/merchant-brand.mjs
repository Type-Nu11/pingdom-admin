import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-brands-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'brand-fixture', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (req.url === '/broken-logo.png') { res.setHeader('Content-Type', 'image/png'); res.end('synthetic invalid image'); return }
    if (!req.url?.startsWith('/brand-qa')) return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/merchant-brand-fixture.jsx')))
  })
} }] })
let browser
try {
  await server.listen()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch()
  for (const width of [1920, 1366, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    page.on('dialog', dialog => dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss())
    let scenario = ''
    const guard = await guardBrowserPage(page, base, event => scenario === 'failure' && event.kind === 'fixture-api' && event.path === '/merchant-owner/campaigns/brands' && event.text === 'Synthetic brand list failure')
    const choice = page.getByRole('combobox', { name: '이벤트 브랜드', exact: true })
    const title = page.getByRole('textbox', { name: '이벤트 제목 (필수)', exact: true })
    for (scenario of ['zero', 'one', 'multiple', 'existing', 'failure']) {
      await page.goto(base + '/brand-qa?scenario=' + scenario)
      assert.equal(new URL(page.url()).searchParams.get('scenario'), scenario, 'scenario navigation must not reuse an unsaved previous page')
      await title.waitFor()
      if (scenario === 'failure') {
        await page.getByRole('button', { name: '브랜드 다시 시도', exact: true }).waitFor()
        assert.doesNotMatch(await choice.innerText(), /등록된 브랜드 없음/)
        await page.getByRole('button', { name: /저장된 이벤트/ }).click()
        assert.equal(await title.inputValue(), '저장된 이벤트')
        await page.getByRole('button', { name: '브랜드 다시 시도', exact: true }).click()
        await page.waitForFunction(() => {
          const input = [...document.querySelectorAll('input')].find(el => el.value === '저장된 이벤트')
          return input && !input.disabled
        })
        assert.equal(await title.inputValue(), '저장된 이벤트', 'saved event remains mounted across brand retry')
        assert.match(await choice.innerText(), /합성 브랜드 2/)
        continue
      }
      if (scenario === 'zero') {
        await page.getByText('먼저 브랜드를 등록한 뒤 이벤트를 작성하세요.', { exact: false }).waitFor()
        assert.equal(await choice.isDisabled(), true)
        await title.fill('브랜드 등록 전 작성 중')
        await page.getByRole('button', { name: '브랜드 추가', exact: true }).click()
        const dialog = page.getByRole('dialog', { name: '브랜드 등록', exact: true })
        await dialog.getByRole('textbox', { name: '브랜드명 (필수)', exact: true }).fill('신규 합성 브랜드')
        await dialog.getByRole('textbox', { name: /^로고 URL/ }).fill('javascript:invalid')
        await dialog.getByRole('button', { name: '저장', exact: true }).click()
        await dialog.getByRole('alert').filter({ hasText: '공개된 http 또는 https' }).waitFor()
        await dialog.getByRole('textbox', { name: /^로고 URL/ }).fill('')
        await dialog.getByRole('button', { name: '저장', exact: true }).click()
        await dialog.waitFor({ state: 'hidden' })
        assert.equal(await title.inputValue(), '브랜드 등록 전 작성 중')
        assert.match(await choice.innerText(), /신규 합성 브랜드/)
      } else if (scenario === 'one') {
        await page.locator('[aria-label="선택한 브랜드"]').waitFor()
        assert.equal(await choice.isDisabled(), true)
        assert.match(await choice.innerText(), /합성 브랜드 1/)
      } else if (scenario === 'existing') {
        await page.getByRole('button', { name: /저장된 이벤트/ }).click()
        await page.locator('[aria-label="선택한 브랜드"]').getByText('합성 브랜드 2', { exact: true }).waitFor()
        assert.match(await choice.innerText(), /합성 브랜드 2/)
        await page.getByRole('button', { name: '브랜드 추가', exact: true }).click()
        const dialog = page.getByRole('dialog', { name: '브랜드 등록', exact: true })
        await dialog.getByRole('textbox', { name: '브랜드명 (필수)', exact: true }).fill('기존 이벤트와 별도 브랜드')
        await dialog.getByRole('button', { name: '저장', exact: true }).click()
        await dialog.waitFor({ state: 'hidden' })
        assert.match(await choice.innerText(), /합성 브랜드 2/, 'creating another brand does not replace a saved event brand')
        assert.equal(await title.inputValue(), '저장된 이벤트')
      } else {
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.getAttribute('aria-label') === '이벤트 브랜드' && !el.disabled))
        assert.match(await choice.innerText(), /사용할 브랜드를 선택하세요/)
        await page.getByRole('button', { name: '초안 등록', exact: true }).click()
        await page.getByRole('alert').filter({ hasText: '이벤트에 사용할 브랜드를 선택해주세요.' }).waitFor()
        assert.ok(!(await page.evaluate(() => window.brandQA.calls)).some(call => call.method !== 'get'))
        await title.fill('브랜드 직접 선택 후 작성 중')
        await choice.click()
        await page.getByRole('option', { name: '합성 브랜드 2', exact: true }).click()
        await page.locator('[aria-label="선택한 브랜드"]').scrollIntoViewIfNeeded()
        await page.getByText('로고를 불러오지 못했습니다.', { exact: true }).waitFor()
        assert.equal(await title.inputValue(), '브랜드 직접 선택 후 작성 중')
        assert.equal(await page.locator('[aria-label="선택한 브랜드"] img').count(), 0)
        await page.getByRole('textbox', { name: /^이벤트 소개/ }).fill('합성 이벤트 설명')
        for (const [label, day] of [['이벤트 시작 일시', 1], ['이벤트 종료 일시', 2]]) {
          await page.getByRole('button', { name: new RegExp('^' + label + ',') }).click()
          const calendar = page.getByRole('dialog', { name: label, exact: true })
          const today = new Date()
          await calendar.getByRole('button', { name: `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${day}일`, exact: true }).click()
          await calendar.getByRole('button', { name: '적용', exact: true }).click()
        }
        await page.getByRole('button', { name: '초안 등록', exact: true }).click()
        await page.getByRole('heading', { name: '이벤트 상세', exact: true }).waitFor()
        const writes = await page.evaluate(() => window.brandQA.calls.filter(call => call.method === 'post' && call.path === '/merchant-owner/campaigns'))
        assert.equal(writes.length, 1)
        assert.equal(writes[0].body.brandId, 2, 'only the explicitly chosen brand is submitted')
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      if (scenario === 'multiple') await page.screenshot({ path: join(output, `brands-${width}.png`), fullPage: true })
    }
    await guard.assertClean()
    await page.close()
    console.log(`${width}px: zero/one/multiple, explicit choice, new-brand draft preservation, saved brand, failed retry and logo fallback PASS`)
  }
  console.log('Screenshots: ' + output)
} finally { await browser?.close(); await server.close() }
