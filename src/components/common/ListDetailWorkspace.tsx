import type { ReactNode } from 'react'
import * as S from './ListDetailWorkspace.styles'

interface ListDetailWorkspaceProps {
  children: ReactNode
  constrained?: boolean
  className?: string
}

interface ListDetailPageProps {
  children: ReactNode
}

export function ListDetailPage({ children }: ListDetailPageProps) {
  return <S.PageContent><S.PageStack>{children}</S.PageStack></S.PageContent>
}

export function ListDetailWorkspace({
  children,
  constrained = false,
  className,
}: ListDetailWorkspaceProps) {
  return <S.Workspace className={className} $constrained={constrained}>{children}</S.Workspace>
}
