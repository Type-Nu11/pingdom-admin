import styled from 'styled-components'
import { SecondaryButton } from '../placeMerge/PlaceMergePage.styles'

export const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(180px, 1.5fr) auto auto;
  align-items: end;
  gap: 12px;

  @media (max-width: 920px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const PlaceSearchButton = styled(SecondaryButton)`
  align-self: end;
  justify-self: start;
  width: fit-content;
  height: 40px;
  white-space: nowrap;
`
