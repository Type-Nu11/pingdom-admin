import styled, { css } from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const HeaderButton = styled.button`
  min-height: 40px;
  padding: 0 13px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.text};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover { border-color: ${colors.primary}; color: ${colors.primary}; background: ${colors.primaryTint}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`

export const Workspace = styled.div`
  display: grid;
  grid-template-columns: minmax(340px, 0.92fr) minmax(420px, 1.08fr);
  gap: 24px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

export const Panel = styled.section`
  min-width: 0;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};
`

export const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid ${colors.borderSoft};
`

export const PanelTitle = styled.h2`
  margin: 0;
  color: ${colors.strongText};
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
`

export const PanelDescription = styled.p`
  margin: 5px 0 0;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.5;
`

export const CreateButton = styled.button`
  min-width: 108px;
  height: 40px;
  border: 1px solid ${colors.primary};
  border-radius: 6px;
  background: ${colors.primary};
  color: ${colors.primaryText};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover { border-color: ${colors.primaryHover}; background: ${colors.primaryHover}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`

export const FilterBar = styled.div`
  display: flex;
  gap: 6px;
  padding: 12px 16px;
  overflow-x: auto;
  border-bottom: 1px solid ${colors.borderSoft};
`

export const FilterButton = styled.button<{ $selected: boolean }>`
  height: 36px;
  flex: 0 0 auto;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: ${({ $selected }) => ($selected ? colors.primaryTint : 'transparent')};
  color: ${({ $selected }) => ($selected ? colors.primary : colors.muted)};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) { background: ${colors.primaryTint}; color: ${colors.primary}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`

export const ResultMeta = styled.p`
  margin: 0;
  padding: 12px 24px 0;
  color: ${colors.muted};
  font-size: 12px;
`

export const CampaignList = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px;
`

export const CampaignItem = styled.button<{ $selected: boolean }>`
  width: 100%;
  min-width: 0;
  display: block;
  padding: 15px 14px;
  border: 0;
  border-left: 3px solid ${({ $selected }) => ($selected ? colors.primary : 'transparent')};
  border-radius: 6px;
  background: ${({ $selected }) => ($selected ? colors.primaryTint : 'transparent')};
  color: inherit;
  text-align: left;
  cursor: pointer;

  &:hover { background: ${({ $selected }) => ($selected ? colors.primaryTint : colors.surfaceLow)}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: -2px; }
`

export const CampaignTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

export const CampaignTitle = styled.h3`
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: ${colors.text};
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const StatusBadge = styled.span<{ $tone: 'draft' | 'published' | 'closed' }>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 7px;
  border: 1px solid ${({ $tone }) => ($tone === 'published' ? '#9bd7a9' : $tone === 'closed' ? '#f0c970' : colors.primarySoft)};
  border-radius: 6px;
  background: ${({ $tone }) => ($tone === 'published' ? colors.successTint : $tone === 'closed' ? colors.warningTint : colors.primaryTint)};
  color: ${({ $tone }) => ($tone === 'published' ? colors.successText : $tone === 'closed' ? colors.warningText : colors.primary)};
  font-size: 11px;
  font-weight: 700;
`

export const CampaignMeta = styled.p`
  margin: 7px 0 0;
  overflow: hidden;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const Empty = styled.div`
  padding: 52px 24px;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.55;
  text-align: center;
`

export const ListLoading = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px 24px 24px;
`

export const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 24px 22px;
  border-top: 1px solid ${colors.borderSoft};
`

export const PaginationButton = styled.button`
  min-width: 64px;
  height: 34px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.text};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) { border-color: ${colors.primary}; color: ${colors.primary}; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

export const PageText = styled.span`
  min-width: 42px;
  color: ${colors.muted};
  font-size: 12px;
  font-weight: 700;
  text-align: center;
`

export const Editor = styled.div`
  padding: 24px;
`

export const ReadonlyNotice = styled.div`
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surfaceLow};
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.5;
`

export const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`

export const Field = styled.label<{ $wide?: boolean }>`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: ${colors.text};
  font-size: 13px;
  font-weight: 700;

  ${({ $wide }) => $wide && css`grid-column: 1 / -1;`}
`

const fieldStyle = css`
  width: 100%;
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

export const Input = styled.input`
  ${fieldStyle}
  height: 42px;
  padding: 0 12px;
`

export const Select = styled.select`
  ${fieldStyle}
  height: 42px;
  padding: 0 38px 0 12px;
  appearance: none;
  background: ${colors.surface} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='m4 6 4 4 4-4' stroke='%236B6B73' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 12px center / 16px;
  cursor: pointer;

  &:disabled { background-color: ${colors.surfaceLow}; }
`

export const Textarea = styled.textarea`
  ${fieldStyle}
  min-height: 144px;
  padding: 12px;
  resize: vertical;
  line-height: 1.55;
`

export const BrandField = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;

  > :first-child { min-width: 0; }

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr) auto;
    button:last-child { grid-column: 1 / -1; }
  }
`

export const BrandButton = styled.button`
  min-height: 42px;
  padding: 0 10px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  &:hover:not(:disabled) { border-color: ${colors.primary}; background: ${colors.primaryTint}; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

export const FieldHint = styled.p`
  margin: -2px 0 0;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.45;
`

export const FormError = styled.p`
  grid-column: 1 / -1;
  margin: 0;
  color: ${colors.error};
  font-size: 13px;
  font-weight: 700;
`

export const FormActions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
`

export const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' }>`
  min-width: 100px;
  height: 42px;
  padding: 0 14px;
  border: 1px solid;
  border-radius: 6px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  ${({ $variant = 'secondary' }) => {
    if ($variant === 'primary') return css`
      border-color: ${colors.primary}; background: ${colors.primary}; color: ${colors.primaryText};
      &:hover:not(:disabled) { border-color: ${colors.primaryHover}; background: ${colors.primaryHover}; }
    `
    if ($variant === 'danger') return css`
      border-color: ${colors.error}; background: ${colors.surface}; color: ${colors.error};
      &:hover:not(:disabled) { background: ${colors.errorTint}; }
    `
    return css`
      border-color: ${colors.border}; background: ${colors.surface}; color: ${colors.text};
      &:hover:not(:disabled) { border-color: ${colors.primary}; color: ${colors.primary}; }
    `
  }}

  &:disabled { cursor: wait; opacity: 0.55; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const ModalOverlay = styled.div`
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(17 24 39 / 40%);
`

export const Modal = styled.section`
  width: min(100%, 520px);
  max-height: min(720px, calc(100vh - 48px));
  overflow: auto;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};
  box-shadow: 0 20px 45px rgb(15 23 42 / 18%);
`

export const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 16px;
  border-bottom: 1px solid ${colors.borderSoft};
`

export const ModalTitle = styled.h2`
  margin: 0;
  color: ${colors.strongText};
  font-size: 18px;
  font-weight: 700;
`

export const ModalBody = styled.div`
  padding: 24px;
`

export const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: ${colors.muted};
  font-family: 'Material Symbols Outlined';
  font-size: 20px;
  cursor: pointer;

  &:hover { background: ${colors.surfaceLow}; color: ${colors.text}; }
`
