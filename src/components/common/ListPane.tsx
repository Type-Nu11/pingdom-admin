import { useEffect, useRef, type ReactNode } from 'react'
import * as S from './ListPane.styles'
import { formatListRange, type ListRange } from '../../utils/listRange'

interface ListPaneProps {
  title: string
  description?: string
  count?: ReactNode
  range?: ListRange
  children: ReactNode
  footer?: ReactNode
  page?: number
  ariaLabel?: string
  className?: string
}

export function ListPane({
  title,
  description,
  count,
  range,
  children,
  footer,
  page,
  ariaLabel,
  className,
}: ListPaneProps) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [page])

  return (
    <S.Panel className={className}>
      <S.Header>
        <S.Heading>
          <S.Title>{title}</S.Title>
          {description ? <S.Description>{description}</S.Description> : null}
        </S.Heading>
        {range ? <S.Count>{formatListRange(range)}</S.Count> : count ? <S.Count>{count}</S.Count> : null}
      </S.Header>
      <S.ScrollArea ref={scrollAreaRef} aria-label={ariaLabel ?? `${title} 목록`} tabIndex={0}>
        {children}
      </S.ScrollArea>
      {footer ? <S.Footer>{footer}</S.Footer> : null}
    </S.Panel>
  )
}
