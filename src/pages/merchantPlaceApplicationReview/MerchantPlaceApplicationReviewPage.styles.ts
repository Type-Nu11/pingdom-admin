import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const AttachmentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const AttachmentRow = styled.article`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  background: ${colors.surfaceLow};

  > div {
    min-width: 0;
  }

  strong,
  span {
    display: block;
  }

  strong {
    overflow: hidden;
    color: ${colors.strongText};
    font-size: 12px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    margin-top: 4px;
    color: ${colors.muted};
    font-size: 11px;
    line-height: 1.45;
  }
`

export const AttachmentButton = styled.button`
  min-height: 34px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};
  color: ${colors.primary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${colors.primarySoft};
    background: ${colors.primaryTint};
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`

export const Reason = styled.p`
  margin: 12px 0 0;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  background: ${colors.surfaceLow};
  color: ${colors.text};
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
`

export const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border: 1px solid ${colors.borderSoft};
  border-radius: 10px;
  background: ${colors.surface};
`

export const FilterTabs = styled.div`
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: ${colors.surfaceLow};
`

export const FilterTab = styled.button<{ $active: boolean }>`
  min-height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 6px;
  background: ${({ $active }) => ($active ? colors.primary : 'transparent')};
  color: ${({ $active }) => ($active ? colors.primaryText : colors.muted)};
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ $active }) => ($active ? colors.primaryText : colors.primary)};
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`

export const FilterField = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${colors.muted};
  font-size: 12px;
  font-weight: 700;
`

export const DangerButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: ${colors.error};
  color: ${colors.primaryText};
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;

  &:hover:not(:disabled) {
    filter: brightness(0.94);
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`
