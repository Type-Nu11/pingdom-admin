import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import * as S from './AppDialog.styles'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface AppDialogProps {
  title: string
  children: ReactNode
  footer?: ReactNode
  description?: ReactNode
  isDismissible?: boolean
  onClose: () => void
}

export function AppDialog({
  title,
  children,
  footer,
  description,
  isDismissible = true,
  onClose,
}: AppDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    const focusFirstElement = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
    })

    return () => {
      window.cancelAnimationFrame(focusFirstElement)
      previousActiveElementRef.current?.focus()
    }
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && isDismissible) {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements.at(-1)

    if (!firstElement || !lastElement) {
      event.preventDefault()
      return
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  return (
    <S.Overlay
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && isDismissible) onClose()
      }}
    >
      <S.Dialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={handleKeyDown}
      >
        <S.Header>
          <S.Heading>
            <S.Title id={titleId}>{title}</S.Title>
            {description ? <S.Description id={descriptionId}>{description}</S.Description> : null}
          </S.Heading>
          <S.CloseButton type="button" aria-label="닫기" disabled={!isDismissible} onClick={onClose}>
            <S.Icon aria-hidden="true">close</S.Icon>
          </S.CloseButton>
        </S.Header>
        <S.Body>{children}</S.Body>
        {footer ? <S.Footer>{footer}</S.Footer> : null}
      </S.Dialog>
    </S.Overlay>
  )
}
