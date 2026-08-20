import styled, { css } from 'styled-components'
import KakaoMap from '../../components/map/KakaoMap'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(250px, 0.78fr) minmax(0, 1.22fr);
  gap: 24px;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`

export const Panel = styled.section`
  min-width: 0;
  padding: 26px 28px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};

  @media (max-width: 640px) { padding: 22px 20px; }
`

export const PanelHeading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
`

export const PanelTitle = styled.h2`
  margin: 0;
  color: ${colors.strongText};
  font-size: 18px;
  font-weight: 700;
`

export const PanelDescription = styled.p`
  margin: 6px 0 0;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.5;
`

export const ApplicationList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${colors.borderSoft};
`

export const ApplicationItem = styled.button<{ $selected: boolean }>`
  width: 100%;
  min-width: 0;
  display: block;
  padding: 16px 0;
  border: 0;
  border-bottom: 1px solid ${colors.borderSoft};
  border-left: 3px solid transparent;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;

  ${({ $selected }) => $selected && css`
    margin-left: -12px;
    padding-left: 9px;
    border-left-color: ${colors.primary};
    background: ${colors.primaryTint};
  `}

  &:hover { background: ${({ $selected }) => ($selected ? colors.primaryTint : colors.surfaceLow)}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const ApplicationTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

export const ApplicationName = styled.strong`
  min-width: 0;
  overflow: hidden;
  color: ${colors.text};
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ApplicationMeta = styled.span`
  display: block;
  margin-top: 6px;
  overflow: hidden;
  color: ${colors.muted};
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const StatusBadge = styled.span<{ $tone: 'draft' | 'pending' | 'active' | 'danger' | 'neutral' }>`
  min-height: 24px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;

  ${({ $tone }) => $tone === 'active'
    ? css`border-color: #9bd7a9; background: ${colors.successTint}; color: ${colors.successText};`
    : $tone === 'pending'
      ? css`border-color: #f0c970; background: ${colors.warningTint}; color: ${colors.warningText};`
      : $tone === 'danger'
        ? css`border-color: ${colors.primarySoft}; background: ${colors.primaryTint}; color: ${colors.primary};`
        : $tone === 'draft'
          ? css`border-color: #d9c9ff; background: #f5f1ff; color: #7150af;`
          : css`border-color: ${colors.border}; background: ${colors.surfaceLow}; color: ${colors.muted};`}
`

export const Empty = styled.p`
  margin: 0;
  padding: 12px 0 4px;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.55;
`

export const NewApplicationButton = styled.button`
  width: 100%;
  min-height: 42px;
  margin-top: 18px;
  border: 1px solid ${colors.primary};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.primary};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover { background: ${colors.primaryTint}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const Section = styled.fieldset`
  grid-column: 1 / -1;
  min-width: 0;
  margin: 0;
  padding: 20px 0;
  border: 0;
  border-top: 1px solid ${colors.borderSoft};

  &:first-of-type { padding-top: 0; border-top: 0; }
`

export const SectionLegend = styled.legend`
  width: 100%;
  margin: 0 0 14px;
  padding: 0;
  color: ${colors.text};
  font-size: 15px;
  font-weight: 700;
`

export const SectionHint = styled.p`
  margin: -7px 0 14px;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.5;
`

export const CategorySelect = styled.select`
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.text};
  font: inherit;
  font-size: 14px;
  outline: 0;

  &:focus { border-color: ${colors.primary}; box-shadow: 0 0 0 3px ${colors.primaryTint}; }
  &:disabled { cursor: not-allowed; background: ${colors.surfaceLow}; color: ${colors.softText}; }
`

export const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const TagButton = styled.button<{ $selected: boolean }>`
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid ${({ $selected }) => ($selected ? colors.primarySoft : colors.border)};
  border-radius: 999px;
  background: ${({ $selected }) => ($selected ? colors.primaryTint : colors.surface)};
  color: ${({ $selected }) => ($selected ? colors.primary : colors.muted)};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  &:disabled { cursor: not-allowed; opacity: 0.55; }
`

export const LocationMap = styled(KakaoMap)`
  height: 300px;
  margin-top: 12px;
`

export const CoordinateText = styled.p`
  margin: 10px 0 0;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.5;
`

export const ScheduleList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${colors.borderSoft};
`

export const ScheduleRow = styled.div`
  display: grid;
  grid-template-columns: 50px minmax(184px, 1fr) minmax(80px, 0.7fr) minmax(80px, 0.7fr);
  align-items: center;
  gap: 10px;
  min-height: 58px;
  border-bottom: 1px solid ${colors.borderSoft};

  @media (max-width: 640px) {
    grid-template-columns: 42px 1fr 1fr;
    padding: 10px 0;

    > :last-child { grid-column: 2 / -1; }
  }
`

export const DayName = styled.strong`
  color: ${colors.text};
  font-size: 13px;
`

export const DayStatus = styled.div`
  display: flex;
  gap: 4px;
`

export const DayStatusButton = styled.button<{ $selected: boolean }>`
  min-height: 30px;
  padding: 0 8px;
  border: 1px solid ${({ $selected }) => ($selected ? colors.primarySoft : colors.border)};
  border-radius: 5px;
  background: ${({ $selected }) => ($selected ? colors.primaryTint : colors.surface)};
  color: ${({ $selected }) => ($selected ? colors.primary : colors.muted)};
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;

  &:disabled { cursor: not-allowed; opacity: 0.55; }
`

export const TimeInput = styled.input`
  width: 100%;
  height: 36px;
  padding: 0 8px;
  border: 1px solid ${colors.border};
  border-radius: 5px;
  background: ${colors.surface};
  color: ${colors.text};
  font: inherit;
  font-size: 12px;

  &:focus { border-color: ${colors.primary}; outline: 2px solid ${colors.primaryTint}; outline-offset: 0; }
  &:disabled { cursor: not-allowed; background: ${colors.surfaceLow}; color: ${colors.softText}; }
`

export const ReadonlyBlock = styled.div`
  margin-bottom: 18px;
  padding: 14px;
  border-left: 3px solid ${colors.primary};
  background: ${colors.primaryTint};
  color: ${colors.text};
  font-size: 13px;
  line-height: 1.55;

  strong { color: ${colors.primary}; }
`

export const AttachmentNotice = styled.div`
  padding: 12px 14px;
  border: 1px solid ${colors.borderSoft};
  border-radius: 6px;
  background: ${colors.surfaceLow};
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.5;
`

export const FormActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
`

export const SecondaryButton = styled.button`
  min-height: 42px;
  padding: 0 13px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.muted};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) { border-color: ${colors.primarySoft}; color: ${colors.primary}; background: ${colors.primaryTint}; }
  &:disabled { cursor: wait; opacity: 0.65; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const DangerButton = styled(SecondaryButton)`
  border-color: #f2b8be;
  color: ${colors.error};
  &:hover:not(:disabled) { border-color: ${colors.error}; color: ${colors.error}; background: ${colors.errorTint}; }
`
