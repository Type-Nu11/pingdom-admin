import styled from 'styled-components'
import { adminColors as colors } from '../../styles/theme'

const Summary = styled.div`
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
  gap: 12px; padding: 16px; margin: 16px 0; border: 1px solid ${colors.border}; border-radius: 6px;
  color: ${colors.text}; background: ${colors.surface};
  strong { display: block; font-size: 14px; line-height: 1.5; }
  small { display: block; margin-top: 4px; color: ${colors.muted}; line-height: 1.5; }
  button { min-height: 36px; padding: 6px 12px; border: 1px solid ${colors.border}; border-radius: 6px; background: ${colors.surface}; color: ${colors.text}; font: inherit; cursor: pointer; }
  button:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export function MerchantOperatingSummary({ loading, failed, value, checkedAt, disabled, onRetry }: {
  loading: boolean
  failed: boolean
  value: boolean | null | undefined
  checkedAt?: string | null
  disabled?: boolean
  onRetry: () => void
}) {
  const known = !loading && !failed && typeof value === 'boolean'
  const label = loading ? '영업 상태를 확인하는 중입니다.' : !known ? '현재 영업 상태를 확인할 수 없습니다.' : value ? '현재 영업시간입니다.' : '현재 영업시간 외입니다.'
  return <Summary aria-label="현재 영업 상태">
    <div role="status"><strong>{label}</strong>
      {known && checkedAt ? <small>서버 확인 시각: <time dateTime={checkedAt}>{checkedAt.replace('T', ' ')}</time></small> : null}
      {!loading && failed ? <small>조회에 실패했습니다. 다시 시도해주세요.</small> : null}
      {!loading && !failed && !known ? <small>서버에서 영업 여부를 확인하지 못했습니다.</small> : null}
    </div>
    {!loading && !known ? <button type="button" disabled={disabled} onClick={onRetry}>다시 확인</button> : null}
  </Summary>
}
