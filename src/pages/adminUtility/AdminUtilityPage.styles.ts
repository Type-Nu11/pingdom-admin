import styled, { css } from 'styled-components'
import { adminColors } from '../../styles/theme'

const neutral = adminColors

export const Content = styled.main`
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px 40px;
  background: ${neutral.background};

  @media (max-width: 720px) {
    padding: 20px;
  }
`

export const PageStack = styled.div`
  width: min(1120px, 100%);
  display: flex;
  flex-direction: column;
  gap: 20px;
`

export const IntroBand = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding-bottom: 20px;
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
  font-weight: 800;
  letter-spacing: 0;
`

export const IntroTitle = styled.h1`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 24px;
  font-weight: 800;
  line-height: 1.25;
`

export const IntroDescription = styled.p`
  max-width: 640px;
  margin: 8px 0 0;
  color: ${neutral.muted};
  font-size: 14px;
  line-height: 1.6;
`

export const StatusBadge = styled.span<{ $tone?: 'ready' | 'warning' }>`
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border: 1px solid
    ${({ $tone }) =>
      $tone === 'warning' ? neutral.warning : neutral.primarySoft};
  border-radius: 8px;
  background: ${({ $tone }) =>
    $tone === 'warning' ? neutral.warningTint : neutral.primaryTint};
  color: ${({ $tone }) =>
    $tone === 'warning' ? neutral.warningText : neutral.primary};
  font-size: 13px;
  font-weight: 800;
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

export const MetricItem = styled.section`
  min-width: 0;
  padding: 16px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
`

export const MetricLabel = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 700;
`

export const MetricValue = styled.strong`
  display: block;
  margin-top: 8px;
  color: ${neutral.strongText};
  font-size: 28px;
  font-weight: 800;
  line-height: 1.1;
`

export const MetricHint = styled.span`
  display: block;
  margin-top: 8px;
  color: ${neutral.softText};
  font-size: 12px;
  line-height: 1.4;
`

export const WorkGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 16px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

export const Section = styled.section`
  min-width: 0;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
`

export const SectionHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid ${neutral.border};
`

export const SectionTitle = styled.h2`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 16px;
  font-weight: 800;
`

export const SectionBody = styled.div`
  padding: 18px;
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
  min-height: 44px;
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

  &:focus {
    border-color: ${neutral.primary};
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }
`

const buttonStyle = css`
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border-radius: 8px;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`

export const PrimaryButton = styled.button`
  ${buttonStyle}
  border: 1px solid ${neutral.primary};
  background: ${neutral.primary};
  color: ${neutral.primaryText};

  &:hover:not(:disabled) {
    background: ${neutral.primaryHover};
  }
`

export const SecondaryButton = styled.button`
  ${buttonStyle}
  border: 1px solid ${neutral.border};
  background: ${neutral.surface};
  color: ${neutral.text};

  &:hover:not(:disabled) {
    border-color: ${neutral.primarySoft};
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }
`

export const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
`

export const Table = styled.table`
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;
  font-size: 13px;
`

export const TableHeadCell = styled.th`
  padding: 12px;
  background: ${neutral.surfaceLow};
  color: ${neutral.muted};
  font-weight: 800;
  text-align: left;
  white-space: nowrap;
`

export const TableCell = styled.td`
  padding: 14px 12px;
  border-top: 1px solid ${neutral.borderSoft};
  color: ${neutral.text};
`

export const EmptyRow = styled.td`
  padding: 28px 12px;
  border-top: 1px solid ${neutral.borderSoft};
  color: ${neutral.muted};
  text-align: center;
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
    font-size: 13px;
    font-weight: 800;
    line-height: 1.4;
  }

  span {
    display: block;
    margin-top: 3px;
    color: ${neutral.muted};
    font-size: 12px;
    line-height: 1.5;
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
  font-weight: 800;
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
    font-weight: 800;
    line-height: 1.4;
  }

  small {
    display: block;
    margin-top: 4px;
    color: ${neutral.muted};
    font-size: 12px;
    line-height: 1.5;
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
