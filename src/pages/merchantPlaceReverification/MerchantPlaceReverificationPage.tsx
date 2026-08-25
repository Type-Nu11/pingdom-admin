import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantPlaceReverification } from '../../hooks/useMerchantPlaceReverification'
import type {
  MerchantPlaceReverificationRequest,
  MerchantPlaceReverificationStatus,
} from '../../types/merchantStore.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from '../merchantCampaign/MerchantCampaignPage.styles'

const STATUS: Record<MerchantPlaceReverificationStatus, { label: string; tone: 'draft' | 'published' | 'closed' }> = {
  REQUESTED: { label: '응답 대기', tone: 'draft' },
  RESPONDED: { label: '응답 제출', tone: 'published' },
  COMPLETED: { label: '완료', tone: 'published' },
  CANCELED: { label: '취소', tone: 'closed' },
  EXPIRED: { label: '기한 만료', tone: 'closed' },
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function MerchantPlaceReverificationPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const reverification = useMerchantPlaceReverification()
  const [selectedRequest, setSelectedRequest] = useState<MerchantPlaceReverificationRequest | null>(null)
  const [responseNote, setResponseNote] = useState('')
  const [formError, setFormError] = useState('')

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  const closeResponseModal = (force = false) => {
    if (!force && reverification.respondingRequestId !== null) return
    setSelectedRequest(null)
    setResponseNote('')
    setFormError('')
  }

  const openResponseModal = (request: MerchantPlaceReverificationRequest) => {
    setSelectedRequest(request)
    setResponseNote('')
    setFormError('')
  }

  const submitResponse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRequest) return
    if (!responseNote.trim()) {
      setFormError('응답 내용을 입력해주세요.')
      return
    }
    const next = await reverification.submitResponse(selectedRequest, responseNote)
    if (next) closeResponseModal(true)
  }

  if (reverification.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>정보 재확인</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reverification.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void reverification.fetchRequests(1, true)}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>정보 재확인</Store.PageTitle><Store.PageDescription>관리자가 요청한 장소 정보 재확인을 확인하고 응답을 제출합니다.</Store.PageDescription></div><S.HeaderActions><S.HeaderButton type="button" disabled={reverification.isLoading || reverification.respondingRequestId !== null} onClick={() => void reverification.fetchRequests(reverification.pageInfo.page)}>새로고침</S.HeaderButton></S.HeaderActions></Store.PageIntro>
    {reverification.sectionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reverification.sectionErrorMessage}</Store.Notice> : null}
    {reverification.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reverification.actionErrorMessage}</Store.Notice> : null}
    {reverification.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{reverification.successMessage}</Store.Notice> : null}
    {reverification.status === 'loading' || reverification.isLoading ? <Store.LoadingSummary aria-label="장소 정보 재확인 요청을 불러오는 중"><Store.Skeleton $height={420} /></Store.LoadingSummary> : <S.Panel><S.PanelHeader><div><S.PanelTitle>재확인 요청 목록</S.PanelTitle><S.PanelDescription>응답 대기 상태의 요청에만 응답 내용을 제출할 수 있습니다.</S.PanelDescription></div></S.PanelHeader><S.ResultMeta>총 {reverification.pageInfo.totalCount.toLocaleString()}건</S.ResultMeta>{reverification.requests.length === 0 ? <S.Empty>현재 확인할 재확인 요청이 없습니다.</S.Empty> : <S.CampaignList>{reverification.requests.map((request) => {
      const status = STATUS[request.status]
      return <S.CampaignItem as="div" key={request.requestId} $selected={false}><S.CampaignTop><S.CampaignTitle>장소 #{request.placeId} · 요청 #{request.requestId}</S.CampaignTitle><S.StatusBadge $tone={status.tone}>{status.label}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>요청 사유: {request.reason}</S.CampaignMeta><S.CampaignMeta>요청 {formatDateTime(request.requestedAt)} · 응답 기한 {formatDateTime(request.dueAt)}</S.CampaignMeta>{request.responseNote ? <S.CampaignMeta>제출한 응답: {request.responseNote}</S.CampaignMeta> : null}{request.status === 'REQUESTED' ? <S.FormActions><S.ActionButton type="button" disabled={reverification.respondingRequestId !== null} $variant="primary" onClick={() => openResponseModal(request)}>응답 작성</S.ActionButton></S.FormActions> : null}</S.CampaignItem>
    })}</S.CampaignList>}{reverification.pageInfo.totalPages > 1 ? <S.Pagination><S.PaginationButton type="button" disabled={reverification.isLoading || reverification.pageInfo.page <= 1} onClick={() => void reverification.fetchRequests(reverification.pageInfo.page - 1)}>이전</S.PaginationButton><S.PageText>{reverification.pageInfo.page} / {reverification.pageInfo.totalPages}</S.PageText><S.PaginationButton type="button" disabled={reverification.isLoading || !reverification.pageInfo.hasNext} onClick={() => void reverification.fetchRequests(reverification.pageInfo.page + 1)}>다음</S.PaginationButton></S.Pagination> : null}</S.Panel>}
  </Store.Content>{selectedRequest ? <S.ModalOverlay role="presentation" onMouseDown={() => closeResponseModal()}><S.Modal role="dialog" aria-modal="true" aria-labelledby="reverification-response-title" onMouseDown={(event) => event.stopPropagation()}><S.ModalHeader><div><S.ModalTitle id="reverification-response-title">재확인 요청 응답</S.ModalTitle></div><S.CloseButton type="button" aria-label="닫기" onClick={() => closeResponseModal()}>close</S.CloseButton></S.ModalHeader><S.ModalBody><S.ReadonlyNotice>장소 #{selectedRequest.placeId}의 요청 사유: {selectedRequest.reason}<br />응답 기한: {formatDateTime(selectedRequest.dueAt)}</S.ReadonlyNotice><S.Form onSubmit={submitResponse}><S.Field $wide>응답 내용<S.Textarea value={responseNote} maxLength={1000} disabled={reverification.respondingRequestId !== null} onChange={(event) => setResponseNote(event.target.value)} /></S.Field>{formError ? <S.FormError role="alert">{formError}</S.FormError> : null}<S.FormActions><S.ActionButton type="button" disabled={reverification.respondingRequestId !== null} onClick={() => closeResponseModal()}>취소</S.ActionButton><S.ActionButton type="submit" disabled={reverification.respondingRequestId !== null} $variant="primary">{reverification.respondingRequestId === selectedRequest.requestId ? '제출 중' : '응답 제출'}</S.ActionButton></S.FormActions></S.Form></S.ModalBody></S.Modal></S.ModalOverlay> : null}</Store.Page>
}

export default MerchantPlaceReverificationPage
