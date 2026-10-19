import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { GlobalStyle } from '../../src/styles/globalStyle'
import * as Admin from '../../src/pages/placeMerge/PlaceMergePage.styles'
import * as Merchant from '../../src/components/merchant/MerchantPageShell.styles'
import * as Workspace from '../../src/components/merchant/MerchantWorkspace.styles'
import * as Surface from '../../src/components/merchant/MerchantSurface.styles'
import * as Registration from '../../src/pages/merchantPlaceRegistration/MerchantPlaceRegistrationPage.styles'
import * as AdminNav from '../../src/components/navigation/AdminNavigationMenu.styles'
import * as MerchantNav from '../../src/components/navigation/MerchantNavigationMenu.styles'
import { FeedbackMessage } from '../../src/components/common/FeedbackMessage'
import { AppDialog } from '../../src/components/common/AppDialog'

function Fixture() {
  const [dialog, setDialog] = useState(false)
  return <><GlobalStyle /><main style={{ maxWidth: 1100, margin: 'auto' }}>
    <Admin.PageTitle data-testid="admin-title">관리자 디자인 시스템 확인</Admin.PageTitle>
    <AdminNav.ItemButton $active data-testid="admin-nav">예약 심사</AdminNav.ItemButton>
    <Merchant.Title data-testid="merchant-title">상점주 디자인 시스템 확인</Merchant.Title>
    <MerchantNav.ItemButton $active data-testid="merchant-nav">신규 장소 등록</MerchantNav.ItemButton>
    <Merchant.Description>조회와 입력 기능은 실제 공통 컴포넌트로 확인합니다.</Merchant.Description>
    <Surface.PageTitle data-testid="surface-title">상점주 공통 제목</Surface.PageTitle>
    <Workspace.Panel><Workspace.PanelHeader><Workspace.PanelTitle data-testid="panel-title">예약 가능 시간</Workspace.PanelTitle></Workspace.PanelHeader>
      <Workspace.Editor><Workspace.Form onSubmit={event => event.preventDefault()}>
        <Workspace.Field>장소명<Workspace.Input data-testid="merchant-input" defaultValue="테스트 가게" /></Workspace.Field>
        <Workspace.Field>안내<Workspace.Textarea defaultValue="예약 안내를 입력하세요." /></Workspace.Field>
        <Workspace.FieldHint data-testid="hint">필수 항목을 확인해주세요.</Workspace.FieldHint>
        <Workspace.StatusBadge $tone="published" data-testid="badge">게시 중</Workspace.StatusBadge>
        <Workspace.ActionButton type="button" $variant="primary" onClick={() => setDialog(true)} data-testid="primary">상세 확인</Workspace.ActionButton>
      </Workspace.Form></Workspace.Editor>
    </Workspace.Panel>
    <Registration.PlaceSearchResultIcon data-testid="marker" aria-hidden="true">location_on</Registration.PlaceSearchResultIcon>
    <Registration.StatusBadge $tone="draft" data-testid="draft">초안</Registration.StatusBadge>
    {['error', 'success', 'warning', 'info'].map(tone => <FeedbackMessage key={tone} tone={tone}>{tone} 상태 안내</FeedbackMessage>)}
    {dialog && <AppDialog title="입력 내용 확인" description="필수 항목을 확인한 뒤 진행해주세요." onClose={() => setDialog(false)}><Workspace.Input aria-label="모달 입력" /><Workspace.ActionButton onClick={() => setDialog(false)}>닫기</Workspace.ActionButton></AppDialog>}
  </main></>
}
createRoot(document.getElementById('root')).render(<Fixture />)
