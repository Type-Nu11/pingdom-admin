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
let root,location
function Location(){location=useLocation();return null}
const metrics={duplicatePlaceGroupCount:0,expiringBannedUserCount:0,missingLocationPlaceCount:0,today:{placeRegistrationCount:0},last7Days:{placeRegistrationCount:0}}
beforeEach(()=>{root=createRoot(document.getElementById('root'));globalThis.dashboardState={summary:{placeCount:10,bannedUserCount:0,operationalMetrics:metrics},recentActivities:null,pendingItems:{items:[],totalCount:0},status:'success',recentActivitiesStatus:'empty',pendingItemsStatus:'empty',isLoading:false,lastUpdatedAt:1,fetchSummary(){}}})
afterEach(async()=>{await act(async()=>root.unmount())})
after(async()=>{delete globalThis.dashboardState;await server.close();dom.window.close()})
async function render(extra={}){Object.assign(globalThis.dashboardState,extra);await act(async()=>root.render(h(AuthContext.Provider,{value:{user:{username:'admin'},logout(){}}},h(AdminNotificationContext.Provider,{value:{notifications:[],unreadCount:0,pendingWorkItems:[],pendingWorkCount:0,status:'success',pendingWorkStatus:'success'}},h(MemoryRouter,{},h(Page),h(Location))))))}
test('work sections precede summary and valid zero is concise',async()=>{await render();const text=document.body.textContent;assert.ok(text.indexOf('처리 대기')<text.indexOf('관리 요약'));assert.ok(text.indexOf('우선 확인')<text.indexOf('관리 요약'));assert.match(text,/처리 대기 중인 장소 신청이 없습니다/);assert.match(text,/전체 장소/);assert.match(text,/마지막 수신/)})
for(const status of ['error','loading','unavailable']) test(status+' is never shown as zero work',async()=>{await render({status,pendingItemsStatus:status});assert.doesNotMatch(document.body.textContent,/조회된 운영 항목 중 확인할 항목이 없습니다|처리 대기 중인 장소 신청이 없습니다/)})
test('pending application opens exact application and count is bounded',async()=>{await render({pendingItemsStatus:'success',pendingItems:{items:[{type:'MERCHANT_PLACE_APPLICATION',targetId:7,status:'PENDING',title:'합성 가게',navigationPath:'https://untrusted.example'}],totalCount:30}});const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('합성 가게'));await act(async()=>b.click());assert.equal(location.pathname,'/merchant-place-applications');assert.equal(location.state.applicationId,7);assert.match(document.body.textContent,/전체 대기 30건 · 표시 1건 · 최대 10건/)})
test('missing metrics are not zero',async()=>{await render({summary:{placeCount:10,bannedUserCount:0}});assert.match(document.body.textContent,/운영 항목 집계가 제공되지 않았습니다/)})

const pendingSection=()=>document.querySelector('[aria-labelledby="dashboard-pending-review-title"]')
test('unsupported types and invalid targets are visible without misleading navigation',async()=>{
  await render({pendingItemsStatus:'success',pendingItems:{totalCount:2,items:[
    {type:'NEW_TYPE',targetId:9,status:'PENDING',title:'새 유형'},
    {type:'MERCHANT_PLACE_APPLICATION',targetId:-1,status:'PENDING',title:'잘못된 대상'},
  ]}})
  const rows=[...pendingSection().querySelectorAll('button')].filter(b=>b.disabled)
  assert.equal(rows.length,2)
  assert.match(pendingSection().textContent,/대상 또는 처리 경로 확인 필요/)
  assert.doesNotMatch(pendingSection().textContent,/게시글 신고/)
})
test('duplicate items collapse and stable row retains focus through refresh and failure',async()=>{
  const item={type:'MERCHANT_PLACE_APPLICATION',targetId:7,status:'PENDING',title:'합성 가게'}
  await render({pendingItemsStatus:'success',pendingItems:{items:[item,item],totalCount:20}})
  const row=[...pendingSection().querySelectorAll('button')].find(b=>b.textContent.includes('합성 가게'))
  row.focus()
  assert.match(pendingSection().textContent,/표시 1건/)
  for(const pendingItemsStatus of ['loading','error','success']){
    await render({pendingItemsStatus})
    assert.ok(row.isConnected);assert.equal(document.activeElement,row)
  }
  await render({pendingItemsStatus:'unavailable'})
  assert.equal(row.isConnected,false)
})
test('positive total with empty slice is not reported as zero pending work',async()=>{
  await render({pendingItemsStatus:'success',pendingItems:{items:[],totalCount:30}})
  assert.match(pendingSection().textContent,/대기 업무가 있지만 표시할 항목이 없습니다/)
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
