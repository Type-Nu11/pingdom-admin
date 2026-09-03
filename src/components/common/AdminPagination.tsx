import * as S from './AdminPagination.styles'

interface AdminPaginationProps {
  page: number
  totalPages: number
  hasNext?: boolean
  disabled?: boolean
  onPageChange: (page: number) => void
  ariaLabel?: string
}

const MAX_VISIBLE_PAGE_COUNT = 3

function getVisiblePageNumbers(page: number, totalPages: number) {
  const visibleCount = Math.min(MAX_VISIBLE_PAGE_COUNT, totalPages)
  const sideCount = Math.floor(visibleCount / 2)
  let startPage = Math.max(1, page - sideCount)
  let endPage = Math.min(totalPages, startPage + visibleCount - 1)

  startPage = Math.max(1, endPage - visibleCount + 1)
  endPage = Math.min(totalPages, startPage + visibleCount - 1)

  return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index)
}

export function AdminPagination({
  page,
  totalPages,
  hasNext,
  disabled = false,
  onPageChange,
  ariaLabel = '페이지네이션',
}: AdminPaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1)
  const safePage = Math.min(Math.max(page, 1), safeTotalPages)
  const visiblePages = getVisiblePageNumbers(safePage, safeTotalPages)
  const canGoNext = hasNext ?? safePage < safeTotalPages
  const showEdgeButtons = safeTotalPages > MAX_VISIBLE_PAGE_COUNT

  return (
    <S.Pagination aria-label={ariaLabel}>
      {showEdgeButtons ? (
        <S.IconButton
          type="button"
          aria-label="첫 페이지로 이동"
          title="첫 페이지"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(1)}
        >
          <S.Icon aria-hidden="true">first_page</S.Icon>
        </S.IconButton>
      ) : null}
      <S.IconButton
        type="button"
        aria-label="이전 페이지로 이동"
        title="이전 페이지"
        disabled={disabled || safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
      >
        <S.Icon aria-hidden="true">chevron_left</S.Icon>
      </S.IconButton>
      <S.PageList>
        {visiblePages.map((pageNumber) => (
          <S.PageButton
            key={pageNumber}
            type="button"
            $active={safePage === pageNumber}
            aria-current={safePage === pageNumber ? 'page' : undefined}
            aria-label={`${pageNumber}페이지로 이동`}
            disabled={disabled}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </S.PageButton>
        ))}
      </S.PageList>
      <S.IconButton
        type="button"
        aria-label="다음 페이지로 이동"
        title="다음 페이지"
        disabled={disabled || !canGoNext}
        onClick={() => onPageChange(safePage + 1)}
      >
        <S.Icon aria-hidden="true">chevron_right</S.Icon>
      </S.IconButton>
      {showEdgeButtons ? (
        <S.IconButton
          type="button"
          aria-label="마지막 페이지로 이동"
          title="마지막 페이지"
          disabled={disabled || safePage >= safeTotalPages}
          onClick={() => onPageChange(safeTotalPages)}
        >
          <S.Icon aria-hidden="true">last_page</S.Icon>
        </S.IconButton>
      ) : null}
    </S.Pagination>
  )
}
