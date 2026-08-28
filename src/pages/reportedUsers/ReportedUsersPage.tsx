import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminReports } from '../../hooks/useAdminReports'
import { useAuth } from '../../hooks/useAuth'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as Form from '../placeVerification/PlaceVerificationPage.styles'

const PAGE_LIMIT = 10

function ReportedUsersPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [keywordInput, setKeywordInput] = useState('')
  const [activeKeyword, setActiveKeyword] = useState('')
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const {
    reportedUsers,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isError,
    errorMessage,
    reportedUserDetail,
    isDetailLoading,
    detailErrorMessage,
    fetchAdminReportedUsers,
    fetchAdminReportedUserDetail,
    clearReportedUserDetail,
  } = useAdminReports({ limit: PAGE_LIMIT })
  const adminIdentifier =
    user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const keyword = keywordInput.trim()
    setActiveKeyword(keyword)
    setSelectedReportId(null)
    clearReportedUserDetail()
    void fetchAdminReportedUsers({ page: 1, limit: PAGE_LIMIT, keyword })
  }

  const resetSearch = () => {
    setKeywordInput('')
    setActiveKeyword('')
    setSelectedReportId(null)
    clearReportedUserDetail()
    void fetchAdminReportedUsers({ page: 1, limit: PAGE_LIMIT, keyword: '' })
  }

  const movePage = (nextPage: number) => {
    setSelectedReportId(null)
    clearReportedUserDetail()
    void fetchAdminReportedUsers({ page: nextPage, limit: PAGE_LIMIT, keyword: activeKeyword })
  }

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
        <Shell.SideMenu>
          <AdminNavigationMenu />
        </Shell.SideMenu>
        <Shell.SideFooter>
          <Shell.AdminProfile aria-label="관리자 계정"><Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon><Shell.AdminProfileText><strong>{adminIdentifier}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile>
          <Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton>
        </Shell.SideFooter>
      </Shell.SideNav>

      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup><Shell.TopTitle>신고 사용자 조회</Shell.TopTitle></Shell.TopTitleGroup>
          <Shell.TopActions>
            <AdminNotificationButton />
            <Shell.IconButton type="button" aria-label="목록 새로고침" disabled={isLoading} onClick={() => void fetchAdminReportedUsers({ page, limit: PAGE_LIMIT, keyword: activeKeyword })}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton>
          </Shell.TopActions>
        </Shell.TopBar>

        <Shared.Content>
          <Shared.PageStack>
            <Shared.PageHeader>
              <div>
                <Shared.Eyebrow>사용자 · 안전 &gt; 신고 사용자</Shared.Eyebrow>
                <Shared.PageTitle>신고 사용자 조회</Shared.PageTitle>
                <Shared.PageDescription>처리 대기 중인 신고를 대상 사용자 단위 정보와 함께 조회합니다.</Shared.PageDescription>
              </div>
              <Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/reports/appeals')}>이의제기 검토</Shared.HeaderButton><Shared.HeaderButton type="button" onClick={() => navigate('/bans')}>사용자 밴</Shared.HeaderButton></Shared.HeaderActions>
            </Shared.PageHeader>

            <Form.SearchBar onSubmit={search}>
              <Form.Field>통합 검색
                <Form.Input type="search" value={keywordInput} placeholder="신고자 이름, 신고 사유, 신고 대상 사용자 ID" onChange={(event) => setKeywordInput(event.target.value)} />
                <small>공백 검색은 전체 목록으로 처리됩니다.</small>
              </Form.Field>
              {activeKeyword ? <Shared.SecondaryButton type="button" disabled={isLoading} onClick={resetSearch}>초기화</Shared.SecondaryButton> : null}
              <Shared.PrimaryButton type="submit" disabled={isLoading}>검색</Shared.PrimaryButton>
            </Form.SearchBar>

            {isError ? <Shared.Notice $variant="error">{errorMessage}</Shared.Notice> : null}
            <Shared.Workspace>
              <Shared.Panel>
                <Shared.PanelHeader>
                  <div><Shared.PanelTitle>{activeKeyword ? '검색 결과' : '처리 대기 신고'}</Shared.PanelTitle><Shared.PanelDescription>신고를 선택하면 상세 정보를 조회합니다.</Shared.PanelDescription></div>
                  <Shared.PanelCount>{totalCount.toLocaleString()}건</Shared.PanelCount>
                </Shared.PanelHeader>
                <Shared.ScrollArea>
                  {isLoading && reportedUsers.length === 0 ? (
                    <Shared.EmptyState><strong>신고 사용자를 불러오는 중입니다.</strong></Shared.EmptyState>
                  ) : !isError && reportedUsers.length === 0 ? (
                    <Shared.EmptyState><Shell.MaterialIcon aria-hidden="true">task_alt</Shell.MaterialIcon><strong>{activeKeyword ? '검색 결과가 없습니다.' : '처리할 신고가 없습니다.'}</strong></Shared.EmptyState>
                  ) : (
                    <Form.CardList>
                      {reportedUsers.map((report) => (
                        <Form.RecordButton key={report.reportId} type="button" $selected={selectedReportId === report.reportId} onClick={() => { setSelectedReportId(report.reportId); void fetchAdminReportedUserDetail(report.reportId) }}>
                          <Form.RecordHeader><Form.RecordTitle>신고 #{report.reportId}</Form.RecordTitle><Form.StatusBadge $tone="warning">처리 대기</Form.StatusBadge></Form.RecordHeader>
                          <Form.RecordMeta>신고자 {report.reporterUsername || `#${report.reporterUserId}`} · 대상 사용자 #{report.reportedUserId}</Form.RecordMeta>
                          <Form.RecordDescription>{report.reason}</Form.RecordDescription>
                        </Form.RecordButton>
                      ))}
                    </Form.CardList>
                  )}
                </Shared.ScrollArea>
                {totalPages > 1 ? (
                  <Form.Pagination>
                    <Shared.SecondaryButton type="button" disabled={page <= 1 || isLoading} onClick={() => movePage(page - 1)}>이전</Shared.SecondaryButton>
                    <span>{Math.max(page, 1)} / {Math.max(totalPages, 1)}</span>
                    <Shared.SecondaryButton type="button" disabled={!hasNext || isLoading} onClick={() => movePage(page + 1)}>다음</Shared.SecondaryButton>
                  </Form.Pagination>
                ) : null}
              </Shared.Panel>

              <Shared.Panel>
                <Shared.PanelHeader><div><Shared.PanelTitle>신고 상세</Shared.PanelTitle><Shared.PanelDescription>신고자, 대상 사용자, 신고 이미지를 교차 확인합니다.</Shared.PanelDescription></div></Shared.PanelHeader>
                <Shared.CompareBody>
                  {!selectedReportId ? (
                    <Shared.EmptyState><strong>확인할 신고를 선택해주세요.</strong></Shared.EmptyState>
                  ) : isDetailLoading ? (
                    <Shared.EmptyState><strong>신고 상세를 불러오는 중입니다.</strong></Shared.EmptyState>
                  ) : detailErrorMessage ? (
                    <Shared.EmptyState><strong>{detailErrorMessage}</strong><Shared.SecondaryButton type="button" onClick={() => void fetchAdminReportedUserDetail(selectedReportId)}>다시 시도</Shared.SecondaryButton></Shared.EmptyState>
                  ) : reportedUserDetail ? (
                    <>
                      <Form.RecordHeader><div><Form.RecordTitle>신고 #{reportedUserDetail.reportId}</Form.RecordTitle><Form.RecordMeta>서버에서 조회한 최신 상세 정보</Form.RecordMeta></div><Form.StatusBadge $tone="warning">처리 대기</Form.StatusBadge></Form.RecordHeader>
                      <Form.RecordDescription>{reportedUserDetail.reason}</Form.RecordDescription>
                      <Form.DetailGrid>
                        <Form.DetailItem><dt>신고자</dt><dd>{reportedUserDetail.reporterUsername || '이름 없음'} (ID {reportedUserDetail.reporterUserId})</dd></Form.DetailItem>
                        <Form.DetailItem><dt>신고 대상 사용자</dt><dd>ID {reportedUserDetail.reportedUserId}</dd></Form.DetailItem>
                        <Form.DetailItem><dt>신고 이미지</dt><dd>이미지 ID {reportedUserDetail.reportedImageId}</dd></Form.DetailItem>
                        <Form.DetailItem><dt>신고 ID</dt><dd>{reportedUserDetail.reportId}</dd></Form.DetailItem>
                      </Form.DetailGrid>
                      <Shared.DetailNotice><Shell.MaterialIcon aria-hidden="true">info</Shell.MaterialIcon><div><strong>조회 전용 화면입니다.</strong>신고 수락·거절은 관련 제재와 운영 영향을 확인할 수 있는 검수 흐름에서 처리합니다.</div></Shared.DetailNotice>
                    </>
                  ) : null}
                </Shared.CompareBody>
              </Shared.Panel>
            </Shared.Workspace>
          </Shared.PageStack>
        </Shared.Content>
      </Shell.MainArea>
    </Shell.AppShell>
  )
}

export default ReportedUsersPage
