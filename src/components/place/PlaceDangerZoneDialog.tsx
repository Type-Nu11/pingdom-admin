import { useEffect, useRef, useState } from 'react'
import type { AdminPlaceDetail } from '../../types/adminPlace.types'
import * as S from '../../pages/place/PlaceManagePage.styles'

interface PlaceDangerZoneDialogProps {
  place: AdminPlaceDetail
  deletingPlaceId: number | null
  errorMessage: string
  onClose: () => void
  onDelete: (placeId: number) => Promise<boolean>
  onDeleted: () => void
}

export function PlaceDangerZoneDialog({
  place,
  deletingPlaceId,
  errorMessage,
  onClose,
  onDelete,
  onDeleted,
}: PlaceDangerZoneDialogProps) {
  const [hasAttempted, setHasAttempted] = useState(false)
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)
  const isDeleting = deletingPlaceId !== null

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    cancelButtonRef.current?.focus()

    return () => {
      previouslyFocusedElement?.focus()
    }
  }, [])

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isDeleting) {
        onClose()
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isDeleting, onClose])

  const handleClose = () => {
    if (!isDeleting) {
      onClose()
    }
  }

  const handleDelete = async () => {
    if (isDeleting) {
      return
    }

    setHasAttempted(true)
    if (await onDelete(place.id)) {
      onDeleted()
    }
  }

  return (
    <S.DeleteConfirmOverlay role="presentation" onMouseDown={handleClose}>
      <S.DeleteConfirmDialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-delete-confirm-title"
        aria-describedby="place-delete-confirm-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <S.DeleteConfirmIcon aria-hidden="true">
          <S.MaterialIcon>delete</S.MaterialIcon>
        </S.DeleteConfirmIcon>
        <S.DeleteConfirmTitle id="place-delete-confirm-title">
          장소를 삭제할까요?
        </S.DeleteConfirmTitle>
        <S.DeleteConfirmDescription id="place-delete-confirm-description">
          장소 #{place.id}은 삭제 후 관리자 화면에서 다시 복구할 수 없습니다.
        </S.DeleteConfirmDescription>
        <S.DeleteConfirmMeta>
          {place.name} · {place.address || '주소 정보 없음'}
        </S.DeleteConfirmMeta>
        <S.DeleteConfirmWarning>
          {place.postCount > 0
            ? `연결된 게시글 ${place.postCount.toLocaleString()}개도 함께 삭제됩니다. 삭제 전에 연결 게시글을 확인해 주세요.`
            : '연결된 게시글은 없지만 삭제 후 복구가 어려울 수 있습니다.'}
        </S.DeleteConfirmWarning>

        {hasAttempted && errorMessage ? (
          <S.DeleteConfirmNotice role="alert">{errorMessage}</S.DeleteConfirmNotice>
        ) : null}

        <S.DeleteConfirmActions>
          <S.SecondaryButton
            ref={cancelButtonRef}
            type="button"
            disabled={isDeleting}
            onClick={handleClose}
          >
            취소
          </S.SecondaryButton>
          <S.DangerButton
            type="button"
            disabled={isDeleting}
            onClick={() => void handleDelete()}
          >
            {deletingPlaceId === place.id ? '삭제 중' : '삭제하기'}
          </S.DangerButton>
        </S.DeleteConfirmActions>
      </S.DeleteConfirmDialog>
    </S.DeleteConfirmOverlay>
  )
}
