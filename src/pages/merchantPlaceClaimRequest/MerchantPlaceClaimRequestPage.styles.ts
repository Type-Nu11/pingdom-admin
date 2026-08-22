import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const Workspace = styled.div`
  display: grid;
  grid-template-columns: minmax(320px, 0.85fr) minmax(460px, 1.15fr);
  gap: 24px;

  @media (max-width: 980px) { grid-template-columns: 1fr; }
`

export const ClaimItem = styled.button<{ $selected: boolean }>`
  width: 100%;
  padding: 15px 16px;
  border: 1px solid ${({ $selected }) => ($selected ? colors.primary : colors.borderSoft)};
  border-radius: 7px;
  background: ${({ $selected }) => ($selected ? colors.primaryTint : colors.surface)};
  color: ${colors.text};
  text-align: left;
  cursor: pointer;

  &:hover { border-color: ${colors.primary}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  & + & { margin-top: 8px; }
`

export const ClaimTitle = styled.strong`
  display: block;
  color: ${colors.strongText};
  font-size: 14px;
`

export const ClaimMeta = styled.span`
  display: block;
  margin-top: 5px;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.45;
`

export const SearchWrap = styled.div`
  position: relative;
`

export const SearchResults = styled.div`
  position: absolute;
  z-index: 4;
  top: calc(100% + 5px);
  right: 0;
  left: 0;
  overflow: auto;
  max-height: 230px;
  border: 1px solid ${colors.border};
  border-radius: 7px;
  background: ${colors.surface};
  box-shadow: 0 10px 24px rgba(35, 31, 32, 0.12);
`

export const SearchResult = styled.button`
  width: 100%;
  padding: 11px 12px;
  border: 0;
  border-bottom: 1px solid ${colors.borderSoft};
  background: ${colors.surface};
  color: ${colors.text};
  text-align: left;
  cursor: pointer;

  &:last-child { border-bottom: 0; }
  &:hover:not(:disabled) { background: ${colors.primaryTint}; }
  strong, span { display: block; }
  strong { font-size: 13px; }
  span { margin-top: 3px; color: ${colors.muted}; font-size: 12px; }
`

export const FieldHint = styled.p`
  margin: 6px 0 0;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.45;
`

export const SelectedPlace = styled.div`
  margin-top: 9px;
  padding: 10px 12px;
  border: 1px solid ${colors.primaryTint};
  border-radius: 7px;
  background: ${colors.primaryTint};
  color: ${colors.text};
  font-size: 13px;

  strong, span { display: block; }
  span { margin-top: 3px; color: ${colors.muted}; font-size: 12px; }
`

export const DetailSection = styled.section`
  padding: 18px 0;
  border-top: 1px solid ${colors.borderSoft};
`

export const SectionTitle = styled.h3`
  margin: 0 0 5px;
  color: ${colors.strongText};
  font-size: 15px;
`

export const AttachmentList = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 14px;
`

export const AttachmentRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 11px 12px;
  border: 1px solid ${colors.borderSoft};
  border-radius: 7px;
  background: ${colors.surfaceLow};

  strong, span { display: block; }
  strong { color: ${colors.text}; font-size: 13px; }
  span { margin-top: 3px; color: ${colors.muted}; font-size: 12px; }
`

export const AttachmentActions = styled.div`
  display: flex;
  gap: 6px;
`

export const IconButton = styled.button`
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.text};
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  cursor: pointer;

  &:hover:not(:disabled) { border-color: ${colors.primary}; color: ${colors.primary}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

export const UploadRow = styled.div`
  display: flex;
  align-items: end;
  gap: 8px;
  margin-top: 14px;

  @media (max-width: 620px) { align-items: stretch; flex-direction: column; }
`

export const FileInput = styled.input`
  min-width: 0;
  flex: 1;
  color: ${colors.muted};
  font: inherit;
  font-size: 12px;
`

export const DetailMeta = styled.dl`
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 9px 12px;
  margin: 16px 0 0;
  font-size: 13px;

  dt { color: ${colors.muted}; }
  dd { min-width: 0; margin: 0; color: ${colors.text}; overflow-wrap: anywhere; }
`
