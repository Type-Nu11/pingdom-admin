import { useState } from 'react'
import { AdminDateTimePicker } from '../common/AdminDateTimePicker'
import type { useAdminPlaceVerification } from '../../hooks/useAdminPlaceVerification'
import type { PlaceInformationReverificationRequest } from '../../types/adminPlaceVerification.types'
import * as Shell from '../../pages/place/PlaceManagePage.styles'
import * as Shared from '../../pages/placeMerge/PlaceMergePage.styles'
import * as S from '../../pages/placeVerification/PlaceVerificationPage.styles'
import {
  REVERIFICATION_STATUS_LABELS,
  formatVerificationDate,
  getStatusTone,
} from './placeVerificationLabels'

type VerificationHook = ReturnType<typeof useAdminPlaceVerification>
type RequestAction = 'cancel-reverification' | 'complete-reverification' | 'remind-reverification'
type Dialog = { type: 'create' } | { type: 'action'; action: RequestAction; request: PlaceInformationReverificationRequest } | null

const ACTION_LABELS: Record<RequestAction, string> = {
  'cancel-reverification': '요청 취소',
  'complete-reverification': '검토 완료',
  'remind-reverification': '알림 재전송',
}

export function PlaceInformationReverificationPanel({
  verificationHook,
  loadedPlaceId,
}: {
  verificationHook: VerificationHook
  loadedPlaceId: number | null
}) {
  const {
    reverificationRequests,
    reverificationTotalCount,
    reverificationPage,
    reverificationTotalPages,
    reverificationHasNext,
    isReverificationLoading,
    activeAction,
    reverificationErrorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    fetchReverificationRequests,
    createReverification,
    runReverificationAction,
  } = verificationHook
  const [dialog, setDialog] = useState<Dialog>(null)
  const [reason, setReason] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [formError, setFormError] = useState('')

  const openCreate = () => {
    setReason('')
    setDueAt('')
    setFormError('')
    setDialog({ type: 'create' })
  }

  const submitCreate = async () => {
    if (!loadedPlaceId || activeAction) return
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      setFormError('재확인 요청 사유를 입력해주세요.')
      return
    }
    if (!dueAt || Number.isNaN(new Date(dueAt).getTime()) || new Date(dueAt).getTime() <= Date.now()) {
      setFormError('현재보다 이후인 응답 기한을 선택해주세요.')
      return
    }
    const result = await createReverification(loadedPlaceId, {
      reason: trimmedReason,
      dueAt,
    })
    if (result) setDialog(null)
  }

  const submitAction = async () => {
    if (!loadedPlaceId || dialog?.type !== 'action' || activeAction) return
    const result = await runReverificationAction(
      dialog.action,
      loadedPlaceId,
      dialog.request.requestId
    )
    if (result) setDialog(null)
  }

  return (
    <>
      {actionErrorMessage ? <Shared.Notice $variant="error">{actionErrorMessage}</Shared.Notice> : null}
      {actionSuccessMessage ? <Shared.Notice $variant="success">{actionSuccessMessage}</Shared.Notice> : null}
      {!loadedPlaceId ? (
        <Shared.EmptyStateCard>
          <Shell.MaterialIcon aria-hidden="true">sync_problem</Shell.MaterialIcon>
          <strong>장소 ID를 조회해주세요.</strong>
          <p>업주에게 요청한 정보 재확인 상태를 추적할 수 있습니다.</p>
        </Shared.EmptyStateCard>
      ) : (
        <Shared.Panel>
          <Shared.PanelHeader>
            <div>
              <Shared.PanelTitle>장소 #{loadedPlaceId} 재확인 요청</Shared.PanelTitle>
              <Shared.PanelDescription>업주 응답 기한과 후속 조치를 관리합니다.</Shared.PanelDescription>
            </div>
            <Shared.HeaderActions>
              <Shared.SecondaryButton type="button" disabled={isReverificationLoading || activeAction !== null} onClick={() => void fetchReverificationRequests(loadedPlaceId, reverificationPage)}>새로고침</Shared.SecondaryButton>
              <Shared.PrimaryButton type="button" disabled={activeAction !== null} onClick={openCreate}>재확인 요청</Shared.PrimaryButton>
            </Shared.HeaderActions>
          </Shared.PanelHeader>
          <Shared.CompareBody>
            {reverificationErrorMessage ? <Shared.Notice $variant="error">{reverificationErrorMessage}</Shared.Notice> : null}
            {isReverificationLoading ? (
              <Shared.EmptyState><strong>재확인 요청을 불러오는 중입니다.</strong></Shared.EmptyState>
            ) : reverificationRequests.length === 0 ? (
              <Shared.EmptyState><strong>재확인 요청이 없습니다.</strong><p>정보 갱신이 필요하면 업주에게 새 요청을 보내주세요.</p></Shared.EmptyState>
            ) : (
              <S.CardList>
                {reverificationRequests.map((request) => (
                  <S.RecordCard key={request.requestId}>
                    <S.RecordHeader>
                      <div>
                        <S.RecordTitle>재확인 요청 #{request.requestId}</S.RecordTitle>
                        <S.RecordMeta>업주 #{request.merchantOwnerUserId} · 요청 {formatVerificationDate(request.requestedAt)}</S.RecordMeta>
                      </div>
                      <S.StatusBadge $tone={getStatusTone(request.status)}>{REVERIFICATION_STATUS_LABELS[request.status]}</S.StatusBadge>
                    </S.RecordHeader>
                    <S.RecordDescription>{request.reason}</S.RecordDescription>
                    <S.DetailGrid>
                      <S.DetailItem><dt>응답 기한</dt><dd>{formatVerificationDate(request.dueAt)}</dd></S.DetailItem>
                      <S.DetailItem><dt>알림</dt><dd>{request.reminderCount.toLocaleString()}회 · {formatVerificationDate(request.lastRemindedAt)}</dd></S.DetailItem>
                      <S.DetailItem><dt>응답 시각</dt><dd>{formatVerificationDate(request.respondedAt)}</dd></S.DetailItem>
                      <S.DetailItem><dt>응답 내용</dt><dd>{request.responseNote || '아직 응답하지 않음'}</dd></S.DetailItem>
                    </S.DetailGrid>
                    {['REQUESTED', 'RESPONDED'].includes(request.status) ? (
                      <S.InlineActions>
                        {request.status === 'REQUESTED' ? (
                          <Shared.SecondaryButton type="button" disabled={activeAction !== null} onClick={() => setDialog({ type: 'action', action: 'remind-reverification', request })}>알림 재전송</Shared.SecondaryButton>
                        ) : null}
                        <Shared.SecondaryButton type="button" disabled={activeAction !== null} onClick={() => setDialog({ type: 'action', action: 'cancel-reverification', request })}>요청 취소</Shared.SecondaryButton>
                        <Shared.PrimaryButton type="button" disabled={activeAction !== null} onClick={() => setDialog({ type: 'action', action: 'complete-reverification', request })}>검토 완료</Shared.PrimaryButton>
                      </S.InlineActions>
                    ) : null}
                  </S.RecordCard>
                ))}
              </S.CardList>
            )}
          </Shared.CompareBody>
          <S.Pagination aria-label="재확인 요청 페이지네이션">
            <Shared.SecondaryButton type="button" disabled={isReverificationLoading || reverificationPage <= 1} onClick={() => void fetchReverificationRequests(loadedPlaceId, reverificationPage - 1)}>이전</Shared.SecondaryButton>
            <span>전체 {reverificationTotalCount.toLocaleString()}건 · {Math.max(reverificationPage, 1)} / {Math.max(reverificationTotalPages, 1)}</span>
            <Shared.SecondaryButton type="button" disabled={isReverificationLoading || !reverificationHasNext} onClick={() => void fetchReverificationRequests(loadedPlaceId, reverificationPage + 1)}>다음</Shared.SecondaryButton>
          </S.Pagination>
        </Shared.Panel>
      )}

      {dialog ? (
        <Shared.ModalOverlay role="presentation" onMouseDown={() => activeAction === null && setDialog(null)}>
          <Shared.Modal role="dialog" aria-modal="true" aria-labelledby="reverification-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <Shared.ModalHeader>
              <Shared.ModalTitle id="reverification-dialog-title">{dialog.type === 'create' ? '장소 정보 재확인 요청' : ACTION_LABELS[dialog.action]}</Shared.ModalTitle>
              <Shared.ModalCloseButton type="button" aria-label="닫기" disabled={activeAction !== null} onClick={() => setDialog(null)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton>
            </Shared.ModalHeader>
            <Shared.ModalBody>
              {dialog.type === 'create' ? (
                <S.FormGrid>
                  <S.WideField>요청 사유 *
                    <S.TextArea value={reason} maxLength={500} disabled={activeAction !== null} onChange={(event) => { setReason(event.target.value); setFormError('') }} />
                    <small>{reason.length}/500</small>
                  </S.WideField>
                  <S.WideField>응답 기한 *
                    <AdminDateTimePicker ariaLabel="재확인 응답 기한" value={dueAt} disabled={activeAction !== null} onChange={(value) => { setDueAt(value); setFormError('') }} />
                  </S.WideField>
                </S.FormGrid>
              ) : (
                <Shared.ModalWarning>
                  요청 #{dialog.request.requestId}을(를) {ACTION_LABELS[dialog.action]} 처리합니다. 서버의 현재 상태 검증을 통과한 경우에만 반영됩니다.
                </Shared.ModalWarning>
              )}
              {formError || actionErrorMessage ? <Shared.Notice $variant="error">{formError || actionErrorMessage}</Shared.Notice> : null}
            </Shared.ModalBody>
            <Shared.ModalFooter>
              <Shared.SecondaryButton type="button" disabled={activeAction !== null} onClick={() => setDialog(null)}>취소</Shared.SecondaryButton>
              <Shared.PrimaryButton type="button" disabled={activeAction !== null} onClick={() => void (dialog.type === 'create' ? submitCreate() : submitAction())}>{activeAction ? '처리 중' : dialog.type === 'create' ? '요청 보내기' : ACTION_LABELS[dialog.action]}</Shared.PrimaryButton>
            </Shared.ModalFooter>
          </Shared.Modal>
        </Shared.ModalOverlay>
      ) : null}
    </>
  )
}
