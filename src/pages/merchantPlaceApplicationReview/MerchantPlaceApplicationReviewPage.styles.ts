import styled from 'styled-components'
import { adminColors, radius } from '../../styles/theme'
import * as Form from '../placeVerification/PlaceVerificationPage.styles'
import { PageContent, PageStack } from '../../components/common/ListDetailWorkspace.styles'

const colors = adminColors

export const ReviewActions = styled.footer`
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid ${colors.border};
  background: ${colors.surface};
`

export const ActionTarget = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-wrap: anywhere;

  strong {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    font-size: 14px;
    line-height: 1.4;
    color: ${colors.strongText};
  }

  span {
    font-size: 12px;
    color: ${colors.muted};
  }
`

export const ActionReason = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${colors.muted};
  overflow-wrap: anywhere;
`

export const ActionButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;

  > button {
    min-width: 80px;
  }
`

export const ReviewContent = PageContent
export const ReviewPageStack = PageStack

export const ApplicationList = styled.div`
  display: flex;
  flex-direction: column;
`

export const ApplicationButton = styled(Form.RecordButton)`
  padding: 10px 12px;
  overflow-wrap: anywhere;
`

export const ApplicationTitle = styled(Form.RecordTitle)`
  min-width: 0;
  overflow-wrap: anywhere;
`

export const ApplicationMeta = styled(Form.RecordMeta)`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
`

export const AttachmentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const AttachmentRow = styled.article`
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  background: ${colors.surfaceLow};

  > div {
    grid-column: 1 / -1;
    min-width: 0;
  }

  > button:first-of-type { grid-column: 2; }

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
  color: ${colors.primaryForeground};
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

  &:focus-visible { outline: 2px solid ${colors.primaryForeground}; outline-offset: 2px; }

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
  gap: 8px 16px;
  flex-wrap: wrap;
  padding: 4px 0;
  border: 0;
  border-radius: 0;
  background: transparent;
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
  background: ${({ $active }) => ($active ? colors.primaryAction : 'transparent')};
  color: ${({ $active }) => ($active ? colors.primaryText : colors.muted)};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ $active }) => ($active ? colors.primaryText : colors.primaryForeground)};
    background: ${({ $active }) => ($active ? colors.primaryForeground : colors.primaryTint)};
  }

  &:focus-visible { outline: 2px solid ${colors.primaryForeground}; outline-offset: 2px; }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`

export const FilterField = styled.label`
  min-width: 0;
  flex-wrap: wrap;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${colors.muted};
  font-size: 12px;
  font-weight: 700;
`

export const HistoryFilters = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
  min-width: 0;
  > label, > div { flex-direction: column; align-items: stretch; }
  @media (max-width: 640px) {
    > label, > div { width: 100%; }
  }
`

export const AppliedFilters = styled.p`
  flex-basis: 100%;
  margin: 0;
  color: ${colors.muted};
  font-size: 12px;
  overflow-wrap: anywhere;
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
