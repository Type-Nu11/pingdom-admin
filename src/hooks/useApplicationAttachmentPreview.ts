import { useEffect, useState } from 'react'
import { downloadAdminMerchantPlaceApplicationAttachment } from '../api/adminMerchantPlaceApplicationApi'
import { isApiError } from '../api/customAxios'

type PreviewState =
  | { status: 'loading' }
  | { status: 'ready'; url: string; kind: 'image' | 'pdf' }
  | { status: 'unsupported' }
  | { status: 'error'; message: string }

export function useApplicationAttachmentPreview(applicationId: number, attachmentId: number, attempt: number) {
  const [state, setState] = useState<PreviewState>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    let url: string | undefined
    void downloadAdminMerchantPlaceApplicationAttachment(applicationId, attachmentId, controller.signal)
      .then((file) => {
        if (controller.signal.aborted) return
        const type = file.type.split(';')[0].trim().toLowerCase()
        const kind = type === 'application/pdf' ? 'pdf'
          : ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type) ? 'image' : null
        if (!kind) { setState({ status: 'unsupported' }); return }
        if (!file.size) { setState({ status: 'error', message: '파일이 비어 있거나 손상되었습니다.' }); return }
        url = URL.createObjectURL(file)
        setState({ status: 'ready', url, kind })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const category = isApiError(error) ? error.category : null
        setState({ status: 'error', message: category === 'forbidden' || category === 'unauthorized'
          ? '증빙을 열람할 권한이 없습니다. 로그인과 관리자 권한을 확인해주세요.'
          : category === 'not-found' ? '증빙 파일을 찾을 수 없습니다.'
          : '증빙을 불러오지 못했습니다. 다시 시도해주세요.' })
      })
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url) }
  }, [applicationId, attachmentId, attempt])
  return state
}
