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
    padding: 24px 16px;
  }
`

export const PageStack = styled.div`
  width: min(1280px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

export const PageHeader = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;

  > div:first-child {
    min-width: 0;
    flex: 1 1 420px;
  }

  @media (max-width: 720px) {
    flex-direction: column;
  }
`

export const Eyebrow = styled.p`
  margin: 0 0 6px;
  color: ${neutral.primary};
  font-size: 12px;
  font-weight: 700;
`

export const PageTitle = styled.h1`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
`

export const PageDescription = styled.p`
  max-width: 760px;
  margin: 10px 0 0;
  color: ${neutral.muted};
  font-size: 14px;
  line-height: 1.3;
`

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
  max-width: 100%;
  padding-bottom: 1px;

  @media (max-width: 720px) {
    width: 100%;
    justify-content: flex-start;
  }
`

export const HeaderButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${neutral.primarySoft};
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`

export const Notice = styled.p<{ $variant?: 'error' | 'success' }>`
  margin: 0;
  padding: 12px 14px;
  border: 0;
  border-radius: 8px;
  background: ${({ $variant }) =>
    $variant === 'success' ? neutral.successTint : neutral.errorTint};
  color: ${({ $variant }) =>
    $variant === 'success' ? neutral.successText : neutral.error};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
`

export const Workspace = styled.div`
  min-height: 360px;
  display: grid;
  grid-template-columns: minmax(340px, 0.95fr) minmax(0, 1.35fr);
  gap: 16px;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`

export const Panel = styled.section`
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
`

export const PanelHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 12px 16px;
  border-bottom: 1px solid ${neutral.border};
`

export const PanelTitle = styled.h2`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 16px;
  font-weight: 700;
`

export const PanelDescription = styled.p`
  margin: 4px 0 0;
  color: ${neutral.muted};
  font-size: 12px;
  line-height: 1.3;
`

export const PanelCount = styled.span`
  flex-shrink: 0;
  color: ${neutral.primary};
  font-size: 14px;
  font-weight: 700;
`

export const ScrollArea = styled.div`
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
`

export const GroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const GroupButton = styled.button<{ $selected?: boolean }>`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 13px;
  border: 1px solid
    ${({ $selected }) => ($selected ? 'transparent' : neutral.border)};
  border-radius: 8px;
  background: ${({ $selected }) =>
    $selected ? neutral.primaryTint : neutral.surface};
  color: ${neutral.text};
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;

  &:hover {
    border-color: transparent;
    background: ${neutral.primaryTint};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }

  ${({ $selected }) =>
    $selected &&
    css`
      box-shadow: 0 0 0 3px ${neutral.primaryTint};
    `}
`

export const GroupTopLine = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

export const GroupLabel = styled.strong`
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 700;
`

export const GroupCount = styled.span`
  color: ${neutral.primary};
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
`

export const GroupReasons = styled.span`
  overflow: hidden;
  color: ${neutral.muted};
  font-size: 12px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const CompareBody = styled.div`
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`

export const DetailNotice = styled.div`
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.warningTint};
  color: ${neutral.warningText};
  font-size: 12px;
  line-height: 1.3;

  strong {
    display: block;
    margin-bottom: 2px;
    font-weight: 700;
  }
`

export const ComparisonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

export const PlaceCard = styled.article<{ $variant: 'target' | 'source' }>`
  min-width: 0;
  padding: 14px;
  border: 0;
  border-radius: 8px;
  background: ${({ $variant }) =>
    $variant === 'target' ? neutral.primaryTint : neutral.surfaceLow};
`

export const PlaceCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
`

export const PlaceCardLabel = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 700;
`

export const PlaceCardTitle = styled.h3`
  overflow: hidden;
  margin: 4px 0 0;
  color: ${neutral.strongText};
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const StatusTag = styled.span<{ $variant?: 'target' | 'source' | 'warning' }>`
  flex-shrink: 0;
  padding: 4px 7px;
  border: 1px solid
    ${({ $variant }) =>
      $variant === 'target'
        ? neutral.primarySoft
        : $variant === 'warning'
          ? 'transparent'
          : neutral.borderDark};
  border-radius: ${radius.pill};
  background: ${({ $variant }) =>
    $variant === 'target'
      ? neutral.surface
      : $variant === 'warning'
        ? neutral.warningTint
        : neutral.surface};
  color: ${({ $variant }) =>
    $variant === 'target'
      ? neutral.primary
      : $variant === 'warning'
        ? neutral.warningText
        : neutral.muted};
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
`

export const MetaList = styled.dl`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
`

export const MetaRow = styled.div`
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 8px;
  align-items: start;

  dt {
    color: ${neutral.softText};
    font-size: 12px;
    font-weight: 700;
  }

  dd {
    overflow: hidden;
    margin: 0;
    color: ${neutral.text};
    font-size: 12px;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const CandidateSection = styled.section`
  margin-top: 18px;
`

export const SectionTitle = styled.h3`
  margin: 0 0 9px;
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 700;
`

export const CandidateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const CandidateButton = styled.button<{ $selected?: boolean }>`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 11px 12px;
  border: 1px solid
    ${({ $selected }) => ($selected ? neutral.primary : neutral.border)};
  border-radius: 8px;
  background: ${({ $selected }) =>
    $selected ? neutral.primaryTint : neutral.surface};
  color: ${neutral.text};
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: ${neutral.primarySoft};
    background: ${neutral.primaryTint};
  }
`

export const CandidateName = styled.span`
  display: block;
  overflow: hidden;
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const CandidateMeta = styled.span`
  display: block;
  overflow: hidden;
  margin-top: 3px;
  color: ${neutral.muted};
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const CandidateDistance = styled.span`
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
`

export const ActionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid ${neutral.border};

  @media (max-width: 620px) {
    align-items: stretch;
    flex-direction: column;
  }
`

export const ActionHint = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 12px;
  line-height: 1.3;
`

export const PrimaryButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 0 16px;
  border: 1px solid ${neutral.primary};
  border-radius: ${radius.pill};
  background: ${neutral.primary};
  color: ${neutral.primaryText};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${neutral.primaryHover};
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`

export const SecondaryButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border: 1px solid ${neutral.border};
  border-radius: ${radius.pill};
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${neutral.primarySoft};
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`

export const EmptyState = styled.div`
  display: flex;
  min-height: 128px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  padding: 24px;
  color: ${neutral.muted};
  text-align: center;

  strong {
    color: ${neutral.strongText};
    font-size: 14px;
  }

  p {
    margin: 0;
    font-size: 12px;
    line-height: 1.3;
  }
`

export const EmptyStateCard = styled(EmptyState)`
  min-height: 220px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
`

export const EmptyStateActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`

export const SelectionPrompt = styled(EmptyStateCard)`
  min-height: 280px;
`

export const HistoryPanel = styled.section`
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
`

export const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 16px 16px;
`

export const HistoryItem = styled.article`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 14px 0;
  border-top: 1px solid ${neutral.borderSoft};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

export const HistoryTitle = styled.strong`
  display: block;
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 700;
`

export const HistoryMeta = styled.p`
  margin: 5px 0 0;
  color: ${neutral.muted};
  font-size: 12px;
  line-height: 1.3;
`

export const HistoryActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: ${neutral.overlay};
  backdrop-filter: blur(3px);
`

export const Modal = styled.section`
  width: min(540px, 100%);
  max-height: min(760px, 92vh);
  display: flex;
  overflow: hidden;
  flex-direction: column;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  box-shadow: 0 24px 70px ${neutral.strongShadow};
`

export const ModalHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid ${neutral.border};
`

export const ModalTitle = styled.h2`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 18px;
  font-weight: 700;
`

export const ModalCloseButton = styled.button`
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 0;
  border-radius: ${radius.pill};
  background: transparent;
  color: ${neutral.muted};
  cursor: pointer;

  &:hover {
    background: ${neutral.surfaceLow};
    color: ${neutral.primary};
  }
`

export const ModalBody = styled.div`
  overflow-y: auto;
  padding: 18px;
`

export const ModalWarning = styled.div`
  display: flex;
  gap: 10px;
  padding: 13px;
  border: 1px solid ${neutral.warning};
  border-radius: 8px;
  background: ${neutral.warningTint};
  color: ${neutral.warningText};
  font-size: 12px;
  line-height: 1.3;
`

export const ModalSummary = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0 0;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

export const ModalSummaryItem = styled.div`
  min-width: 0;
  padding: 12px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
  background: ${neutral.surfaceLow};

  dt {
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 700;
  }

  dd {
    overflow: hidden;
    margin: 4px 0 0;
    color: ${neutral.strongText};
    font-size: 14px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const ModalFooter = styled.footer`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid ${neutral.border};
  background: ${neutral.surfaceLow};
`
