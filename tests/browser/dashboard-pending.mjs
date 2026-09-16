import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const output = await mkdtemp(join(tmpdir(), 'pingdom-206-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: {host:'127.0.0.1',port:0,open:false}, plugins:[{
  name:'dashboard-pending-fixture', configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
    if(req.url!=='/dashboard-qa')return next()
    res.setHeader('Content-Type','text/html')
    res.end(await vite.transformIndexHtml(req.url,(await readFile('index.html','utf8')).replace('/src/main.tsx','/tests/browser/dashboard-pending-fixture.jsx')))
  })},
}] })
let browser, page
try {
  await server.listen();browser=await chromium.launch()
  console.log(`Screenshots: ${output}`)
  for(const width of [1280,390]){
    page=await browser.newPage({viewport:{width,height:800}})
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    await page.route('**/*',route=>{
      const u=new URL(route.request().url())
      return (u.hostname==='127.0.0.1'&&!u.pathname.startsWith('/api'))||['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(u.hostname)?route.continue():route.abort()
    })
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/dashboard-qa`)
    const section=page.locator('[aria-labelledby="dashboard-pending-review-title"]')
    await section.getByText('전체 대기 32건 · 표시 3건 · 최대 10건').waitFor()
    await section.scrollIntoViewIfNeeded()
    assert.equal(await section.locator('button:disabled').count(),2)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    assert.ok(await section.locator('button').evaluateAll(buttons=>buttons.every(button=>button.scrollWidth<=button.clientWidth+1)))
    await page.screenshot({path:join(output,`dashboard-${width}.png`)})
    assert.deepEqual(errors,[])
    await page.close()
  }
} catch(error){if(page&&!page.isClosed())await page.screenshot({path:join(output,'failure.png')});throw error}
finally{await browser?.close();await server.close()}
