import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'
const output = await mkdtemp(join(tmpdir(), 'pingdom-246-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { port: 0, host: '127.0.0.1', open: false }, plugins: [{ name: 'draft-fixture', configureServer(vite) {
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
      if (kind === 'new') {
        assert.equal(await page.getByLabel(/법적 성명/).count(), 0)
        await page.getByRole('button', { name: /합성 신청 장소/ }).waitFor()
        assert.ok((await page.getByRole('button', { name: /합성 신청 장소/ }).boundingBox()).y < height)
        await page.screenshot({ path: join(output, `history-${width}.png`) })
      }
      await page.getByRole('button', { name: /합성 신청 장소/ }).click()
      const name = page.getByLabel(/법적 성명/)
      if (kind === 'new') {
        await page.getByRole('button', { name: '신청 내역 보기', exact: true }).click()
        await page.getByRole('button', { name: /합성 신청 장소/ }).click()
        await name.waitFor()
        assert.equal(await name.inputValue(), '테스트 신청자', 'the same application can be reopened after returning to history')
      }
      await name.fill('수정 신청자')
      if (kind === 'claim') assert.equal(await page.getByRole('button', { name: '심사 요청', exact: true }).isDisabled(), true)
      await page.getByLabel(/사업자등록번호/).fill('1234567890')
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
      if (kind === 'new') {
        assert.equal(await page.evaluate(() => window.qaApplication.newPlace.timezone), 'Asia/Tokyo')
        assert.deepEqual(await page.evaluate(() => window.qaApplication.newPlace.operatingDays.find(day => day.dayOfWeek === 'MONDAY').breakTimes), [{ opensAt: '14:00:00', closesAt: '15:00:00' }])
      }
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
          const businessNumber = page.getByLabel(/사업자등록번호/)
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
      if (kind === 'new') {
        await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/draft-qa?new&fresh`)
        await page.getByRole('button', { name: '새 장소 등록 신청', exact: true }).click()
        for (const [label, value] of [
          ['법적 성명', '합성 신청자'], ['사업자명', '합성 사업자'], ['사업자등록번호', '1234567890'],
          ['상점주 노출명', '합성 가게'], ['상점주 연락 이메일', 'synthetic@example.com'], ['상점주 연락처', '+821012345678'],
        ]) await page.getByRole('textbox', { name: new RegExp(label) }).fill(value)
        await page.getByRole('button', { name: '직접 입력', exact: true }).click()
        for (const [label, value] of [
          ['장소명', '합성 신규 장소'], ['도로명 주소', '합성로 1'], ['지번 주소', '합성동 1'], ['우편번호', '12345'],
          ['장소 소개', '테스트 전용 소개'], ['사업장 연락처', '+821012345678'], ['신청자 연락처', '+821012345678'],
        ]) await page.getByRole('textbox', { name: new RegExp(label) }).fill(value)
        await page.getByText('좌표 직접 입력', { exact: true }).click()
        await page.getByLabel('위도', { exact: true }).fill('37.5')
        await page.getByLabel('경도', { exact: true }).fill('127')
        for (const label of ['사업자등록증', '신분증', '대표 이미지']) {
          await page.getByRole('button', { name: '증빙 파일 종류', exact: true }).click()
          await page.getByRole('option', { name: label, exact: true }).click()
          await page.locator('input[type="file"]').setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: Buffer.from('synthetic') })
          await page.getByRole('button', { name: '파일 추가', exact: true }).click()
        }
        await page.evaluate(() => { window.qaFailUploadType = 'IDENTITY_DOCUMENT'; window.qaFailRecovery = true })
        await page.getByRole('button', { name: '심사 요청', exact: true }).click()
        await page.getByRole('alert').filter({ hasText: '신청서를 저장했지만' }).waitFor()
        await page.getByText(/신청 번호 #1/).waitFor()
        assert.equal(await page.getByRole('button', { name: '선택 취소', exact: true }).count(), 2)
        assert.equal(await page.getByLabel(/법적 성명/).inputValue(), '합성 신청자')
        await page.evaluate(() => { window.qaFailUploadType = null; window.qaFailRecovery = false })
        await page.getByRole('button', { name: '심사 요청', exact: true }).click()
        await page.waitForFunction(() => window.qaApplication.status === 'PENDING')
        assert.equal(await page.evaluate(() => window.qaCalls.filter(c => c.method === 'post' && c.url === '/users/me/merchant-place-applications').length), 1)
        assert.equal(await page.evaluate(() => window.qaApplication.attachments.length), 3)
        assert.equal(await page.getByRole('button', { name: '선택 취소', exact: true }).count(), 0)
      }
      assert.deepEqual(errors, [])
      await page.close()
    }
  }
  console.log('PASS both forms: attached draft editing, conflict preservation, save/submit, attachment identity/order, pending lock; ' + output)
} finally { await browser?.close(); await server.close() }
