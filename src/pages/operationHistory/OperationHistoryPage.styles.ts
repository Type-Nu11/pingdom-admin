import styled from 'styled-components'
import { adminColors, radius } from '../../styles/theme'

const neutral = adminColors

export const AuditFilterDisclosure = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-start;
  margin-top: -2px;
`

export const AuditAdvancedFilters = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 14px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceLow};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

export const AuditFilterActions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

export const AuditList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${neutral.borderSoft};
`

export const AuditRowButton = styled.button<{ $selected?: boolean }>`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(116px, 0.8fr) auto;
  align-items: center;
  gap: 14px;
  padding: 13px 10px;
  border: 0;
  border-bottom: 1px solid ${neutral.borderSoft};
  background: ${({ $selected }) => ($selected ? neutral.primaryTint : 'transparent')};
  box-shadow: ${({ $selected }) => ($selected ? `inset 3px 0 0 ${neutral.primary}` : 'none')};
  color: ${neutral.text};
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ $selected }) => ($selected ? neutral.primaryTint : neutral.surfaceLow)};
  }

  &:focus-visible {
    position: relative;
    z-index: 1;
    outline: 3px solid ${neutral.primarySoft};
    outline-offset: -3px;
  }

  @media (max-width: 680px) {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }
`

export const AuditActionCell = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
`

export const AuditActionTitle = styled.strong`
  overflow: hidden;
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const AuditTargetText = styled.span`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${neutral.muted};
  font-size: 12px;
  line-height: 1.3;

  > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const AuditTypeTag = styled.span`
  max-width: 88px;
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 1px 7px;
  overflow: hidden;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.primaryTint};
  color: ${neutral.primary};
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const AuditActorCell = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong,
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: ${neutral.text};
    font-size: 12px;
    font-weight: 700;
  }

  span {
    color: ${neutral.softText};
    font-size: 12px;
  }

  @media (max-width: 680px) {
    display: none;
  }
`

export const AuditTime = styled.time`
  color: ${neutral.softText};
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

export const PaginationPageButton = styled.button<{ $active?: boolean }>`
  min-width: 32px;
  min-height: 32px;
  padding: 0 8px;
  border: 1px solid ${({ $active }) => ($active ? neutral.primary : neutral.border)};
  border-radius: ${radius.pill};
  background: ${({ $active }) => ($active ? neutral.primary : neutral.surface)};
  color: ${({ $active }) => ($active ? '#fff' : neutral.text)};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${neutral.primary};
    color: ${({ $active }) => ($active ? '#fff' : neutral.primary)};
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`

export const AuditDetailHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

export const AuditDetailMeta = styled.p`
  margin: 5px 0 0;
  color: ${neutral.muted};
  font-size: 12px;
  line-height: 1.3;
`

export const AuditStateDetails = styled.details`
  margin-top: 14px;
  border-top: 1px solid ${neutral.border};

  summary {
    display: flex;
    align-items: center;
    min-height: 46px;
    color: ${neutral.text};
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }

  summary::marker { color: ${neutral.primary}; }
`

export const AuditStateContent = styled.pre`
  max-height: 280px;
  margin: 0 0 14px;
  padding: 12px;
  overflow: auto;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.3;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`
