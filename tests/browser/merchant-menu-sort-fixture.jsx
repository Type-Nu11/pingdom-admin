import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { MerchantPlaceProvider } from '../../src/app/providers/MerchantPlaceProvider'
import { UnsavedChangesProvider } from '../../src/components/common/UnsavedChangesProvider'
import { GlobalStyle } from '../../src/styles/globalStyle'
import Page from '../../src/pages/merchantMenu/MerchantMenuPage'
import client from '../../src/api/customAxios'
import { observeFixtureAdapter } from '../helpers/fixture-adapter.mjs'

const scenario = new URLSearchParams(location.search).get('scenario') || 'normal'
let rows = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, placeId: 1, name: `테스트 메뉴 ${i + 1}`, description: '', priceAmount: 10000, currency: 'KRW', imageUrl: null, displayOrder: i * 10, status: i === 2 ? 'INACTIVE' : 'AVAILABLE' }))
const calls = []
client.defaults.adapter = observeFixtureAdapter(async config => {
  calls.push({ method: config.method, path: config.url, data: config.data ? JSON.parse(config.data) : null })
  const response = data => ({ config, data: structuredClone(data), status: 200, statusText: 'OK', headers: {} })
  if (config.method !== 'get') {
    if (config.method !== 'patch' || !config.url.endsWith('/order')) throw new Error('Only synthetic order writes allowed')
    await new Promise(resolve => setTimeout(resolve, 400))
    if (scenario === 'failure') throw Object.assign(new Error('Synthetic order failure'), { isAxiosError: true, config, response: { status: 500, data: { message: '합성 순서 저장 실패' }, config, headers: {} } })
    const source = rows.findIndex(item => item.id === Number(config.url.split('/').at(-2)))
    const [moved] = rows.splice(source, 1)
    rows.splice(JSON.parse(config.data).displayOrder, 0, moved)
    rows.forEach((item, index) => { item.displayOrder = index })
    return response(moved)
  }
  if (config.url.endsWith('/me')) return response({ placeIds: [1, 2] })
  if (/\/places\/\d+$/.test(config.url)) return response({ id: Number(config.url.split('/').at(-1)), name: '테스트 매장', roadAddress: '서울 중구 테스트로 12' })
  if (config.url.endsWith('/menus')) {
    await new Promise(resolve => setTimeout(resolve, 80))
    return response(rows)
  }
  throw new Error('Unexpected synthetic request ' + config.url)
})
function Fixture() {
  return <UnsavedChangesProvider><GlobalStyle />
    <aside><span>합성 메뉴 QA · 운영 데이터 변경 없음</span><button onClick={event => { event.currentTarget.textContent = JSON.stringify(calls) }} aria-label="정렬 요청 기록">요청 기록</button></aside>
    <Page />
  </UnsavedChangesProvider>
}
const router = createBrowserRouter([{ path: '*', element: <Fixture /> }])
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={{ user: { id: 1, role: 'MERCHANT_OWNER' }, clearAuth() {}, logout() {} }}><MerchantPlaceProvider><RouterProvider router={router} /></MerchantPlaceProvider></AuthContext.Provider>)
