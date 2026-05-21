import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

const neutral = {
  background: '#f9f9f9',
  surface: '#ffffff',
  surfaceLow: '#f3f3f3',
  surfaceContainer: '#eeeeee',
  surfaceHigh: '#e8e8e8',
  surfaceHighest: '#e2e2e2',
  border: '#c4c7c7',
  borderDark: '#747878',
  text: '#1a1c1c',
  muted: '#444748',
  softText: '#636465',
  primary: '#000000',
  primaryText: '#ffffff',
}

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
  width: 256px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${neutral.border};
  background: ${neutral.background};

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
  padding: 32px 24px;
  border-bottom: 1px solid ${neutral.border};
`

export const ProfileAvatar = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid ${neutral.border};
  border-radius: 999px;
  background: ${neutral.surfaceContainer};
`

export const SideTitle = styled.h1`
  margin: 0;
  color: ${neutral.primary};
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
  padding: 16px 0;

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
  gap: 12px;
  padding: 12px 24px;
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
    background: ${neutral.surfaceHigh};
    color: ${neutral.primary};
  }

  ${({ $active }) =>
    $active &&
    css`
      border-right-color: ${neutral.primary};
      background: ${neutral.surfaceHighest};
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
  padding: 16px 24px 24px;
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
    background: ${neutral.surfaceContainer};
  }

  @media (max-width: 900px) {
    width: auto;
    padding: 0 14px;
  }
`

export const MainArea = styled.div`
  min-height: 100vh;
  margin-left: 256px;

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
  background: ${neutral.background};

  @media (max-width: 720px) {
    height: auto;
    align-items: flex-start;
    flex-direction: column;
    padding: 16px 24px;
  }
`

export const TopTitle = styled.h2`
  margin: 0;
  color: ${neutral.primary};
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
  background: transparent;
  color: ${neutral.muted};
  cursor: pointer;

  &:hover {
    color: ${neutral.primary};
  }
`

export const ProfileLink = styled(Link)`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid ${neutral.border};
  border-radius: 999px;
  background: ${neutral.surface};
  color: ${neutral.text};
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
  margin-bottom: 48px;

  @media (max-width: 720px) {
    align-items: flex-start;
    flex-direction: column;
  }
`

export const PageTitle = styled.h1`
  margin: 0 0 8px;
  color: ${neutral.primary};
  font-size: 28px;
  font-weight: 700;
  line-height: 1.3;
`

export const PageDescription = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 16px;
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
    background: ${neutral.surfaceContainer};
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
  transition: border-color 160ms ease;

  &:hover {
    border-color: ${neutral.primary};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 3px;
  }
`

export const MediaPreview = styled.div`
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: ${neutral.surfaceContainer};
`

export const MediaImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 500ms ease;

  ${MediaCard}:hover & {
    transform: scale(1.05);
  }
`

export const MediaFallback = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${neutral.muted};
`

export const MediaBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid ${neutral.border};
  border-radius: 4px;
  background: rgb(255 255 255 / 90%);
  color: ${neutral.text};
  font-size: 12px;

  ${MaterialIcon} {
    font-size: 14px;
  }
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
  color: ${neutral.primary};
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const StatusBadge = styled.span`
  flex-shrink: 0;
  padding: 4px 8px;
  border: 1px solid ${neutral.border};
  border-radius: 4px;
  background: ${neutral.surfaceContainer};
  color: ${neutral.text};
  font-size: 12px;
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

export const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
`

export const CardButton = styled.button`
  height: 36px;
  flex: 1;
  border: 1px solid ${neutral.border};
  border-radius: 4px;
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: ${neutral.surfaceContainer};
  }

  &:disabled {
    cursor: default;
    opacity: 0.72;
  }
`

export const IconCardButton = styled.button`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${neutral.border};
  border-radius: 4px;
  background: ${neutral.surface};
  color: ${neutral.muted};
  cursor: pointer;

  &:hover {
    background: ${neutral.surfaceContainer};
    color: ${neutral.primary};
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

  &:hover {
    background: ${({ $active }) =>
      $active ? neutral.primary : neutral.surfaceContainer};
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
  background: rgb(0 0 0 / 58%);

  @media (max-width: 720px) {
    padding: 16px;
  }
`

export const ModalContent = styled.section`
  width: min(920px, 100%);
  max-height: min(760px, 92vh);
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
  padding: 20px 20px 16px;
  border-bottom: 1px solid ${neutral.border};
`

export const ModalTitle = styled.h2`
  margin: 0 0 6px;
  color: ${neutral.primary};
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

export const ModalImageFrame = styled.div`
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 20px;
  background: ${neutral.surfaceContainer};
`

export const ModalImage = styled.img`
  display: block;
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
`

export const ModalFallback = styled.div`
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${neutral.muted};
`

export const ModalMeta = styled.p`
  margin: 0;
  padding: 12px 20px 16px;
  border-top: 1px solid ${neutral.border};
  color: ${neutral.muted};
  font-size: 12px;
  word-break: break-all;
`
