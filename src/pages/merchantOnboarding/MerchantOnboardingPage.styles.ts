import styled, { css } from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

export const Progress = styled.ol`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

export const ProgressStep = styled.li<{ $active?: boolean; $complete?: boolean }>`
  min-height: 74px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid ${colors.border};
  border-radius: 7px;
  background: ${colors.surface};

  ${({ $active, $complete }) =>
    ($active || $complete) &&
    css`
      border-color: ${$complete ? '#9bd7a9' : colors.primarySoft};
      background: ${$complete ? colors.successTint : colors.primaryTint};
    `}
`

export const StepNumber = styled.span<{ $active?: boolean; $complete?: boolean }>`
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ $active, $complete }) =>
    $complete ? colors.successText : $active ? colors.primary : colors.surfaceLow};
  color: ${({ $active, $complete }) => ($active || $complete ? colors.primaryText : colors.muted)};
  font-size: 12px;
  font-weight: 700;
`

export const StepText = styled.div`
  min-width: 0;

  strong { display: block; color: ${colors.text}; font-size: 13px; font-weight: 700; }
  span { display: block; margin-top: 3px; color: ${colors.muted}; font-size: 12px; line-height: 1.4; }
`

export const Panel = styled.section`
  padding: 28px 30px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};

  @media (max-width: 640px) {
    padding: 22px 20px;
  }
`

export const PanelHeading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
`

export const PanelTitle = styled.h2`
  margin: 0;
  color: ${colors.strongText};
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
`

export const PanelDescription = styled.p`
  margin: 6px 0 0;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.55;
`

export const StatusBadge = styled.span<{ $tone: 'active' | 'pending' | 'danger' | 'neutral' }>`
  min-height: 26px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;

  ${({ $tone }) =>
    $tone === 'active'
      ? css`border-color: #9bd7a9; background: ${colors.successTint}; color: ${colors.successText};`
      : $tone === 'pending'
        ? css`border-color: #f0c970; background: ${colors.warningTint}; color: ${colors.warningText};`
        : $tone === 'danger'
          ? css`border-color: ${colors.primarySoft}; background: ${colors.primaryTint}; color: ${colors.primary};`
          : css`border-color: ${colors.border}; background: ${colors.surfaceLow}; color: ${colors.muted};`}
`

export const StatusRows = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid ${colors.borderSoft};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

export const StatusRow = styled.div`
  min-width: 0;
  padding: 16px 18px 16px 0;
  border-bottom: 1px solid ${colors.borderSoft};

  &:not(:first-child) {
    padding-left: 18px;
    border-left: 1px solid ${colors.borderSoft};
  }

  @media (max-width: 720px) {
    padding: 14px 0;

    &:not(:first-child) {
      padding-left: 0;
      border-left: 0;
    }
  }

  strong { display: block; color: ${colors.text}; font-size: 13px; font-weight: 700; }
  span { display: block; margin-top: 6px; color: ${colors.muted}; font-size: 12px; line-height: 1.45; }
`

export const ReviewReason = styled.div`
  margin-top: 16px;
  padding: 12px 14px;
  border-left: 3px solid ${colors.primary};
  background: ${colors.primaryTint};
  color: ${colors.text};
  font-size: 13px;
  line-height: 1.55;

  strong { margin-right: 6px; color: ${colors.primary}; }
`

export const FormHint = styled.p`
  margin: 0;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.5;
`

export const FormNotice = styled.div`
  grid-column: 1 / -1;
`

export const ReadonlyValue = styled.div`
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surfaceLow};
  color: ${colors.softText};
  font-size: 14px;
`
