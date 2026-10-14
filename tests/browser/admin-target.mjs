import assert from 'node:assert/strict'
import {mkdtemp,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const output=await mkdtemp(join(tmpdir(),'pingdom-170-'))
const server=await createServer({cacheDir:join(output,'cache'),server:{host:'127.0.0.1',port:0,open:false},plugins:[{
  name:'target-fixture',enforce:'pre',resolveId(source){if(source.endsWith('/map/NaverMap'))return resolve('tests/browser/place-map-fixture.jsx')},
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
  for(const [width,height] of [[1920,1080],[1366,768],[390,800]]){
    page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(10000)
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    await page.route('**/*',route=>{const u=new URL(route.request().url());return (u.hostname==='127.0.0.1'&&!u.pathname.startsWith('/api'))||['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(u.hostname)?route.continue():route.abort()})
    await page.goto(`${base}/roles`)
    await page.evaluate(async () => {
      const { default: client } = await import('/src/api/customAxios.ts')
      const adapter = client.defaults.adapter
      client.defaults.adapter = async config => {
        if (config.url.endsWith('/roles')) {
          await new Promise(resolve => { window.releaseRoleLookup = resolve })
        }
        return adapter(config)
      }
    })
    await page.getByRole('button',{name:'관리자 사용자명 검색',exact:true}).click()
    const dialog=page.getByRole('dialog')
    await dialog.getByRole('button',{name:'same_admin · #8',exact:true}).waitFor()
    assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth),false)
    await page.screenshot({path:join(output,`roles-search-${width}.png`)})
    await dialog.getByRole('button',{name:'same_admin · #8',exact:true}).focus()
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.activeElement?.tagName === 'INPUT' && document.activeElement.value === '8')
    assert.equal(await page.getByRole('button',{name:'관리자 사용자명 검색',exact:true}).isDisabled(),true)
    await page.evaluate(() => window.releaseRoleLookup())
    await page.getByText('same_admin · 관리자 #8의 역할을 관리합니다.').waitFor()
    assert.equal(await page.getByLabel('관리자 사용자 ID',{exact:true}).evaluate(el => el === document.activeElement),true)
    await page.keyboard.press('Tab')
    assert.equal(await page.getByRole('button',{name:'역할 조회',exact:true}).evaluate(el => el === document.activeElement),true)
    await page.getByRole('button',{name:'관리자 사용자명 검색',exact:true}).click()
    await dialog.waitFor()
    await dialog.getByRole('textbox',{name:'관리자 사용자명 검색',exact:true}).focus()
    await page.keyboard.press('Escape')
    await page.waitForFunction(()=>document.activeElement?.tagName==='BUTTON'&&document.activeElement.textContent==='관리자 사용자명 검색')
    assert.equal(await page.getByRole('button',{name:'관리자 사용자명 검색',exact:true}).evaluate(el => el === document.activeElement),true)
    assert.ok(await page.evaluate(()=>window.qaRequests.some(r=>r.url==='/admin/users/8/roles')))
    await page.goto(`${base}/reservations/review`)
    await page.getByRole('button',{name:'장소 검색',exact:true}).click()
    await dialog.getByRole('button',{name:'합성 장소 1 · #1 · 동명 구분용 주소',exact:true}).click()
    await page.getByRole('button',{name:'조회',exact:true}).click()
    await page.waitForFunction(()=>window.qaRequests.some(r=>r.url==='/admin/reservations'&&r.params.placeId===1))
    const placeInput=page.getByRole('textbox',{name:'장소 ID',exact:false})
    await placeInput.fill('invalid')
    await page.getByRole('combobox',{name:'예약 상태',exact:true}).click()
    await page.getByRole('option',{name:'승인',exact:true}).click()
    await page.getByLabel('예약 조회 조건').filter({hasText:'미적용 변경 있음'}).waitFor()
    const requestsBefore=await page.evaluate(()=>window.qaRequests.length)
    await page.getByRole('button',{name:'2페이지로 이동',exact:true}).click()
    await page.waitForFunction(()=>window.qaRequests.at(-1)?.params?.page===2)
    assert.equal(await page.evaluate(()=>window.qaRequests.at(-1).params.placeId),1,'pagination uses applied place, not invalid draft')
    assert.equal(await page.evaluate(()=>window.qaRequests.at(-1).params.status),'PENDING')
    assert.equal(await page.evaluate(()=>window.qaRequests.length),requestsBefore+1)
    await page.getByRole('button',{name:'목록 새로고침',exact:true}).click()
    assert.equal(await page.evaluate(()=>window.qaRequests.at(-1).params.page),2,'refresh retains applied page')
    assert.equal(await page.evaluate(()=>window.qaRequests.at(-1).params.placeId),1)
    await page.getByRole('button',{name:'조회',exact:true}).click()
    await page.getByRole('alert').filter({hasText:'장소 ID는 1 이상의 정수'}).waitFor()
    await placeInput.fill('2')
    await page.getByRole('button',{name:'조회',exact:true}).click()
    await page.waitForFunction(()=>window.qaRequests.at(-1)?.params?.placeId===2)
    assert.equal(await page.evaluate(()=>window.qaRequests.at(-1).params.page),1,'new search resets page')
    assert.equal(await page.evaluate(()=>window.qaRequests.at(-1).params.status),'CONFIRMED')
    assert.doesNotMatch(await page.getByLabel('예약 조회 조건').textContent(),/미적용 변경/)
    await page.getByRole('button',{name:'초기화',exact:true}).click()
    await page.waitForFunction(()=>window.qaRequests.at(-1)?.params?.placeId===undefined&&window.qaRequests.at(-1)?.params?.page===1)
    assert.equal(await page.evaluate(()=>window.qaRequests.at(-1).params.status),'PENDING')
    assert.equal(await placeInput.inputValue(),'')
    await page.evaluate(()=>{window.qaReservationStatus=500})
    await page.getByRole('button',{name:'목록 새로고침',exact:true}).click()
    await page.getByRole('alert').filter({hasText:'서버 오류가 발생했습니다.'}).waitFor()
    await placeInput.fill('99')
    await page.evaluate(()=>{window.qaReservationStatus=undefined})
    await page.getByRole('button',{name:'다시 시도',exact:true}).click()
    await page.getByRole('alert').filter({hasText:'서버 오류가 발생했습니다.'}).waitFor({state:'detached'})
    assert.equal(await page.evaluate(()=>window.qaRequests.at(-1).params.placeId),undefined,'retry ignores unapplied draft')
    await page.evaluate(()=>{window.qaEmptyReservations=true})
    await page.getByRole('button',{name:'조회',exact:true}).click()
    await page.getByText('조건에 맞는 결과가 없습니다.',{exact:true}).waitFor()
    assert.equal(await page.getByRole('button',{name:'2페이지로 이동',exact:true}).count(),0)
    assert.ok(await page.evaluate(()=>window.qaRequests.every(request=>request.method==='get')))
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
