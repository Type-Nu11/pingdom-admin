import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppDialog } from '../../src/components/common/AppDialog'
import { AccessibleTabList } from '../../src/components/common/AccessibleTabList'
import { UnsavedChangesProvider } from '../../src/components/common/UnsavedChangesProvider'
import { useUnsavedChanges } from '../../src/hooks/useUnsavedChanges'
import { SubmitButton } from '../../src/pages/login/LoginPage.styles'
import { GlobalStyle } from '../../src/styles/globalStyle'
import { observeFixtureAdapter } from '../helpers/fixture-adapter.mjs'

const fault = new URLSearchParams(location.search).get('fault')
function Probes() {
  const [open, setOpen] = useState(false), [value, setValue] = useState(''), [tab, setTab] = useState(0)
  const protection = useUnsavedChanges(value !== '')
  window.qaCaughtFailure = async () => {
    try { await observeFixtureAdapter(async () => { throw new Error('injected caught failure') })({ method: 'get', url: '/synthetic' }) } catch { /* Deliberately swallowed: guard must still see it. */ }
  }
  return <main style={{ padding: 24 }}><GlobalStyle /><h1>검사 감지 능력 검증</h1>
    <SubmitButton data-contrast="production-submit" style={fault === 'contrast' ? { color: '#fff', background: '#fff' } : undefined}>대비 검증</SubmitButton>
    <AccessibleTabList panelId="probe-panel" aria-label="검증 탭">{[0, 1].map(index => <button key={index} role="tab" aria-selected={tab === index} onClick={() => setTab(index)}>탭 {index + 1}</button>)}</AccessibleTabList>
    <section id="probe-panel" role="tabpanel" aria-labelledby={`probe-panel-tab-${tab}`}>패널 {tab + 1}</section>
    <label>미저장 입력<input value={value} onChange={event => setValue(event.target.value)} /></label>
    <button onClick={() => fault === 'unsaved' ? setValue('') : protection.request(() => setValue(''))}>입력 초기화</button>
    <button onClick={() => setOpen(true)}>처리 모달 열기</button>
    {open ? <AppDialog title="처리 중 잠금 검증" description="합성 요청 진행 상태" isDismissible={fault === 'close'} onClose={() => setOpen(false)} footer={<button disabled>처리 중</button>}><input aria-label="처리 중 입력" disabled /></AppDialog> : null}
  </main>
}
const router = createBrowserRouter([{ path: '*', element: <UnsavedChangesProvider><Probes /></UnsavedChangesProvider> }])
createRoot(document.getElementById('root')).render(<RouterProvider router={router} />)
