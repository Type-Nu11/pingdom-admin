import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { GlobalStyle } from '../../src/styles/globalStyle'
import { InlineExample } from '../../src/components/common/Text.styles'
import { AdminSelect } from '../../src/components/common/AdminStatusSelect'
import { AdminDateTimePicker } from '../../src/components/common/AdminDateTimePicker'
import { AttachmentTypeDropdown } from '../../src/components/merchant/AttachmentTypeDropdown'
import * as Registration from '../../src/pages/merchantPlaceRegistration/MerchantPlaceRegistrationPage.styles'
import * as Claim from '../../src/pages/merchantPlaceApplication/MerchantPlaceApplicationPage.styles'
import * as Surface from '../../src/components/merchant/MerchantSurface.styles'
import * as Workspace from '../../src/components/merchant/MerchantWorkspace.styles'
import * as Admin from '../../src/pages/adminUtility/AdminUtilityPage.styles'
import * as Place from '../../src/pages/place/PlaceManagePage.styles'
import * as Merge from '../../src/pages/placeMerge/PlaceMergePage.styles'
import * as Store from '../../src/pages/merchantStore/MerchantStorePage.styles'
import * as Review from '../../src/pages/merchantPlaceApplicationReview/MerchantPlaceApplicationReviewPage.styles'

const title = '테스트 매장 서울역점 본관 지하 1층 예약 전용 공간'
const address = '서울특별시 중구 테스트로 123 테스트빌딩 본관 지하 1층 안내 데스크 옆'
const filename = '사업자등록증_서울역점_확인용_20261019_' + 'a'.repeat(60) + '.pdf'

function Fixture() {
  const [status, setStatus] = useState('long')
  const [attachment, setAttachment] = useState('long')
  return <><GlobalStyle /><main style={{ maxWidth: 1000, margin: 'auto', padding: 20 }}>
    <h1>텍스트 가독성 검증</h1>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 24 }}>
      <section style={{ minWidth: 0 }}><h2>상점주 안내·첨부</h2>
        <Registration.Section data-testid="registration-section">
          <Surface.Field>연락처<Surface.Input defaultValue="+82-010-1234-5678" />
            <Registration.SectionHint data-testid="phone-hint">국가번호를 포함해 입력하세요. <InlineExample data-testid="phone-example">예: +82-010-1234-5678</InlineExample></Registration.SectionHint>
          </Surface.Field>
          <Surface.Field>이메일<Surface.Input defaultValue="test@example.com" /></Surface.Field>
        </Registration.Section>
        <Claim.SearchHint data-testid="claim-hint">국가번호를 포함해 입력하세요. <InlineExample>예: +82-10-1234-5678</InlineExample></Claim.SearchHint>
        <Workspace.Field><Workspace.FieldHint data-testid="field-hint">선택한 요일의 영업시간을 확인한 뒤 저장해주세요.</Workspace.FieldHint></Workspace.Field>
        <Registration.FilePicker $hasFile={false} $disabled={false}><span aria-hidden="true">↥</span><div><strong>파일 선택</strong><small data-testid="file-help">심사 요청 때 함께 업로드됩니다.</small></div></Registration.FilePicker>
        {[Registration.AttachmentFileInfo, Claim.AttachmentFileInfo].map((Info, i) => <Info key={i}><span aria-hidden="true">↥</span><div><strong data-testid={`filename-${i}`}>{filename}</strong><small>사업자등록증 · 20 MiB 이하</small></div></Info>)}
        <Claim.SearchResult type="button"><strong>{title}</strong><span data-testid="search-address">{address}</span></Claim.SearchResult>
        <Store.ResourceTitle data-testid="resource-title">{title}</Store.ResourceTitle>
        <Store.ResourceMeta data-testid="resource-meta">{address}</Store.ResourceMeta>
      </section>
      <section style={{ minWidth: 0 }}><h2>관리자 상세·필터</h2>
        <Admin.DetailTitle data-testid="admin-title">{title}</Admin.DetailTitle>
        <Place.DetailTitle data-testid="place-title">{title}</Place.DetailTitle>
        <Place.DetailMetaRow><span>이메일</span><strong data-testid="email">{'example'.repeat(12)}@example.com</strong></Place.DetailMetaRow>
        <Place.OperatingSummaryLabel><small data-testid="hours">월요일부터 금요일까지 오전 10시부터 오후 8시까지 운영합니다.</small></Place.OperatingSummaryLabel>
        <Merge.PlaceCardTitle data-testid="merge-title">{title}</Merge.PlaceCardTitle>
        <dl><Merge.MetaRow><dt>주소</dt><dd data-testid="merge-address">{address}</dd></Merge.MetaRow></dl>
        <dl><Merge.ModalSummaryItem><dt>병합할 장소</dt><dd data-testid="merge-confirm-title">{title}</dd></Merge.ModalSummaryItem></dl>
        <Review.AttachmentRow><div><strong data-testid="review-filename">{filename}</strong><span>사업자등록증</span></div></Review.AttachmentRow>
        <Admin.FilterMenuButton type="button" style={{ width: 140 }}><span className="filter-menu-label" data-testid="filter-label">통합 장소 신청 첨부파일 조회</span><span className="filter-menu-icon" aria-hidden="true">⌄</span></Admin.FilterMenuButton>
        <AdminSelect aria-label="처리 상태" value={status} width="140px" onChange={event => setStatus(event.target.value)}><option value="long">추가 자료 확인이 필요한 심사 대기</option><option value="short">전체</option></AdminSelect>
        <div style={{ width: 140 }}><AttachmentTypeDropdown ariaLabel="증빙 종류" value={attachment} options={[{ value: 'long', label: '사업자등록증 또는 운영 권한 증빙 서류' }, { value: 'short', label: '신분증' }]} onChange={setAttachment} /></div>
        <div style={{ width: 140 }}><AdminDateTimePicker ariaLabel="방문 일시" value="2026-10-24T14:00" onChange={() => {}} /></div>
      </section>
    </div>
  </main></>
}
createRoot(document.getElementById('root')).render(<Fixture />)
