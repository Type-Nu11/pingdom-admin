import styled from 'styled-components'
import { adminColors, radius } from '../../styles/theme'

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
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    margin-top: 4px;
    color: ${colors.muted};
    font-size: 12px;
    line-height: 1.3;
  }
`

export const AttachmentButton = styled.button`
  min-height: 34px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 10px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${colors.surfaceLow};
  color: ${colors.primary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;

  > span {
    display: block;
    font-size: 16px;
    line-height: 1;
    transform: translateY(-1px);
  }

  &:hover:not(:disabled) {
    background: ${colors.primaryTint};
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`

export const OperatingHoursList = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 12px;
`

export const OperatingHoursItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 6px;
  background: ${colors.surfaceLow};

  span {
    flex: 0 0 16px;
    color: ${colors.muted};
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    color: ${colors.strongText};
    font-size: 12px;
    font-weight: 700;
    text-align: left;
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
  line-height: 1.3;
  white-space: pre-wrap;
`

export const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border: 0;
  border-radius: ${radius.lg};
  background: ${colors.surfaceLow};
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
  font-weight: 700;
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
  border-radius: ${radius.pill};
  background: ${colors.error};
  color: ${colors.primaryText};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    filter: brightness(0.94);
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`
