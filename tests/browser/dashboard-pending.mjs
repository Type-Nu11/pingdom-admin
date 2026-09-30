import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const output = await mkdtemp(join(tmpdir(), 'pingdom-239-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: {host:'127.0.0.1',port:0,open:false}, plugins:[{
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
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    await page.route('**/*',route=>{
      const u=new URL(route.request().url())
      return (u.hostname==='127.0.0.1'&&!u.pathname.startsWith('/api'))||['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(u.hostname)?route.continue():route.abort()
    })
    const url='http://127.0.0.1:'+server.httpServer.address().port+'/dashboard-qa'
    for (const scenario of ['success','zero','partial','all-error','retry','loading']) {
      await page.goto(url+'?scenario='+scenario)
      const section=page.getByRole('region',{name:'처리 대기 업무'}).first()
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
    assert.deepEqual(errors,[])
    await page.close()
  }
} catch(error){if(page&&!page.isClosed())await page.screenshot({path:join(output,'failure.png')});throw error}
finally{await browser?.close();await server.close()}
