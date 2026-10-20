import styled from 'styled-components'
import { typography, adminColors } from '../../styles/theme'
import * as Shared from '../../components/merchant/MerchantWorkspace.styles'

const colors = adminColors

export const SortList = styled.div`
  max-height: 65vh; overflow-y: auto; overscroll-behavior: contain;
`
export const SortRow = styled.div<{ $moving: boolean }>`
  display: flex; min-width: 0; margin: 6px 0;
  border: 2px solid ${({ $moving }) => $moving ? colors.primary : 'transparent'};
  border-radius: 8px; background: ${colors.surface};
  box-shadow: ${({ $moving }) => $moving ? `0 4px 12px ${colors.primaryTint}` : 'none'};
`
export const DragHandle = styled.button`
  flex: 0 0 44px; min-height: 44px; border: 0; background: transparent; color: ${colors.primary};
  font-size: 24px; cursor: grab; touch-action: none; border-radius: 6px;
  &:active { cursor: grabbing; }
  &:disabled { color: ${colors.softText}; cursor: default; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: -2px; }
`
export const MenuSelect = styled(Shared.CampaignItem)`
  flex: 1; min-width: 0; margin: 0;
`
export const SortNotice = styled.p`
  min-height: 18px; margin: 6px 16px; color: ${colors.muted}; font-size: 12px; line-height: 1.5;
`
export const SortHint = styled(Shared.PanelDescription)`margin: 8px 16px 0;`

export const ImagePreview = styled.figure`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: ${colors.surfaceLow};

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }
`

export const Image = styled.img`
  width: 148px;
  height: 104px;
  display: block;
  border: 0;
  border-radius: 6px;
  background: ${colors.surface};
  object-fit: cover;

  @media (max-width: 460px) {
    width: 100%;
    height: 160px;
  }
`

export const ImagePreviewText = styled.figcaption`
  min-width: 0;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.5;

  strong {
    display: block;
    margin-bottom: 4px;
    color: ${colors.text};
    font-size: ${typography.label.regular.fontSize}px;
  }
`
