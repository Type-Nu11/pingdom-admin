import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { useAdminNotifications } from '../../hooks/useAdminNotifications'
import type { AdminPendingWorkEntry } from '../../api/adminPendingWorkApi'
import { adminColors as c, radius } from '../../styles/theme'

export function AdminPendingWork({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { pendingWorkEntries: entries = [], pendingWorkStatus, refreshPendingWork } = useAdminNotifications()
  const loading = pendingWorkStatus === 'loading' || pendingWorkStatus === 'idle'
  const successful = entries.filter(entry => entry.status === 'success')
  const failures = entries.filter(entry => entry.status === 'error')
  const total = successful.reduce((sum, entry) => sum + (entry.count ?? 0), 0)
  const zero = entries.filter(entry => entry.status === 'success' && entry.count === 0)
  const quiet = entries.filter(entry => entry.count === 0 && entry.status !== 'error')
  const visible = entries.filter(entry => entry.count !== 0 || entry.status === 'error')
  const allZero = entries.length > 0 && zero.length === entries.length

  function row(entry: AdminPendingWorkEntry) {
    const previous = entry.status !== 'success' && entry.count !== null
    return <Row key={entry.key} type="button" onClick={() => { navigate(entry.path, entry.state ? { state: entry.state } : undefined); onNavigate?.() }}>
      <Text><strong>{entry.title}</strong><span>{entry.status === 'error' ? '조회 실패' : entry.status === 'loading' ? '조회 중' : entry.description}
        {previous ? ` · 이전 조회 ${entry.count?.toLocaleString()}건` : ''}</span>
        {entry.updatedAt ? <time dateTime={new Date(entry.updatedAt).toISOString()}>확인 {new Date(entry.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</time> : null}
      </Text>
      <Count>{entry.status === 'success' ? `${entry.count?.toLocaleString()}건` : '—'}</Count>
      <Icon aria-hidden="true">chevron_right</Icon>
    </Row>
  }

  return <Section aria-label="처리 대기 업무" $compact={compact}>
    <Header><div><h2>처리 대기 업무</h2><Meta role="status">{loading ? '업무 현황을 확인하고 있습니다.' : successful.length > 0
      ? `조회 성공 ${successful.length}/${entries.length}개 업무 · 확인된 대기 ${total.toLocaleString()}건`
      : '업무 현황을 확인하지 못했습니다.'}</Meta></div>
      <Refresh type="button" aria-label="대기 업무 새로고침" title="대기 업무 새로고침" disabled={loading} onClick={() => void refreshPendingWork()}><Icon aria-hidden="true">refresh</Icon></Refresh>
    </Header>
    {failures.length > 0 ? <Warning role="alert">{failures.length === entries.length ? '모든 업무 조회에 실패했습니다.' : `${failures.length}개 업무 조회에 실패했습니다. 확인된 건수에 포함되지 않습니다.`}</Warning> : null}
    {visible.length > 0 ? <Rows $compact={compact}>{visible.map(row)}</Rows> : null}
    {allZero ? <Empty>조회한 {entries.length}개 업무에 처리 대기 항목이 없습니다.</Empty> : null}
    {quiet.length > 0 ? <details><summary>{loading ? `이전 조회 0건 · ${quiet.length}개 업무 확인 중` : `대기 없음 · ${quiet.length}개 업무`}</summary><Rows $compact={compact}>{quiet.map(row)}</Rows></details> : null}
  </Section>
}

const Section = styled.section<{ $compact: boolean }>`
  min-width: 0;
  padding: ${({ $compact }) => $compact ? '14px 16px' : '0'};
  details > summary { padding: 12px 0; cursor: pointer; font-size: 13px; color: ${c.muted}; }
  details > summary:focus-visible { outline: 2px solid ${c.primary}; outline-offset: 2px; }
`
const Header = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px;
  h2 { margin: 0 0 6px; font-size: 18px; }
`
const Meta = styled.p`margin: 0; font-size: 12px; color: ${c.muted}; overflow-wrap: anywhere;`
const Rows = styled.div<{ $compact: boolean }>`
  display: grid; grid-template-columns: ${({ $compact }) => $compact ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))'}; column-gap: 24px;
  @media (max-width: 760px) { grid-template-columns: minmax(0, 1fr); }
`
const Row = styled.button`
  min-width: 0; min-height: 74px; display: flex; align-items: center; gap: 12px;
  padding: 12px 8px; border: 0; border-bottom: 1px solid ${c.border}; background: transparent;
  color: ${c.text}; text-align: left; cursor: pointer;
  &:hover { background: ${c.surfaceLow}; }
  &:focus-visible { outline: 2px solid ${c.primary}; outline-offset: -2px; }
`
const Text = styled.span`
  flex: 1; min-width: 0; display: grid; gap: 4px; overflow-wrap: anywhere;
  strong { font-size: 14px; }
  span, time { font-size: 12px; color: ${c.muted}; }
`
const Count = styled.span`flex-shrink: 0; font-size: 14px; font-weight: 700;`
const Icon = styled.span`width: 20px; height: 20px; overflow: hidden; font-family: 'Material Symbols Outlined'; font-size: 20px; line-height: 1; flex-shrink: 0;`
const Refresh = styled.button`
  width: 36px; height: 36px; flex-shrink: 0; display: grid; place-items: center; border: 0;
  border-radius: 8px; color: ${c.text}; background: ${c.surfaceLow}; cursor: pointer;
  &:disabled { opacity: 0.5; cursor: default; }
  &:focus-visible { outline: 2px solid ${c.primary}; outline-offset: 2px; }
`
const Warning = styled.p`margin: 0 0 12px; padding: 12px; border-radius: ${radius.md}; color: ${c.errorText}; background: ${c.errorTint}; font-size: 13px;`
const Empty = styled.p`margin: 0; padding: 12px 16px; color: ${c.muted}; background: ${c.surfaceLow}; font-size: 14px;`
