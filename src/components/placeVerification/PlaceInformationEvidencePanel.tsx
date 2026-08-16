import { useState } from 'react'
import type { useAdminPlaceVerification } from '../../hooks/useAdminPlaceVerification'
import type {
  PlaceInformationEvidence,
  PlaceInformationEvidenceType,
  PlaceInformationSourceType,
  PlaceInformationVerificationStatus,
} from '../../types/adminPlaceVerification.types'
import * as Shell from '../../pages/place/PlaceManagePage.styles'
import * as Shared from '../../pages/placeMerge/PlaceMergePage.styles'
import * as S from '../../pages/placeVerification/PlaceVerificationPage.styles'
import {
  EVIDENCE_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  VERIFICATION_STATUS_LABELS,
  formatVerificationDate,
  getStatusTone,
} from './placeVerificationLabels'

type VerificationHook = ReturnType<typeof useAdminPlaceVerification>
type EvidenceDialog = { type: 'create' } | { type: 'review'; evidence: PlaceInformationEvidence } | null

const SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABELS) as PlaceInformationSourceType[]
const EVIDENCE_TYPES = Object.keys(EVIDENCE_TYPE_LABELS) as PlaceInformationEvidenceType[]

function isValidHttpUrl(value: string) {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function PlaceInformationEvidencePanel({
  verificationHook,
  loadedPlaceId,
}: {
  verificationHook: VerificationHook
  loadedPlaceId: number | null
}) {
  const {
    evidences,
    isEvidenceLoading,
    activeAction,
    evidenceErrorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    fetchEvidence,
    createEvidence,
    reviewEvidence,
  } = verificationHook
  const [dialog, setDialog] = useState<EvidenceDialog>(null)
  const [sourceType, setSourceType] = useState<PlaceInformationSourceType>('ADMIN')
  const [evidenceType, setEvidenceType] = useState<PlaceInformationEvidenceType>('ADMIN_REVIEW')
  const [externalReference, setExternalReference] = useState('')
  const [referenceUrl, setReferenceUrl] = useState('')
  const [description, setDescription] = useState('')
  const [submittedByUserId, setSubmittedByUserId] = useState('')
  const [verificationStatus, setVerificationStatus] =
    useState<Extract<PlaceInformationVerificationStatus, 'ADMIN_VERIFIED' | 'REJECTED'>>('ADMIN_VERIFIED')
  const [reviewReason, setReviewReason] = useState('')
  const [formError, setFormError] = useState('')

  const openCreate = () => {
    setSourceType('ADMIN')
    setEvidenceType('ADMIN_REVIEW')
    setExternalReference('')
    setReferenceUrl('')
    setDescription('')
    setSubmittedByUserId('')
    setFormError('')
    setDialog({ type: 'create' })
  }

  const openReview = (evidence: PlaceInformationEvidence) => {
    setVerificationStatus('ADMIN_VERIFIED')
    setReviewReason('')
    setFormError('')
    setDialog({ type: 'review', evidence })
  }

  const submit = async () => {
    if (!loadedPlaceId || !dialog || activeAction) return
    setFormError('')

    if (dialog.type === 'create') {
      if (!isValidHttpUrl(referenceUrl.trim())) {
        setFormError('참조 URL은 http 또는 https 형식으로 입력해주세요.')
        return
      }
      const parsedUserId = submittedByUserId ? Number(submittedByUserId) : undefined
      if (parsedUserId !== undefined && (!Number.isInteger(parsedUserId) || parsedUserId <= 0)) {
        setFormError('제출 사용자 ID는 1 이상의 정수로 입력해주세요.')
        return
      }
      const result = await createEvidence(loadedPlaceId, {
        sourceType,
        evidenceType,
        externalReference: externalReference.trim() || undefined,
        referenceUrl: referenceUrl.trim() || undefined,
        description: description.trim() || undefined,
        submittedByUserId: parsedUserId,
      })
      if (result) setDialog(null)
      return
    }

    const reason = reviewReason.trim()
    if (!reason) {
      setFormError('검토 근거를 입력해주세요.')
      return
    }
    const result = await reviewEvidence(loadedPlaceId, dialog.evidence.evidenceId, {
      verificationStatus,
      reviewReason: reason,
    })
    if (result) setDialog(null)
  }

  return (
    <>
      {actionErrorMessage ? <Shared.Notice $variant="error">{actionErrorMessage}</Shared.Notice> : null}
      {actionSuccessMessage ? <Shared.Notice $variant="success">{actionSuccessMessage}</Shared.Notice> : null}
      {!loadedPlaceId ? (
        <Shared.EmptyStateCard>
          <Shell.MaterialIcon aria-hidden="true">fact_check</Shell.MaterialIcon>
          <strong>장소 ID를 조회해주세요.</strong>
          <p>장소별 출처와 증빙 검토 이력을 확인할 수 있습니다.</p>
        </Shared.EmptyStateCard>
      ) : (
        <Shared.Panel>
          <Shared.PanelHeader>
            <div>
              <Shared.PanelTitle>장소 #{loadedPlaceId} 정보 증빙</Shared.PanelTitle>
              <Shared.PanelDescription>증빙을 추가하거나 관리자 검증 결과를 기록합니다.</Shared.PanelDescription>
            </div>
            <Shared.HeaderActions>
              <Shared.SecondaryButton type="button" disabled={isEvidenceLoading || activeAction !== null} onClick={() => void fetchEvidence(loadedPlaceId)}>새로고침</Shared.SecondaryButton>
              <Shared.PrimaryButton type="button" disabled={activeAction !== null} onClick={openCreate}>증빙 등록</Shared.PrimaryButton>
            </Shared.HeaderActions>
          </Shared.PanelHeader>
          <Shared.CompareBody>
            {evidenceErrorMessage ? <Shared.Notice $variant="error">{evidenceErrorMessage}</Shared.Notice> : null}
            {isEvidenceLoading ? (
              <Shared.EmptyState><strong>증빙을 불러오는 중입니다.</strong></Shared.EmptyState>
            ) : evidences.length === 0 ? (
              <Shared.EmptyState><strong>등록된 증빙이 없습니다.</strong><p>출처를 확인한 뒤 첫 증빙을 등록해주세요.</p></Shared.EmptyState>
            ) : (
              <S.CardList>
                {evidences.map((evidence) => (
                  <S.RecordCard key={evidence.evidenceId}>
                    <S.RecordHeader>
                      <div>
                        <S.RecordTitle>증빙 #{evidence.evidenceId} · {EVIDENCE_TYPE_LABELS[evidence.evidenceType]}</S.RecordTitle>
                        <S.RecordMeta>{SOURCE_TYPE_LABELS[evidence.sourceType]} · 제출 {formatVerificationDate(evidence.submittedAt)}</S.RecordMeta>
                      </div>
                      <S.StatusBadge $tone={getStatusTone(evidence.verificationStatus)}>{VERIFICATION_STATUS_LABELS[evidence.verificationStatus]}</S.StatusBadge>
                    </S.RecordHeader>
                    {evidence.description ? <S.RecordDescription>{evidence.description}</S.RecordDescription> : null}
                    <S.DetailGrid>
                      <S.DetailItem><dt>외부 참조</dt><dd>{evidence.externalReference || '없음'}</dd></S.DetailItem>
                      <S.DetailItem><dt>제출 사용자</dt><dd>{evidence.submittedByUserId ? `ID ${evidence.submittedByUserId}` : '관리자'}</dd></S.DetailItem>
                      <S.DetailItem><dt>검토 관리자</dt><dd>{evidence.reviewedByAdminUserId ? `ID ${evidence.reviewedByAdminUserId}` : '미검토'}</dd></S.DetailItem>
                      <S.DetailItem><dt>검토 근거</dt><dd>{evidence.reviewReason || '아직 입력되지 않음'}</dd></S.DetailItem>
                    </S.DetailGrid>
                    <S.InlineActions>
                      {evidence.referenceUrl ? <S.Link href={evidence.referenceUrl} target="_blank" rel="noreferrer">참조 자료 열기</S.Link> : null}
                      {!['ADMIN_VERIFIED', 'REJECTED'].includes(evidence.verificationStatus) ? (
                        <Shared.SecondaryButton type="button" disabled={activeAction !== null} onClick={() => openReview(evidence)}>증빙 검토</Shared.SecondaryButton>
                      ) : null}
                    </S.InlineActions>
                  </S.RecordCard>
                ))}
              </S.CardList>
            )}
          </Shared.CompareBody>
        </Shared.Panel>
      )}

      {dialog ? (
        <Shared.ModalOverlay role="presentation" onMouseDown={() => activeAction === null && setDialog(null)}>
          <Shared.Modal role="dialog" aria-modal="true" aria-labelledby="evidence-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <Shared.ModalHeader>
              <Shared.ModalTitle id="evidence-dialog-title">{dialog.type === 'create' ? '정보 증빙 등록' : `증빙 #${dialog.evidence.evidenceId} 검토`}</Shared.ModalTitle>
              <Shared.ModalCloseButton type="button" aria-label="닫기" disabled={activeAction !== null} onClick={() => setDialog(null)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton>
            </Shared.ModalHeader>
            <Shared.ModalBody>
              {dialog.type === 'create' ? (
                <S.FormGrid>
                  <S.Field>출처 유형 *
                    <S.Select value={sourceType} disabled={activeAction !== null} onChange={(event) => setSourceType(event.target.value as PlaceInformationSourceType)}>{SOURCE_TYPES.map((value) => <option key={value} value={value}>{SOURCE_TYPE_LABELS[value]}</option>)}</S.Select>
                  </S.Field>
                  <S.Field>증빙 유형 *
                    <S.Select value={evidenceType} disabled={activeAction !== null} onChange={(event) => setEvidenceType(event.target.value as PlaceInformationEvidenceType)}>{EVIDENCE_TYPES.map((value) => <option key={value} value={value}>{EVIDENCE_TYPE_LABELS[value]}</option>)}</S.Select>
                  </S.Field>
                  <S.Field>외부 참조
                    <S.Input value={externalReference} maxLength={100} disabled={activeAction !== null} onChange={(event) => setExternalReference(event.target.value)} />
                  </S.Field>
                  <S.Field>제출 사용자 ID
                    <S.Input inputMode="numeric" value={submittedByUserId} disabled={activeAction !== null} placeholder="비우면 현재 관리자" onChange={(event) => setSubmittedByUserId(event.target.value)} />
                  </S.Field>
                  <S.WideField>참조 URL
                    <S.Input type="url" value={referenceUrl} maxLength={500} disabled={activeAction !== null} placeholder="https://" onChange={(event) => setReferenceUrl(event.target.value)} />
                  </S.WideField>
                  <S.WideField>설명
                    <S.TextArea value={description} maxLength={1000} disabled={activeAction !== null} onChange={(event) => setDescription(event.target.value)} />
                    <small>{description.length}/1000</small>
                  </S.WideField>
                </S.FormGrid>
              ) : (
                <S.FormGrid>
                  <S.WideField>검토 결과 *
                    <S.Select value={verificationStatus} disabled={activeAction !== null} onChange={(event) => setVerificationStatus(event.target.value as typeof verificationStatus)}>
                      <option value="ADMIN_VERIFIED">관리자 검증</option>
                      <option value="REJECTED">증빙 반려</option>
                    </S.Select>
                  </S.WideField>
                  <S.WideField>검토 근거 *
                    <S.TextArea value={reviewReason} maxLength={500} disabled={activeAction !== null} onChange={(event) => { setReviewReason(event.target.value); setFormError('') }} />
                    <small>{reviewReason.length}/500</small>
                  </S.WideField>
                </S.FormGrid>
              )}
              {formError || actionErrorMessage ? <Shared.Notice $variant="error">{formError || actionErrorMessage}</Shared.Notice> : null}
            </Shared.ModalBody>
            <Shared.ModalFooter>
              <Shared.SecondaryButton type="button" disabled={activeAction !== null} onClick={() => setDialog(null)}>취소</Shared.SecondaryButton>
              <Shared.PrimaryButton type="button" disabled={activeAction !== null} onClick={() => void submit()}>{activeAction ? '저장 중' : dialog.type === 'create' ? '증빙 등록' : '검토 결과 저장'}</Shared.PrimaryButton>
            </Shared.ModalFooter>
          </Shared.Modal>
        </Shared.ModalOverlay>
      ) : null}
    </>
  )
}
