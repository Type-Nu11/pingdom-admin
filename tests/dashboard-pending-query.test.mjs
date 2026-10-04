import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { AxiosError } from 'axios'
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window','document','localStorage']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({server:{middlewareMode:true,ws:false},appType:'custom'})
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { useAdminDashboard } = await server.ssrLoadModule('/src/hooks/useAdminDashboard.ts')
const { AdminNotificationProvider } = await server.ssrLoadModule('/src/app/providers/AdminNotificationProvider.tsx')
const { useAdminNotificationContext } = await server.ssrLoadModule('/src/app/providers/AdminNotificationContext.ts')
let root, state, dashboard, requests, clears
const auth = {isAuthReady:true,isAuthenticated:true,clearAuth(){clears++}}
const intervals = new Map()
const originalSetInterval = window.setInterval.bind(window)
const originalClearInterval = window.clearInterval.bind(window)
window.setInterval = (callback, delay) => { const id=originalSetInterval(callback, delay);intervals.set(id,{callback,delay});return id }
window.clearInterval = id => { intervals.delete(id);originalClearInterval(id) }
function Probe({enabled}) {state=useAdminNotificationContext();dashboard=useAdminDashboard({enabled});return null}
async function render(enabled=true){
  await act(async()=>root.render(h(AuthContext.Provider,{value:{...auth,isAuthenticated:enabled}},h(AdminNotificationProvider,{},h(Probe,{enabled})))))
  await act(async()=>{await new Promise(r=>setTimeout(r,10))})
}
beforeEach(async()=>{
  requests=[];clears=0
  client.defaults.adapter=config=>new Promise((resolve,reject)=>requests.push({config,resolve,reject}))
  root=createRoot(document.getElementById('root'));await render()
})
afterEach(async()=>{await act(async()=>root.unmount())})
after(async()=>{await server.close();dom.window.close()})
async function finish(start=0,{fail,code=500,count=6,invalid,duplicateTotal=0}={}){
  const batch=requests.slice(start)
  await act(async()=>{
    for(const {config,resolve,reject} of batch){
      if(fail?.(config.url)){
        reject(new AxiosError('Synthetic failure','ERR_BAD_RESPONSE',config,null,{config,status:code,statusText:'Error',headers:{},data:{}}));continue
      }
      const n=config.url==='/admin/reservations'?count:0
      const duplicate=config.url==='/admin/places/duplicates'||config.url==='/admin/places/duplicate-candidates'
      const data=duplicate?{groups:[],candidates:[],page:1,limit:1,total:duplicateTotal,totalPages:Math.ceil(duplicateTotal),hasNext:duplicateTotal>1}:config.url.endsWith('/summary')?{placeCount:1,bannedUserCount:0}:config.url.endsWith('/recent-activities')?{places:[],userSanctions:[]}:
        {count:0,unreadCount:0,totalElements:invalid!==undefined?invalid:n,totalCount:0,total:0}
      resolve({config,status:200,statusText:'OK',headers:{},data})
    }
  })
}
const reservation=()=>state.pendingWorkEntries.find(x=>x.key==='reservations')
test('duplicate checks use server total and request only one item',async()=>{
  assert.deepEqual(requests.find(x=>x.config.url==='/admin/places/duplicates').config.params,{page:1,limit:1})
  assert.deepEqual(requests.find(x=>x.config.url==='/admin/places/duplicate-candidates').config.params,{status:'PENDING',page:1,limit:1})
  await finish(0,{duplicateTotal:25})
  for(const key of ['duplicate-place-groups','duplicate-place-candidates']) {
    assert.equal(state.pendingWorkEntries.find(x=>x.key===key).count,25)
    assert.equal(state.pendingWorkEntries.find(x=>x.key===key).status,'success')
  }
  assert.equal(state.pendingWorkCount,56)
})
for(const duplicateTotal of [-1,1.5,'6',NaN]) test('invalid duplicate total '+duplicateTotal+' remains a failed check',async()=>{
  await finish(0,{duplicateTotal})
  for(const key of ['duplicate-place-groups','duplicate-place-candidates']) {
    assert.equal(state.pendingWorkEntries.find(x=>x.key===key).status,'error')
    assert.equal(state.pendingWorkEntries.find(x=>x.key===key).count,null)
  }
  assert.equal(state.pendingWorkCount,6)
})
test('dashboard and notifications share twelve checks, reservation filter and overlap guard',async()=>{
  assert.equal(requests.filter(x=>x.config.url==='/admin/merchant-place-applications').length,1)
  const r=requests.find(x=>x.config.url==='/admin/reservations')
  assert.deepEqual(r.config.params,{status:'PENDING',page:1,limit:1})
  assert.equal(state.pendingWorkEntries.length,12)
  const count=requests.length
  await act(async()=>{void state.refreshPendingWork();void state.refreshPendingWork();void dashboard.fetchSummary()})
  assert.equal(requests.length,count)
  await finish()
  assert.equal(reservation().count,6);assert.equal(state.pendingWorkCount,6)
  assert.equal(state.pendingWorkEntries.filter(x=>x.status==='success').length,12)
  assert.equal(dashboard.status,'success')
})
for(const code of [401,403,500]) test(code+' distinguishes authentication from per-work failure',async()=>{
  await finish(0,{fail:url=>url==='/admin/reservations',code})
  assert.equal(clears,code===401?1:0)
  assert.equal(state.pendingWorkCount,code===401?null:0)
  assert.equal(reservation().status,code===401?'loading':'error')
  assert.equal(dashboard.status,'success')
})
test('failure preserves prior per-work count without including it in current total, retry clears stale data',async()=>{
  await finish()
  let start=requests.length
  await act(async()=>{void state.refreshPendingWork()})
  assert.equal(reservation().status,'loading');assert.equal(reservation().count,6);assert.equal(state.pendingWorkCount,null)
  await finish(start,{fail:url=>url==='/admin/reservations'})
  assert.equal(reservation().count,6);assert.equal(reservation().status,'error');assert.equal(state.pendingWorkCount,0)
  start=requests.length
  await act(async()=>{void state.refreshPendingWork()});await finish(start,{count:0})
  assert.equal(reservation().count,0);assert.equal(reservation().status,'success')
})
test('total failure is unknown, not an empty successful result',async()=>{
  await finish(0,{fail:url=>!url.includes('/dashboard/')&&!url.includes('/notifications/')})
  assert.equal(state.pendingWorkStatus,'error');assert.equal(state.pendingWorkCount,null)
  assert.ok(state.pendingWorkEntries.every(x=>x.status==='error'))
})
test('visitor checks fail independently and all-zero is a successful result',async()=>{
  await finish(0,{count:0,fail:url=>url==='/admin/visitor-verification-reports'})
  assert.equal(state.pendingWorkEntries.find(x=>x.key==='visitor-verification-corrections').status,'success')
  assert.equal(state.pendingWorkEntries.find(x=>x.key==='visitor-verification-reports').status,'error')
  const start=requests.length
  await act(async()=>{void state.refreshPendingWork()});await finish(start,{count:0})
  assert.equal(state.pendingWorkCount,0)
  assert.ok(state.pendingWorkEntries.every(x=>x.status==='success'&&x.count===0))
})
test('one shared minute poll refreshes work and hidden tabs suspend it',async()=>{
  await finish()
  const polls=[...intervals.values()].filter(x=>x.delay===60000)
  assert.equal(polls.length,1)
  const start=requests.length
  await act(async()=>polls[0].callback())
  assert.equal(requests.slice(start).filter(x=>x.config.url==='/admin/reservations').length,1)
  await finish(start)
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'})
  await act(async()=>document.dispatchEvent(new dom.window.Event('visibilitychange')))
  assert.equal([...intervals.values()].filter(x=>x.delay===60000).length,0)
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'})
})
for(const invalid of [-1,1.5,'6',NaN]) test('invalid count '+invalid+' is an error rather than zero',async()=>{
  await finish(0,{invalid})
  assert.equal(reservation().status,'error');assert.equal(reservation().count,null)
})
test('session reset invalidates old responses and releases only its own in-flight guard',async()=>{
  const first=requests.length
  await render(false);await render(true)
  const current=requests.slice(first)
  const old=requests.slice(0,first);requests=old
  await finish(0,{count:9});requests=[...old,...current]
  assert.equal(reservation().count,null)
  const count=requests.length
  await act(async()=>{void state.refreshPendingWork()})
  assert.equal(requests.length,count)
  await finish(first,{count:2});assert.equal(reservation().count,2)
})
test('visibility refresh is shared and ignores repeated events while in flight',async()=>{
  await finish()
  const start=requests.length
  await act(async()=>{
    document.dispatchEvent(new dom.window.Event('visibilitychange'))
    document.dispatchEvent(new dom.window.Event('visibilitychange'))
  })
  assert.equal(requests.slice(start).filter(x=>x.config.url==='/admin/reservations').length,1)
  assert.equal(requests.slice(start).filter(x=>x.config.url==='/admin/merchant-place-applications').length,1)
  await finish(start)
})
