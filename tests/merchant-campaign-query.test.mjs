import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<div id="root"></div>', { url:'http://localhost/', pretendToBeVisual:true })
for (const key of ['window','document','localStorage','HTMLElement','Node']) globalThis[key]=dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT=true
const {createElement:h,act}=await import('react')
const {createRoot}=await import('react-dom/client')
const server=await createServer({server:{middlewareMode:true,ws:false},appType:'custom',ssr:{noExternal:['styled-components']}})
const {AuthContext}=await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const {useMerchantCampaigns}=await server.ssrLoadModule('/src/hooks/useMerchantCampaigns.ts')
const {default:client}=await server.ssrLoadModule('/src/api/customAxios.ts')
let root,hook,adapter,clears
const response=(config,data)=>({config,data,status:200,statusText:'OK',headers:{}})
const base=async config=>response(config,config.url.endsWith('/me')?{placeIds:[1]}:{items:[{id:1}],totalPages:1})
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
function Probe(){hook=useMerchantCampaigns();return null}
async function mount(){await act(async()=>root.render(h(AuthContext.Provider,{value:{clearAuth(){clears++}}},h(Probe))))}
beforeEach(()=>{clears=0;adapter=base;client.defaults.adapter=config=>adapter(config);root=createRoot(document.getElementById('root'))})
afterEach(async()=>{await act(async()=>root.unmount())})
after(async()=>{await server.close();dom.window.close()})
test('brand failure remains separate and brand-only retry recovers',async()=>{
 adapter=config=>config.url.endsWith('/brands')?Promise.reject(new Error('offline')):base(config)
 await mount()
 assert.equal(hook.status,'ready');assert.equal(hook.brandStatus,'error');assert.equal(hook.errorMessage,'');assert.ok(hook.brandErrorMessage)
 await act(async()=>{await hook.fetchCampaigns()})
 assert.ok(hook.brandErrorMessage)
 adapter=base
 await act(async()=>{await hook.fetchBrands()})
 assert.equal(hook.brandStatus,'ready');assert.equal(hook.brandErrorMessage,'')
})
for(const kind of ['campaigns','brands'])test(`older ${kind} response cannot replace a newer result`,async()=>{
 await mount();const gate=deferred();let calls=0
 adapter=async config=>{if(config.url.endsWith('/'+kind)){if(++calls===1){await gate.promise;return response(config,{items:[{id:2}],totalPages:1})}return response(config,{items:[{id:3}],totalPages:1})}return base(config)}
 const method=kind==='brands'?'fetchBrands':'fetchCampaigns';let old
 await act(async()=>{old=hook.fetchInitialData()})
 await act(async()=>{await hook[method]()})
 await act(async()=>{gate.resolve();await old;await new Promise(r=>setTimeout(r,0))})
 assert.equal(hook[kind][0].id,3)
})
test('older initial profile failure cannot undo a newer initial success',async()=>{
 await mount();const gate=deferred();let calls=0
 adapter=async config=>{if(config.url.endsWith('/me')&&++calls===1){await gate.promise;throw new Error('old failure')}return base(config)}
 let old;await act(async()=>{old=hook.fetchInitialData()})
 await act(async()=>{await hook.fetchInitialData()})
 await act(async()=>{gate.resolve();await old})
 assert.equal(hook.status,'ready');assert.equal(hook.errorMessage,'')
})
for(const status of [401,403,500])test(`brand-only HTTP ${status} uses the shared auth policy`,async()=>{
 adapter=async config=>{if(config.url.endsWith('/brands'))throw Object.assign(new Error('failure'),{isAxiosError:true,config,response:{status,data:{message:'failure'},headers:{},config}});return base(config)}
 await mount();assert.equal(clears>0,status===401);assert.equal(hook.brandStatus,'error');assert.equal(hook.status,'ready')
})
test('profile failure is not overwritten by a delayed campaign result',async()=>{
 const gate=deferred()
 adapter=async config=>{if(config.url.endsWith('/me'))throw new Error('profile failed');await gate.promise;return base(config)}
 await mount();assert.equal(hook.status,'error');const message=hook.errorMessage
 await act(async()=>{gate.resolve();await new Promise(r=>setTimeout(r,0))})
 assert.equal(hook.status,'error');assert.equal(hook.errorMessage,message);assert.equal(hook.isListLoading,false)
})
test('unmount invalidates an outstanding brand request',async()=>{
 await mount();const gate=deferred();adapter=async config=>{await gate.promise;return base(config)}
 let pending;await act(async()=>{pending=hook.fetchBrands()})
 await act(async()=>root.render(null))
 let result;await act(async()=>{gate.resolve();result=await pending})
 assert.equal(result,false)
})
