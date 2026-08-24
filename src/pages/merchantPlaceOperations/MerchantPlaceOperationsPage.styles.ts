import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const HeaderActions = styled.div`
  display: flex;
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

  &:hover:not(:disabled) { border-color: ${colors.primary}; color: ${colors.primary}; background: ${colors.primaryTint}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`

export const StateSummary = styled.div<{ $operating: boolean | null }>`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 13px 16px;
  border: 1px solid ${({ $operating }) => ($operating === false ? colors.warningTint : colors.primaryTint)};
  border-radius: 8px;
  background: ${({ $operating }) => ($operating === false ? colors.warningTint : colors.primaryTint)};
  color: ${colors.text};
  font-size: 13px;
  line-height: 1.5;

  strong { color: ${({ $operating }) => ($operating === false ? colors.warningText : colors.primary)}; }
`

export const StateIcon = styled.span`
  color: ${colors.primary};
  font-family: 'Material Symbols Outlined';
  font-size: 20px;
`

export const Workspace = styled.div`
  display: grid;
  grid-template-columns: minmax(370px, 0.9fr) minmax(440px, 1.1fr);
  gap: 24px;

  @media (max-width: 980px) { grid-template-columns: 1fr; }
`

export const Column = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
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

export const PanelBody = styled.div`
  padding: 22px 24px 24px;
`

export const StatusOptions = styled.div`
  display: grid;
  gap: 8px;
`

export const StatusOption = styled.label<{ $selected: boolean; $danger?: boolean }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  padding: 13px 14px;
  border: 1px solid ${({ $selected, $danger }) => ($selected ? ($danger ? colors.error : colors.primary) : colors.border)};
  border-radius: 7px;
  background: ${({ $selected, $danger }) => ($selected ? ($danger ? colors.errorTint : colors.primaryTint) : colors.surface)};
  cursor: pointer;

  input { width: 16px; height: 16px; margin: 2px 0 0; accent-color: ${({ $danger }) => ($danger ? colors.error : colors.primary)}; }
  strong { display: block; color: ${({ $danger, $selected }) => ($selected && $danger ? colors.error : colors.text)}; font-size: 13px; }
  small { display: block; margin-top: 3px; color: ${colors.muted}; font-size: 12px; line-height: 1.45; }
`

export const DangerNotice = styled.p`
  margin: 14px 0 0;
  padding: 11px 12px;
  border: 1px solid ${colors.errorTint};
  border-radius: 6px;
  background: ${colors.errorTint};
  color: ${colors.error};
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
`

export const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
`

export const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' }>`
  min-width: 100px;
  height: 42px;
  padding: 0 14px;
  border: 1px solid ${({ $variant }) => ($variant === 'primary' ? colors.primary : $variant === 'danger' ? colors.error : colors.border)};
  border-radius: 6px;
  background: ${({ $variant }) => ($variant === 'primary' ? colors.primary : $variant === 'danger' ? colors.error : colors.surface)};
  color: ${({ $variant }) => ($variant === 'primary' || $variant === 'danger' ? colors.primaryText : colors.text)};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) { filter: brightness(0.96); }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`

export const FormError = styled.p`
  margin: 14px 0 0;
  color: ${colors.error};
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
`

export const ScheduleSection = styled.section`
  padding: 14px;
  border: 1px solid ${colors.borderSoft};
  border-radius: 8px;
  background: ${colors.surfaceLow};

  & + & { margin-top: 14px; }
`

export const ScheduleSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  strong { color: ${colors.strongText}; font-size: 13px; }
  span { color: ${colors.muted}; font-size: 11px; }
`

export const WeekList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const WeekRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid ${colors.border};
  border-radius: 7px;
  background: ${colors.surface};

  > div:last-child { min-width: 0; flex: 1; }
  @media (max-width: 620px) { flex-direction: column; }
`

export const CheckLabel = styled.label`
  width: 122px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: ${colors.text};
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  input { width: 16px; height: 16px; margin: 0; accent-color: ${colors.primary}; }
  @media (max-width: 620px) { width: auto; }
`

export const HourList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

export const HourRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

export const TimeControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: ${colors.muted};
  font-size: 12px;
  font-weight: 800;
`

export const IconButton = styled.button.attrs<{ $danger?: boolean }>((props) => {
  const isMediaOrderControl = props['aria-label'] === '이전 순서로 이동'
    || props['aria-label'] === '다음 순서로 이동'

  return isMediaOrderControl
    ? {
      disabled: true,
      title: '원자적 미디어 재정렬 API가 제공된 뒤 순서를 변경할 수 있습니다.',
    }
    : {}
})<{ $danger?: boolean }>`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.muted};
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  cursor: pointer;

  &:hover:not(:disabled) { border-color: ${({ $danger }) => ($danger ? colors.error : colors.primary)}; background: ${({ $danger }) => ($danger ? colors.errorTint : colors.primaryTint)}; color: ${({ $danger }) => ($danger ? colors.error : colors.primary)}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

export const TextButton = styled.button`
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:hover:not(:disabled) { text-decoration: underline; text-underline-offset: 3px; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; border-radius: 4px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

export const ExceptionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const ExceptionEditor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid ${colors.border};
  border-radius: 7px;
  background: ${colors.surface};
`

export const ExceptionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  > div:first-child { width: 160px; }
`

export const Empty = styled.p`
  margin: 0;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.55;
`

export const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 540px) { grid-template-columns: 1fr; }
`

export const MediaItem = styled.article<{ $representative: boolean }>`
  overflow: hidden;
  border: 1px solid ${({ $representative }) => ($representative ? colors.primary : colors.border)};
  border-radius: 7px;
  background: ${colors.surface};
`

export const MediaImage = styled.img`
  width: 100%;
  aspect-ratio: 4 / 3;
  display: block;
  object-fit: cover;
  background: ${colors.surfaceLow};
`

export const MediaBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 11px;
`

export const MediaMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: ${colors.muted};
  font-size: 11px;
`

export const RepresentativeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 11px;
  background: ${colors.primaryTint};
  color: ${colors.primary};
  font-size: 11px;
  font-weight: 800;
`

export const MediaActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`

export const MediaOrderActions = styled.div`
  display: flex;
  gap: 5px;
`

export const UploadArea = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  border: 1px dashed ${colors.primarySoft};
  border-radius: 7px;
  background: ${colors.primaryTint};

  span { color: ${colors.muted}; font-size: 12px; line-height: 1.45; }
`

export const UploadButton = styled.button`
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0 11px;
  border: 1px solid ${colors.primary};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.primary};
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:hover { background: ${colors.primary}; color: ${colors.primaryText}; }
  &:disabled { cursor: not-allowed; opacity: 0.56; }
`


export const ModalOverlay = styled.div`
  position: fixed;
  z-index: 160;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(30, 31, 35, 0.44);
`

export const Modal = styled.section`
  width: min(440px, 100%);
  overflow: hidden;
  border-radius: 8px;
  background: ${colors.surface};
  box-shadow: 0 24px 56px ${colors.shadow};
`

export const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid ${colors.borderSoft};
`

export const ModalTitle = styled.h2`
  margin: 0;
  color: ${colors.strongText};
  font-size: 18px;
`

export const ModalBody = styled.div`
  padding: 20px 22px 22px;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.6;
`

export const CloseButton = styled(IconButton)`
  border: 0;
`
