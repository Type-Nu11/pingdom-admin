import styled from 'styled-components'
import { adminColors, typo } from '../../styles/theme'
import { Empty, ReadonlyNotice } from '../../components/merchant/MerchantWorkspace.styles'

export const AvailabilityNotice = styled(ReadonlyNotice)`
  margin: 16px 24px 0;
  background: transparent;
  border: 1px solid ${adminColors.borderSoft};
`

export const EmptyState = styled(Empty)`
  display: flex;
  min-height: 180px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;

  strong {
    color: ${adminColors.strongText};
    ${typo.label.bold}
  }

  p { margin: 0; }
`
