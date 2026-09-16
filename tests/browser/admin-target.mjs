import assert from 'node:assert/strict'
import {mkdtemp,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const output=await mkdtemp(join(tmpdir(),'pingdom-170-'))
const server=await createServer({cacheDir:join(output,'cache'),server:{host:'127.0.0.1',port:0,open:false},plugins:[{
  name:'target-fixture',enforce:'pre',resolveId(source){if(source.endsWith('/map/KakaoMap'))return resolve('tests/browser/place-map-fixture.jsx')},
  configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
    if(!['/roles','/places','/reservations/review'].includes(req.url.split('?')[0]))return next()
    res.setHeader('Content-Type','text/html')
    res.end(await vite.transformIndexHtml(req.url,(await readFile('index.html','utf8')).replace('/src/main.tsx','/tests/browser/admin-target-fixture.jsx')))
  })},
}]})
let browser,page
try{
  await server.listen();browser=await chromium.launch()
  console.log(`Screenshots: ${output}`)
  const base=`http://127.0.0.1:${server.httpServer.address().port}`
  for(const width of [1280,390]){
    page=await browser.newPage({viewport:{width,height:800}});page.setDefaultTimeout(10000)
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    await page.route('**/*',route=>{const u=new URL(route.request().url());return (u.hostname==='127.0.0.1'&&!u.pathname.startsWith('/api'))||['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(u.hostname)?route.continue():route.abort()})
    await page.goto(`${base}/roles`)
    await page.getByRole('button',{name:'관리자 사용자명 검색',exact:true}).click()
    const dialog=page.getByRole('dialog')
    await dialog.getByRole('button',{name:'same_admin · #8',exact:true}).waitFor()
    assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth),false)
    await page.screenshot({path:join(output,`roles-search-${width}.png`)})
    await dialog.getByRole('button',{name:'same_admin · #8',exact:true}).click()
    await page.getByText('same_admin · 관리자 #8의 역할을 관리합니다.').waitFor()
    assert.ok(await page.evaluate(()=>window.qaRequests.some(r=>r.url==='/admin/users/8/roles')))
    await page.goto(`${base}/reservations/review`)
    await page.getByRole('button',{name:'장소 검색',exact:true}).click()
    await dialog.getByRole('button',{name:'합성 장소 1 · #1 · 동명 구분용 주소',exact:true}).click()
    await page.getByRole('button',{name:'조회',exact:true}).click()
    await page.waitForFunction(()=>window.qaRequests.some(r=>r.url==='/admin/reservations'&&r.params.placeId===1))
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    await page.screenshot({path:join(output,`reservation-${width}.png`)})
    await page.goto(`${base}/places?placeId=2`)
    const panel=page.locator('aside').filter({has:page.getByRole('button',{name:'장소 상세 닫기'})})
    await panel.getByRole('heading',{name:'합성 장소 2'}).waitFor()
    await page.reload()
    await panel.getByRole('heading',{name:'합성 장소 2'}).waitFor()
    await page.locator('[aria-label="장소 목록"] button').first().click()
    await panel.getByRole('heading',{name:'합성 장소 1'}).waitFor()
    assert.match(page.url(),/placeId=1/)
    await page.goBack()
    await panel.getByRole('heading',{name:'합성 장소 2'}).waitFor()
    await panel.scrollIntoViewIfNeeded()
    await page.screenshot({path:join(output,`linked-place-${width}.png`)})
    assert.deepEqual(errors,[])
    await page.close()
  }
}catch(error){if(page&&!page.isClosed()){console.log(page.url(),await page.evaluate(()=>window.qaRequests));await page.screenshot({path:join(output,'failure.png')})}throw error}
finally{await browser?.close();await server.close()}
