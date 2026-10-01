import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { createPortal } from 'react-dom'
import { useBlocker } from 'react-router-dom'
import { AppDialog } from './AppDialog'
import { UnsavedChangesContext, type FormProtection } from './UnsavedChangesContext'
import * as Shared from '../../pages/placeMerge/PlaceMergePage.styles'

export function UnsavedChangesProvider({ children }: PropsWithChildren) {
  const forms = useRef(new Map<string, FormProtection>())
  const [, setRevision] = useState(0)
  const [pending, setPending] = useState<{ action: () => void; id?: string } | null>(null)
  const pendingRef = useRef(pending)
  const allowingTransition = useRef(false)
  const protections = [...forms.current.values()]
  const dirty = protections.some(form => form.dirty)
  const busy = protections.some(form => form.busy)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => nextLocation.pathname !== '/login'
    && !allowingTransition.current
    && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search)
    && [...forms.current.values()].some(form => form.dirty || form.busy))

  const update = useCallback((id: string, protection: FormProtection | null) => {
    const previous = forms.current.get(id)
    if (protection ? previous?.dirty === protection.dirty && previous?.busy === protection.busy : !previous) return
    if (protection) forms.current.set(id, protection)
    else forms.current.delete(id)
    setRevision(value => value + 1)
  }, [])
  const request = useCallback((action: () => void, id?: string) => {
    if (pendingRef.current) return
    const selected = id ? [forms.current.get(id)] : [...forms.current.values()]
    if (selected.some(form => form?.busy)) return
    if (selected.some(form => form?.dirty)) {
      const next = { action, id }
      pendingRef.current = next
      setPending(next)
    } else action()
  }, [])
  const value = useMemo(() => ({ update, request }), [update, request])
  const runAllowed = useCallback((action: () => void) => {
    allowingTransition.current = true
    try { action() } finally { allowingTransition.current = false }
  }, [])

  useEffect(() => {
    if (!dirty && !busy && blocker.state === 'blocked') blocker.proceed()
  }, [dirty, busy, blocker])

  useEffect(() => {
    if (!dirty && !busy) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty, busy])

  const cancel = () => {
    pendingRef.current = null
    setPending(null)
    if (blocker.state === 'blocked') blocker.reset()
  }
  const confirm = () => {
    if (busy) return
    const action = pendingRef.current?.action
    pendingRef.current = null
    setPending(null)
    if (action) {
      if (blocker.state === 'blocked') blocker.reset()
      runAllowed(action)
    } else if (blocker.state === 'blocked') blocker.proceed()
  }

  // The portal is above existing edit dialogs and must not bubble into their close handlers.
  return <UnsavedChangesContext.Provider value={value}>
    {children}
    {(pending || blocker.state === 'blocked') ? createPortal(<div onMouseDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
      <AppDialog title="저장하지 않은 변경 사항이 있습니다" onClose={cancel} description={busy ? '저장이 완료될 때까지 기다려주세요.' : '이동하면 아직 저장하지 않은 입력과 첨부 파일 선택이 사라집니다.'} footer={<>
        <Shared.SecondaryButton type="button" onClick={cancel}>계속 작성</Shared.SecondaryButton>
        <Shared.PrimaryButton type="button" disabled={busy} onClick={confirm}>변경 버리고 이동</Shared.PrimaryButton>
      </>}><p>서버에 이미 저장된 내용은 유지됩니다.</p></AppDialog>
    </div>, document.body) : null}
  </UnsavedChangesContext.Provider>
}
