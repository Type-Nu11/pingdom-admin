import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react'
import type { MerchantPlaceMenu } from '../../types/merchantStore.types'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import * as S from '../../components/merchant/MerchantWorkspace.styles'
import * as M from './MerchantMenuPage.styles'

type Drag = { id: number; index: number; mode: 'pointer' | 'keyboard' }
const labels = { AVAILABLE: '판매 중', SOLD_OUT: '품절', HIDDEN: '숨김', INACTIVE: '비활성' }

export function SortableMenuList({ menus, selectedId, disabled, onSelect, onMove }: {
  menus: MerchantPlaceMenu[]
  selectedId: number | null
  disabled: boolean
  onSelect: (id: number) => void
  onMove: (menu: MerchantPlaceMenu, index: number) => Promise<boolean>
}) {
  const hintId = useId()
  const [drag, setDrag] = useState<Drag | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  useUnsavedChanges(false, saving || Boolean(drag))
  const listRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const cleanupRef = useRef<() => void>(() => {})
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; cleanupRef.current() }
  }, [])
  const displayed = [...menus]
  if (drag) {
    const source = displayed.findIndex(item => item.id === drag.id)
    if (source >= 0) { const [item] = displayed.splice(source, 1); displayed.splice(drag.index, 0, item) }
  }
  const focusHandle = (id: number) => listRef.current?.querySelector<HTMLButtonElement>(`[data-handle-id="${id}"]`)?.focus({ preventScroll: true })
  useLayoutEffect(() => {
    if (drag?.mode !== 'keyboard') return
    const handle = listRef.current?.querySelector<HTMLButtonElement>(`[data-handle-id="${drag.id}"]`)
    handle?.focus({ preventScroll: true })
    handle?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [drag])

  const update = (next: Drag) => {
    dragRef.current = next; setDrag(next)
    setNotice(`${menus.find(item => item.id === next.id)?.name} · ${next.index + 1}/${menus.length}번째 위치`)
  }
  const cancel = (restoreFocus = true) => {
    const current = dragRef.current
    cleanupRef.current(); dragRef.current = null; setDrag(null)
    setNotice('순서 변경을 취소했습니다.')
    if (current && restoreFocus) requestAnimationFrame(() => { if (mounted.current) focusHandle(current.id) })
  }
  const finish = async () => {
    const current = dragRef.current
    cleanupRef.current(); dragRef.current = null
    const source = menus.findIndex(item => item.id === current?.id)
    if (!current || source < 0 || source === current.index || disabled) { setDrag(null); return }
    setSaving(true)
    let success = false
    try { success = await onMove(menus[source], current.index) }
    catch { success = false }
    finally {
      if (mounted.current) {
        setDrag(null); setSaving(false)
        setNotice(success ? '메뉴 표시 순서를 저장했습니다.' : '순서 저장을 확인하지 못했습니다. 목록을 다시 확인해주세요.')
        requestAnimationFrame(() => { if (mounted.current) focusHandle(current.id) })
      }
    }
  }
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>, menu: MerchantPlaceMenu) => {
    if (event.key === 'Escape' && dragRef.current) { event.preventDefault(); cancel(); return }
    if (disabled || saving || menu.status === 'INACTIVE') return
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (dragRef.current) { void finish(); return }
      update({ id: menu.id, index: menus.findIndex(item => item.id === menu.id), mode: 'keyboard' })
      return
    }
    const current = dragRef.current
    if (!current || current.mode !== 'keyboard') return
    const index = event.key === 'ArrowUp' ? Math.max(0, current.index - 1)
      : event.key === 'ArrowDown' ? Math.min(menus.length - 1, current.index + 1)
      : event.key === 'Home' ? 0 : event.key === 'End' ? menus.length - 1 : null
    if (index !== null) { event.preventDefault(); update({ ...current, index }) }
    else if (event.key === 'Tab') cancel(false)
  }
  const pointer = (event: PointerEvent<HTMLButtonElement>, menu: MerchantPlaceMenu) => {
    if (event.button !== 0 || !event.isPrimary || disabled || saving || menu.status === 'INACTIVE') return
    event.preventDefault(); event.currentTarget.focus({ preventScroll: true })
    cleanupRef.current()
    update({ id: menu.id, index: menus.findIndex(item => item.id === menu.id), mode: 'pointer' })
    const pointerId = event.pointerId
    let y = event.clientY, x = event.clientX, frame = 0
    const list = listRef.current!
    const initialTop = list.getBoundingClientRect().top
    const initialScroll = list.scrollTop
    const centers = [...list.querySelectorAll<HTMLElement>('[data-menu-id]')].map((row, index) => {
      const rect = row.getBoundingClientRect()
      return { index, y: rect.top + rect.height / 2 }
    })
    const locate = () => {
      const current = dragRef.current
      const rect = list.getBoundingClientRect()
      if (!current || x < rect.left || x > rect.right) return
      // Stable geometry prevents preview reordering from moving the hit target under the pointer.
      const logicalY = y + list.scrollTop - initialScroll + initialTop - rect.top
      const nearest = centers.reduce((best, candidate) => Math.abs(candidate.y - logicalY) < Math.abs(best.y - logicalY) ? candidate : best)
      if (nearest.index !== current.index) update({ ...current, index: nearest.index })
    }
    const autoScroll = () => {
      const list = listRef.current
      if (!list || !dragRef.current) return
      const rect = list.getBoundingClientRect()
      const top = Math.max(0, rect.top), bottom = Math.min(innerHeight, rect.bottom)
      const speed = y < top + 36 ? -12 : y > bottom - 36 ? 12 : 0
      if (speed) { list.scrollTop += speed; locate() }
      frame = requestAnimationFrame(autoScroll)
    }
    const move = (next: globalThis.PointerEvent) => {
      if (next.pointerId !== pointerId) return
      next.preventDefault(); y = next.clientY; x = next.clientX; locate()
    }
    const end = (next: globalThis.PointerEvent) => { if (next.pointerId === pointerId) void finish() }
    const abort = () => cancel()
    const escape = (next: globalThis.KeyboardEvent) => { if (next.key === 'Escape') { next.preventDefault(); cancel() } }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', abort)
    window.addEventListener('blur', abort)
    window.addEventListener('keydown', escape)
    cleanupRef.current = () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', abort); window.removeEventListener('blur', abort); window.removeEventListener('keydown', escape)
    }
    frame = requestAnimationFrame(autoScroll)
  }
  return <>
    <M.SortHint id={hintId}>손잡이를 끌어 순서를 변경하세요. 키보드: Enter로 선택 → 방향키로 이동 → Enter로 저장, Esc로 취소.</M.SortHint>
    <M.SortNotice role="status" aria-live="polite">{notice}</M.SortNotice>
    <M.SortList ref={listRef} role="list" aria-label="메뉴 표시 순서" aria-busy={saving}>
      {displayed.map((item, index) => <M.SortRow role="listitem" key={item.id} data-menu-id={item.id} $moving={drag?.id === item.id}>
        <M.DragHandle type="button" data-handle-id={item.id} aria-label={`${item.name} 순서 이동`} aria-describedby={hintId}
          aria-pressed={drag?.id === item.id} disabled={disabled || saving || item.status === 'INACTIVE'}
          onKeyDown={event => keyboard(event, item)} onPointerDown={event => pointer(event, item)}>
          <span aria-hidden="true">⠿</span>
        </M.DragHandle>
        <M.MenuSelect type="button" $selected={item.id === selectedId} disabled={disabled || saving || Boolean(drag)} onClick={() => onSelect(item.id)}>
          <S.CampaignTop><S.CampaignTitle>{item.name}</S.CampaignTitle><S.StatusBadge $tone={item.status === 'AVAILABLE' ? 'published' : item.status === 'INACTIVE' ? 'closed' : 'draft'}>{labels[item.status]}</S.StatusBadge></S.CampaignTop>
          <S.CampaignMeta>{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: item.currency, maximumFractionDigits: 0 }).format(item.priceAmount)} · 표시 순서 {index + 1}</S.CampaignMeta>
          {item.description ? <S.CampaignMeta title={item.description}>{item.description}</S.CampaignMeta> : null}
        </M.MenuSelect>
      </M.SortRow>)}
    </M.SortList>
  </>
}
