import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const neutral = adminColors

export const Root = styled.div`
  position: relative;
  min-width: 0;
`

export const Icon = styled.span`
  width: 1em;
  height: 1em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 18;
`

export const Trigger = styled.button`
  width: 100%;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid ${neutral.border};
  border-radius: 7px;
  outline: 0;
  background: ${neutral.surface};
  color: ${neutral.text};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  > span:first-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  ${Icon} {
    color: ${neutral.muted};
  }

  &:hover:not(:disabled) {
    border-color: ${neutral.primarySoft};

    ${Icon} {
      color: ${neutral.primary};
    }
  }

  &:focus-visible {
    border-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};

    ${Icon} {
      color: ${neutral.primary};
    }
  }

  &:disabled {
    cursor: default;
    background: ${neutral.surfaceLow};
    color: ${neutral.softText};
  }
`

export const Popover = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 150;
  width: min(300px, calc(100vw - 40px));
  padding: 14px;
  border: 1px solid ${neutral.border};
  border-radius: 10px;
  background: ${neutral.surface};
  box-shadow: 0 18px 42px ${neutral.shadow};
`

export const CalendarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
`

export const CalendarTitle = styled.strong`
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 800;
`

export const IconButton = styled.button`
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: ${neutral.muted};
  cursor: pointer;

  &:hover,
  &:focus-visible {
    outline: 0;
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }
`

export const Weekdays = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  margin-bottom: 4px;
  color: ${neutral.softText};
  font-size: 11px;
  font-weight: 700;
  text-align: center;
`

export const DayGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 3px;
`

export const DayButton = styled.button<{
  $outside?: boolean
  $selected?: boolean
  $today?: boolean
}>`
  min-width: 0;
  aspect-ratio: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid
    ${({ $selected, $today }) =>
      $selected ? neutral.primary : $today ? neutral.primarySoft : 'transparent'};
  border-radius: 7px;
  background: ${({ $selected }) => ($selected ? neutral.primary : 'transparent')};
  color: ${({ $selected, $outside }) =>
    $selected ? neutral.primaryText : $outside ? neutral.softText : neutral.text};
  font: inherit;
  font-size: 12px;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: ${neutral.primarySoft};
    outline: 0;
    background: ${({ $selected }) =>
      $selected ? neutral.primaryHover : neutral.primaryTint};
    color: ${({ $selected }) => ($selected ? neutral.primaryText : neutral.primary)};
  }
`

export const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid ${neutral.borderSoft};
`

export const SecondaryButton = styled.button`
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid ${neutral.border};
  border-radius: 7px;
  background: ${neutral.surface};
  color: ${neutral.muted};
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: ${neutral.primarySoft};
    outline: 0;
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }
`

export const PrimaryButton = styled(SecondaryButton)`
  border-color: ${neutral.primary};
  background: ${neutral.primary};
  color: ${neutral.primaryText};

  &:hover,
  &:focus-visible {
    border-color: ${neutral.primaryHover};
    background: ${neutral.primaryHover};
    color: ${neutral.primaryText};
  }
`

export const TimePickerRoot = styled.div`
  position: relative;
  min-width: 104px;
`

export const TimeMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 151;
  width: 184px;
  padding: 10px;
  border: 1px solid ${neutral.border};
  border-radius: 10px;
  background: ${neutral.surface};
  box-shadow: 0 14px 32px ${neutral.shadow};
`

export const TimeMenuTitle = styled.strong`
  display: block;
  margin-bottom: 8px;
  color: ${neutral.strongText};
  font-size: 12px;
  font-weight: 800;
`

export const TimeColumns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: start;
  gap: 6px;
`

export const TimeColumn = styled.div`
  min-width: 0;
`

export const TimeColumnLabel = styled.span`
  display: block;
  margin-bottom: 4px;
  color: ${neutral.softText};
  font-size: 11px;
  font-weight: 700;
  text-align: center;
`

export const TimeOptions = styled.div`
  max-height: 150px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  padding: 2px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 7px;
  background: ${neutral.surfaceLow};
  scrollbar-width: thin;
  scrollbar-color: ${neutral.border} transparent;
`

export const TimeOption = styled.button<{ $selected?: boolean }>`
  min-height: 28px;
  padding: 0;
  border: 1px solid ${({ $selected }) => ($selected ? neutral.primary : 'transparent')};
  border-radius: 6px;
  background: ${({ $selected }) => ($selected ? neutral.primaryTint : 'transparent')};
  color: ${({ $selected }) => ($selected ? neutral.primary : neutral.text)};
  font: inherit;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: ${neutral.primarySoft};
    outline: 0;
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }
`

export const TimeSeparator = styled.span`
  align-self: center;
  color: ${neutral.primary};
  font-size: 16px;
  font-weight: 800;
`
