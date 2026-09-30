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
const {AdminPlacePicker}=await server.ssrLoadModule('/src/components/common/AdminPlacePicker.tsx')
const {useAdminPlaceVerification}=await server.ssrLoadModule('/src/hooks/useAdminPlaceVerification.ts')
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

test('place picker selects an ID, shows its address, and clears selection',async()=>{
  client.defaults.adapter=async config=>({config,status:200,statusText:'OK',headers:{},data:{places:[{id:8,name:'선택 장소',address:'서울 주소'}],totalCount:1,totalPages:1,hasNext:false}})
  function Picker(){const [value,setValue]=React.useState('');return h(AdminPlacePicker,{value,onChange:setValue})}
  const React=await import('react')
  await act(async()=>root.render(h(AuthContext.Provider,{value:auth},h(Picker))))
  await click('장소 검색');await click('선택 장소 · #8 · 서울 주소')
  assert.match(document.body.textContent,/선택 장소 · #8서울 주소/)
  assert.equal(document.querySelector('input').value,'8')
  await click('선택 해제')
  assert.equal(document.querySelector('input').value,'')
  assert.doesNotMatch(document.body.textContent,/서울 주소/)
})

test('controlled place selection survives picker remount and clears parent metadata',async()=>{
  const React=await import('react')
  client.defaults.adapter=async config=>({config,status:200,statusText:'OK',headers:{},data:{places:[{id:8,name:'선택 장소',address:'서울 주소'}],totalCount:1,totalPages:1,hasNext:false}})
  let selection
  function PickerPage(){
    const [visible,setVisible]=React.useState(true)
    const [value,setValue]=React.useState('')
    const [place,setPlace]=React.useState(null)
    selection={value,place}
    return h('div',null,
      h('button',{onClick:()=>setVisible(current=>!current)},'탭 전환'),
      visible?h(AdminPlacePicker,{value,selectedPlace:place,onChange:(next,target)=>{setValue(next);setPlace(target)}}):null)
  }
  await act(async()=>root.render(h(AuthContext.Provider,{value:auth},h(PickerPage))))
  await click('장소 검색');await click('선택 장소 · #8 · 서울 주소')
  await click('탭 전환');await click('탭 전환')
  assert.match(document.body.textContent,/선택 장소 · #8서울 주소/)
  assert.equal(selection.value,'8')
  assert.deepEqual(selection.place,{id:8,name:'선택 장소',description:'서울 주소'})
  await click('선택 해제')
  assert.deepEqual(selection,{value:'',place:null})
  await click('탭 전환');await click('탭 전환')
  assert.match(document.body.textContent,/선택한 장소 없음/)
  assert.doesNotMatch(document.body.textContent,/서울 주소/)
})

test('clearing verification target invalidates in-flight evidence and reverification',async()=>{
  let verification
  function Probe(){verification=useAdminPlaceVerification();return null}
  client.defaults.adapter=config=>new Promise(resolve=>requests.push({config,resolve}))
  await act(async()=>root.render(h(AuthContext.Provider,{value:auth},h(Probe))))
  await act(async()=>{void verification.fetchEvidence(1);void verification.fetchReverificationRequests(1)})
  await act(async()=>verification.clearPlace())
  for(const request of requests)await act(async()=>request.resolve({config:request.config,status:200,statusText:'OK',headers:{},data:{evidences:[{id:99}],requests:[{id:99}],totalCount:1,page:1,totalPages:1,hasNext:false}}))
  assert.equal(verification.placeId,null)
  assert.deepEqual(verification.evidences,[])
  assert.deepEqual(verification.reverificationRequests,[])
  assert.equal(verification.isEvidenceLoading,false)
})

test('401 search expires authentication instead of showing an empty result',async()=>{
  let cleared=false
  await act(async()=>root.render(h(AuthContext.Provider,{value:{clearAuth(){cleared=true}}},h(AdminTargetSearch,{title:'대상 검색',load,onSelect(){},onClose(){}}))))
  await act(async()=>requests[0].reject({isAxiosError:true,response:{status:401}}))
  assert.equal(cleared,true)
  assert.ok(document.querySelector('[role="alert"]'))
})
