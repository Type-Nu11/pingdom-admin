import styled from 'styled-components'
import { typo, typography, adminColors } from '../../styles/theme'

const colors = adminColors

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

export const IntroNotice = styled.div`
  display: grid;
  gap: 4px;
  margin: 0 0 20px;
  padding: 14px 16px;
  border: 0;
  border-radius: 7px;
  background: ${colors.primaryTint};

  strong {
    color: ${colors.primaryForeground};
    ${typo.label.bold}
  }

  span {
    color: ${colors.text};
    font-size: ${typography.label.regular.fontSize}px;
    line-height: 1.55;
  }
`

export const ReadonlySummary = styled.div`
  display: grid;
  gap: 4px;
  margin: 0 0 20px;
  padding: 14px 16px;
  border: 0;
  border-radius: 7px;
  background: ${colors.surfaceLow};

  strong {
    color: ${colors.text};
    ${typo.label.bold}
  }

  span {
    color: ${colors.muted};
    font-size: ${typography.label.regular.fontSize}px;
    line-height: 1.5;
  }
`

export const ReviewState = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid ${colors.border};
  border-radius: 7px;
  background: ${colors.surfaceLow};

  > span {
    color: ${colors.warningText};
    font-family: 'Material Symbols Outlined';
    font-size: 22px;
    line-height: 1;
  }

  strong {
    display: block;
    color: ${colors.text};
    ${typo.label.bold}
  }

  p {
    margin: 5px 0 0;
    color: ${colors.muted};
    font-size: ${typography.label.regular.fontSize}px;
    line-height: 1.55;
  }
`

export const FormActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
`
