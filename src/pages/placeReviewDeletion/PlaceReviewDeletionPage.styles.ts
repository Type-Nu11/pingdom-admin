import styled from 'styled-components'
import { typo, adminColors, radius } from '../../styles/theme'

const neutral = adminColors

export const RequestSummary = styled.p`
  margin: 10px 0 0;
  color: ${neutral.text};
  font-size: 12px;
  line-height: 1.3;
  white-space: pre-wrap;
`

export const ReviewNote = styled.div`
  margin-top: 10px;
  padding: 11px 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  font-size: 12px;
  line-height: 1.3;
  white-space: pre-wrap;
`

export const DangerButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.errorAction};
  color: ${neutral.primaryText};
  ${typo.label.bold}
  cursor: pointer;

  &:hover:not(:disabled) {
    filter: brightness(0.94);
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`
