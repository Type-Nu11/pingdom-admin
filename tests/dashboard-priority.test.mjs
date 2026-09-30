import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<div id="root"></div>', {url:'http://localhost/',pretendToBeVisual:true})
for (const key of ['window','document','localStorage','HTMLElement','Node']) globalThis[key]=dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT=true
const {createElement:h,act}=await import('react')
const {createRoot}=await import('react-dom/client')
const {MemoryRouter,useLocation}=await import('react-router-dom')
const server=await createServer({server:{middlewareMode:true,ws:false},appType:'custom',ssr:{noExternal:['styled-components']},plugins:[{name:'dashboard-state',enforce:'pre',load(id){if(id.endsWith('/hooks/useAdminDashboard.ts')) return 'export function useAdminDashboard(){return globalThis.dashboardState}'}}]})
const {AuthContext}=await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const {AdminNotificationContext}=await server.ssrLoadModule('/src/app/providers/AdminNotificationContext.ts')
const {default:Page}=await server.ssrLoadModule('/src/pages/dashboard/DashboardPage.tsx')
let root,location,work
const emptyWork = {key:'reservations',title:'예약 심사',description:'심사 대기 예약',path:'/reservations/review',status:'success',count:0,updatedAt:1}
function Location(){location=useLocation();return null}
const metrics={duplicatePlaceGroupCount:0,expiringBannedUserCount:0,missingLocationPlaceCount:0,today:{placeRegistrationCount:0},last7Days:{placeRegistrationCount:0}}
beforeEach(()=>{work=[{...emptyWork}];root=createRoot(document.getElementById('root'));globalThis.dashboardState={summary:{placeCount:10,bannedUserCount:0,operationalMetrics:metrics},recentActivities:null,pendingItems:{items:[],totalCount:0},status:'success',recentActivitiesStatus:'empty',pendingItemsStatus:'empty',isLoading:false,lastUpdatedAt:1,fetchSummary(){}}})
afterEach(async()=>{await act(async()=>root.unmount())})
after(async()=>{delete globalThis.dashboardState;await server.close();dom.window.close()})
async function render(extra={}){Object.assign(globalThis.dashboardState,extra);await act(async()=>root.render(h(AuthContext.Provider,{value:{user:{username:'admin'},logout(){}}},h(AdminNotificationContext.Provider,{value:{notifications:[],unreadCount:0,pendingWorkEntries:work,refreshPendingWork(){},pendingWorkItems:[],pendingWorkCount:0,status:'success',pendingWorkStatus:'success'}},h(MemoryRouter,{},h(Page),h(Location))))))}
test('work sections precede summary and valid zero is concise',async()=>{
  await render();const text=document.body.textContent
  assert.ok(text.indexOf('처리 대기 업무')<text.indexOf('관리 요약'))
  assert.ok(text.indexOf('우선 확인')<text.indexOf('관리 요약'))
  assert.match(text,/조회한 1개 업무에 처리 대기 항목이 없습니다/)
})
test('pending reservation opens the review route and uses the server count',async()=>{
  work=[{...emptyWork,count:6}]
  await render()
  const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('예약 심사'))
  await act(async()=>b.click())
  assert.equal(location.pathname,'/reservations/review')
  assert.match(document.body.textContent,/확인된 대기 6건/)
})
for(const status of ['error','loading']) test(status+' never reports no work and labels cached counts',async()=>{
  work=[{...emptyWork,status,count:6}]
  await render()
  assert.doesNotMatch(document.body.textContent,/처리 대기 항목이 없습니다/)
  assert.match(document.body.textContent,/이전 조회 6건/)
})
test('partial failure is not zero and only successful counts are totalled',async()=>{
  work=[{...emptyWork,count:6},{...emptyWork,key:'other',title:'다른 업무',status:'error',count:4}]
  await render()
  assert.match(document.body.textContent,/확인된 대기 6건/)
  assert.match(document.body.textContent,/1개 업무 조회에 실패/)
  assert.match(document.body.textContent,/이전 조회 4건/)
})
test('missing metrics are not zero',async()=>{await render({summary:{placeCount:10,bannedUserCount:0}});assert.match(document.body.textContent,/운영 항목 집계가 제공되지 않았습니다/)})
test('previous zero remains collapsed while reloading without claiming current zero',async()=>{
  work=[{...emptyWork,status:'loading'}]
  await render()
  const section=document.querySelector('[aria-label="처리 대기 업무"]')
  assert.ok(section.querySelector('details button'))
  assert.equal(section.querySelector('details').open,false)
  assert.doesNotMatch(section.textContent,/처리 대기 항목이 없습니다/)
})

const operationalSection=()=>document.querySelector('[aria-labelledby="dashboard-operational-metrics-title"]')
test('operational card and focus survive refresh, failure and recovery',async()=>{
  const summary={placeCount:10,bannedUserCount:0,operationalMetrics:{...metrics,missingLocationPlaceCount:4}}
  await render({summary})
  const card=operationalSection().querySelector('button')
  card.focus()
  for(const status of ['loading','error','success']) {
    await render({status,isLoading:status==='loading'})
    assert.ok(card.isConnected)
    assert.equal(document.activeElement,card)
    if(status!=='success') assert.match(operationalSection().textContent,/이전 조회 결과/)
  }
  assert.doesNotMatch(operationalSection().textContent,/이전 조회 결과/)
  await act(async()=>card.click())
  assert.equal(location.pathname,'/places')
})
test('previous zero never reports no work during refresh or failure',async()=>{
  await render()
  for(const status of ['loading','error']) {
    await render({status,isLoading:status==='loading'})
    assert.doesNotMatch(operationalSection().textContent,/확인할 항목이 없습니다/)
    assert.match(operationalSection().textContent,/이전 조회 결과/)
  }
})
test('initial loading and failure show no operational cards',async()=>{
  for(const status of ['loading','error']) {
    await render({summary:null,status,isLoading:status==='loading'})
    assert.equal(operationalSection().querySelector('[aria-label$="관리 화면으로 이동"]'),null)
    assert.doesNotMatch(operationalSection().textContent,/이전 조회 결과|확인할 항목이 없습니다/)
  }
})
test('successful zero replaces old cards but unavailable never exposes cached cards',async()=>{
  await render({summary:{placeCount:10,bannedUserCount:0,operationalMetrics:{...metrics,missingLocationPlaceCount:4}}})
  await render({status:'unavailable'})
  assert.equal(operationalSection().querySelector('[aria-label$="관리 화면으로 이동"]'),null)
  await render({status:'success',summary:{placeCount:10,bannedUserCount:0,operationalMetrics:metrics}})
  assert.match(operationalSection().textContent,/확인할 항목이 없습니다/)
  assert.equal(operationalSection().querySelector('button'),null)
})
