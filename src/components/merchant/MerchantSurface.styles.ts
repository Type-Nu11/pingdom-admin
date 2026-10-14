import styled, { css, keyframes } from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export { MerchantPlaceSelect as PlaceSelect } from './MerchantPlaceSelect'

const shimmer = keyframes`
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
`

export const Page = styled.main`
  min-height: 100vh;
  padding: 0;
  background: ${colors.background};

  .merchant-layout-content & {
    min-height: calc(100vh - 64px);
    background: transparent;
  }
`

export const Header = styled.header`
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 0 48px;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surface};

  @media (max-width: 720px) {
    min-height: 64px;
    padding: 0 20px;
  }

  .merchant-layout-content & {
    display: none;
  }
`

export const BrandLogo = styled.img`
  width: 132px;
  height: auto;
  display: block;
`

export const HeaderUser = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${colors.muted};
  font-size: 13px;

  strong {
    max-width: 180px;
    overflow: hidden;
    color: ${colors.strongText};
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const AccountIcon = styled.span`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${colors.primaryTint};
  color: ${colors.primaryForeground};
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
`

export const LogoutButton = styled.button`
  min-height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: ${colors.muted};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${colors.primaryForeground};
    background: ${colors.primaryTint};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: 520px) {
    display: none;
  }
`

export const Content = styled.div`
  width: min(1180px, calc(100% - 64px));
  margin: 0 auto;
  padding: 48px 0 72px;

  @media (max-width: 720px) {
    width: min(100% - 40px, 1180px);
    padding: 32px 0 48px;
  }

  .merchant-layout-content & {
    width: min(calc(100% - 64px), 1100px);
    margin: 0 auto;
    padding: 36px 0 48px;

    @media (max-width: 720px) {
      width: calc(100% - 32px);
      padding: 28px 0 36px;
    }
  }
`

export const PageIntro = styled.section`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 28px;

  @media (max-width: 760px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 20px;
  }

  .merchant-layout-content & {
    align-items: flex-end;
    margin-bottom: 34px;

    @media (max-width: 640px) {
      align-items: flex-start;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 28px;
    }
  }
`

export const PageTitle = styled.h1`
  margin: 0;
  color: ${colors.strongText};
  font-size: 30px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: 0;

  .merchant-layout-content & {
    margin-bottom: 6px;
    font-size: 24px;
  }
`

export const PageDescription = styled.p`
  margin: 10px 0 0;
  color: ${colors.muted};
  font-size: 15px;
  line-height: 1.55;

  .merchant-layout-content & {
    margin-top: 0;
    font-size: 16px;
    line-height: 1.5;
  }
`

export const QuickLinks = styled.nav`
  display: flex;
  align-items: center;
  align-self: end;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;

  @media (max-width: 720px) {
    align-self: start;
    justify-content: flex-start;
  }
`

export const QuickLink = styled.button`
  min-height: 36px;
  padding: 0 11px;
  border: 1px solid ${colors.border};
  border-radius: 5px;
  background: ${colors.surface};
  color: ${colors.muted};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${colors.primarySoft};
    color: ${colors.primaryForeground};
    background: ${colors.primaryTint};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }
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

  ${({ $wide }) =>
    $wide &&
    css`
      grid-column: 1 / -1;
    `}
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
  transition: border-color 160ms ease, box-shadow 160ms ease;

  &::placeholder { color: ${colors.placeholder}; }

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px ${colors.primaryTint};
  }

  &:disabled {
    cursor: not-allowed;
    background: ${colors.surfaceLow};
    color: ${colors.softText};
  }
`

export const Input = styled.input`
  ${fieldStyle}
  height: 42px;
  padding: 0 12px;
`

export const Textarea = styled.textarea`
  ${fieldStyle}
  min-height: 132px;
  resize: vertical;
  padding: 12px;
  line-height: 1.55;
`

export const SaveButton = styled.button`
  min-width: 104px;
  height: 42px;
  border: 1px solid ${colors.primary};
  border-radius: 6px;
  background: ${colors.primaryAction};
  color: ${colors.primaryText};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) { background: ${colors.primaryForeground}; border-color: ${colors.primaryHover}; }
  &:disabled { cursor: wait; opacity: 0.65; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const Notice = styled.div<{ $tone: 'error' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border: 0;
  border-radius: 6px;
  background: ${({ $tone }) => ($tone === 'error' ? colors.errorTint : colors.successTint)};
  color: ${({ $tone }) => ($tone === 'error' ? colors.errorText : colors.successText)};
  font-size: 13px;
  line-height: 1.5;
`

export const NoticeIcon = styled.span`
  flex: 0 0 auto;
  line-height: 1;
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
`

export const Empty = styled.div`
  padding: 20px 0 4px;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.5;
`

export const EmptyStoreState = styled.section`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-radius: 8px;
  background: ${colors.surfaceContainer};

  @media (max-width: 680px) {
    align-items: flex-start;
  }
`

export const EmptyStoreIcon = styled.span`
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: ${colors.surface};
  color: ${colors.primaryForeground};
  font-family: 'Material Symbols Outlined';
  font-size: 21px;
  font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
`

export const EmptyStoreTitle = styled.h2`
  margin: 0;
  color: ${colors.strongText};
  font-size: 16px;
  font-weight: 700;
`

export const EmptyStoreDescription = styled.p`
  margin: 6px 0 0;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.55;
`

export const EmptyStoreActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  grid-column: 2;

  @media (max-width: 680px) {
    grid-column: 1 / -1;
    width: 100%;
  }
`

export const EmptyStoreAction = styled.button`
  min-height: 42px;
  padding: 0 13px;
  border: 1px solid ${colors.primary};
  border-radius: 6px;
  background: ${colors.primaryAction};
  color: ${colors.primaryText};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  &:hover { background: ${colors.primaryForeground}; border-color: ${colors.primaryHover}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }

`

export const EmptyStoreSecondaryAction = styled(EmptyStoreAction)`
  border-color: ${colors.primarySoft};
  background: ${colors.surface};
  color: ${colors.primaryForeground};

  &:hover { background: ${colors.primaryTint}; border-color: ${colors.primary}; }
`

export const Skeleton = styled.div<{ $height?: number }>`
  height: ${({ $height = 20 }) => $height}px;
  border-radius: 4px;
  background: linear-gradient(90deg, ${colors.surfaceLow} 25%, ${colors.surfaceHigh} 50%, ${colors.surfaceLow} 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background: ${colors.surfaceLow};
  }
`

export const LoadingSummary = styled.div`
  display: grid;
  gap: 16px;
`

export const RetryButton = styled.button`
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid ${colors.primary};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.primaryForeground};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`
