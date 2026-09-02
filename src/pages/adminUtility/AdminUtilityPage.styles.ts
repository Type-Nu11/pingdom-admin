import styled, { css } from 'styled-components'
import { adminColors, radius } from '../../styles/theme'

const neutral = adminColors

export const Content = styled.main`
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  background: ${neutral.background};

  @media (max-width: 720px) {
    padding: 20px;
  }
`

export const PageStack = styled.div`
  width: min(1280px, 100%);
  display: flex;
  flex-direction: column;
  gap: 20px;
`

export const IntroBand = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${neutral.border};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

export const IntroText = styled.div`
  min-width: 0;
`

export const Eyebrow = styled.p`
  margin: 0 0 6px;
  color: ${neutral.primary};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
`

export const IntroTitle = styled.h1`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
`

export const IntroDescription = styled.p`
  max-width: 640px;
  margin: 8px 0 0;
  color: ${neutral.muted};
  font-size: 14px;
  line-height: 1.3;
`

export const StatusBadge = styled.span<{ $tone?: 'ready' | 'warning' }>`
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border: 1px solid
    ${({ $tone }) =>
      $tone === 'warning' ? neutral.warning : neutral.primarySoft};
  border-radius: ${radius.pill};
  background: ${({ $tone }) =>
    $tone === 'warning' ? neutral.warningTint : neutral.primaryTint};
  color: ${({ $tone }) =>
    $tone === 'warning' ? neutral.warningText : neutral.primary};
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
`

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`

export const SummaryBar = styled.section`
  display: flex;
  align-items: center;
  gap: 20px;
  min-height: 72px;
  padding: 12px 18px;
  border: 0;
  border-radius: ${radius.md};
  background: ${neutral.surfaceLow};
`

export const SummaryBarTitle = styled.strong`
  flex: 0 0 auto;
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 700;
`

export const SummaryBarItems = styled.div`
  min-width: 0;
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
`

export const SummaryBarItem = styled.div`
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border-left: 1px solid ${neutral.borderSoft};

  span {
    overflow: hidden;
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: ${neutral.strongText};
    font-size: 24px;
    font-weight: 700;
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
    padding: 0 10px;

    strong {
      font-size: 18px;
    }
  }
`

export const FilterPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border: 0;
  border-radius: ${radius.md};
  background: ${neutral.surfaceLow};
`

export const FilterTopLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;

  @media (max-width: 760px) {
    align-items: flex-start;
    flex-direction: column;
  }
`

export const ResultSummary = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 14px;
  font-weight: 400;
  line-height: 1.3;

  strong {
    color: ${neutral.strongText};
    font-weight: 500;
  }
`

export const SectionHeading = styled.div`
  min-width: 0;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
`

export const SegmentGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const SegmentButton = styled.button<{ $active?: boolean }>`
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${({ $active }) =>
    $active ? neutral.primaryTint : neutral.surfaceLow};
  color: ${({ $active }) => ($active ? neutral.primary : neutral.text)};
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    color: ${neutral.primary};
  }

  span {
    min-width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 7px;
    border-radius: 999px;
    background: ${({ $active }) =>
      $active ? neutral.primary : neutral.surfaceLow};
    color: ${({ $active }) => ($active ? neutral.primaryText : neutral.muted)};
    font-size: 12px;
  }
`

export const FilterForm = styled.form`
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto;
  gap: 12px;
  align-items: end;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

export const AdvancedFilterPanel = styled.div`
  grid-template-columns:
    minmax(120px, 0.8fr)
    minmax(260px, 1.6fr)
    minmax(220px, 1.2fr)
    auto;
  display: grid;
  grid-column: 1 / -1;
  gap: 10px;
  align-items: end;
  padding: 12px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
  background: ${neutral.surfaceLow};

  @media (max-width: 1160px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

export const DetailFilterPanel = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-column: 1 / -1;
  gap: 10px;
  align-items: end;
  min-width: 0;
  padding: 12px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
  background: ${neutral.surfaceLow};

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

export const FilterField = styled.label`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 500;
`

export const FilterGroup = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 500;
`

export const FilterGroupLabel = styled.span`
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 500;
`

export const FilterGroupControls = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;

  > * {
    min-width: 0;
  }
`

export const FilterRangeSeparator = styled.span`
  color: ${neutral.softText};
  font-size: 14px;
  text-align: center;
`

export const FilterHelpText = styled.span`
  color: ${neutral.softText};
  font-size: 12px;
  font-weight: 400;
  line-height: 1.3;
`

const inputControlStyle = css`
  min-height: 40px;
  min-width: 0;
  width: 100%;
  padding: 0 12px;
  border: 0;
  border-radius: ${radius.md};
  outline: 1px solid transparent;
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  font: inherit;
  font-size: 14px;

  &:focus {
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }
`

export const DatePickerRoot = styled.div`
  position: relative;
  min-width: 0;
`

export const DatePickerButton = styled.button`
  ${inputControlStyle}
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  text-align: left;

  .date-picker-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .date-picker-icon {
    flex: 0 0 auto;
    color: ${neutral.primary};
    font-size: 18px;
  }

  &:hover {
    border-color: ${neutral.primarySoft};
  }
`

export const DatePickerPopover = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 20;
  width: min(300px, calc(100vw - 40px));
  padding: 14px;
  border: 1px solid ${neutral.border};
  border-radius: 10px;
  background: ${neutral.surface};
  box-shadow: 0 18px 42px ${neutral.shadow};
`

export const DatePickerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
`

export const DatePickerTitle = styled.strong`
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 700;
`

export const DatePickerIconButton = styled.button`
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: ${radius.pill};
  background: transparent;
  color: ${neutral.muted};
  cursor: pointer;

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }
`

export const DatePickerWeekdays = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
  color: ${neutral.softText};
  font-size: 12px;
  font-weight: 500;
  text-align: center;
`

export const DatePickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
`

export const DatePickerDayButton = styled.button<{
  $outside?: boolean
  $selected?: boolean
  $today?: boolean
}>`
  min-width: 0;
  aspect-ratio: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: ${radius.pill};
  background: ${({ $selected, $today }) =>
    $selected ? neutral.primary : $today ? neutral.primaryTint : 'transparent'};
  color: ${({ $selected, $outside }) =>
    $selected ? neutral.primaryText : $outside ? neutral.softText : neutral.text};
  font: inherit;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: ${({ $selected }) =>
      $selected ? neutral.primaryHover : neutral.primaryTint};
    color: ${({ $selected }) => ($selected ? neutral.primaryText : neutral.primary)};
  }
`

export const DatePickerFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid ${neutral.borderSoft};
`

export const DatePickerTimeField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

export const DatePickerTimeLabel = styled.span`
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 500;
`

export const DatePickerTimePicker = styled.div`
  position: relative;
`

export const DatePickerTimeButton = styled.button`
  min-width: 118px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
  border: 0;
  border-radius: ${radius.md};
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  font: inherit;
  font-size: 12px;
  cursor: pointer;

  > span {
    flex: 1;
    text-align: left;
    font-variant-numeric: tabular-nums;
  }

  > span:first-child {
    color: ${neutral.primary};
    font-size: 18px;
  }

  > span:last-child {
    color: ${neutral.softText};
    font-size: 18px;
  }

  &:hover,
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }
`

export const DatePickerTimeMenu = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 2;
  width: 174px;
  padding: 10px;
  border: 1px solid ${neutral.border};
  border-radius: 10px;
  background: ${neutral.surface};
  box-shadow: 0 14px 32px ${neutral.shadow};
`

export const DatePickerTimeMenuTitle = styled.strong`
  display: block;
  margin-bottom: 4px;
  color: ${neutral.strongText};
  font-size: 12px;
  font-weight: 700;
`

export const DatePickerTimePreview = styled.span`
  display: block;
  margin-bottom: 8px;
  color: ${neutral.primary};
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
`

export const DatePickerTimeColumns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 6px;
`

export const DatePickerTimeColumn = styled.div`
  min-width: 0;
`

export const DatePickerTimeColumnLabel = styled.span`
  display: block;
  margin-bottom: 4px;
  color: ${neutral.softText};
  font-size: 12px;
  font-weight: 500;
  text-align: center;
`

export const DatePickerTimeOptions = styled.div`
  max-height: 132px;
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

export const DatePickerTimeOption = styled.button<{ $selected?: boolean }>`
  min-height: 28px;
  border: 0;
  border-radius: ${radius.sm};
  background: ${({ $selected }) =>
    $selected ? neutral.primaryTint : 'transparent'};
  color: ${({ $selected }) =>
    $selected ? neutral.primary : neutral.text};
  font: inherit;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    outline: none;
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }
`

export const DatePickerTimeSeparator = styled.span`
  align-self: end;
  padding-bottom: 7px;
  color: ${neutral.primary};
  font-size: 16px;
  font-weight: 700;
`

export const FilterMenuRoot = styled.div`
  position: relative;
  min-width: 0;
`

export const FilterMenuButton = styled.button<{ $open?: boolean }>`
  ${inputControlStyle}
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;

  ${({ $open }) =>
    $open &&
    css`
      border-color: ${neutral.primary};
      outline-color: ${neutral.primary};
      box-shadow: 0 0 0 3px ${neutral.primaryTint};
    `}

  .filter-menu-label {
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .filter-menu-icon {
    color: ${neutral.muted};
    font-size: 20px;
    line-height: 1;
  }
`

export const FilterMenuList = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 15;
  width: 100%;
  min-width: 160px;
  padding: 6px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  box-shadow: 0 18px 42px ${neutral.shadow};
`

export const FilterMenuOption = styled.button<{ $active?: boolean }>`
  width: 100%;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: ${({ $active }) =>
    $active ? neutral.primaryTint : 'transparent'};
  color: ${({ $active }) => ($active ? neutral.primary : neutral.text)};
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  .filter-menu-icon {
    color: ${neutral.primary};
    font-size: 18px;
  }
`

export const FilterActions = styled.div<{ $alignWithField?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;

  ${({ $alignWithField }) =>
    $alignWithField &&
    css`
      align-self: start;
      padding-top: 20px;
    `}

  @media (max-width: 1160px) {
    justify-content: flex-start;
  }

  @media (max-width: 760px) {
    padding-top: 0;
  }
`

export const DetailFilterActions = styled(FilterActions)`
  grid-column: 1 / -1;
  justify-content: flex-end;

  @media (max-width: 520px) {
    justify-content: stretch;

    > button {
      flex: 1;
    }
  }
`

export const MetricItem = styled.section`
  min-width: 0;
  min-height: 92px;
  padding: 14px 16px;
  border: 0;
  border-radius: ${radius.md};
  background: ${neutral.surfaceLow};
`

export const MetricLabel = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 500;
`

export const MetricValue = styled.strong`
  display: block;
  margin-top: 6px;
  overflow: hidden;
  color: ${neutral.strongText};
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const MetricHint = styled.span`
  display: block;
  margin-top: 6px;
  color: ${neutral.softText};
  font-size: 12px;
  line-height: 1.3;
`

export const WorkGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(420px, 1fr);
  gap: 16px;
  min-height: 480px;
  height: min(680px, calc(100vh - 300px));

  @media (max-width: 1040px) {
    grid-template-columns: 1fr;
    height: auto;
  }
`

export const Section = styled.section`
  min-width: 0;
  overflow: hidden;
  border: 0;
  border-radius: ${radius.md};
  background: ${neutral.surfaceLow};
`

export const SectionHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 64px;
  padding: 14px 16px;
  border-bottom: 1px solid ${neutral.border};
`

export const SectionTitle = styled.h2`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 16px;
  font-weight: 700;
`

export const DetailTabList = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid ${neutral.border};
`

export const DetailTabButton = styled.button<{ $active?: boolean }>`
  min-height: 38px;
  padding: 0 12px;
  border: 0;
  border-bottom: 2px solid
    ${({ $active }) => ($active ? neutral.primary : 'transparent')};
  background: transparent;
  color: ${({ $active }) => ($active ? neutral.text : neutral.muted)};
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    color: ${neutral.primary};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: -2px;
  }
`

export const SectionBody = styled.div`
  padding: 16px;
`

export const WorkSection = styled(Section)`
  min-height: 0;
  display: flex;
  flex-direction: column;
`

export const WorkSectionBody = styled(SectionBody)`
  min-height: 0;
  overflow: auto;
`

export const Toolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  margin-bottom: 14px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

export const SearchInput = styled.input`
  min-height: 40px;
  min-width: 0;
  padding: 0 14px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  outline: 1px solid transparent;
  background: ${neutral.surface};
  color: ${neutral.text};
  font: inherit;

  &::placeholder {
    color: ${neutral.placeholder};
  }

  &::-webkit-search-cancel-button {
    appearance: none;
  }

  &:focus {
    border-color: ${neutral.primary};
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }
`

const buttonStyle = css`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  border-radius: ${radius.pill};
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`

export const PrimaryButton = styled.button`
  ${buttonStyle}
  border: 0;
  background: ${neutral.primary};
  color: ${neutral.primaryText};

  &:hover:not(:disabled) {
    background: ${neutral.primaryHover};
  }
`

export const SecondaryButton = styled.button`
  ${buttonStyle}
  border: 0;
  background: ${neutral.surfaceLow};
  color: ${neutral.text};

  &:hover:not(:disabled) {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }
`

export const IconActionButton = styled.button`
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.surfaceLow};
  color: ${neutral.muted};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`

export const TableWrap = styled.div`
  max-height: 520px;
  overflow: auto;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
`

export const Table = styled.table`
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;
  font-size: 14px;
`

export const TableHeadCell = styled.th`
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px;
  border-bottom: 1px solid ${neutral.border};
  background: ${neutral.surfaceLow};
  color: ${neutral.neutralText};
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
`

export const TableRow = styled.tr<{ $active?: boolean }>`
  background: ${({ $active }) => ($active ? neutral.primaryTint : 'transparent')};
  cursor: pointer;

  &:hover {
    background: ${({ $active }) =>
      $active ? neutral.primaryTint : neutral.surfaceLow};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: -2px;
  }

  ${({ $active }) =>
    $active &&
    css`
      td:first-child {
        box-shadow: inset 3px 0 0 ${neutral.primary};
      }
    `}
`

export const TableCell = styled.td`
  padding: 12px;
  border-top: 1px solid ${neutral.borderSoft};
  color: ${neutral.text};
`

export const TableDateCell = styled(TableCell)`
  white-space: nowrap;
`

export const TableStrongText = styled.strong`
  display: block;
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
`

export const TableSubText = styled.span`
  display: block;
  margin-top: 3px;
  color: ${neutral.softText};
  font-size: 12px;
  line-height: 1.3;
`

export const TableStatusBadge = styled.span<{
  $tone?: 'danger' | 'warning' | 'success' | 'neutral'
}>`
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid
    ${({ $tone }) => {
      if ($tone === 'warning') {
        return neutral.warning
      }

      if ($tone === 'success') {
        return neutral.success
      }

      if ($tone === 'neutral') {
        return neutral.primarySoft
      }

      return neutral.error
    }};
  border-radius: ${radius.pill};
  background: ${({ $tone }) => {
    if ($tone === 'warning') {
      return neutral.warningTint
    }

    if ($tone === 'success') {
      return neutral.successTint
    }

    if ($tone === 'neutral') {
      return neutral.primaryTint
    }

    return neutral.errorTint
  }};
  color: ${({ $tone }) => {
    if ($tone === 'warning') {
      return neutral.warningText
    }

    if ($tone === 'success') {
      return neutral.successText
    }

    if ($tone === 'neutral') {
      return neutral.primary
    }

    return neutral.error
  }};
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
`

export const BadgeGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`

export const EmptyRow = styled.td`
  padding: 28px 12px;
  border-top: 1px solid ${neutral.borderSoft};
  color: ${neutral.muted};
  text-align: center;
`

export const Notice = styled.div<{ $variant?: 'error' | 'info' }>`
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid
    ${({ $variant }) => ($variant === 'error' ? neutral.error : neutral.border)};
  border-radius: 8px;
  background: ${({ $variant }) =>
    $variant === 'error' ? neutral.errorTint : neutral.surfaceLow};
  color: ${({ $variant }) => ($variant === 'error' ? neutral.error : neutral.muted)};
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
`

export const ActionPanel = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
  background: ${neutral.surfaceLow};
`

export const ActionLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 500;
`

export const TextArea = styled.textarea`
  min-height: 82px;
  width: 100%;
  resize: vertical;
  padding: 10px 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  outline: 1px solid transparent;
  background: ${neutral.surface};
  color: ${neutral.text};
  font: inherit;
  font-size: 14px;
  line-height: 1.3;

  &::placeholder {
    color: ${neutral.placeholder};
  }

  &:focus {
    border-color: ${neutral.primary};
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }
`

export const ActionHelpText = styled.span`
  color: ${neutral.softText};
  font-size: 12px;
  line-height: 1.3;
`

export const ActionInfoText = styled.span`
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 10px 12px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
  background: ${neutral.primaryTint};
  color: ${neutral.muted};
  font-size: 12px;
  line-height: 1.3;

  .material-symbols-rounded {
    flex: 0 0 auto;
    color: ${neutral.primary};
    font-size: 18px;
  }
`

export const Pagination = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid ${neutral.borderSoft};
`

export const PaginationStatus = styled.span`
  min-width: 96px;
  color: ${neutral.muted};
  font-size: 14px;
  font-weight: 500;
  text-align: center;
`

export const DetailEmpty = styled.div`
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: ${neutral.muted};
  text-align: center;

  strong {
    color: ${neutral.strongText};
    font-size: 16px;
    font-weight: 500;
  }

  span {
    max-width: 260px;
    font-size: 14px;
    line-height: 1.3;
  }
`

export const DetailHeaderStack = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const DetailSummaryCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid ${neutral.primarySoft};
  border-radius: 8px;
  background: ${neutral.primaryTint};
  box-shadow: 0 6px 16px ${neutral.shadow};
`

export const DetailTitle = styled.strong`
  display: block;
  overflow: hidden;
  color: ${neutral.strongText};
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const DetailMeta = styled.span`
  display: block;
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 400;
`

export const DetailStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

export const DetailGroup = styled.section`
  min-width: 0;
  padding: 14px;
  border: 0;
  border-radius: ${radius.md};
  background: ${neutral.surfaceLow};
`

export const DetailActionGroup = styled(DetailGroup)`
  margin-top: 4px;
  padding: 18px 0 0;
  border-width: 1px 0 0;
  border-radius: 0;
  background: transparent;
`

export const DetailGroupTitle = styled.h3`
  margin: 0 0 10px;
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 700;
`

export const DetailGroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;

  > ${DetailGroupTitle} {
    margin-bottom: 0;
  }
`

export const CompactButton = styled(SecondaryButton)`
  min-height: 34px;
  padding: 0 10px;
  font-size: 12px;
`

export const SanctionHistoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  strong {
    min-width: 0;
    overflow: hidden;
    color: ${neutral.strongText};
    font-size: 14px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const SanctionHistoryMeta = styled.span`
  display: block;
  margin-top: 4px;
  color: ${neutral.softText};
  font-size: 12px;
  line-height: 1.3;
`

export const DetailList = styled.dl`
  display: flex;
  flex-direction: column;
  margin: 0;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
  overflow: hidden;
`

export const DetailRow = styled.div`
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 10px;
  padding: 11px 12px;
  border-top: 1px solid ${neutral.borderSoft};

  &:first-child {
    border-top: 0;
  }

  dt {
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 500;
  }

  dd {
    min-width: 0;
    margin: 0;
    color: ${neutral.text};
    font-size: 14px;
    font-weight: 400;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }
`

export const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: ${neutral.overlay};
`

export const ConfirmDialog = styled.section`
  width: min(440px, 100%);
  padding: 22px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  box-shadow: 0 24px 64px ${neutral.strongShadow};
`

export const FormDialog = styled(ConfirmDialog)`
  width: min(620px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
`

export const ConfirmIcon = styled.div`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  border-radius: 8px;
  background: ${neutral.warningTint};
  color: ${neutral.warningText};

  span {
    font-size: 24px;
  }
`

export const ConfirmTitle = styled.h2`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
`

export const ConfirmDescription = styled.p`
  margin: 10px 0 0;
  color: ${neutral.muted};
  font-size: 14px;
  line-height: 1.3;
`

export const ConfirmMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 400;
  line-height: 1.3;

  span {
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 500;
  }
`

export const ConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
`

export const PolicyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const PolicyItem = styled.div`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 10px;
  align-items: flex-start;
`

export const PolicyIcon = styled.span`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: ${neutral.primaryTint};
  color: ${neutral.primary};
`

export const PolicyText = styled.div`
  min-width: 0;

  strong {
    display: block;
    color: ${neutral.strongText};
    font-size: 14px;
    font-weight: 500;
    line-height: 1.3;
  }

  span {
    display: block;
    margin-top: 3px;
    color: ${neutral.muted};
    font-size: 12px;
    line-height: 1.3;
  }
`

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

export const Field = styled.label`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 500;
`

export const FieldInput = styled.input`
  min-height: 42px;
  min-width: 0;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  outline: 1px solid ${neutral.border};
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  font: inherit;

  &:focus {
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
    background: ${neutral.surface};
  }
`

export const ToggleList = styled.div`
  display: flex;
  flex-direction: column;
`

export const ToggleRow = styled.label`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid ${neutral.borderSoft};

  &:last-child {
    border-bottom: 0;
  }
`

export const ToggleText = styled.span`
  min-width: 0;

  strong {
    display: block;
    color: ${neutral.strongText};
    font-size: 14px;
    font-weight: 500;
    line-height: 1.3;
  }

  small {
    display: block;
    margin-top: 4px;
    color: ${neutral.muted};
    font-size: 12px;
    line-height: 1.3;
  }
`

export const ToggleInput = styled.input`
  width: 42px;
  height: 24px;
  appearance: none;
  border: 1px solid ${neutral.borderDark};
  border-radius: 999px;
  background: ${neutral.surfaceHigh};
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease;

  &::before {
    width: 18px;
    height: 18px;
    display: block;
    margin: 2px;
    border-radius: 50%;
    background: ${neutral.surface};
    box-shadow: 0 1px 3px ${neutral.shadow};
    content: '';
    transition: transform 160ms ease;
  }

  &:checked {
    border-color: ${neutral.primary};
    background: ${neutral.primary};
  }

  &:checked::before {
    transform: translateX(18px);
  }
`
