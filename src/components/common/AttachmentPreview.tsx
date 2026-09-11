import { useState } from 'react'
import { AppDialog } from './AppDialog'
import { FeedbackMessage } from './FeedbackMessage'
import { useApplicationAttachmentPreview } from '../../hooks/useApplicationAttachmentPreview'
import type { AdminMerchantPlaceApplicationAttachment } from '../../types/adminMerchantPlaceApplication.types'
import { PdfAttachment } from './PdfAttachment'
import * as S from './AttachmentPreview.styles'

interface Props {
  applicationId: number
  attachment: AdminMerchantPlaceApplicationAttachment
  onClose: () => void
  onDownload: () => Promise<boolean>
}

export function AttachmentPreview(props: Props) {
  const [attempt, setAttempt] = useState(0)
  return <AppDialog title="증빙 미리보기" description={props.attachment.originalFilename} onClose={props.onClose}>
    <PreviewContent key={`${props.applicationId}:${props.attachment.id}:${attempt}`} {...props} attempt={attempt} onRetry={() => setAttempt(value => value + 1)} />
  </AppDialog>
}

function PreviewContent({ applicationId, attachment, attempt, onDownload, onRetry }: Props & { attempt: number; onRetry: () => void }) {
  const state = useApplicationAttachmentPreview(applicationId, attachment.id, attempt)
  const [zoom, setZoom] = useState(100)
  const [broken, setBroken] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const download = async () => {
    if (downloading) return
    setDownloading(true)
    setDownloadError(false)
    try { setDownloadError(!await onDownload()) }
    catch { setDownloadError(true) }
    finally { setDownloading(false) }
  }
  return <>
    <S.Toolbar>
      <S.IconButton type="button" title="다운로드" aria-label="다운로드" disabled={downloading} onClick={() => void download()}><span aria-hidden="true">download</span></S.IconButton>
      {state.status === 'ready' && !broken ? <>
        <S.IconButton type="button" title="축소" aria-label="축소" disabled={zoom <= 50} onClick={() => setZoom(value => value - 25)}><span aria-hidden="true">zoom_out</span></S.IconButton>
        <output aria-label="확대 비율">{zoom}%</output>
        <S.IconButton type="button" title="확대" aria-label="확대" disabled={zoom >= 200} onClick={() => setZoom(value => value + 25)}><span aria-hidden="true">zoom_in</span></S.IconButton>
      </> : null}
      {state.status === 'error' || broken ? <S.IconButton type="button" title="다시 시도" aria-label="다시 시도" onClick={onRetry}><span aria-hidden="true">refresh</span></S.IconButton> : null}
    </S.Toolbar>
    {downloading ? <FeedbackMessage tone="info">다운로드 중입니다.</FeedbackMessage> : null}
    {downloadError ? <FeedbackMessage tone="error">다운로드하지 못했습니다. 다시 시도해주세요.</FeedbackMessage> : null}
    {state.status === 'loading' ? <FeedbackMessage tone="info">증빙을 불러오는 중입니다.</FeedbackMessage> : null}
    {state.status === 'unsupported' ? <FeedbackMessage tone="info">미리보기를 지원하지 않는 파일 형식입니다. 다운로드해서 확인해주세요.</FeedbackMessage> : null}
    {state.status === 'error' ? <FeedbackMessage tone="error">{state.message}</FeedbackMessage> : null}
    {broken ? <FeedbackMessage tone="error">파일이 손상되었거나 표시할 수 없습니다. 다운로드해서 확인해주세요.</FeedbackMessage> : null}
    {state.status === 'ready' && !broken ? state.kind === 'pdf'
      ? <PdfAttachment url={state.url} zoom={zoom} onError={() => setBroken(true)} />
      : <S.Viewport tabIndex={0} role="region" aria-label="증빙 이미지"><img src={state.url} alt={attachment.originalFilename} style={{ width: zoom + '%' }} onError={() => setBroken(true)} /></S.Viewport>
      : null}
  </>
}
