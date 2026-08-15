import styled, { css } from 'styled-components'
import { adminColors } from '../../styles/theme'

const neutral = adminColors

export const TabList = styled.div`
  display: flex;
  gap: 6px;
  padding: 5px;
  border: 1px solid ${neutral.border};
  border-radius: 10px;
  background: ${neutral.surface};
`

export const TabButton = styled.button<{ $active?: boolean }>`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 16px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: ${neutral.muted};
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  ${({ $active }) =>
    $active &&
    css`
      background: ${neutral.primaryTint};
      color: ${neutral.primary};
    `}
`

export const SearchBar = styled.form`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 16px;
  border: 1px solid ${neutral.border};
  border-radius: 10px;
  background: ${neutral.surface};

  @media (max-width: 620px) {
    align-items: stretch;
    flex-direction: column;
  }
`

export const Field = styled.label`
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  color: ${neutral.text};
  font-size: 12px;
  font-weight: 700;

  small {
    color: ${neutral.muted};
    font-weight: 500;
    line-height: 1.4;
  }
`

const inputStyles = css`
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.strongText};
  font: inherit;
  font-size: 13px;

  &:focus {
    border-color: ${neutral.primary};
    outline: 3px solid ${neutral.primaryTint};
  }

  &:disabled {
    opacity: 0.6;
  }
`

export const Input = styled.input`
  ${inputStyles}
`

export const Select = styled.select`
  ${inputStyles}
`

export const TextArea = styled.textarea`
  ${inputStyles}
  min-height: 96px;
  padding: 11px 12px;
  resize: vertical;
  line-height: 1.5;
`

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

export const WideField = styled(Field)`
  grid-column: 1 / -1;
`

export const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const RecordCard = styled.article<{ $selected?: boolean }>`
  min-width: 0;
  padding: 14px;
  border: 1px solid ${({ $selected }) => ($selected ? neutral.primary : neutral.border)};
  border-radius: 9px;
  background: ${({ $selected }) => ($selected ? neutral.primaryTint : neutral.surface)};
`

export const RecordButton = styled.button<{ $selected?: boolean }>`
  width: 100%;
  min-width: 0;
  padding: 14px;
  border: 1px solid ${({ $selected }) => ($selected ? neutral.primary : neutral.border)};
  border-radius: 9px;
  background: ${({ $selected }) => ($selected ? neutral.primaryTint : neutral.surface)};
  color: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: ${neutral.primarySoft};
    background: ${neutral.primaryTint};
  }
`

export const RecordHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

export const RecordTitle = styled.strong`
  display: block;
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
`

export const RecordMeta = styled.p`
  margin: 5px 0 0;
  color: ${neutral.muted};
  font-size: 11px;
  line-height: 1.5;
`

export const RecordDescription = styled.p`
  margin: 11px 0 0;
  color: ${neutral.text};
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
`

export const StatusBadge = styled.span<{ $tone?: 'success' | 'warning' | 'danger' }>`
  flex-shrink: 0;
  padding: 4px 8px;
  border: 1px solid
    ${({ $tone }) =>
      $tone === 'success'
        ? neutral.success
        : $tone === 'danger'
          ? neutral.error
          : $tone === 'warning'
            ? neutral.warning
            : neutral.borderDark};
  border-radius: 999px;
  background: ${({ $tone }) =>
    $tone === 'success'
      ? neutral.successTint
      : $tone === 'danger'
        ? neutral.errorTint
        : $tone === 'warning'
          ? neutral.warningTint
          : neutral.surfaceLow};
  color: ${({ $tone }) =>
    $tone === 'success'
      ? neutral.successText
      : $tone === 'danger'
        ? neutral.error
        : $tone === 'warning'
          ? neutral.warningText
          : neutral.muted};
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
`

export const DetailGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0 0;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`

export const DetailItem = styled.div`
  min-width: 0;
  padding: 11px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
  background: ${neutral.surfaceLow};

  dt {
    color: ${neutral.muted};
    font-size: 10px;
    font-weight: 700;
  }

  dd {
    overflow-wrap: anywhere;
    margin: 4px 0 0;
    color: ${neutral.strongText};
    font-size: 12px;
    line-height: 1.45;
  }
`

export const Section = styled.section`
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid ${neutral.border};
`

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
`

export const SectionTitle = styled.h3`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 800;
`

export const InlineActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 12px;
`

export const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  border-top: 1px solid ${neutral.border};
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 700;
`

export const FormBody = styled.div`
  padding: 16px;
`

export const Link = styled.a`
  color: ${neutral.primary};
  font-weight: 700;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

export const MetricCard = styled.div`
  min-width: 0;
  padding: 13px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
  background: ${neutral.surfaceLow};

  span {
    display: block;
    color: ${neutral.muted};
    font-size: 10px;
    font-weight: 700;
  }

  strong {
    display: block;
    margin-top: 5px;
    color: ${neutral.strongText};
    font-size: 18px;
    font-weight: 800;
  }
`

export const TableScroll = styled.div`
  overflow-x: auto;
`

export const Table = styled.table`
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;

  th,
  td {
    padding: 12px 14px;
    border-bottom: 1px solid ${neutral.borderSoft};
    color: ${neutral.text};
    font-size: 12px;
    text-align: right;
    white-space: nowrap;
  }

  th {
    background: ${neutral.surfaceLow};
    color: ${neutral.muted};
    font-size: 11px;
    font-weight: 800;
  }

  th:first-child,
  td:first-child {
    min-width: 220px;
    text-align: left;
  }

  tbody tr:hover {
    background: ${neutral.primaryTint};
  }
`

export const TableTitle = styled.strong`
  display: block;
  overflow: hidden;
  max-width: 260px;
  color: ${neutral.strongText};
  font-size: 12px;
  text-overflow: ellipsis;
`

export const TableMeta = styled.span`
  display: block;
  overflow: hidden;
  max-width: 260px;
  margin-top: 3px;
  color: ${neutral.muted};
  font-size: 10px;
  text-overflow: ellipsis;
`
