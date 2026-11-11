import type { ElementType, ReactNode } from 'react'

export type WorkspaceFrameParts = {
  AppShell: ElementType
  MainArea: ElementType
  TopBar: ElementType
}

type Props = {
  parts: WorkspaceFrameParts
  mainId: string
  mainClassName?: string
  sidebar: ReactNode
  header: ReactNode
  children: ReactNode
  overlays?: ReactNode
}

// Structure only: each workspace owns its styling, navigation and provider lifetime.
export function WorkspaceFrame({ parts: S, mainId, mainClassName, sidebar, header, children, overlays }: Props) {
  return (
    <S.AppShell>
      {sidebar}
      <S.MainArea id={mainId} className={mainClassName}>
        <S.TopBar>{header}</S.TopBar>
        {children}
      </S.MainArea>
      {overlays}
    </S.AppShell>
  )
}
