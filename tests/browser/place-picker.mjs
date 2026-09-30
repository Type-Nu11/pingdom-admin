import assert from 'node:assert/strict'
import {mkdtemp,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const output=await mkdtemp(join(tmpdir(),'pingdom-240-'))
const server=await createServer({cacheDir:join(output,'cache'),server:{host:'127.0.0.1',port:0,open:false},plugins:[{
  name:'place-picker-fixture',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
    if(!['/places/events','/verification'].includes(req.url.split('?')[0]))return next()
    res.setHeader('Content-Type','text/html')
    res.end(await vite.transformIndexHtml(req.url,(await readFile('index.html','utf8')).replace('/src/main.tsx','/tests/browser/place-picker-fixture.jsx')))
  })},
}]})
let browser,page
try{
  await server.listen();browser=await chromium.launch()
  console.log(`Screenshots: ${output}`)
  const base=`http://127.0.0.1:${server.httpServer.address().port}`
  for(const [width,height] of [[1920,1080],[1366,768],[390,844]]){
    page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(10000)
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    await page.route('**/*',route=>{const u=new URL(route.request().url());return (u.hostname==='127.0.0.1'&&!u.pathname.startsWith('/api'))||['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(u.hostname)?route.continue():route.abort()})
    await page.goto(`${base}/places/events`)
    await page.getByRole('button',{name:'이벤트 등록',exact:true}).click()
    const event=page.getByRole('dialog',{name:'기간형 이벤트 등록',exact:true})
    await page.getByRole('button',{name:'장소 검색',exact:true}).click()
    const search=page.getByRole('dialog',{name:'장소명·주소 검색',exact:true})
    await search.getByRole('button',{name:'합성 장소 · #8 · 서울 테스트 주소',exact:true}).waitFor()
    await page.screenshot({path:join(output,`search-${width}.png`)})
    await page.keyboard.press('Escape')
    assert.equal(await page.getByRole('button',{name:'장소 검색',exact:true}).evaluate(el=>el===document.activeElement),true)
    await page.getByRole('button',{name:'장소 검색',exact:true}).click()
    await search.getByRole('button',{name:'합성 장소 · #8 · 서울 테스트 주소',exact:true}).focus()
    await page.keyboard.press('Enter')
    await event.getByText('서울 테스트 주소',{exact:true}).waitFor()
    assert.equal(await event.count(),1)
    assert.equal(await event.evaluate(el=>el.scrollWidth>el.clientWidth),false)
    await page.screenshot({path:join(output,`event-${width}.png`)})
    await event.getByRole('button',{name:'취소',exact:true}).click()
    await page.getByText('합성 초안',{exact:true}).first().click()
    await page.getByRole('button',{name:'수정',exact:true}).click()
    const edit=page.getByRole('dialog',{name:'기간형 이벤트 수정',exact:true})
    await edit.getByText('합성 장소 · #8',{exact:false}).waitFor()
    assert.equal(await edit.getByRole('button',{name:'장소 변경',exact:true}).count(),0)
    assert.equal(await edit.getByRole('button',{name:'장소 검색',exact:true}).count(),0)
    await page.goto(`${base}/verification?placeId=7`)
    await page.waitForFunction(()=>window.qaRequests.some(r=>r.url==='/admin/places/7/information-evidence'))
    await page.getByRole('button',{name:'장소 변경',exact:true}).click()
    await search.getByRole('button',{name:'합성 장소 · #8 · 서울 테스트 주소',exact:true}).click()
    assert.equal(new URL(page.url()).searchParams.has('placeId'),false)
    // The picker unmounts in the reports tab, but the selected place must survive.
    await page.getByRole('tab',{name:'신고·반박',exact:false}).click()
    await page.getByRole('tab',{name:'증빙',exact:false}).click()
    await page.getByText('합성 장소 · #8',{exact:true}).waitFor()
    await page.getByText('서울 테스트 주소',{exact:true}).waitFor()
    assert.equal(new URL(page.url()).searchParams.has('placeId'),false)
    await page.getByRole('button',{name:'장소 조회',exact:true}).click()
    await page.waitForFunction(()=>window.qaRequests.some(r=>r.url==='/admin/places/8/information-evidence'))
    await page.getByRole('tab',{name:'재확인',exact:false}).click()
    await page.waitForFunction(()=>window.qaRequests.some(r=>r.url==='/admin/places/8/information-reverification-requests'))
    await page.getByRole('tab',{name:'신고·반박',exact:false}).click()
    await page.getByRole('tab',{name:'재확인',exact:false}).click()
    await page.getByText('합성 장소 · #8',{exact:true}).waitFor()
    await page.getByText('서울 테스트 주소',{exact:true}).waitFor()
    assert.equal(new URL(page.url()).searchParams.get('placeId'),'8')
    await page.getByText('장소 ID 직접 입력',{exact:true}).click()
    await page.getByLabel('장소 ID',{exact:true}).fill('9')
    assert.equal(await page.getByText('서울 테스트 주소',{exact:true}).count(),0)
    await page.getByRole('tab',{name:'신고·반박',exact:false}).click()
    await page.getByRole('tab',{name:'재확인',exact:false}).click()
    await page.getByText('장소 #9',{exact:true}).waitFor()
    assert.equal(await page.getByText('서울 테스트 주소',{exact:true}).count(),0)
    await page.getByRole('button',{name:'선택 해제',exact:true}).click()
    await page.getByRole('tab',{name:'신고·반박',exact:false}).click()
    await page.getByRole('tab',{name:'재확인',exact:false}).click()
    await page.getByText('선택한 장소 없음',{exact:true}).waitFor()
    await page.getByText('장소 ID 직접 입력',{exact:true}).click()
    await page.getByLabel('장소 ID',{exact:true}).fill('9')
    await page.getByRole('button',{name:'장소 조회',exact:true}).click()
    await page.waitForFunction(()=>window.qaRequests.some(r=>r.url==='/admin/places/9/information-reverification-requests'))
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    await page.screenshot({path:join(output,`verification-${width}.png`)})
    assert.deepEqual(errors,[])
    await page.close()
  }
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:join(output,'failure.png')});throw error}
finally{await browser?.close();await server.close()}
