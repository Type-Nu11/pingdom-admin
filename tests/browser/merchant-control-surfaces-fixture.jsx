import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import { createBrowserRouter, Link, RouterProvider, useLocation } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { MerchantControlLayout } from '../../src/app/router/MerchantControlLayout'
import { MerchantPlaceIdentityContext } from '../../src/app/providers/MerchantPlaceIdentityContext'
import { AdminSelect } from '../../src/components/common/AdminStatusSelect'
import { AdminDatePicker, AdminDateTimePicker, AdminTimePicker } from '../../src/components/common/AdminDateTimePicker'
import { MerchantPlaceSelect } from '../../src/components/merchant/MerchantPlaceSelect'
import { AppDialog } from '../../src/components/common/AppDialog'
import * as S from '../../src/components/merchant/MerchantWorkspace.styles'
import { GlobalStyle } from '../../src/styles/globalStyle'
import { theme } from '../../src/styles/theme'

const identity = { places: { 1: { status: 'ready', name: '합성 매장', address: '서울 중구 테스트로 12' } }, ensurePlaces() {} }
function Controls({ prefix }) {
  const [state, setState] = useState('ALL')
  const [date, setDate] = useState('2030-10-24')
  const [datetime, setDatetime] = useState('2030-10-24T14:00')
  const [time, setTime] = useState('14:00')
  return <S.Form aria-label={prefix + ' 입력'}>
    <S.Field>상태<AdminSelect aria-label={prefix + ' 상태'} width="100%" value={state} onChange={event => setState(event.target.value)}><option value="ALL">전체 상태</option><option value="PENDING">승인 대기</option></AdminSelect></S.Field>
    <S.Field as="div">매장<MerchantPlaceSelect compact fullWidth aria-label={prefix + ' 매장'} value="1"><option value="1">장소 #1</option></MerchantPlaceSelect></S.Field>
    <S.Field as="div">날짜<AdminDatePicker ariaLabel={prefix + ' 날짜'} value={date} onChange={setDate} /></S.Field>
    <S.Field as="div">일시<AdminDateTimePicker ariaLabel={prefix + ' 일시'} value={datetime} onChange={setDatetime} /></S.Field>
    <S.Field as="div">시간<AdminTimePicker ariaLabel={prefix + ' 시간'} value={time} onChange={setTime} /></S.Field>
    <S.Field>사용 불가<AdminSelect aria-label={prefix + ' 비활성'} value="" disabled><option value="">사용 불가</option></AdminSelect></S.Field>
    <S.Field>기존 선택<S.Select aria-label={prefix + ' 기본 선택'}><option>선택 항목</option></S.Select></S.Field>
    <S.FormActions><S.ActionButton type="button" $variant="primary">{prefix} 저장</S.ActionButton><S.ActionButton type="button" $variant="danger">{prefix} 삭제</S.ActionButton></S.FormActions>
  </S.Form>
}
function Demo() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  return <div style={{ maxWidth: 1000, padding: 24, margin: 'auto' }}>
    <h1>{pathname === '/admin-qa' ? '관리자 버튼 검증' : pathname === '/apply-qa' ? '신청 버튼 검증' : '상점주 버튼 검증'} · 실제 API 없음</h1>
    <nav style={{ display: 'flex', gap: 16 }}><Link to="/merchant-qa">상점주</Link><Link to="/apply-qa">신청 화면</Link><Link to="/admin-qa">관리자</Link></nav>
    <S.Panel style={{ padding: 24, marginTop: 24 }}><Controls prefix="페이지" /></S.Panel>
    <S.HeaderButton type="button" onClick={() => setOpen(true)}>모달 열기</S.HeaderButton>
    {open ? createPortal(<AppDialog title="선택 버튼 검증" onClose={() => setOpen(false)}><Controls prefix="모달" /></AppDialog>, document.body) : null}
  </div>
}
const router = createBrowserRouter([
  { element: <MerchantControlLayout />, children: [{ path: '/merchant-qa', element: <Demo /> }, { path: '/apply-qa', element: <Demo /> }] },
  { path: '/admin-qa', element: <Demo /> },
])
createRoot(document.getElementById('root')).render(<ThemeProvider theme={theme}><GlobalStyle /><MerchantPlaceIdentityContext.Provider value={identity}><RouterProvider router={router} /></MerchantPlaceIdentityContext.Provider></ThemeProvider>)
