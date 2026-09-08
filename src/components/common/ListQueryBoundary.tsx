import type { ReactNode } from 'react'
import type { useListQueryState } from '../../hooks/useListQueryState'
import * as Shared from '../../pages/placeMerge/PlaceMergePage.styles'

type Props = {
  state: ReturnType<typeof useListQueryState>
  error: string
  empty: boolean
  onRetry: () => void
  onReset: () => void
  children: ReactNode
}

export function ListQueryBoundary({ state, error, empty, onRetry, onReset, children }: Props) {
  if (state.phase === 'error') {
    return <>
      <Shared.EmptyState role="alert">
        <strong>{error || '목록을 불러오지 못했습니다.'}</strong>
        {state.restricted ? <span>관리자에게 조회 권한을 확인해주세요.</span> : <Shared.SecondaryButton type="button" onClick={onRetry}>다시 시도</Shared.SecondaryButton>}
        {state.hasResult ? <span>최신 조회에 실패했습니다. 이전 조회 결과입니다.</span> : null}
      </Shared.EmptyState>
      {state.hasResult && !empty ? children : null}
    </>
  }
  if (state.phase === 'idle') return <Shared.EmptyState>조건을 선택하고 조회해주세요.</Shared.EmptyState>
  if (state.phase === 'loading') return <><Shared.EmptyState role="status">목록을 불러오는 중입니다.</Shared.EmptyState>{state.hasResult && !empty ? children : null}</>
  if (empty) return <Shared.EmptyState role="status"><strong>{state.filtered ? '조건에 맞는 결과가 없습니다.' : '등록된 내역이 없습니다.'}</strong>{state.filtered ? <Shared.SecondaryButton type="button" onClick={onReset}>전체 보기</Shared.SecondaryButton> : null}</Shared.EmptyState>
  return children
}
