import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export {
  ActionButton,
  CampaignItem,
  CampaignList,
  CampaignMeta,
  CampaignTitle,
  CampaignTop,
  CreateButton,
  Editor,
  Empty,
  Field,
  FieldHint,
  FilterBar,
  FilterButton,
  Form,
  FormActions,
  FormError,
  HeaderActions,
  HeaderButton,
  Input,
  ListLoading,
  Panel,
  PanelDescription,
  PanelHeader,
  PanelTitle,
  ReadonlyNotice,
  ResultMeta,
  Select,
  StatusBadge,
  Textarea,
  Workspace,
} from '../../components/merchant/MerchantWorkspace.styles'

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

  &:hover:not(:disabled) { border-color: ${colors.primary}; color: ${colors.primaryForeground}; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

export const PageText = styled.span`
  min-width: 42px;
  color: ${colors.muted};
  font-size: 12px;
  font-weight: 700;
  text-align: center;
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
  color: ${colors.primaryForeground};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  &:hover:not(:disabled) { border-color: ${colors.primary}; background: ${colors.primaryTint}; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
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
