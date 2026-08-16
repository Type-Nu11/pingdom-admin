import styled from 'styled-components'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import { Select } from '../placeVerification/PlaceVerificationPage.styles'

export const StatusFilterHeader = styled(Shared.PanelHeader)`
  align-items: center;
  justify-content: flex-start;
  gap: 20px;

  ${Shared.PanelTitle} {
    white-space: nowrap;
  }

  @media (max-width: 620px) {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }
`

export const StatusSelect = styled(Select)`
  width: 240px;
  flex: 0 0 240px;
  padding-right: 36px;

  @media (max-width: 620px) {
    width: 100%;
    flex-basis: auto;
  }
`
