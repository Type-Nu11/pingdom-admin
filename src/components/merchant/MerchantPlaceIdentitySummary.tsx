import styled from 'styled-components'
import type { MerchantPlaceIdentity } from '../../app/providers/MerchantPlaceIdentityContext'
import { adminColors as colors } from '../../styles/theme'

const Summary = styled.div`
  min-width: 0;
  margin: 8px 0;
  line-height: 1.5;
  overflow-wrap: anywhere;
  strong { display: block; color: ${colors.text}; font-size: 14px; }
  small { display: block; color: ${colors.muted}; font-size: 12px; }
`

const Retry = styled.button`
  margin-top: 6px;
  padding: 6px 10px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.text};
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  &:disabled { cursor: not-allowed; opacity: 0.5; }
`

// Fetch at the page boundary; repeated list/dialog displays share the same identity.
export function MerchantPlaceIdentitySummary({ placeId, identity, onRetry, disabled = false, isUnlinked = false }: {
  placeId: number
  identity?: MerchantPlaceIdentity
  onRetry: (placeId: number) => void
  disabled?: boolean
  isUnlinked?: boolean
}) {
  return <Summary aria-label={`장소 #${placeId} 정보`}>
    {identity?.status === 'ready' ? <>
      <strong>{identity.name}</strong>
      <small>{identity.address || '주소 정보 없음'} · 장소 #{placeId}</small>
    </> : <>
      <strong>장소 #{placeId} · {identity?.status === 'error' ? '조회 실패' : '확인 중'}</strong>
      <small>{identity?.status === 'error' ? '매장명과 주소를 불러오지 못했습니다. 관리 권한과 연결 상태를 확인해주세요.' : '매장명과 주소를 확인하고 있습니다.'}</small>
      {identity?.status === 'error' ? <Retry type="button" aria-label={`장소 #${placeId} 정보 다시 조회`} disabled={disabled} onClick={() => onRetry(placeId)}>매장 정보 다시 조회</Retry> : null}
    </>}
    {isUnlinked ? <small>현재 관리 장소 목록에 없는 장소입니다.</small> : null}
  </Summary>
}
