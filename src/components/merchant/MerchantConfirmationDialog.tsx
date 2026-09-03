import { useId } from 'react'
import * as S from './MerchantConfirmationDialog.styles'

type MerchantConfirmationDialogProps = {
  confirmLabel: string
  description: string
  isPending?: boolean
  title: string
  onClose: () => void
  onConfirm: () => void
}

export function MerchantConfirmationDialog({
  confirmLabel,
  description,
  isPending = false,
  title,
  onClose,
  onConfirm,
}: MerchantConfirmationDialogProps) {
  const titleId = useId()

  return (
    <S.Overlay role="presentation" onMouseDown={() => { if (!isPending) onClose() }}>
      <S.Dialog role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === 'Escape' && !isPending) onClose() }}>
        <S.Header>
          <S.Title id={titleId}>{title}</S.Title>
          <S.CloseButton type="button" aria-label="닫기" disabled={isPending} onClick={onClose}><span aria-hidden="true">close</span></S.CloseButton>
        </S.Header>
        <S.Body>
          <S.Warning><span aria-hidden="true">warning</span>{description}</S.Warning>
        </S.Body>
        <S.Actions>
          <S.CancelButton type="button" disabled={isPending} onClick={onClose}>계속 작성</S.CancelButton>
          <S.ConfirmButton type="button" disabled={isPending} onClick={onConfirm}>{isPending ? '취소 중' : confirmLabel}</S.ConfirmButton>
        </S.Actions>
      </S.Dialog>
    </S.Overlay>
  )
}
