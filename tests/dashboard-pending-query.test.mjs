import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { AxiosError } from 'axios'
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window','document','localStorage']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({server:{middlewareMode:true,ws:false},appType:'custom'})
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { useAdminDashboard } = await server.ssrLoadModule('/src/hooks/useAdminDashboard.ts')
let root, state, requests, clears
const auth = {clearAuth(){clears++}}
function Probe({enabled}) {state = useAdminDashboard({enabled});return null}
async function render(enabled=true){await act(async()=>{root.render(h(AuthContext.Provider,{value:auth},h(Probe,{enabled})));});await act(async()=>{await new Promise(r=>setTimeout(r,10))})}
beforeEach(async()=>{requests=[];clears=0;client.defaults.adapter=config=>new Promise((resolve,reject)=>requests.push({config,resolve,reject}));root=createRoot(document.getElementById('root'));await render()})
afterEach(async()=>{await act(async()=>root.unmount())})
after(async()=>{await server.close();dom.window.close()})
const pending={items:[{id:7,status:'PENDING',placeName:'합성 가게',submittedAt:'2026-09-16T09:00:00'}],total:30}
async function finish(start=0,data=pending,errorStatus){
  await act(async()=>{
    for(const request of requests.slice(start,start+3)){
      const {config,resolve,reject}=request
      if(config.url.endsWith('/merchant-place-applications') && errorStatus){reject(new AxiosError('Synthetic failure','ERR_BAD_RESPONSE',config,null,{config,status:errorStatus,statusText:'Error',headers:{},data:{}}));continue}
      resolve({config,status:200,statusText:'OK',headers:{},data:config.url.endsWith('/merchant-place-applications')?data:config.url.endsWith('/summary')?{placeCount:1,bannedUserCount:0}:{places:[],userSanctions:[]}})
    }
  })
}
test('requests only pending applications with server total and blocks overlapping refresh',async()=>{
  assert.equal(requests.length,3)
  assert.equal(requests[2].config.url,'/admin/merchant-place-applications')
  assert.deepEqual(requests[2].config.params,{status:'PENDING',page:1,limit:10})
  await act(async()=>{void state.fetchSummary();void state.fetchSummary()})
  assert.equal(requests.length,3)
  await finish();assert.equal(state.pendingItems.totalCount,30)
  assert.deepEqual(state.pendingItems.items,[{type:'MERCHANT_PLACE_APPLICATION',targetId:7,status:'PENDING',title:'합성 가게',createdAt:'2026-09-16T09:00:00'}])
  assert.equal(state.pendingItemsStatus,'success')
})
for(const status of [401,403,500]) test(`pending ${status} preserves other sections and distinguishes auth`,async()=>{
  await finish(0,pending,status)
  assert.equal(state.status,'success');assert.equal(state.pendingItemsStatus,'error')
  assert.equal(state.pendingItems,null);assert.equal(clears,status===401?1:0)
})
test('refresh failure retains previous result and retry can reach a genuine zero',async()=>{
  await finish()
  await act(async()=>{void state.fetchSummary()});await finish(3,pending,500)
  assert.equal(state.pendingItems.totalCount,30);assert.equal(state.pendingItemsStatus,'error')
  await act(async()=>{void state.fetchSummary()});await finish(6,{items:[],total:0})
  assert.equal(state.pendingItemsStatus,'empty');assert.equal(state.pendingItems.totalCount,0)
})
for(const data of [{items:null,total:0},{items:[null],total:1},{items:[],total:-1},{items:[{id:1,status:'APPROVED'}],total:1}]) test(`malformed response ${JSON.stringify(data)} is not zero`,async()=>{
  await finish(0,data);assert.equal(state.pendingItemsStatus,'error');assert.equal(state.pendingItems,null)
})
test('disabled session invalidates old response without clearing a newer request',async()=>{
  await render(false);await render(true)
  assert.equal(requests.length,6)
  await finish(0,{items:[],total:0})
  assert.equal(state.pendingItems,null);assert.equal(state.isLoading,true)
  await finish(3);assert.equal(state.pendingItems.totalCount,30)
})
