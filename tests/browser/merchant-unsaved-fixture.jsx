import React, { useCallback, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Outlet, useNavigate } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { MerchantPlaceContext } from '../../src/app/providers/MerchantPlaceContext'
import { UnsavedChangesProvider } from '../../src/components/common/UnsavedChangesProvider'
import ProductsPage from '../../src/pages/merchantReservationProducts/MerchantReservationProductsPage'
import AvailabilityPage from '../../src/pages/merchantReservationSetup/MerchantReservationSetupPage'
import NoticesPage from '../../src/pages/merchantOperatingNotice/MerchantOperatingNoticePage'
import OperationsPage from '../../src/pages/merchantPlaceOperations/MerchantPlaceOperationsPage'
import ResponsePage from '../../src/pages/merchantPlaceReverification/MerchantPlaceReverificationPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
import { createMerchantUnsavedData } from './merchant-unsaved-data.mjs'

const data = createMerchantUnsavedData()
let mode = 'success'
let report = () => {}
let writes = 0
client.defaults.adapter = async config => {
  if (config.method !== 'get') { writes++; report(writes) }
  if (mode === 'delayed' && config.method !== 'get') await new Promise(resolve => setTimeout(resolve, 8000))
  if (mode === 'failure' && config.method !== 'get') throw Object.assign(new Error('Synthetic failure'), { isAxiosError: true, config, response: { config, status: 500, data: { message: '합성 저장 실패' }, headers: {} } })
  const value = config.method === 'get' ? data.read(config.url) : data.write(config.url, config.data ? JSON.parse(config.data) : {})
  return { config, data: value, status: 200, statusText: 'OK', headers: {} }
}
function Layout() {
  const navigate = useNavigate()
  const [account, setAccount] = useState(99)
  const [place, setPlace] = useState(1)
  const [count, setCount] = useState(0)
  report = setCount
  const syncPlaces = useCallback(() => 1, [])
  const selection = useMemo(() => ({ selectedPlaceId: place, selectPlace: setPlace, syncPlaces }), [place, syncPlaces])
  const logout = useCallback(() => { setAccount(null); navigate('/login', { replace: true }) }, [navigate])
  const auth = useMemo(() => ({ user: { id: account, username: '합성 QA', role: 'MERCHANT_OWNER' }, logout, clearAuth: logout }), [account, logout])
  return <AuthContext.Provider value={auth}>
    <MerchantPlaceContext.Provider value={selection}><UnsavedChangesProvider key={account}>
      <GlobalStyle />
      <aside style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8, background: '#fff2f5' }}>
        <strong>합성 QA · 실서버 요청 없음 · 변경 {count}회</strong>
        <button onClick={() => navigate('/other')}>화면 이동</button>
        <button onClick={() => setAccount(id => id + 1)}>계정 변경</button>
        <select aria-label="합성 저장 결과" onChange={event => { mode = event.target.value }}><option value="success">성공</option><option value="failure">실패</option><option value="delayed">8초 지연</option></select>
      </aside>
      <Outlet />
    </UnsavedChangesProvider></MerchantPlaceContext.Provider>
  </AuthContext.Provider>
}
const pages = { products: ProductsPage, availability: AvailabilityPage, notices: NoticesPage, operations: OperationsPage, response: ResponsePage }
const Page = pages[new URLSearchParams(location.search).get('screen')] || ProductsPage
const router = createBrowserRouter([{ element: <Layout />, children: [
  { path: '/', element: <Page /> },
  { path: '/other', element: <p>이동 완료</p> },
  { path: '/login', element: <p>로그인 필요</p> },
] }])
createRoot(document.getElementById('root')).render(<RouterProvider router={router} />)
