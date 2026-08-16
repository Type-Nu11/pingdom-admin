import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { PlaceInformationEvidencePanel } from '../../components/placeVerification/PlaceInformationEvidencePanel'
import { PlaceInformationReportPanel } from '../../components/placeVerification/PlaceInformationReportPanel'
import { PlaceInformationReverificationPanel } from '../../components/placeVerification/PlaceInformationReverificationPanel'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminPlaceInformationReports } from '../../hooks/useAdminPlaceInformationReports'
import { useAdminPlaceVerification } from '../../hooks/useAdminPlaceVerification'
import { useAuth } from '../../hooks/useAuth'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as S from './PlaceVerificationPage.styles'

type VerificationTab = 'reports' | 'evidence' | 'reverification'

function parsePlaceId(value: string | null) {
  if (!value) return null
  const placeId = Number(value)
  return Number.isInteger(placeId) && placeId > 0 ? placeId : null
}

function PlaceVerificationPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { logout, user } = useAuth()
  const reportHook = useAdminPlaceInformationReports()
  const verificationHook = useAdminPlaceVerification()
  const initialPlaceId = parsePlaceId(searchParams.get('placeId'))
  const initialTab = (searchParams.get('tab') === 'reverification' ? 'reverification' : initialPlaceId ? 'evidence' : 'reports') as VerificationTab
  const [activeTab, setActiveTab] = useState<VerificationTab>(initialTab)
  const [placeIdInput, setPlaceIdInput] = useState(initialPlaceId ? String(initialPlaceId) : '')
  const [loadedPlaceId, setLoadedPlaceId] = useState<number | null>(initialPlaceId)
  const [searchError, setSearchError] = useState('')
  const adminIdentifier =
    user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  useEffect(() => {
    if (!initialPlaceId) return
    if (initialTab === 'reverification') {
      void verificationHook.fetchReverificationRequests(initialPlaceId)
    } else {
      void verificationHook.fetchEvidence(initialPlaceId)
    }
    // URL로 직접 진입할 때 한 번만 초기 조회합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectTab = (tab: VerificationTab) => {
    setActiveTab(tab)
    verificationHook.clearActionMessages()
    if (tab === 'reports') {
      setSearchParams({ tab: 'reports' })
      return
    }

    const nextParams: Record<string, string> = { tab }
    if (loadedPlaceId) nextParams.placeId = String(loadedPlaceId)
    setSearchParams(nextParams)
    if (!loadedPlaceId) return
    if (tab === 'evidence') void verificationHook.fetchEvidence(loadedPlaceId)
    else void verificationHook.fetchReverificationRequests(loadedPlaceId)
  }

  const handlePlaceSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextPlaceId = Number(placeIdInput)
    if (!Number.isInteger(nextPlaceId) || nextPlaceId <= 0) {
      setSearchError('장소 ID는 1 이상의 정수로 입력해주세요.')
      return
    }
    setSearchError('')
    setLoadedPlaceId(nextPlaceId)
    setSearchParams({ tab: activeTab, placeId: String(nextPlaceId) })
    if (activeTab === 'evidence') void verificationHook.fetchEvidence(nextPlaceId)
    else void verificationHook.fetchReverificationRequests(nextPlaceId)
  }

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader>
          <Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup>
        </Shell.SideHeader>
        <Shell.SideMenu>
          <AdminNavigationMenu />
        </Shell.SideMenu>
        <Shell.SideFooter>
          <Shell.AdminProfile aria-label="관리자 계정">
            <Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon>
            <Shell.AdminProfileText><strong>{adminIdentifier}</strong><span>관리자</span></Shell.AdminProfileText>
          </Shell.AdminProfile>
          <Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton>
        </Shell.SideFooter>
      </Shell.SideNav>

      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup><Shell.TopTitle>장소 정보 검증</Shell.TopTitle></Shell.TopTitleGroup>
          <Shell.TopActions>
            <AdminNotificationButton />
            <Shell.IconButton type="button" aria-label="현재 작업 새로고침" onClick={() => {
              if (activeTab === 'reports') void reportHook.fetchReports(reportHook.status, reportHook.page)
              else if (loadedPlaceId && activeTab === 'evidence') void verificationHook.fetchEvidence(loadedPlaceId)
              else if (loadedPlaceId) void verificationHook.fetchReverificationRequests(loadedPlaceId)
            }}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton>
          </Shell.TopActions>
        </Shell.TopBar>

        <Shared.Content>
          <Shared.PageStack>
            <Shared.PageHeader>
              <div>
                <Shared.Eyebrow>장소 관리 &gt; 정보 검증</Shared.Eyebrow>
                <Shared.PageTitle>장소 정보 신고 및 재확인</Shared.PageTitle>
                <Shared.PageDescription>사용자 신고와 반박을 판정하고, 장소별 증빙 및 업주 재확인 요청을 한 흐름에서 관리합니다.</Shared.PageDescription>
              </div>
              <Shared.HeaderActions>
                <Shared.HeaderButton type="button" onClick={() => navigate('/places')}>장소 관리</Shared.HeaderButton>
              </Shared.HeaderActions>
            </Shared.PageHeader>

            <S.TabList role="tablist" aria-label="정보 검증 작업">
              <S.TabButton type="button" role="tab" aria-selected={activeTab === 'reports'} $active={activeTab === 'reports'} onClick={() => selectTab('reports')}><Shell.MaterialIcon aria-hidden="true">report</Shell.MaterialIcon>신고·반박</S.TabButton>
              <S.TabButton type="button" role="tab" aria-selected={activeTab === 'evidence'} $active={activeTab === 'evidence'} onClick={() => selectTab('evidence')}><Shell.MaterialIcon aria-hidden="true">fact_check</Shell.MaterialIcon>증빙</S.TabButton>
              <S.TabButton type="button" role="tab" aria-selected={activeTab === 'reverification'} $active={activeTab === 'reverification'} onClick={() => selectTab('reverification')}><Shell.MaterialIcon aria-hidden="true">sync_problem</Shell.MaterialIcon>재확인</S.TabButton>
            </S.TabList>

            {activeTab !== 'reports' ? (
              <S.SearchBar onSubmit={handlePlaceSearch}>
                <S.Field>장소 ID
                  <S.Input inputMode="numeric" value={placeIdInput} placeholder="예: 123" onChange={(event) => { setPlaceIdInput(event.target.value); setSearchError('') }} />
                  <small>장소 관리 화면에서 확인한 ID를 입력하세요.</small>
                </S.Field>
                <Shared.PrimaryButton type="submit" disabled={verificationHook.activeAction !== null}>장소 조회</Shared.PrimaryButton>
              </S.SearchBar>
            ) : null}
            {searchError ? <Shared.Notice $variant="error">{searchError}</Shared.Notice> : null}

            {activeTab === 'reports' ? <PlaceInformationReportPanel reportHook={reportHook} /> : null}
            {activeTab === 'evidence' ? <PlaceInformationEvidencePanel verificationHook={verificationHook} loadedPlaceId={loadedPlaceId} /> : null}
            {activeTab === 'reverification' ? <PlaceInformationReverificationPanel verificationHook={verificationHook} loadedPlaceId={loadedPlaceId} /> : null}
          </Shared.PageStack>
        </Shared.Content>
      </Shell.MainArea>
    </Shell.AppShell>
  )
}

export default PlaceVerificationPage
