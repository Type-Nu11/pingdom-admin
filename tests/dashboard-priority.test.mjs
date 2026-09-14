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
beforeEach(()=>{root=createRoot(document.getElementById('root'));globalThis.dashboardState={summary:{placeCount:10,bannedUserCount:0,operationalMetrics:metrics},recentActivities:null,pendingMerchantPlaceApplications:[],status:'success',recentActivitiesStatus:'empty',pendingItemsStatus:'empty',isLoading:false,lastUpdatedAt:1,fetchSummary(){}}})
afterEach(async()=>{await act(async()=>root.unmount())})
after(async()=>{delete globalThis.dashboardState;await server.close();dom.window.close()})
async function render(extra={}){Object.assign(globalThis.dashboardState,extra);await act(async()=>root.render(h(AuthContext.Provider,{value:{user:{username:'admin'},logout(){}}},h(AdminNotificationContext.Provider,{value:{notifications:[],unreadCount:0,pendingWorkItems:[],pendingWorkCount:0,status:'success',pendingWorkStatus:'success'}},h(MemoryRouter,{},h(Page),h(Location))))))}
test('work sections precede summary and valid zero is concise',async()=>{await render();const text=document.body.textContent;assert.ok(text.indexOf('심사 대기')<text.indexOf('관리 요약'));assert.ok(text.indexOf('우선 확인')<text.indexOf('관리 요약'));assert.match(text,/심사 대기 중인 상점주 장소 신청이 없습니다/);assert.match(text,/전체 장소/);assert.match(text,/마지막 수신/)})
for(const status of ['error','loading','unavailable']) test(status+' is never shown as zero work',async()=>{await render({status,pendingItemsStatus:status});assert.doesNotMatch(document.body.textContent,/조회된 운영 항목 중 확인할 항목이 없습니다|심사 대기 중인 상점주 장소 신청이 없습니다/)})
test('pending application opens exact application and count is bounded',async()=>{await render({pendingItemsStatus:'success',pendingMerchantPlaceApplications:[{id:7,placeName:'합성 가게'}]});const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('합성 가게'));await act(async()=>b.click());assert.equal(location.pathname,'/merchant-place-applications');assert.equal(location.state.applicationId,7);assert.match(document.body.textContent,/최대 10건/)})
test('missing metrics are not zero',async()=>{await render({summary:{placeCount:10,bannedUserCount:0}});assert.match(document.body.textContent,/운영 항목 집계가 제공되지 않았습니다/)})
