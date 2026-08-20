import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantStore } from '../../hooks/useMerchantStore'
import type {
  MerchantOfferStatus,
  MerchantOwnerProfileStatus,
  ReservableProductStatus,
} from '../../types/merchantStore.types'
import * as S from './MerchantStorePage.styles'

const OWNER_STATUS: Record<MerchantOwnerProfileStatus, { label: string; tone: 'active' | 'pending' | 'inactive' }> = {
  ACTIVE: { label: '운영 가능', tone: 'active' },
  PENDING: { label: '승인 대기', tone: 'pending' },
  REJECTED: { label: '승인 거절', tone: 'inactive' },
  REVOKED: { label: '운영 중지', tone: 'inactive' },
}

const OFFER_STATUS: Record<MerchantOfferStatus, string> = {
  DRAFT: '초안',
  PUBLISHED: '공개 중',
  CLOSED: '종료',
}

const PRODUCT_STATUS: Record<ReservableProductStatus, string> = {
  ACTIVE: '예약 가능',
  INACTIVE: '비활성',
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace(/\./g, '')
    .replace(/\s/g, '.')
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function StoreInformationForm({
  initialValues,
  isSaving,
  onSave,
}: {
  initialValues: {
    description: string | null
    contactPhone: string | null
    websiteUrl: string | null
    reservationUrl: string | null
  } | null
  isSaving: boolean
  onSave: (values: {
    description: string
    contactPhone: string
    websiteUrl: string
    reservationUrl: string
  }) => Promise<boolean>
}) {
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [contactPhone, setContactPhone] = useState(initialValues?.contactPhone ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(initialValues?.websiteUrl ?? '')
  const [reservationUrl, setReservationUrl] = useState(initialValues?.reservationUrl ?? '')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSave({ description, contactPhone, websiteUrl, reservationUrl })
  }

  return (
    <S.Form onSubmit={submit}>
      <S.Field $wide>
        가게 소개
        <S.Textarea
          value={description}
          maxLength={1000}
          placeholder="방문 전 알아두면 좋은 가게 소개를 입력하세요."
          disabled={isSaving}
          onChange={(event) => setDescription(event.target.value)}
        />
      </S.Field>
      <S.Field>
        문의 전화번호
        <S.Input
          value={contactPhone}
          maxLength={30}
          placeholder="예: 02-1234-5678"
          disabled={isSaving}
          onChange={(event) => setContactPhone(event.target.value)}
        />
      </S.Field>
      <S.Field>
        웹사이트
        <S.Input
          type="url"
          value={websiteUrl}
          maxLength={500}
          placeholder="https://"
          disabled={isSaving}
          onChange={(event) => setWebsiteUrl(event.target.value)}
        />
      </S.Field>
      <S.Field $wide>
        예약 페이지
        <S.Input
          type="url"
          value={reservationUrl}
          maxLength={500}
          placeholder="https://"
          disabled={isSaving}
          onChange={(event) => setReservationUrl(event.target.value)}
        />
      </S.Field>
      <S.FormFooter>
        <S.SaveButton type="submit" disabled={isSaving}>
          {isSaving ? '저장 중' : '저장'}
        </S.SaveButton>
      </S.FormFooter>
    </S.Form>
  )
}

function MerchantStorePage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const store = useMerchantStore()
  const ownerStatus = store.profile ? OWNER_STATUS[store.profile.status] : null
  const activeCampaignCount = store.campaigns.filter((campaign) => campaign.status === 'PUBLISHED').length
  const activeOfferCount = store.offers.filter((offer) => offer.status === 'PUBLISHED').length
  const activeProductCount = store.reservableProducts.filter((product) => product.status === 'ACTIVE').length

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  if (store.status === 'error') {
    return (
      <S.Page>
        <S.Header>
          <S.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
          <S.LogoutButton type="button" onClick={handleLogout}>로그아웃</S.LogoutButton>
        </S.Header>
        <S.Content>
          <S.PageIntro>
            <div>
              <S.Eyebrow>Merchant Portal</S.Eyebrow>
              <S.PageTitle>내 가게 관리</S.PageTitle>
            </div>
          </S.PageIntro>
          <S.Notice $tone="error" role="alert"><S.NoticeIcon aria-hidden="true">error_outline</S.NoticeIcon>{store.errorMessage}</S.Notice>
          <div style={{ marginTop: 16 }}><S.RetryButton type="button" onClick={() => void store.fetchStore()}>다시 시도</S.RetryButton></div>
        </S.Content>
      </S.Page>
    )
  }

  return (
    <S.Page>
      <S.Header>
        <S.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
        <S.HeaderUser>
          <S.AccountIcon aria-hidden="true">storefront</S.AccountIcon>
          <strong>{store.profile?.displayName || user?.username || '상점주'}</strong>
          <S.LogoutButton type="button" onClick={handleLogout}>로그아웃</S.LogoutButton>
        </S.HeaderUser>
      </S.Header>

      <S.Content>
        <S.PageIntro>
          <div>
            <S.Eyebrow>Merchant Portal</S.Eyebrow>
            <S.PageTitle>내 가게 관리</S.PageTitle>
            <S.PageDescription>방문자에게 보여줄 정보와 운영 중인 혜택을 관리합니다.</S.PageDescription>
          </div>
          {store.profile && store.profile.placeIds.length > 1 ? (
            <S.PlaceSelect
              aria-label="관리할 장소 선택"
              value={store.selectedPlaceId ?? ''}
              onChange={(event) => store.selectPlace(Number(event.target.value))}
            >
              {store.profile.placeIds.map((placeId) => <option key={placeId} value={placeId}>연결 장소 #{placeId}</option>)}
            </S.PlaceSelect>
          ) : null}
        </S.PageIntro>

        {store.status === 'loading' || !store.profile ? (
          <S.LoadingSummary aria-label="가게 정보를 불러오는 중">
            <S.Skeleton $height={170} />
            <S.Metrics><S.Skeleton $height={112} /><S.Skeleton $height={112} /><S.Skeleton $height={112} /></S.Metrics>
          </S.LoadingSummary>
        ) : (
          <>
            <S.StoreSummary>
              <div>
                <S.SummaryTitleRow>
                  <S.StoreName>{store.profile.businessName}</S.StoreName>
                  {ownerStatus ? <S.StatusBadge $tone={ownerStatus.tone}>{ownerStatus.label}</S.StatusBadge> : null}
                </S.SummaryTitleRow>
                <S.StoreMeta>
                  {store.selectedPlaceId ? `연결 장소 #${store.selectedPlaceId}` : '연결된 장소가 없습니다.'}
                  {store.profile.contactEmail ? ` · ${store.profile.contactEmail}` : ''}
                </S.StoreMeta>
              </div>
              <S.QuickLinks aria-label="가게 관리 바로가기">
                <S.QuickLink type="button" onClick={() => scrollToSection('merchant-store-information')}>기본 정보</S.QuickLink>
                <S.QuickLink type="button" onClick={() => scrollToSection('merchant-store-campaigns')}>이벤트</S.QuickLink>
                <S.QuickLink type="button" onClick={() => scrollToSection('merchant-store-offers')}>혜택·예약</S.QuickLink>
              </S.QuickLinks>
            </S.StoreSummary>

            {store.selectedPlaceId ? (
              <>
                <S.Metrics aria-label="가게 운영 현황">
                  <S.Metric><S.MetricIcon aria-hidden="true">campaign</S.MetricIcon><S.MetricContent><span>공개 중인 이벤트</span><strong>{activeCampaignCount}개</strong></S.MetricContent></S.Metric>
                  <S.Metric><S.MetricIcon aria-hidden="true">local_offer</S.MetricIcon><S.MetricContent><span>공개 중인 혜택</span><strong>{activeOfferCount}개</strong></S.MetricContent></S.Metric>
                  <S.Metric><S.MetricIcon aria-hidden="true">calendar_month</S.MetricIcon><S.MetricContent><span>예약 가능한 상품</span><strong>{activeProductCount}개</strong></S.MetricContent></S.Metric>
                </S.Metrics>

                {store.sectionErrorMessage ? <div style={{ marginTop: 16 }}><S.Notice $tone="error" role="alert"><S.NoticeIcon aria-hidden="true">error_outline</S.NoticeIcon>{store.sectionErrorMessage}</S.Notice></div> : null}
                {store.successMessage ? <div style={{ marginTop: 16 }}><S.Notice $tone="success" role="status"><S.NoticeIcon aria-hidden="true">check_circle</S.NoticeIcon>{store.successMessage}</S.Notice></div> : null}

                <S.Workspace>
                  <S.Column>
                    <S.Section id="merchant-store-information">
                      <S.SectionHeading><div><S.SectionTitle>기본 정보</S.SectionTitle><S.SectionDescription>방문자가 장소 상세에서 확인하는 소개와 문의 경로입니다.</S.SectionDescription></div></S.SectionHeading>
                      <StoreInformationForm
                        key={`${store.selectedPlaceId}-${store.placeInformation?.updatedAt ?? 'loading'}`}
                        initialValues={store.placeInformation}
                        isSaving={store.isSavingInformation}
                        onSave={store.saveInformation}
                      />
                    </S.Section>

                    <S.Section id="merchant-store-campaigns">
                      <S.SectionHeading><div><S.SectionTitle>이벤트</S.SectionTitle><S.SectionDescription>현재 등록된 이벤트의 공개 상태와 기간을 확인합니다.</S.SectionDescription></div></S.SectionHeading>
                      {store.campaigns.length === 0 ? <S.Empty>등록된 이벤트가 없습니다.</S.Empty> : <S.ResourceList>{store.campaigns.slice(0, 4).map((campaign) => <S.ResourceRow key={campaign.id}><S.ResourceTop><S.ResourceTitle title={campaign.title}>{campaign.title}</S.ResourceTitle><S.ResourceBadge $active={campaign.status === 'PUBLISHED'}>{campaign.status === 'PUBLISHED' ? '공개 중' : campaign.status === 'DRAFT' ? '초안' : '종료'}</S.ResourceBadge></S.ResourceTop><S.ResourceMeta>{formatDate(campaign.startsAt)} - {formatDate(campaign.endsAt)}</S.ResourceMeta></S.ResourceRow>)}</S.ResourceList>}
                    </S.Section>
                  </S.Column>

                  <S.Column>
                    <S.Section id="merchant-store-offers">
                      <S.SectionHeading><div><S.SectionTitle>혜택</S.SectionTitle><S.SectionDescription>관광객에게 제공하는 쿠폰과 전용 혜택입니다.</S.SectionDescription></div></S.SectionHeading>
                      {store.offers.length === 0 ? <S.Empty>등록된 혜택이 없습니다.</S.Empty> : <S.ResourceList>{store.offers.slice(0, 4).map((offer) => <S.ResourceRow key={offer.id}><S.ResourceTop><S.ResourceTitle title={offer.title}>{offer.title}</S.ResourceTitle><S.ResourceBadge $active={offer.status === 'PUBLISHED'}>{OFFER_STATUS[offer.status]}</S.ResourceBadge></S.ResourceTop><S.ResourceMeta>{offer.benefitDescription} · {formatDate(offer.endsAt)}까지</S.ResourceMeta></S.ResourceRow>)}</S.ResourceList>}
                    </S.Section>

                    <S.Section>
                      <S.SectionHeading><div><S.SectionTitle>예약 상품</S.SectionTitle><S.SectionDescription>현재 고객이 예약할 수 있는 상품입니다.</S.SectionDescription></div></S.SectionHeading>
                      {store.reservableProducts.length === 0 ? <S.Empty>등록된 예약 상품이 없습니다.</S.Empty> : <S.ResourceList>{store.reservableProducts.slice(0, 4).map((product) => <S.ResourceRow key={product.id}><S.ResourceTop><S.ResourceTitle title={product.name}>{product.name}</S.ResourceTitle><S.ResourceBadge $active={product.status === 'ACTIVE'}>{PRODUCT_STATUS[product.status]}</S.ResourceBadge></S.ResourceTop><S.ResourceMeta>{product.productType === 'GENERAL' ? '일반 예약' : product.productType === 'TICKET' ? '티켓' : '클래스'}</S.ResourceMeta></S.ResourceRow>)}</S.ResourceList>}
                    </S.Section>

                    <S.Section>
                      <S.SectionHeading><div><S.SectionTitle>운영 상태</S.SectionTitle><S.SectionDescription>점주 프로필과 연결 장소 상태를 확인합니다.</S.SectionDescription></div></S.SectionHeading>
                      <S.StatusList>
                        <S.StatusRow><div><strong>상점주 계정</strong><span>승인된 계정만 장소 정보를 수정할 수 있습니다.</span></div><S.StateText $tone={ownerStatus?.tone === 'active' ? 'active' : ownerStatus?.tone === 'pending' ? 'pending' : 'neutral'}>{ownerStatus?.label ?? '확인 중'}</S.StateText></S.StatusRow>
                        <S.StatusRow><div><strong>장소 연결</strong><span>현재 관리 권한이 연결된 장소입니다.</span></div><S.StateText $tone={store.selectedPlaceId ? 'active' : 'neutral'}>{store.selectedPlaceId ? `장소 #${store.selectedPlaceId}` : '연결 없음'}</S.StateText></S.StatusRow>
                      </S.StatusList>
                    </S.Section>
                  </S.Column>
                </S.Workspace>
              </>
            ) : (
              <S.EmptyStoreState>
                <S.EmptyStoreIcon aria-hidden="true">add_business</S.EmptyStoreIcon>
                <div>
                  <S.EmptyStoreTitle>관리할 장소를 연결해주세요.</S.EmptyStoreTitle>
                  <S.EmptyStoreDescription>PingDom에 이미 등록된 장소를 검색해 운영 권한을 신청할 수 있습니다. 심사와 연결이 완료되면 이 화면에서 가게 정보를 관리합니다.</S.EmptyStoreDescription>
                </div>
                <S.EmptyStoreAction type="button" onClick={() => navigate('/merchant/place-application')}>운영 장소 신청</S.EmptyStoreAction>
              </S.EmptyStoreState>
            )}
          </>
        )}
      </S.Content>
    </S.Page>
  )
}

export default MerchantStorePage
