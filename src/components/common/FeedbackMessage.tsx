import type { HTMLAttributes, ReactNode } from 'react'
import * as S from './FeedbackMessage.styles'

type FeedbackTone = 'error' | 'success' | 'warning' | 'info'

const ICON_BY_TONE: Record<FeedbackTone, string> = {
  error: 'error_outline',
  success: 'check_circle',
  warning: 'warning',
  info: 'info',
}

interface FeedbackMessageProps extends HTMLAttributes<HTMLDivElement> {
  tone: FeedbackTone
  children: ReactNode
}

export function FeedbackMessage({ tone, children, role, ...props }: FeedbackMessageProps) {
  return (
    <S.Root
      {...props}
      $tone={tone}
      role={role ?? (tone === 'error' ? 'alert' : 'status')}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
    >
      <S.Icon aria-hidden="true">{ICON_BY_TONE[tone]}</S.Icon>
      <span>{children}</span>
    </S.Root>
  )
}
