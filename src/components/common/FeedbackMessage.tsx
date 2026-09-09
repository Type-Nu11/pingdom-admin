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
  onDismiss?: () => void
}

export function FeedbackMessage({ tone, children, role, onDismiss, ...props }: FeedbackMessageProps) {
  return (
    <S.Root
      {...props}
      $tone={tone}
      role={role ?? (tone === 'error' ? 'alert' : 'status')}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
    >
      <S.Icon aria-hidden="true">{ICON_BY_TONE[tone]}</S.Icon>
      <S.Content>{children}</S.Content>
      {onDismiss ? (
        <S.DismissButton type="button" aria-label="안내 닫기" onClick={onDismiss}>
          <S.Icon aria-hidden="true">close</S.Icon>
        </S.DismissButton>
      ) : null}
    </S.Root>
  )
}
