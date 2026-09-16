import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<div id="root"></div>', {url:'http://localhost/',pretendToBeVisual:true})
for(const key of ['window','document','localStorage','HTMLElement','Node'])globalThis[key]=dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT=true
const {createElement:h,act}=await import('react')
const {createRoot}=await import('react-dom/client')
const server=await createServer({server:{middlewareMode:true,ws:false},appType:'custom',ssr:{noExternal:['styled-components']}})
const {AuthContext}=await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const {AdminTargetSearch}=await server.ssrLoadModule('/src/components/common/AdminTargetSearch.tsx')
const {useAdminUserRoles}=await server.ssrLoadModule('/src/hooks/useAdminUserRoles.ts')
const {default:client}=await server.ssrLoadModule('/src/api/customAxios.ts')
const {searchAdminPlaces,searchAdminRoleTargets}=await server.ssrLoadModule('/src/api/adminTargetSearchApi.ts')
let root,requests,selected,closed,roles
const auth={clearAuth(){}}
const load=(keyword,page)=>new Promise((resolve,reject)=>requests.push({keyword,page,resolve,reject}))
beforeEach(()=>{root=createRoot(document.getElementById('root'));requests=[];selected=null;closed=false})
afterEach(async()=>{await act(async()=>root.unmount())})
after(async()=>{await server.close();dom.window.close()})
async function render(){await act(async()=>root.render(h(AuthContext.Provider,{value:auth},h(AdminTargetSearch,{title:'대상 검색',load,onSelect:item=>selected=item,onClose:()=>closed=true}))))}
const click=async name=>act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent===name)?.click())
async function finish(index,items=[{id:1,name:'같은 이름',description:'첫 주소'},{id:2,name:'같은 이름',description:'둘째 주소'}]){await act(async()=>requests[index].resolve({items,totalCount:25,totalPages:3,hasNext:true}))}
test('same names show distinct addresses and IDs and select exact target',async()=>{
  await render();await finish(0)
  assert.match(document.body.textContent,/같은 이름 · #1 · 첫 주소/)
  await click('같은 이름 · #2 · 둘째 주소')
  assert.equal(selected.id,2);assert.equal(closed,true)
})
test('pagination and a new search reset page and hide stale rows',async()=>{
  await render();await finish(0)
  await act(async()=>document.querySelector('[aria-label="다음 페이지로 이동"]').click())
  assert.equal(requests[1].page,2)
  assert.doesNotMatch(document.body.textContent,/같은 이름/)
  await click('검색');assert.equal(requests[2].page,1)
  await finish(2,[{id:3,name:'최신 결과'}]);await finish(1)
  assert.match(document.body.textContent,/최신 결과/);assert.doesNotMatch(document.body.textContent,/같은 이름/)
})
for(const status of [403,404,500])test(`${status} is error, never empty, and retry works`,async()=>{
  await render();await act(async()=>requests[0].reject({response:{status}}))
  assert.ok(document.querySelector('[role="alert"]'));assert.doesNotMatch(document.body.textContent,/검색 결과가 없습니다/)
  await click('다시 시도');await finish(1,[])
  assert.match(document.body.textContent,/검색 결과가 없습니다/)
})
test('invalid IDs cannot be selected and Escape closes',async()=>{
  await render();await finish(0,[{id:-1,name:'잘못된 대상'}])
  const button=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('잘못된 대상'))
  assert.equal(button.disabled,true)
  await act(async()=>document.querySelector('[role="dialog"]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})))
  assert.equal(closed,true)
})
test('lookup adapters use supported contracts without exposing extra user fields',async()=>{
  const configs=[]
  client.defaults.adapter=async config=>{configs.push(config);return {config,status:200,statusText:'OK',headers:{},data:{users:[{userId:7,username:'operator',email:'not-for-ui'}],places:[{id:8,name:'장소',address:'주소'}],totalCount:1,totalPages:1,hasNext:false}}}
  const users=await searchAdminRoleTargets('oper',2)
  const places=await searchAdminPlaces('장소',3)
  assert.equal(configs[0].url,'/admin/users/role-targets');assert.deepEqual(configs[0].params,{keyword:'oper',page:2,limit:10})
  assert.deepEqual(users.items,[{id:7,name:'operator'}]);assert.equal(places.items[0].description,'주소')
})
function RoleProbe(){roles=useAdminUserRoles();return null}
test('changing role target clears old authority and ignores reversed results',async()=>{
  client.defaults.adapter=config=>new Promise(resolve=>requests.push({config,resolve}))
  await act(async()=>root.render(h(AuthContext.Provider,{value:auth},h(RoleProbe))))
  await act(async()=>{void roles.fetchRoles(1)})
  await act(async()=>{void roles.fetchRoles(2)})
  const resolve=async(index)=>act(async()=>requests[index].resolve({config:requests[index].config,status:200,statusText:'OK',headers:{},data:[]}))
  await resolve(1);await resolve(0)
  assert.equal(roles.targetUserId,2)
  await act(async()=>roles.clearTarget());assert.equal(roles.targetUserId,null)
})
