import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'
import { useAdminNotifications } from '../../hooks/useAdminNotifications'
import { adminColors } from '../../styles/theme'
import type { AdminNotificationItem } from '../../types/adminNotification.types'

const NOTIFICATION_PAGE_SIZE = 20

function formatNotificationDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '시각 정보 없음'
  }

  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const time = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)

  if (isToday) {
    return `오늘 ${time}`
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function getNotificationNavigation(notification: AdminNotificationItem) {
  const token = notification.token?.trim() ?? ''
  const [tokenType, tokenValue] = token.split(':')
  const parsedId = Number(tokenValue)
  const hasValidId = Number.isInteger(parsedId) && parsedId > 0

  if (notification.type === 'ADMIN_DUPLICATE_PLACE_DETECTED') {
    return { path: '/places/duplicates' }
  }

  if (notification.type === 'ADMIN_USER_SANCTION') {
    return { path: '/bans' }
  }

  if (
    notification.type === 'ADMIN_REPORT_RECEIVED' ||
    notification.type === 'ADMIN_REPORT_PROCESSED'
  ) {
    return {
      path: '/main',
      state: {
        reportId: hasValidId ? parsedId : undefined,
        reviewStatus:
          notification.type === 'ADMIN_REPORT_RECEIVED' ? 'PENDING' : 'PROCESSED',
      },
    }
  }

  if (
    tokenType === 'post' &&
    hasValidId
  ) {
    return { path: '/main', state: { openPostId: parsedId } }
  }

  if (tokenType === 'place' && hasValidId) {
    return { path: '/places' }
  }

  if (
    notification.type === 'PLACE_INFORMATION_REVERIFICATION_REQUESTED' ||
    notification.type === 'PLACE_INFORMATION_REVERIFICATION_REMINDER'
  ) {
    return { path: '/places' }
  }

  return null
}

function NotificationRow({
  notification,
  disabled,
  onClick,
}: {
  notification: AdminNotificationItem
  disabled: boolean
  onClick: () => void
}) {
  return (
    <NotificationItem
      type="button"
      $unread={!notification.read}
      disabled={disabled}
      onClick={onClick}
      aria-label={`${notification.title}${notification.read ? '' : ' 읽지 않음'}`}
    >
      <NotificationItemTop>
        <NotificationTitle title={notification.title}>{notification.title}</NotificationTitle>
        {!notification.read ? <UnreadDot aria-label="읽지 않음" /> : null}
      </NotificationItemTop>
      <NotificationBody title={notification.body}>{notification.body}</NotificationBody>
      <NotificationDate>{formatNotificationDate(notification.createdAt)}</NotificationDate>
    </NotificationItem>
  )
}

export function AdminNotificationButton() {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    pendingWorkItems,
    pendingWorkCount,
    pendingWorkStatus,
    pendingWorkErrorMessage,
    status,
    errorMessage,
    isActionLoading,
    fetchNotifications,
    refreshPendingWork,
    markAsRead,
    markAllAsRead,
  } = useAdminNotifications()

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (notifications === null && status === 'idle') {
      void fetchNotifications({ page: 1, limit: NOTIFICATION_PAGE_SIZE })
    }

    if (pendingWorkStatus === 'idle') {
      void refreshPendingWork()
    }
  }, [fetchNotifications, isOpen, notifications, pendingWorkStatus, refreshPendingWork, status])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  async function handleNotificationClick(notification: AdminNotificationItem) {
    if (!notification.read) {
      await markAsRead(notification.notificationId)
    }

    const navigation = getNotificationNavigation(notification)

    if (navigation) {
      navigate(navigation.path, 'state' in navigation ? { state: navigation.state } : undefined)
      setIsOpen(false)
    }
  }

  const attentionCount = unreadCount === null && pendingWorkCount === null
    ? null
    : (unreadCount ?? 0) + (pendingWorkCount ?? 0)
  const visibleAttentionCount = attentionCount === null
    ? null
    : attentionCount > 99 ? '99+' : attentionCount

  return (
    <NotificationRoot ref={rootRef}>
      <NotificationTrigger
        type="button"
        aria-label={visibleAttentionCount ? `확인 필요 ${visibleAttentionCount}건` : '알림'}
        title="알림"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => {
          const next = !current
          if (next) void refreshPendingWork()
          return next
        })}
      >
        <MaterialIcon aria-hidden="true">notifications</MaterialIcon>
        {visibleAttentionCount ? <UnreadCount>{visibleAttentionCount}</UnreadCount> : null}
      </NotificationTrigger>

      {isOpen ? (
        <NotificationPanel role="dialog" aria-label="알림 목록" aria-live="polite">
          <NotificationPanelHeader>
            <NotificationPanelHeading>
              <strong>알림</strong>
              {attentionCount ? <NotificationPanelCount>{attentionCount}건 확인 필요</NotificationPanelCount> : null}
            </NotificationPanelHeading>
            <NotificationPanelActions>
              <MarkAllButton type="button" onClick={() => { navigate('/operations/notifications'); setIsOpen(false) }}>
                운영 화면
              </MarkAllButton>
              <MarkAllButton
                type="button"
                disabled={!unreadCount || isActionLoading}
                onClick={() => void markAllAsRead()}
              >
                모두 읽음
              </MarkAllButton>
              <CloseButton
                type="button"
                aria-label="알림 닫기"
                title="알림 닫기"
                onClick={() => setIsOpen(false)}
              >
                <MaterialIcon aria-hidden="true">close</MaterialIcon>
              </CloseButton>
            </NotificationPanelActions>
          </NotificationPanelHeader>

          <NotificationContent>
            {pendingWorkStatus === 'loading' && pendingWorkItems === null ? (
              <PendingWorkSection aria-label="처리 필요 업무 불러오는 중">
                <NotificationSectionHeader><strong>처리 필요</strong></NotificationSectionHeader>
                <PendingWorkLoading>업무 현황을 확인하고 있습니다.</PendingWorkLoading>
              </PendingWorkSection>
            ) : pendingWorkItems && pendingWorkItems.length > 0 ? (
              <PendingWorkSection>
                <NotificationSectionHeader>
                  <strong>처리 필요</strong>
                  <span>{pendingWorkCount?.toLocaleString()}건</span>
                </NotificationSectionHeader>
                {pendingWorkErrorMessage ? (
                  <InlineError role="alert">
                    <span>{pendingWorkErrorMessage}</span>
                    <RetryButton type="button" onClick={() => void refreshPendingWork()}>
                      다시 확인
                    </RetryButton>
                  </InlineError>
                ) : null}
                {pendingWorkItems.map((pendingWork) => (
                  <PendingWorkButton
                    key={pendingWork.key}
                    type="button"
                    onClick={() => {
                      navigate(
                        pendingWork.path,
                        pendingWork.state ? { state: pendingWork.state } : undefined,
                      )
                      setIsOpen(false)
                    }}
                  >
                    <PendingWorkText>
                      <strong>{pendingWork.title}</strong>
                      <span>{pendingWork.description}</span>
                    </PendingWorkText>
                    <PendingWorkCount>{pendingWork.count.toLocaleString()}</PendingWorkCount>
                    <MaterialIcon aria-hidden="true">chevron_right</MaterialIcon>
                  </PendingWorkButton>
                ))}
              </PendingWorkSection>
            ) : pendingWorkStatus === 'error' ? (
              <PendingWorkSection>
                <NotificationSectionHeader><strong>처리 필요</strong></NotificationSectionHeader>
                <InlineError role="alert">
                  <span>{pendingWorkErrorMessage}</span>
                  <RetryButton type="button" onClick={() => void refreshPendingWork()}>
                    다시 확인
                  </RetryButton>
                </InlineError>
              </PendingWorkSection>
            ) : null}

            <NotificationSectionHeader><strong>새 알림</strong></NotificationSectionHeader>
            {status === 'loading' && !notifications ? (
              <NotificationSkeletonList aria-label="알림 불러오는 중">
                {[1, 2, 3].map((item) => <NotificationSkeleton key={item} />)}
              </NotificationSkeletonList>
            ) : status === 'error' && !notifications ? (
              <NotificationState role="alert">
                <MaterialIcon aria-hidden="true">error_outline</MaterialIcon>
                <span>{errorMessage}</span>
                <RetryButton
                  type="button"
                  onClick={() => void fetchNotifications({ page: 1, limit: NOTIFICATION_PAGE_SIZE })}
                >
                  다시 시도
                </RetryButton>
              </NotificationState>
            ) : notifications && notifications.length > 0 ? (
              <NotificationList>
                {status === 'error' ? (
                  <InlineError role="alert">
                    <span>{errorMessage}</span>
                    <RetryButton
                      type="button"
                      onClick={() => void fetchNotifications({ page: 1, limit: NOTIFICATION_PAGE_SIZE })}
                    >
                      다시 시도
                    </RetryButton>
                  </InlineError>
                ) : null}
                {notifications.map((notification) => (
                  <NotificationRow
                    key={notification.notificationId}
                    notification={notification}
                    disabled={isActionLoading}
                    onClick={() => void handleNotificationClick(notification)}
                  />
                ))}
                {status === 'loading' ? <UpdatingText>알림 업데이트 중</UpdatingText> : null}
              </NotificationList>
            ) : status === 'error' ? (
              <NotificationState role="alert">
                <MaterialIcon aria-hidden="true">error_outline</MaterialIcon>
                <span>{errorMessage}</span>
                <RetryButton
                  type="button"
                  onClick={() => void fetchNotifications({ page: 1, limit: NOTIFICATION_PAGE_SIZE })}
                >
                  다시 시도
                </RetryButton>
              </NotificationState>
            ) : (
              <NotificationState>
                <MaterialIcon aria-hidden="true">notifications_none</MaterialIcon>
                <strong>새로운 알림이 없습니다.</strong>
                <span>새로운 운영 이벤트가 생기면 이곳에 표시됩니다.</span>
              </NotificationState>
            )}
          </NotificationContent>
        </NotificationPanel>
      ) : null}
    </NotificationRoot>
  )
}

const shimmer = keyframes`
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
`

const focusStyle = css`
  &:focus-visible {
    outline: 3px solid ${adminColors.primarySoft};
    outline-offset: 2px;
  }
`

const MaterialIcon = styled.span`
  width: 1em;
  height: 1em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  font-family: 'Material Symbols Outlined';
  font-size: 20px;
  line-height: 1;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 20;
`

const NotificationRoot = styled.div`
  position: relative;
  flex-shrink: 0;
`

const NotificationTrigger = styled.button`
  position: relative;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: ${adminColors.muted};
  font: inherit;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease;

  &:hover {
    border-color: ${adminColors.border};
    background: ${adminColors.surfaceLow};
    color: ${adminColors.primary};
  }

  ${focusStyle}
`

const UnreadCount = styled.span`
  position: absolute;
  top: 1px;
  right: 0;
  min-width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid ${adminColors.surface};
  border-radius: 999px;
  background: ${adminColors.primary};
  color: ${adminColors.primaryText};
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
`

const NotificationPanel = styled.section`
  position: absolute;
  top: 48px;
  right: 0;
  z-index: 70;
  width: min(420px, calc(100vw - 32px));
  overflow: hidden;
  border: 1px solid ${adminColors.border};
  border-radius: 10px;
  background: ${adminColors.surface};
  box-shadow: 0 12px 32px ${adminColors.shadow};

  @media (max-width: 520px) {
    position: fixed;
    top: 72px;
    right: 16px;
    left: 16px;
    width: auto;
  }
`

const NotificationPanelHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 12px 16px;
  border-bottom: 1px solid ${adminColors.borderSoft};
`

const NotificationPanelHeading = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;

  strong {
    color: ${adminColors.strongText};
    font-size: 15px;
    font-weight: 700;
  }
`

const NotificationPanelCount = styled.span`
  color: ${adminColors.primary};
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
`

const NotificationPanelActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const MarkAllButton = styled.button`
  min-height: 30px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: ${adminColors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${adminColors.primaryTint};
  }

  &:disabled {
    color: ${adminColors.disabled};
    cursor: not-allowed;
  }

  ${focusStyle}
`

const CloseButton = styled.button`
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: ${adminColors.muted};
  cursor: pointer;

  &:hover {
    background: ${adminColors.surfaceLow};
    color: ${adminColors.text};
  }

  ${focusStyle}
  ${MaterialIcon} { font-size: 18px; }
`

const NotificationContent = styled.div`
  max-height: min(560px, calc(100vh - 160px));
  overflow-y: auto;
`

const NotificationSectionHeader = styled.div`
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 16px;
  border-bottom: 1px solid ${adminColors.borderSoft};
  background: ${adminColors.surfaceLow};

  strong {
    color: ${adminColors.strongText};
    font-size: 12px;
    font-weight: 700;
  }

  span {
    color: ${adminColors.primary};
    font-size: 11px;
    font-weight: 700;
  }
`

const PendingWorkSection = styled.section`
  border-bottom: 1px solid ${adminColors.border};
`

const PendingWorkButton = styled.button`
  width: 100%;
  min-height: 58px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 20px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 16px;
  border: 0;
  border-bottom: 1px solid ${adminColors.borderSoft};
  background: ${adminColors.surface};
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${adminColors.primaryTint};
  }

  ${MaterialIcon} {
    color: ${adminColors.muted};
    font-size: 18px;
  }

  ${focusStyle}
`

const PendingWorkText = styled.span`
  min-width: 0;
  display: grid;
  gap: 3px;

  strong,
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: ${adminColors.strongText};
    font-size: 13px;
  }

  span {
    color: ${adminColors.muted};
    font-size: 11px;
  }
`

const PendingWorkCount = styled.span`
  min-width: 28px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 7px;
  border-radius: 999px;
  background: ${adminColors.primaryTint};
  color: ${adminColors.primary};
  font-size: 11px;
  font-weight: 700;
`

const PendingWorkLoading = styled.p`
  margin: 0;
  padding: 14px 16px;
  color: ${adminColors.muted};
  font-size: 12px;
`

const NotificationList = styled.div`
  min-width: 0;
`

const NotificationItem = styled.button<{ $unread: boolean }>`
  width: 100%;
  display: block;
  padding: 14px 16px 12px;
  border: 0;
  border-bottom: 1px solid ${adminColors.borderSoft};
  background: ${({ $unread }) => ($unread ? adminColors.primaryTint : adminColors.surface)};
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 160ms ease;

  &:hover:not(:disabled) {
    background: ${adminColors.surfaceLow};
  }

  &:disabled {
    cursor: wait;
  }

  ${focusStyle}
`

const NotificationItemTop = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const NotificationTitle = styled.strong`
  min-width: 0;
  overflow: hidden;
  color: ${adminColors.strongText};
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const UnreadDot = styled.span`
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${adminColors.primary};
`

const NotificationBody = styled.span`
  display: block;
  margin-top: 5px;
  overflow: hidden;
  color: ${adminColors.muted};
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const NotificationDate = styled.time`
  display: block;
  margin-top: 7px;
  color: ${adminColors.softText};
  font-size: 11px;
`

const NotificationState = styled.div`
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  padding: 24px;
  color: ${adminColors.muted};
  text-align: center;

  ${MaterialIcon} {
    margin-bottom: 2px;
    color: ${adminColors.primary};
    font-size: 28px;
  }

  strong {
    color: ${adminColors.strongText};
    font-size: 13px;
  }

  span {
    max-width: 260px;
    font-size: 12px;
    line-height: 1.45;
  }
`

const RetryButton = styled.button`
  min-height: 32px;
  margin-top: 4px;
  padding: 0 12px;
  border: 1px solid ${adminColors.primarySoft};
  border-radius: 6px;
  background: ${adminColors.primaryTint};
  color: ${adminColors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${adminColors.primarySoft};
  }

  ${focusStyle}
`

const UpdatingText = styled.p`
  margin: 0;
  padding: 8px 16px 10px;
  color: ${adminColors.softText};
  font-size: 11px;
  text-align: right;
`

const InlineError = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid ${adminColors.borderSoft};
  background: ${adminColors.errorTint};
  color: ${adminColors.error};
  font-size: 11px;

  span {
    min-width: 0;
    line-height: 1.4;
  }

  ${RetryButton} {
    flex-shrink: 0;
    min-height: 28px;
    margin-top: 0;
    padding: 0 8px;
    border-color: ${adminColors.error};
    background: transparent;
    color: ${adminColors.error};
  }
`

const NotificationSkeletonList = styled.div`
  padding: 4px 0;
`

const NotificationSkeleton = styled.div`
  height: 76px;
  margin: 10px 16px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    ${adminColors.surfaceContainer} 25%,
    ${adminColors.surfaceHigh} 37%,
    ${adminColors.surfaceContainer} 63%
  );
  background-size: 400% 100%;
  animation: ${shimmer} 1.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`
