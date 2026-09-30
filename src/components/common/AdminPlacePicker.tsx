import { useId, useState } from 'react'
import styled from 'styled-components'
import { searchAdminPlaces, type AdminTarget } from '../../api/adminTargetSearchApi'
import { AdminTargetSearch } from './AdminTargetSearch'
import { adminColors } from '../../styles/theme'
import * as Shared from '../../pages/placeMerge/PlaceMergePage.styles'
import * as Form from '../../pages/placeVerification/PlaceVerificationPage.styles'

const Root = styled.div`display: grid; gap: 8px; min-width: 0;`
const Actions = styled.div`display: flex; flex-wrap: wrap; gap: 8px;`
const Selection = styled.div`display: grid; gap: 4px; overflow-wrap: anywhere; font-size: 14px; small { color: ${adminColors.muted}; }`
const Direct = styled.details`font-size: 13px; summary { cursor: pointer; } input { margin-top: 8px; width: 100%; box-sizing: border-box; }`

interface Props {
  value: string
  selectedPlace?: AdminTarget | null
  onChange: (value: string, place: AdminTarget | null) => void
  disabled?: boolean
}

export function AdminPlacePicker({ value, selectedPlace, onChange, disabled = false }: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [localSelected, setLocalSelected] = useState<AdminTarget | null>(null)
  const selected = selectedPlace === undefined ? localSelected : selectedPlace
  const target = selected && String(selected.id) === value ? selected : null
  const change = (next: string, place: AdminTarget | null = null) => {
    if (selectedPlace === undefined) setLocalSelected(place)
    onChange(next, place)
  }

  return <Root>
    <Selection aria-live="polite">
      <strong>{target ? `${target.name || '이름 없음'} · #${target.id}` : value ? `장소 #${value}` : '선택한 장소 없음'}</strong>
      {target?.description ? <small>{target.description}</small> : null}
    </Selection>
    <Actions>
      <Shared.SecondaryButton type="button" disabled={disabled} onClick={() => setOpen(true)}>{value ? '장소 변경' : '장소 검색'}</Shared.SecondaryButton>
      {value ? <Shared.SecondaryButton type="button" disabled={disabled} onClick={() => change('')}>선택 해제</Shared.SecondaryButton> : null}
    </Actions>
    <Direct>
      <summary>장소 ID 직접 입력</summary>
      <label htmlFor={id}>장소 ID</label>
      <Form.Input id={id} inputMode="numeric" value={value} disabled={disabled} onChange={event => change(event.target.value)} />
    </Direct>
    {open ? <AdminTargetSearch title="장소명·주소 검색" load={searchAdminPlaces} onClose={() => setOpen(false)} onSelect={place => change(String(place.id), place)} /> : null}
  </Root>
}
