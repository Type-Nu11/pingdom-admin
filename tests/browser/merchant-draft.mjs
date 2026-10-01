import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'
const output = await mkdtemp(join(tmpdir(), 'pingdom-246-'))
const server = await createServer({ server: { port: 0, host: '127.0.0.1', open: false }, plugins: [{ name: 'draft-fixture', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (!req.url.startsWith('/draft-qa')) return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/merchant-draft-fixture.jsx')))
  })
} }] })
let browser
try {
  await server.listen()
  browser = await chromium.launch()
  for (const [width, height] of [[1920, 1080], [1366, 768]]) {
    for (const kind of ['claim', 'new']) {
      const page = await browser.newPage({ viewport: { width, height } })
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.route('**/*', route => ['127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/draft-qa?${kind}`)
      await page.getByRole('button', { name: /합성 신청 장소/ }).click()
      const name = page.getByLabel('법적 성명', { exact: true })
      await name.fill('수정 신청자')
      if (kind === 'claim') assert.equal(await page.getByRole('button', { name: '심사 요청', exact: true }).isDisabled(), true)
      await page.getByLabel('사업자등록번호', { exact: true }).fill('1234567890')
      const before = await page.evaluate(() => window.qaApplication.attachments)
      await page.evaluate(() => { window.qaFailSave = true })
      await page.getByRole('button', { name: '임시 저장', exact: true }).click()
      await page.getByRole('alert').filter({ hasText: '입력 내용을 확인한 뒤' }).waitFor()
      assert.equal(await name.inputValue(), '수정 신청자')
      assert.deepEqual(await page.evaluate(() => window.qaApplication.attachments), before)
      await page.evaluate(() => { window.qaFailSave = false })
      await page.getByRole('button', { name: '임시 저장', exact: true }).focus()
      await page.keyboard.press('Enter')
      await page.waitForFunction(() => window.qaApplication.legalName === '수정 신청자')
      assert.deepEqual(await page.evaluate(() => window.qaApplication.attachments), before)
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({ path: join(output, `${kind}-${width}.png`), fullPage: true })
      await page.getByRole('button', { name: '심사 요청', exact: true }).click()
      await page.waitForFunction(() => window.qaApplication.status === 'PENDING')
      assert.equal(await name.isDisabled(), true)
      assert.ok((await page.evaluate(() => window.qaCalls)).every(c => !c.url.includes('/attachments')))
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      if (kind === 'new') {
        for (const restoreInitialInput of [true, false]) {
          await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/draft-qa?new`)
          await page.getByRole('button', { name: /합성 신청 장소/ }).click()
          await name.fill('저장된 수정 신청자')
          const businessNumber = page.getByLabel('사업자등록번호', { exact: true })
          await businessNumber.fill('1234567890')
          await page.evaluate(() => { window.qaFailSubmit = true })
          await page.getByRole('button', { name: '심사 요청', exact: true }).click()
          await page.getByRole('alert').filter({ hasText: '신청서를 저장했지만' }).waitFor()
          await name.waitFor()
          assert.equal(await name.inputValue(), '저장된 수정 신청자')
          if (restoreInitialInput) {
            await name.fill('테스트 신청자')
            await businessNumber.fill('')
            await page.getByRole('button', { name: '심사 요청', exact: true }).click()
            await page.getByRole('alert').filter({ hasText: '필수 항목을 모두 입력해주세요.' }).waitFor()
            assert.equal(await page.evaluate(() => window.qaApplication.status), 'DRAFT')
            assert.equal(await page.evaluate(() => window.qaCalls.filter(c => c.url.endsWith('/submit')).length), 1)
            await businessNumber.fill('1234567890')
          }
          await page.evaluate(() => { window.qaFailSubmit = false })
          await page.getByRole('button', { name: '심사 요청', exact: true }).click()
          await page.waitForFunction(() => window.qaApplication.status === 'PENDING')
          const expectedName = restoreInitialInput ? '테스트 신청자' : '저장된 수정 신청자'
          assert.equal(await name.inputValue(), expectedName)
          assert.equal(await page.evaluate(() => window.qaApplication.legalName), expectedName)
          assert.equal(await page.evaluate(() => window.qaCalls.filter(c => c.method === 'put').length), restoreInitialInput ? 2 : 1)
          assert.deepEqual(await page.evaluate(() => window.qaApplication.attachments), before)
        }
      }
      assert.deepEqual(errors, [])
      await page.close()
    }
  }
  console.log('PASS both forms: attached draft editing, conflict preservation, save/submit, attachment identity/order, pending lock; ' + output)
} finally { await browser?.close(); await server.close() }
