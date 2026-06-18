import styled, { css, keyframes } from 'styled-components'
import { adminColors } from '../../styles/theme'

const neutral = adminColors
const loadingShimmer = keyframes`
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
`

const controlStyle = css`
  min-height: 44px;
  border-radius: 8px;
  font-family: inherit;
`

export const AppShell = styled.div`
  min-height: 100vh;
  background: ${neutral.background};
  color: ${neutral.text};
  font-family:
    'Hanken Grotesk',
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
`

export const MaterialIcon = styled.span`
  width: 1em;
  height: 1em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  font-family: 'Material Symbols Outlined';
  font-size: 20px;
  line-height: 1;
  font-weight: 400;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 20;
`

export const SideNav = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 50;
  width: 280px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${neutral.border};
  background: ${neutral.surface};

  @media (max-width: 900px) {
    position: static;
    width: 100%;
    height: auto;
    border-right: 0;
    border-bottom: 1px solid ${neutral.border};
  }
`

export const SideHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 34px 28px;
  border-bottom: 1px solid ${neutral.border};
`

export const ProfileAvatar = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid ${neutral.primarySoft};
  border-radius: 999px;
  background: ${neutral.primaryTint};
  color: ${neutral.primary};
`

export const SideTitle = styled.h1`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
`

export const SideCaption = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 12px;
  line-height: 1.3;
`

export const SideMenu = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 18px 0;

  @media (max-width: 900px) {
    flex: 0 1 auto;
    flex-direction: row;
    overflow-x: auto;
    padding: 8px;
  }
`

export const MenuButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 48px;
  padding: 0 28px;
  border: 0;
  border-right: 2px solid transparent;
  background: transparent;
  color: ${neutral.muted};
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease,
    border-color 160ms ease;

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  ${({ $active }) =>
    $active &&
    css`
      border-right-color: ${neutral.primary};
      background: ${neutral.primaryTint};
      color: ${neutral.primary};
      font-weight: 700;

      ${MaterialIcon} {
        font-variation-settings:
          'FILL' 1,
          'wght' 400,
          'GRAD' 0,
          'opsz' 20;
      }
    `}

  @media (max-width: 900px) {
    width: auto;
    flex-shrink: 0;
    border-right: 0;
    border-bottom: 2px solid transparent;
    border-radius: 8px;

    ${({ $active }) =>
      $active &&
      css`
        border-bottom-color: ${neutral.primary};
      `}
  }
`

export const SideFooter = styled.div`
  padding: 18px 28px 28px;
  border-top: 1px solid ${neutral.border};

  @media (max-width: 900px) {
    padding: 8px;
    border-top: 1px solid ${neutral.border};
  }
`

export const LogoutButton = styled.button`
  width: 100%;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 0 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease;

  &:hover {
    border-color: ${neutral.primary};
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  @media (max-width: 900px) {
    width: auto;
    padding: 0 14px;
  }
`

export const MainArea = styled.div`
  min-height: 100vh;
  margin-left: 280px;

  @media (max-width: 900px) {
    margin-left: 0;
  }
`

export const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 40;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 0 32px;
  border-bottom: 1px solid ${neutral.border};
  background: ${neutral.surface};

  @media (max-width: 720px) {
    height: auto;
    align-items: flex-start;
    flex-direction: column;
    padding: 16px 24px;
  }
`

export const TopTitle = styled.h2`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 18px;
  font-weight: 700;
`

export const TopActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 720px) {
    width: 100%;
  }
`

export const SearchBox = styled.div`
  position: relative;
  width: 256px;

  @media (max-width: 720px) {
    width: 100%;
  }
`

export const SearchIcon = styled(MaterialIcon)`
  position: absolute;
  top: 50%;
  left: 12px;
  color: ${neutral.muted};
  transform: translateY(-50%);
  pointer-events: none;
`

export const SearchInput = styled.input`
  ${controlStyle}
  width: 100%;
  padding: 0 16px 0 40px;
  border: 0;
  border-radius: 8px;
  outline: 1px solid transparent;
  background: ${neutral.surfaceContainer};
  color: ${neutral.text};

  &:focus {
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
    background: ${neutral.surface};
  }
`

export const IconButton = styled.button`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: ${neutral.muted};
  cursor: pointer;

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }
`

export const PageContent = styled.main`
  min-height: calc(100vh - 64px);
  padding: 32px;
`

export const PageHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;

  @media (max-width: 720px) {
    align-items: flex-start;
    flex-direction: column;
  }
`

export const PageTitle = styled.h1`
  margin: 0 0 8px;
  color: ${neutral.strongText};
  font-size: 28px;
  font-weight: 700;
  line-height: 1.3;
`

export const PageDescription = styled.p`
  min-height: 24px;
  margin: 0;
  color: ${neutral.muted};
  font-size: 16px;
  line-height: 1.5;
`

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const OutlineButton = styled.button`
  ${controlStyle}
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  border: 1px solid ${neutral.border};
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    border-color: ${neutral.primary};
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }
`

export const PrimaryButton = styled.button`
  ${controlStyle}
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  border: 1px solid ${neutral.primary};
  background: ${neutral.primary};
  color: ${neutral.primaryText};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease;

  &:hover:not(:disabled) {
    border-color: ${neutral.primaryHover};
    background: ${neutral.primaryHover};
  }

  &:disabled {
    cursor: default;
    opacity: 0.72;
  }
`

export const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
`

export const FilterLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 500;

  ${MaterialIcon} {
    color: ${neutral.primary};
  }
`

export const Select = styled.select`
  ${controlStyle}
  min-width: 140px;
  padding: 0 12px;
  border: 0;
  outline: 1px solid transparent;
  background: ${neutral.surfaceContainer};
  color: ${neutral.text};

  &:focus {
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }
`

export const DateInput = styled.input`
  ${controlStyle}
  width: 180px;
  padding: 0 14px;
  border: 0;
  outline: 1px solid transparent;
  background: ${neutral.surfaceContainer};
  color: ${neutral.text};

  &:focus {
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }
`

export const ClearButton = styled.button`
  margin-left: auto;
  border: 0;
  background: transparent;
  color: ${neutral.muted};
  font-size: 14px;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;

  &:hover {
    color: ${neutral.primary};
  }
`

export const ReviewToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding: 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};

  @media (max-width: 860px) {
    align-items: stretch;
    flex-direction: column;
  }
`

export const ReviewTabList = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
`

export const ReviewTabButton = styled.button<{ $active?: boolean }>`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 0 12px;
  border: 1px solid ${({ $active }) => ($active ? neutral.primary : neutral.border)};
  border-radius: 8px;
  background: ${({ $active }) => ($active ? neutral.primaryTint : neutral.surface)};
  color: ${({ $active }) => ($active ? neutral.primary : neutral.text)};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease;

  strong {
    min-width: 24px;
    padding: 2px 6px;
    border-radius: 999px;
    background: ${({ $active }) =>
      $active ? neutral.primary : neutral.surfaceContainer};
    color: ${({ $active }) => ($active ? neutral.primaryText : neutral.muted)};
    font-size: 12px;
    line-height: 1.4;
    text-align: center;
  }

  &:hover {
    border-color: ${neutral.primary};
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }
`

export const ReviewSearchField = styled.div`
  position: relative;
  width: min(320px, 100%);
  flex-shrink: 0;

  @media (max-width: 860px) {
    width: 100%;
  }
`

export const ReviewSearchInput = styled.input`
  ${controlStyle}
  width: 100%;
  padding: 0 16px 0 40px;
  border: 1px solid ${neutral.border};
  outline: 1px solid transparent;
  background: ${neutral.surfaceContainer};
  color: ${neutral.text};
  font-size: 14px;

  &::placeholder {
    color: ${neutral.placeholder};
  }

  &:focus {
    border-color: ${neutral.primary};
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
    background: ${neutral.surface};
  }
`

export const ReviewResultSummary = styled.div`
  margin: -12px 0 24px;
  color: ${neutral.muted};
  font-size: 13px;
  font-weight: 700;
`

export const FeedbackText = styled.p`
  margin: 0 0 24px;
  padding: 16px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.muted};
`

export const MediaGrid = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
  margin: 0 0 48px;
  padding: 0;
  list-style: none;
`

export const MediaCard = styled.li`
  display: flex;
  min-width: 0;
  overflow: hidden;
  flex-direction: column;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: ${neutral.primary};
    box-shadow: 0 10px 24px ${neutral.shadow};
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 3px;
  }
`

export const MediaPreview = styled.div`
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background: ${neutral.surfaceLow};
`

export const MediaImage = styled.img<{ $isLoaded?: boolean }>`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: ${({ $isLoaded }) => ($isLoaded ? 1 : 0)};
  transition:
    opacity 160ms ease,
    transform 500ms ease;

  ${MediaCard}:hover & {
    transform: scale(1.05);
  }
`

export const MediaLoading = styled.div`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(
      90deg,
      ${neutral.surfaceContainer} 0%,
      ${neutral.surfaceLow} 42%,
      ${neutral.surfaceContainer} 72%
    );
  background-size: 220% 100%;
  color: ${neutral.muted};
  font-size: 13px;
  font-weight: 600;
  animation: ${loadingShimmer} 1.2s ease-in-out infinite;
`

export const MediaFallback = styled.div`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${neutral.muted};
`

export const MediaBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 16px;
`

export const MediaTitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
`

export const MediaTitle = styled.h3`
  min-width: 0;
  overflow: hidden;
  margin: 0;
  color: ${neutral.strongText};
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const StatusBadge = styled.span<{
  $tone?: 'normal' | 'reported'
}>`
  flex-shrink: 0;
  padding: 4px 8px;
  border: 1px solid ${neutral.primarySoft};
  border-radius: 4px;
  background: ${neutral.primaryTint};
  color: ${neutral.primary};
  font-size: 12px;
  font-weight: 700;

  ${({ $tone }) =>
    $tone === 'normal' &&
    css`
      border-color: ${neutral.success};
      background: #20df331a;
      color: ${neutral.text};
    `}

  ${({ $tone }) =>
    $tone === 'reported' &&
    css`
      border-color: ${neutral.info};
      background: #008bff14;
      color: ${neutral.info};
    `}

`

export const MediaMetaList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
`

export const MediaMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: ${neutral.muted};
  font-size: 12px;

  span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  ${MaterialIcon} {
    flex-shrink: 0;
    font-size: 16px;
  }
`

export const CardHint = styled.div`
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid ${neutral.borderSoft};
  color: ${neutral.muted};
  font-size: 13px;
  font-weight: 700;

  ${MaterialIcon} {
    flex-shrink: 0;
    font-size: 18px;
    transition: transform 160ms ease;
  }

  ${MediaCard}:hover & {
    color: ${neutral.primary};
  }

  ${MediaCard}:hover & ${MaterialIcon} {
    transform: translateX(2px);
  }
`

export const Pagination = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-top: 32px;
  border-top: 1px solid ${neutral.border};
`

export const PaginationButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 14px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.muted};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease;

  &:hover:not(:disabled) {
    background: ${neutral.surfaceContainer};
    color: ${neutral.primary};
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }

  ${MaterialIcon} {
    font-size: 18px;
  }
`

export const PageNumberList = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

export const PageNumberButton = styled.button<{ $active?: boolean }>`
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $active }) => ($active ? neutral.primary : neutral.border)};
  border-radius: 8px;
  background: ${({ $active }) => ($active ? neutral.primary : neutral.surface)};
  color: ${({ $active }) => ($active ? neutral.primaryText : neutral.text)};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease;

  &:hover:not(:disabled) {
    background: ${({ $active }) =>
      $active ? neutral.primary : neutral.surfaceContainer};
  }

  &:disabled {
    cursor: default;
    opacity: 0.72;
  }
`

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: ${neutral.overlay};

  @media (max-width: 720px) {
    padding: 16px;
  }
`

export const ModalContent = styled.section`
  width: min(1120px, 100%);
  max-height: min(820px, 92vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
`

export const ModalHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid ${neutral.border};
`

export const ModalTitle = styled.h2`
  margin: 0 0 6px;
  color: ${neutral.strongText};
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  word-break: break-word;
`

export const ModalDescription = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 14px;
`

export const ModalCloseButton = styled.button`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.text};
  cursor: pointer;

  &:hover {
    background: ${neutral.surfaceContainer};
  }
`

export const ModalBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`

export const ModalNotice = styled.div`
  margin: 16px 20px 0;
  padding: 12px 14px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surfaceHighest};
  color: ${neutral.muted};
  font-size: 13px;
  font-weight: 600;
`

export const ModalReviewLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 400px);
  gap: 20px;
  padding: 20px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 720px) {
    padding: 16px;
  }
`

export const ModalMediaPanel = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const ModalModerationPanel = styled.aside`
  min-width: 0;
  display: flex;
  flex-direction: column;
`

export const ModalStatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: ${neutral.muted};
  font-size: 13px;
  font-weight: 600;

  > span:last-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const ModalImageFrame = styled.div`
  height: min(56vh, 540px);
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 16px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surfaceContainer};

  @media (max-width: 720px) {
    height: min(58vh, 420px);
    min-height: 260px;
  }
`

export const ModalImage = styled.img`
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`

export const ModalFallback = styled.div`
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${neutral.muted};
`

export const ModalMediaActions = styled.div`
  display: flex;
  justify-content: flex-end;
`

export const ModalExternalLink = styled.a`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    border-color: ${neutral.primary};
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  ${MaterialIcon} {
    font-size: 18px;
  }
`

export const ModalInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

export const ModalInfoItem = styled.div`
  min-width: 0;
  padding: 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};

  span,
  strong {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    margin-bottom: 4px;
    color: ${neutral.muted};
    font-size: 12px;
  }

  strong {
    color: ${neutral.strongText};
    font-size: 14px;
    font-weight: 700;
  }
`

export const ModalPostDescription = styled.p`
  margin: 16px 0 0;
  padding: 14px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surfaceHighest};
  color: ${neutral.text};
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
`

export const ModalSection = styled.section`
  margin-top: 16px;
  padding: 0;
`

export const ModalSectionTitle = styled.h3`
  margin: 0 0 12px;
  color: ${neutral.strongText};
  font-size: 16px;
  font-weight: 700;
`

export const ReportList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
`

export const ReportItem = styled.li`
  padding: 14px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
`

export const ReportHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
`

export const ReportReporter = styled.p`
  margin: 0 0 4px;
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 700;
`

export const ReportMeta = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
`

export const ReportStatusBadge = styled.span<{
  $status: 'PENDING' | 'ACCEPTED' | 'DECLINED'
}>`
  flex-shrink: 0;
  padding: 4px 8px;
  border: 1px solid ${neutral.border};
  border-radius: 4px;
  background: ${neutral.surfaceContainer};
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 700;

  ${({ $status }) =>
    $status === 'PENDING' &&
    css`
      border-color: ${neutral.warning};
      background: #ffcc0024;
      color: ${neutral.text};
    `}

  ${({ $status }) =>
    $status === 'ACCEPTED' &&
    css`
      border-color: ${neutral.success};
      background: #20df331f;
      color: ${neutral.text};
    `}

  ${({ $status }) =>
    $status === 'DECLINED' &&
    css`
      border-color: ${neutral.borderDark};
      background: ${neutral.surfaceHighest};
      color: ${neutral.muted};
    `}
`

export const ReportReason = styled.p`
  margin: 0 0 10px;
  color: ${neutral.text};
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
`

export const ModalFooter = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  border-top: 1px solid ${neutral.border};
  background: ${neutral.surface};

  @media (max-width: 720px) {
    align-items: stretch;
    flex-direction: column;
    padding: 16px;
  }
`

export const ModalFooterMeta = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 13px;
  font-weight: 600;
`

export const ModalFooterActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;

  @media (max-width: 720px) {
    justify-content: stretch;
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
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease;

  &:hover:not(:disabled) {
    border-color: ${neutral.primary};
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }

  ${MaterialIcon} {
    font-size: 18px;
  }
`

export const DangerButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border: 1px solid ${neutral.error};
  border-radius: 8px;
  background: ${neutral.error};
  color: ${neutral.primaryText};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    opacity 160ms ease;

  &:hover:not(:disabled) {
    border-color: #c72020;
    background: #c72020;
  }

  &:disabled {
    cursor: default;
    opacity: 0.58;
  }

  ${MaterialIcon} {
    font-size: 18px;
  }
`

export const ModalEmptyText = styled.p`
  margin: 0;
  padding: 16px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surfaceHighest};
  color: ${neutral.muted};
  font-size: 14px;
`
