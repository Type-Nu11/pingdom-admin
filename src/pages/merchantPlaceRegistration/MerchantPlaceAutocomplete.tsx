import { useId, useRef, useState, type KeyboardEvent } from 'react'
import type { MerchantSearchCandidate } from '../../api/merchantUnifiedPlaceSearchApi'
import type { useMerchantUnifiedPlaceSearch } from '../../hooks/useMerchantUnifiedPlaceSearch'
import * as Store from '../../components/merchant/MerchantSurface.styles'
import * as S from './MerchantPlaceRegistrationPage.styles'

function HighlightedName({ name, query }: { name: string; query: string }) {
  const keyword = query.trim()
  const index = keyword ? name.toLocaleLowerCase().indexOf(keyword.toLocaleLowerCase()) : -1
  if (index < 0) return <>{name}</>
  return <>{name.slice(0, index)}<mark>{name.slice(index, index + keyword.length)}</mark>{name.slice(index + keyword.length)}</>
}

export function MerchantPlaceAutocomplete({ query, search, disabled, onQueryChange, onSearch, onCancel, onSelect }: {
  query: string
  search: ReturnType<typeof useMerchantUnifiedPlaceSearch>
  disabled: boolean
  onQueryChange: (query: string) => void
  onSearch: () => void
  onCancel: () => void
  onSelect: (candidate: MerchantSearchCandidate) => void
}) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const busy = search.phase === 'complete'
  const expanded = isOpen && !disabled && !busy && (query.trim().length >= 2 || search.results.length > 0 || search.isError)

  const close = () => {
    setIsOpen(false)
    setActiveIndex(-1)
    onCancel()
  }
  const choose = (candidate: MerchantSearchCandidate) => {
    setIsOpen(false)
    setActiveIndex(-1)
    onSelect(candidate)
  }
  const runSearch = () => {
    inputRef.current?.focus()
    setIsOpen(true)
    setActiveIndex(-1)
    onSearch()
  }
  const open = () => {
    if (busy) return
    setIsOpen(true)
    if (query.trim().length >= 2 && !search.results.length && search.phase === 'idle' && !search.message) {
      onQueryChange(query)
    }
  }
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (composing.current || event.nativeEvent.isComposing) {
      if (event.key === 'Enter') event.preventDefault()
      return
    }
    if (event.key === 'Escape') { event.preventDefault(); close(); return }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      if (!search.results.length) return
      const next = event.key === 'ArrowDown'
        ? (activeIndex + 1) % search.results.length
        : (activeIndex <= 0 ? search.results.length - 1 : activeIndex - 1)
      setActiveIndex(next)
      document.getElementById(`${listId}-${next}`)?.scrollIntoView?.({ block: 'nearest' })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (expanded && activeIndex >= 0 && search.results[activeIndex]) choose(search.results[activeIndex])
      else runSearch()
    }
  }

  const hint = busy ? '주소를 확인하고 있습니다…' : search.message

  return <>
    <S.PlaceSearchLabel htmlFor="merchant-place-search">업체명 또는 주소</S.PlaceSearchLabel>
    <S.PlaceSearchPopoverAnchor onBlur={(event) => {
      if (isOpen && !event.currentTarget.contains(event.relatedTarget)) close()
    }}>
        <S.PlaceSearchInputArea $expanded={expanded}>
          <S.PlaceSearchButton type="button" aria-label="장소·주소 검색" title="검색" disabled={disabled || busy}
            onPointerDown={(event) => event.preventDefault()} onClick={runSearch}>
            <span aria-hidden="true">search</span>
          </S.PlaceSearchButton>
          <Store.Input ref={inputRef} id="merchant-place-search" role="combobox" aria-autocomplete="list"
            aria-expanded={expanded} aria-controls={expanded ? listId : undefined}
            aria-activedescendant={expanded && activeIndex >= 0 && search.results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            aria-describedby={`${listId}-hint`} autoComplete="off" maxLength={100} value={query}
            placeholder="장소명 또는 주소"
            disabled={disabled} onFocus={open}
            onChange={(event) => {
              if (event.target.value !== query) {
                setIsOpen(true); setActiveIndex(-1)
                onQueryChange(event.target.value)
              }
            }}
            onCompositionStart={() => { composing.current = true }}
            onCompositionEnd={(event) => {
              composing.current = false
              if (event.currentTarget.value !== query) {
                setIsOpen(true); setActiveIndex(-1)
                onQueryChange(event.currentTarget.value)
              }
            }} onKeyDown={keyDown} />
          {query ? <S.PlaceSearchClearButton type="button" aria-label="검색어 지우기" disabled={disabled}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => { inputRef.current?.focus(); onQueryChange(''); setActiveIndex(-1); setIsOpen(false) }}>
            <span aria-hidden="true">close</span>
          </S.PlaceSearchClearButton> : null}
        </S.PlaceSearchInputArea>
      {expanded ? <S.PlaceSearchPopover>
        <S.PlaceSearchResults id={listId} role="listbox" aria-label="검색 후보" aria-busy={search.phase === 'search' || search.phase === 'waiting'}>
          {search.results.map((candidate, index) => <S.PlaceSearchResult
            as="div" role="option" aria-selected={activeIndex === index} tabIndex={-1} id={`${listId}-${index}`}
            key={`${candidate.kind}-${index}`} $active={activeIndex === index}
            onPointerDown={(event) => event.preventDefault()} onClick={() => choose(candidate)}>
            <S.PlaceSearchResultIcon aria-hidden="true">location_on</S.PlaceSearchResultIcon>
            <S.PlaceSearchResultContent>
              <S.PlaceSearchResultTop>
                <strong><HighlightedName name={candidate.kind === 'place' ? candidate.name : candidate.roadAddress || candidate.jibunAddress} query={query} /></strong>
              </S.PlaceSearchResultTop>
              <S.PlaceSearchResultAddress>{candidate.kind === 'place' ? candidate.roadAddress || candidate.jibunAddress : candidate.jibunAddress || candidate.roadAddress}</S.PlaceSearchResultAddress>
            </S.PlaceSearchResultContent>
          </S.PlaceSearchResult>)}
        </S.PlaceSearchResults>
        {!search.results.length ? <S.PlaceSearchEmpty role={search.isError ? 'alert' : 'status'} $error={search.isError}>
          {search.phase === 'waiting' || search.phase === 'search' ? '검색 중…' : hint || '검색어를 입력해주세요.'}
        </S.PlaceSearchEmpty> : null}
      </S.PlaceSearchPopover> : null}
    </S.PlaceSearchPopoverAnchor>
    <S.PlaceSearchLabel as="p" id={`${listId}-hint`}>2글자 이상 입력하면 자동 검색합니다. 위·아래 방향키로 이동하고 Enter로 선택하거나 Esc로 닫을 수 있습니다.</S.PlaceSearchLabel>
    {!expanded && hint ? <S.PlaceSearchHint role={search.isError ? 'alert' : 'status'} $error={search.isError}>{hint}</S.PlaceSearchHint> : null}
  </>
}
