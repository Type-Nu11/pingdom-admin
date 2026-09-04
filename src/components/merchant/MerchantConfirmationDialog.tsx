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
  return (
    <AppDialog
      title={title}
      isDismissible={!isPending}
      onClose={onClose}
      footer={(
        <>
          <S.CancelButton type="button" disabled={isPending} onClick={onClose}>{cancelLabel}</S.CancelButton>
          <S.ConfirmButton type="button" disabled={isPending} onClick={onConfirm}>{isPending ? '취소 중' : confirmLabel}</S.ConfirmButton>
        </>
      )}
    >
      <S.Warning><span aria-hidden="true">warning</span>{description}</S.Warning>
    </AppDialog>
  )
}
