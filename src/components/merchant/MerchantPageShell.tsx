import type { ReactNode } from 'react'
import * as S from './MerchantPageShell.styles'

interface MerchantPageShellProps {
  title: string
  children: ReactNode
  actions?: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
}

export function MerchantPageShell({
  title,
  children,
  actions,
  description,
  eyebrow,
}: MerchantPageShellProps) {
  return (
    <S.Page>
      <S.Content>
        <S.Header>
          <div>
            {eyebrow ? <S.Eyebrow>{eyebrow}</S.Eyebrow> : null}
            <S.Title>{title}</S.Title>
            {description ? <S.Description>{description}</S.Description> : null}
          </div>
          {actions}
        </S.Header>
        {children}
      </S.Content>
    </S.Page>
  )
}
