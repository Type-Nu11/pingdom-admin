import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { FeedbackMessage } from '../../components/common/FeedbackMessage'
import { ListDetailPage } from '../../components/common/ListDetailWorkspace'
import { AdminPagination } from '../../components/common/AdminPagination'
import { useAuth } from '../../hooks/useAuth'
import { communityDate } from '../../utils/community'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import type { AdminCommunityPost, AdminCommunityComment, CommunityPage } from '../../types/adminCommunity.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as Form from '../placeVerification/PlaceVerificationPage.styles'
import * as S from './Community.styles'

export function CommunityShell({ title, children }: { title: string; children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return <Shell.AppShell>
    <Shell.SideNav aria-label="관리자 메뉴">
      <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
      <Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu>
      <Shell.SideFooter><Shell.AdminProfile><Shell.AdminProfileText><strong>{user?.username || '관리자'}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile>
        <Shell.LogoutButton onClick={() => { void logout(); navigate('/login', { replace: true }) }}>로그아웃</Shell.LogoutButton>
      </Shell.SideFooter>
    </Shell.SideNav>
    <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
      <Shell.TopBar><Shell.TopTitleGroup><Shell.TopTitle>{title}</Shell.TopTitle></Shell.TopTitleGroup><Shell.TopActions><AdminNotificationButton /></Shell.TopActions></Shell.TopBar>
      <ListDetailPage>{children}</ListDetailPage>
    </Shell.MainArea>
  </Shell.AppShell>
}

export function QueryMessage({ loading, error, empty, onRetry }: { loading: boolean; error: string; empty?: boolean; onRetry: () => unknown }) {
  if (loading) return <S.Body role="status">불러오는 중입니다.</S.Body>
  if (error) return <S.Body><FeedbackMessage tone="error">{error}</FeedbackMessage><Shared.SecondaryButton onClick={() => void onRetry()}>다시 시도</Shared.SecondaryButton></S.Body>
  if (empty) return <S.Body role="status">조건에 맞는 결과가 없습니다.</S.Body>
  return null
}

export function CommunityPagination({ data, page, onChange, label, disabled = false, loading = false }: { data: CommunityPage | null; page: number; onChange: (page: number) => void; label: string; disabled?: boolean; loading?: boolean }) {
  const container = useRef<HTMLDivElement>(null)
  const hadFocus = useRef(false)
  useLayoutEffect(() => {
    if (!data) { hadFocus.current = false; return }
    if (loading || disabled || !hadFocus.current) return
    const active = document.activeElement
    // The next/previous button can become disabled, or a numbered button disappear.
    // Move to the current page only when focus was here, never steal it from a form.
    if (active === document.body || (active instanceof HTMLButtonElement && active.disabled && container.current?.contains(active))) {
      container.current?.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus()
    }
  }, [data, page, loading, disabled])
  if (!data) return null
  return <div ref={container} aria-busy={loading} aria-disabled={loading || disabled}
    onFocusCapture={() => { hadFocus.current = true }}
    onBlurCapture={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) hadFocus.current = false }}>
    <AdminPagination page={loading ? data.page : page} totalPages={data.totalPages} hasNext={data.hasNext} onPageChange={next => { if (!loading && !disabled) onChange(next) }} ariaLabel={label} disabled={disabled} />
  </div>
}

export function CommunityContentView({ content }: { content: AdminCommunityPost | AdminCommunityComment }) {
  return <S.Body>
    {'title' in content ? <Form.RecordTitle>{content.title}</Form.RecordTitle> : <Form.RecordTitle>댓글 #{content.commentId}</Form.RecordTitle>}
    <Form.DetailGrid>
      <Form.DetailItem><dt>작성자</dt><dd>{content.authorUsername || '이름 없음'} · #{content.authorUserId}</dd></Form.DetailItem>
      <Form.DetailItem><dt>노출 상태</dt><dd>{content.hidden ? '숨김' : '공개'}</dd></Form.DetailItem>
      <Form.DetailItem><dt>작성 시각</dt><dd>{communityDate(content.createdAt)}</dd></Form.DetailItem>
      <Form.DetailItem><dt>숨김 처리</dt><dd>{content.hiddenByAdminUserId ? `관리자 #${content.hiddenByAdminUserId} · ${communityDate(content.hiddenAt)}` : '처리 정보 없음'}</dd></Form.DetailItem>
    </Form.DetailGrid>
    <S.Text>{content.content || '내용 없음'}</S.Text>
    {'places' in content ? <section aria-label="연결 장소"><Form.SectionTitle>연결 장소</Form.SectionTitle>
      {content.places.length ? content.places.map(place => <p key={place.placeId}>{place.deleted ? `${place.name} (삭제된 장소)` : <Link to={`/places?placeId=${place.placeId}`}>{place.name} · #{place.placeId}</Link>}</p>) : <p>연결된 장소 없음</p>}
    </section> : null}
  </S.Body>
}
