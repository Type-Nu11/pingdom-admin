import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from '../helpers/isolated-vite.mjs'
import { chromium } from 'playwright'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-239-'))
const server = await createServer({ envDir: false, cacheDir: join(output, 'cache'), server: {host:'127.0.0.1',port:0,open:false}, plugins:[{
  name:'dashboard-pending-fixture', configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
    if(!req.url.startsWith('/dashboard-qa'))return next()
    res.setHeader('Content-Type','text/html')
    res.end(await vite.transformIndexHtml(req.url,(await readFile('index.html','utf8')).replace('/src/main.tsx','/tests/browser/dashboard-pending-fixture.jsx')))
  })},
}] })
let browser, page
try {
  await server.listen();browser=await chromium.launch()
  console.log('Screenshots: '+output)
  for(const [width,height] of [[1920,1080],[1366,768],[390,844]]){
    page=await browser.newPage({viewport:{width,height}})
    let currentScenario = ''
    const guard = await guardBrowserPage(page, 'http://127.0.0.1:'+server.httpServer.address().port, event => {
      const failureScenario = ['all-error', 'partial', 'retry'].includes(currentScenario)
      if (!failureScenario) return false
      if (event.kind === 'console') return event.level === 'error' &&
        /^관리자 처리 필요 업무 조회 실패 (?:[1-9]|1[0-2]) Error: Synthetic query failure\n/.test(event.text) &&
        (currentScenario === 'all-error' || event.text.startsWith('관리자 처리 필요 업무 조회 실패 1 Error:'))
      return event.kind === 'fixture-api' && event.method === 'GET' && event.status === 0 && event.text === 'Synthetic query failure' &&
        (currentScenario === 'all-error' || event.path === '/admin/reservations')
    })
    const url='http://127.0.0.1:'+server.httpServer.address().port+'/dashboard-qa'
    for (const scenario of ['success','zero','partial','all-error','retry','loading','refresh-work-slow','refresh-summary-slow','duplicate-groups']) {
      currentScenario = scenario
      await page.goto(url+'?scenario='+scenario)
      const section=page.getByRole('region',{name:'처리 대기 업무'}).first()
      if (['success', 'zero', 'duplicate-groups'].includes(scenario)) await section.getByText('조회 성공 12/12개 업무', { exact: false }).waitFor()
      if(scenario==='loading') await section.getByText('업무 현황을 확인하고 있습니다.').waitFor()
      if(scenario==='all-error') await section.getByText('모든 업무 조회에 실패했습니다.').waitFor()
      else if(scenario==='partial') {
        await section.getByText('1개 업무 조회에 실패했습니다. 확인된 건수에 포함되지 않습니다.').waitFor()
        assert.equal(await section.getByText(/처리 대기 항목이 없습니다/).count(),0)
      } else if(scenario==='zero') await section.getByText('조회한 12개 업무에 처리 대기 항목이 없습니다.').waitFor()
      else await section.getByText(/확인된 대기 6건/).waitFor()
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
      assert.ok(await section.locator('button').evaluateAll(buttons=>buttons.filter(button=>button.getClientRects().length).every(button=>button.scrollWidth<=button.clientWidth+1)))
      await page.screenshot({path:join(output,'dashboard-'+width+'-'+scenario+'.png')})
      if (scenario === 'duplicate-groups') {
        const card = page.getByRole('button', { name: '장소 병합·복구 3 관리 화면으로 이동', exact: true })
        await card.waitFor()
        assert.match(await card.textContent(), /장소 병합·복구.*3건/)
        assert.equal(await page.getByRole('button', { name: /^중복 후보 검토 .*관리 화면으로 이동$/ }).count(), 0)
        await card.focus()
        await page.keyboard.press('Enter')
        await page.waitForFunction(() => document.querySelector('[aria-label="검증 경로"]').textContent === '/places/duplicates')
        assert.equal(await page.getByLabel('검증 경로').textContent(), '/places/duplicates')
      }
      if (scenario.startsWith('refresh-')) {
        await page.getByRole('button',{name:'대시보드 새로고침',exact:true}).click()
        const fastPath=scenario==='refresh-work-slow'?'/admin/dashboard/summary':'/admin/reservations'
        await page.waitForFunction(path=>window.qaCompletedRequests.filter(url=>url===path).length===2,fastPath)
        await page.waitForFunction(()=>window.qaHeldRequests.length>0)
        assert.equal(await page.getByRole('button',{name:'대시보드 새로고침 중',exact:true}).isDisabled(),true)
        await page.getByRole('button',{name:'검증 요청 수'}).click()
        assert.equal(await page.getByRole('button',{name:'검증 요청 수'}).textContent(),'2')
        await page.evaluate(()=>window.qaHeldRequests.splice(0).forEach(resolve=>resolve()))
        await section.getByText(/확인된 대기 2건/).waitFor()
        assert.equal(await page.getByRole('button',{name:'대시보드 새로고침',exact:true}).isEnabled(),true)
      }
      if (scenario==='retry') {
        await section.getByRole('button',{name:'대기 업무 새로고침'}).click()
        await section.getByText(/이전 조회 6건/).waitFor()
        await section.getByText(/확인된 대기 0건/).waitFor()
        await section.getByRole('button',{name:'대기 업무 새로고침'}).click()
        await section.getByText('조회한 12개 업무에 처리 대기 항목이 없습니다.').waitFor()
      }
      if (scenario==='success') {
        const trigger=page.getByRole('button',{name:'확인 필요 6건',exact:true})
        await trigger.click()
        const dialog=page.getByRole('dialog',{name:'알림 목록'})
        await dialog.getByText(/확인된 대기 6건/).waitFor()
        await page.getByRole('button',{name:'검증 요청 수'}).click()
        assert.equal(await page.getByRole('button',{name:'검증 요청 수'}).textContent(),'1')
        await trigger.click()
        await dialog.waitFor()
        await page.keyboard.press('Escape')
        await dialog.waitFor({state:'hidden'})
        assert.equal(await trigger.getAttribute('aria-expanded'),'false')
        const target=section.getByRole('button',{name:/예약 심사/})
        await target.focus()
        await page.keyboard.press('Enter')
        await page.getByLabel('검증 경로').filter({hasText:'/reservations/review'}).waitFor({state:'attached'})
        assert.equal(await page.getByLabel('검증 경로').textContent(),'/reservations/review')
      }
    }
    guard.assertClean()
    await page.close()
  }
  // Reproduce the old broken groups/page/limit fixture. It must be detected,
  // not silently accepted as an empty result by the regression runner.
  page = await browser.newPage()
  const observed = []
  const faultGuard = await guardBrowserPage(page, 'http://127.0.0.1:'+server.httpServer.address().port, event => { observed.push(event); return false })
  await page.goto('http://127.0.0.1:'+server.httpServer.address().port+'/dashboard-qa?scenario=malformed-duplicates')
  await page.getByText('2개 업무 조회에 실패했습니다. 확인된 건수에 포함되지 않습니다.', { exact: true }).first().waitFor()
  assert.equal(observed.filter(event => event.kind === 'console' && event.text.includes('Invalid duplicate place pagination response')).length, 2)
  assert.throws(() => faultGuard.assertClean(), { code: 'ERR_ASSERTION' })
  console.log('PASS dashboard: malformed duplicate fixture rejected by guard; normal/empty/failure scenarios at three viewports.')
  await page.close()
} catch(error){if(page&&!page.isClosed())await page.screenshot({path:join(output,'failure.png')});throw error}
finally{await browser?.close();await server.close()}
