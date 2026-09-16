import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { AppDialog } from './AppDialog'
import { AdminPagination } from './AdminPagination'
import type { AdminTarget, AdminTargetPage } from '../../api/adminTargetSearchApi'
import { shouldClearAuth } from '../../api/authError'
import { useAuth } from '../../hooks/useAuth'
import * as Form from '../../pages/placeVerification/PlaceVerificationPage.styles'
import * as Shared from '../../pages/placeMerge/PlaceMergePage.styles'

const SearchControls = styled.div`display: flex; gap: 8px; min-width: 0; > input { min-width: 0; flex: 1; }`
const Results = styled.div`height: min(320px, 40dvh); overflow-y: auto; margin-top: 12px;`
const Result = styled(Shared.SecondaryButton)`width: 100%; text-align: left; justify-content: flex-start; margin-bottom: 8px; white-space: normal; overflow-wrap: anywhere;`

interface Props {
  title: string
  load: (keyword: string, page: number) => Promise<AdminTargetPage>
  onSelect: (target: AdminTarget) => void
  onClose: () => void
}

export function AdminTargetSearch({ title, load, onSelect, onClose }: Props) {
  const { clearAuth } = useAuth()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState({ keyword: '', page: 1, attempt: 0 })
  const [result, setResult] = useState<{ query: typeof query; data?: AdminTargetPage; error?: string } | null>(null)
  const current = result?.query === query ? result : null
  const busy = !current
  useEffect(() => {
    let active = true
    void load(query.keyword, query.page).then(data => {
      if (active) setResult({ query, data })
    }).catch(error => {
      if (!active) return
      if (shouldClearAuth(error)) clearAuth()
      const status = error?.response?.status
      setResult({ query, error: status === 403 ? '검색 권한이 없습니다.' : status === 404 ? '검색 API를 사용할 수 없습니다.' : '검색 결과를 불러오지 못했습니다.' })
    })
    return () => { active = false }
  }, [load, query, clearAuth])
  const search = () => setQuery({ keyword: input.trim(), page: 1, attempt: query.attempt + 1 })
  return createPortal(<AppDialog title={title} onClose={onClose} footer={current?.data ? <AdminPagination page={query.page} totalPages={current.data.totalPages} hasNext={current.data.hasNext} onPageChange={page => setQuery({ ...query, page })} /> : null}>
    <SearchControls>
      <Form.Input aria-label={title} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); search() } }} />
      <Shared.PrimaryButton type="button" onClick={search}>검색</Shared.PrimaryButton>
    </SearchControls>
    <Results aria-busy={busy}>
      {busy ? <p role="status">검색 중입니다.</p> : current?.error ? <div role="alert"><p>{current.error}</p><Shared.SecondaryButton type="button" onClick={() => setQuery({ ...query, attempt: query.attempt + 1 })}>다시 시도</Shared.SecondaryButton></div> : current?.data ? <>
        <p>전체 {current.data.totalCount}건</p>
        {current.data.items.length === 0 ? <p>검색 결과가 없습니다.</p> : current.data.items.map(item => <Result key={item.id} type="button" disabled={!Number.isSafeInteger(item.id) || item.id <= 0} onClick={() => { onSelect(item); onClose() }}>
          {item.name || '이름 없음'} · #{item.id}{item.description ? ` · ${item.description}` : ''}
        </Result>)}
      </> : null}
    </Results>
  </AppDialog>, document.body)
}
