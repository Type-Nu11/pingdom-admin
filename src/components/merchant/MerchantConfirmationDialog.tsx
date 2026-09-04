import { useId } from 'react'
import { AppDialog } from '../common/AppDialog'
import * as S from './MerchantConfirmationDialog.styles'

type MerchantConfirmationDialogProps = {
  cancelLabel?: string
  confirmLabel: string
  description: string
  isPending?: boolean
  title: string
  onClose: () => void
  onConfirm: () => void
}

export function MerchantConfirmationDialog({
  cancelLabel = '계속 작성',
  confirmLabel,
  description,
  isPending = false,
  title,
  onClose,
  onConfirm,
}: MerchantConfirmationDialogProps) {
  const warningId = useId()

  return (
    <AppDialog
      title={title}
      descriptionId={warningId}
      isDismissible={!isPending}
      onClose={onClose}
      footer={(
        <>
          <S.CancelButton type="button" disabled={isPending} onClick={onClose}>{cancelLabel}</S.CancelButton>
          <S.ConfirmButton type="button" disabled={isPending} onClick={onConfirm}>{isPending ? '취소 중' : confirmLabel}</S.ConfirmButton>
        </>
      )}
    >
      <S.Warning id={warningId}><span aria-hidden="true">warning</span>{description}</S.Warning>
    </AppDialog>
  )
}
