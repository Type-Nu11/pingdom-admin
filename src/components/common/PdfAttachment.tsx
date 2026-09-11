import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { getPdfDocumentOptions } from '../../utils/pdfDocumentOptions'
import * as S from './AttachmentPreview.styles'

export function PdfAttachment({ url, zoom, onError }: { url: string; zoom: number; onError: () => void }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1)
  const [rendering, setRendering] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef(onError)
  useEffect(() => { errorRef.current = onError }, [onError])
  useEffect(() => {
    let active = true
    let destroy: (() => void) | undefined
    void import('pdfjs-dist').then(async (lib) => {
      if (!active) return
      lib.GlobalWorkerOptions.workerSrc = workerUrl
      const task = lib.getDocument(getPdfDocumentOptions(url))
      destroy = () => { void task.destroy() }
      const doc = await task.promise
      if (active) setPdf(doc)
    }).catch(() => { if (active) errorRef.current() })
    return () => { active = false; destroy?.() }
  }, [url])
  useEffect(() => {
    if (!pdf) return
    let active = true
    let cancel: (() => void) | undefined
    void pdf.getPage(page).then(async (item) => {
      const canvas = canvasRef.current
      if (!active || !canvas) return
      const width = viewportRef.current?.clientWidth || 440
      const scale = width / item.getViewport({ scale: 1 }).width * zoom / 100
      const viewport = item.getViewport({ scale })
      canvas.width = viewport.width
      canvas.height = viewport.height
      const task = item.render({ canvas, viewport })
      cancel = () => task.cancel()
      await task.promise
      if (active) setRendering(false)
    }).catch(() => { if (active) errorRef.current() })
    return () => { active = false; cancel?.() }
  }, [pdf, page, zoom])
  return <>
    <S.Toolbar>
      <S.IconButton type="button" aria-label="이전 페이지" title="이전 페이지" disabled={!pdf || page <= 1} onClick={() => { setRendering(true); setPage(value => value - 1) }}><span aria-hidden="true">chevron_left</span></S.IconButton>
      <output aria-live="polite">{pdf ? `${page} / ${pdf.numPages}` : 'PDF 로딩 중'}</output>
      <S.IconButton type="button" aria-label="다음 페이지" title="다음 페이지" disabled={!pdf || page >= pdf.numPages} onClick={() => { setRendering(true); setPage(value => value + 1) }}><span aria-hidden="true">chevron_right</span></S.IconButton>
    </S.Toolbar>
    <S.Viewport ref={viewportRef} tabIndex={0} role="region" aria-label="증빙 PDF" aria-busy={rendering}>
      <canvas ref={canvasRef} role="img" aria-label={`PDF ${page}페이지. 원본은 다운로드하여 확인할 수 있습니다.`} />
    </S.Viewport>
  </>
}
