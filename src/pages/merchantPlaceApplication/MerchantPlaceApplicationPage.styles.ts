import styled, { css } from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(250px, 0.78fr) minmax(0, 1.22fr);
  gap: 24px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`

export const Panel = styled.section`
  min-width: 0;
  padding: 26px 28px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};

  @media (max-width: 640px) {
    padding: 22px 20px;
  }
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

export const HistoryTabs = styled.div`
  flex: 0 0 auto;
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: ${colors.surfaceLow};
`

export const HistoryTab = styled.button<{ $active: boolean }>`
  min-height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: ${({ $active }) => ($active ? colors.surface : 'transparent')};
  box-shadow: ${({ $active }) => ($active ? '0 1px 3px rgba(28, 28, 35, 0.1)' : 'none')};
  color: ${({ $active }) => ($active ? colors.text : colors.muted)};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) { color: ${colors.primary}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const ApplicationList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${colors.borderSoft};
`

export const ApplicationItem = styled.button<{ $selected: boolean }>`
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  display: block;
  padding: 16px 12px;
  border: 0;
  border-bottom: 1px solid ${colors.borderSoft};
  border-left: 3px solid transparent;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;

  ${({ $selected }) => $selected && css`
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
  border: 0;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;

  ${({ $tone }) => $tone === 'active'
    ? css`background: ${colors.successTint}; color: ${colors.successText};`
    : $tone === 'pending'
      ? css`background: ${colors.warningTint}; color: ${colors.warningText};`
      : $tone === 'danger'
        ? css`background: ${colors.primaryTint}; color: ${colors.primary};`
        : $tone === 'draft'
          ? css`background: #f5f1ff; color: #7150af;`
          : css`background: ${colors.surfaceLow}; color: ${colors.muted};`}
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

export const SearchWrap = styled.div`
  position: relative;
`

export const SearchResults = styled.div`
  position: absolute;
  z-index: 3;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  box-shadow: 0 12px 26px rgba(28, 28, 35, 0.12);
`

export const SearchResult = styled.button`
  width: 100%;
  display: block;
  padding: 12px 14px;
  border: 0;
  border-bottom: 1px solid ${colors.borderSoft};
  background: ${colors.surface};
  color: inherit;
  text-align: left;
  cursor: pointer;

  &:last-child { border-bottom: 0; }
  &:hover { background: ${colors.primaryTint}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: -2px; }

  strong { display: block; color: ${colors.text}; font-size: 13px; font-weight: 700; }
  span { display: block; margin-top: 4px; overflow: hidden; color: ${colors.muted}; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
`

export const SearchHint = styled.p`
  margin: 7px 0 0;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.45;
`

export const SelectedPlace = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 12px;
  padding: 13px 14px;
  border: 0;
  border-radius: 6px;
  background: ${colors.primaryTint};

  > span { color: ${colors.primary}; font-family: 'Material Symbols Outlined'; font-size: 19px; }
  strong { display: block; color: ${colors.text}; font-size: 14px; }
  p { margin: 4px 0 0; color: ${colors.muted}; font-size: 12px; line-height: 1.45; }
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

export const FormActions = styled.div`
  grid-column: 1 / -1;
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

export const AttachmentNotice = styled.div`
  grid-column: 1 / -1;
  padding: 16px;
  border: 1px solid ${colors.borderSoft};
  border-radius: 6px;
  background: ${colors.surfaceLow};
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.5;
`

export const AttachmentHeading = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;

  > span {
    flex: 0 0 auto;
    color: ${colors.primary};
    font-family: 'Material Symbols Outlined';
    font-size: 20px;
    line-height: 1;
  }

  strong {
    display: block;
    color: ${colors.text};
    font-size: 14px;
  }

  p {
    margin: 4px 0 0;
  }
`

export const AttachmentPending = styled.p`
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 5px;
  background: ${colors.surface};
  color: ${colors.muted};
`

export const AttachmentUploader = styled.div`
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 8px;
  margin-top: 14px;

  @media (max-width: 400px) {
    grid-template-columns: minmax(0, 1fr) auto;

    > :first-child { grid-column: 1 / -1; }
  }
`

export const FilePicker = styled.label<{ $hasFile: boolean; $disabled: boolean }>`
  position: relative;
  min-width: 0;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 11px;
  border: 1px dashed ${({ $hasFile }) => ($hasFile ? colors.primary : colors.border)};
  border-radius: 6px;
  background: ${({ $hasFile }) => ($hasFile ? colors.primaryTint : colors.surface)};
  color: ${colors.text};
  cursor: ${({ $disabled }) => ($disabled ? 'wait' : 'pointer')};

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }

  > span {
    flex: 0 0 auto;
    color: ${colors.primary};
    font-family: 'Material Symbols Outlined';
    font-size: 19px;
  }

  div { min-width: 0; }
  strong, small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  strong { color: ${colors.text}; font-size: 12px; }
  small { margin-top: 1px; color: ${colors.muted}; font-size: 11px; }

  &:hover { border-color: ${colors.primary}; background: ${colors.primaryTint}; }
  &:focus-within { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const AttachmentList = styled.ul`
  display: grid;
  gap: 8px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid ${colors.borderSoft};
    border-radius: 6px;
    background: ${colors.surface};

    @media (max-width: 640px) {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`

export const AttachmentFileInfo = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;

  > span {
    flex: 0 0 auto;
    color: ${colors.primary};
    font-family: 'Material Symbols Outlined';
    font-size: 19px;
  }

  div { min-width: 0; }
  strong, small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  strong { color: ${colors.text}; font-size: 12px; }
  small { margin-top: 2px; color: ${colors.muted}; font-size: 11px; }
`

export const AttachmentActions = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;

  ${SecondaryButton} { min-height: 32px; padding: 0 9px; font-size: 12px; }

  @media (max-width: 640px) { justify-content: flex-start; }
`

export const AttachmentEmpty = styled.p`
  margin: 14px 0 0;
  padding: 11px 12px;
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.muted};
`
