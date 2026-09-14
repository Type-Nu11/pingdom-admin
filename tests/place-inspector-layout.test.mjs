import assert from 'node:assert/strict'
import { test, after, beforeEach, afterEach } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost', pretendToBeVisual: true })
for (const key of ['window','document','HTMLElement','Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({server:{middlewareMode:true,ws:false},appType:'custom',ssr:{noExternal:['styled-components']}})
const { PlaceInspector } = await server.ssrLoadModule('/src/components/place/PlaceInspector.tsx')
let root, calls
const place = {id:1,name:'테스트 장소',address:'테스트 주소',category:'CAFE',latitude:37,longitude:127,operatingStatus:'OPERATING',discoveryStatus:'VISIBLE'}
async function render(extra={}) { await act(async()=>root.render(h(PlaceInspector, {selectedPlace:place,placeDetail:place,isLoading:false,errorMessage:'',updatingPlaceIds:new Proxy({}, {get:()=>null}),onClose(){},onRetry(){},onFocusMap:p=>calls.push(p.id),onOpenOperation:a=>calls.push(a),onOpenTouristInfo(){},onOpenOperatingNotices(){},onOpenDataCorrection:()=>calls.push('correction'),...extra}))) }
const button = text => [...document.querySelectorAll('button')].find(el=>el.textContent.includes(text))
beforeEach(()=>{calls=[];root=createRoot(document.getElementById('root'))})
afterEach(async()=>{await act(async()=>root.unmount())})
after(async()=>{await server.close();dom.window.close()})
test('operations precede visitor and collapsed technical information',async()=>{
  await render()
  const text=document.body.textContent
  assert.ok(text.indexOf('운영 및 탐색 관리') < text.indexOf('방문객 안내 정보'))
  assert.equal(document.querySelector('details').open,false)
  await act(async()=>button('영업시간 수정').click())
  await act(async()=>button('위치 보기').click())
  assert.deepEqual(calls,['operating-schedule',1])
})
test('different selected id never displays old detail or controls',async()=>{
  await render({selectedPlace:{...place,id:2,name:'새 장소'}})
  assert.ok(!document.body.textContent.includes('테스트 장소'))
  assert.equal(button('영업시간 수정'),undefined)
})
test('image opens dialog and disappears when target changes',async()=>{
  await render({placeDetail:{...place,imageUrl:'https://example.com/image.jpg'}})
  await act(async()=>document.querySelector('[aria-label="대표 이미지 확대"]').click())
  assert.ok(document.querySelector('[role="dialog"]'))
  await render({selectedPlace:{...place,id:2}})
  assert.equal(document.querySelector('[role="dialog"]'),null)
})
test('image errors fall back to compact placeholder',async()=>{
  await render({placeDetail:{...place,imageUrl:'https://example.com/image.jpg'}})
  await act(async()=>document.querySelector('img').dispatchEvent(new window.Event('error')))
  assert.ok(document.body.textContent.includes('대표 이미지 없음'))
  assert.equal(document.querySelector('[aria-label="대표 이미지 확대"]'),null)
})
test('technical information retains correction entry and resets for another place',async()=>{
  await render()
  document.querySelector('details').open=true
  await act(async()=>button('정보 보정').click())
  assert.deepEqual(calls,['correction'])
  await render({selectedPlace:{...place,id:2},placeDetail:{...place,id:2}})
  assert.equal(document.querySelector('details').open,false)
})
