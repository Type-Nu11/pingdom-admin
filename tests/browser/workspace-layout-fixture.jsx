import React, { useLayoutEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminLayout } from '../../src/app/layouts/AdminLayout'
import { MerchantLayout } from '../../src/app/router/MerchantLayout'
import { MerchantControlLayout } from '../../src/app/router/MerchantControlLayout'
import { useMerchantPlaceSelection } from '../../src/app/providers/MerchantPlaceContext'
import { UnsavedChangesProvider } from '../../src/components/common/UnsavedChangesProvider'
import { useUnsavedChanges } from '../../src/hooks/useUnsavedChanges'
import { AppDialog } from '../../src/components/common/AppDialog'
import { GlobalStyle } from '../../src/styles/globalStyle'
import * as Shell from '../../src/app/layouts/AdminShell.styles'
import client from '../../src/api/customAxios'
import { observeFixtureAdapter } from '../helpers/fixture-adapter.mjs'

// No network is needed for layout QA. Fail on any accidental API call, including reads.
client.defaults.adapter = observeFixtureAdapter(async () => { throw new Error('Unexpected layout QA API request') })
window.workspaceQA = { logouts: 0, accountId: 99 }

function AdminPage() {
  const [value, setValue] = useState(''), [refresh, setRefresh] = useState(0), [dialog, setDialog] = useState(false)
  useUnsavedChanges(Boolean(value))
  return <AdminLayout identifier="합성 관리자" profileLabel="관리자 계정"
    header={<><Shell.TopTitle>레이아웃 검사</Shell.TopTitle><button type="button" onClick={() => setRefresh(v => v + 1)}>상단 작업 {refresh}</button></>}
    overlays={dialog ? <AppDialog title="레이아웃 팝업" onClose={() => setDialog(false)}><p>합성 팝업 내용</p></AppDialog> : null}>
    <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 24 }}>
      <label>합성 입력<input aria-label="합성 입력" value={value} onChange={event => setValue(event.target.value)} /></label>
      <button type="button" onClick={() => setDialog(true)}>팝업 열기</button>
      <p data-testid="admin-route">{useLocation().pathname}</p>
    </main>
  </AdminLayout>
}
function MerchantPage() {
  const { selectedPlaceId, selectPlace } = useMerchantPlaceSelection()
  const { pathname } = useLocation()
  return <main style={{ padding: 24, minHeight: 1200 }}>
    <p data-testid="merchant-route">{pathname}</p><output data-testid="selected-place">{selectedPlaceId ?? '선택 없음'}</output>
    <button type="button" onClick={() => selectPlace(1)}>가게 1 선택</button>
    <button type="button" onClick={() => selectPlace(2)}>가게 2 선택</button>
  </main>
}
const router = createBrowserRouter([{ element: <UnsavedChangesProvider><Outlet /></UnsavedChangesProvider>, children: [
  { path: '/bans', element: <AdminPage key="bans" /> },
  { path: '/dashboard', element: <AdminPage key="dashboard" /> },
  { element: <MerchantControlLayout />, children: [{ element: <MerchantLayout />, children: [
    { path: '/merchant/menus', element: <MerchantPage /> }, { path: '/merchant/campaigns', element: <MerchantPage /> },
    { path: '/merchant', element: <MerchantPage /> },
  ] }] },
  { path: '/login', element: <p>합성 로그인 화면</p> },
] }], { basename: '/console' })
function App() {
  const [id, setId] = useState(99)
  useLayoutEffect(() => { window.workspaceQA.changeAccount = setId; window.workspaceQA.accountId = id }, [id])
  const merchant = location.pathname.startsWith('/console/merchant')
  return <AuthContext.Provider value={{ user: { id, username: `합성 ${id}`, role: merchant ? 'MERCHANT_OWNER' : 'ADMIN' },
    clearAuth() {}, logout() { window.workspaceQA.logouts++ }, isAuthenticated: true, isAuthReady: true }}>
    <GlobalStyle /><RouterProvider router={router} />
  </AuthContext.Provider>
}
createRoot(document.getElementById('root')).render(<App />)
