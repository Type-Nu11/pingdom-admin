import styled from 'styled-components'
import { adminColors, radius } from '../../styles/theme'

type FeedbackTone = 'error' | 'success' | 'warning' | 'info'

const toneColor = {
  error: { background: adminColors.errorTint, color: adminColors.error },
  success: { background: adminColors.successToastSurface, color: adminColors.successText },
  warning: { background: adminColors.warningTint, color: adminColors.warningText },
  info: { background: adminColors.infoTint, color: adminColors.infoText },
} as const

export const Root = styled.div<{ $tone: FeedbackTone }>`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 13px 14px;
  border: 0;
  border-radius: ${radius.md};
  background: ${({ $tone }) => toneColor[$tone].background};
  color: ${({ $tone }) => toneColor[$tone].color};
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
`

export const Icon = styled.span`
  flex: 0 0 auto;
  margin-top: 1px;
  font-family: 'Material Symbols Outlined';
  font-size: 19px;
  line-height: 1;
`

export type { FeedbackTone }
