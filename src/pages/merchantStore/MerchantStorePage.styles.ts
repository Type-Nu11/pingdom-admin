import styled, { css, keyframes } from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

const shimmer = keyframes`
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
`

export const Page = styled.main`
  min-height: 100vh;
  padding: 0;
  background: ${colors.background};

  .merchant-layout-content & {
    min-height: 100%;
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
  color: ${colors.primary};
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
    color: ${colors.primary};
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
    width: min(100% - 80px, 1280px);
    margin: 0 auto;
    padding: 44px 0 72px;

    @media (max-width: 720px) {
      width: min(100% - 40px, 1280px);
      padding: 32px 0 48px;
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
`

export const Eyebrow = styled.p`
  margin: 0 0 8px;
  color: ${colors.primary};
  font-size: 13px;
  font-weight: 700;
`

export const PageTitle = styled.h1`
  margin: 0;
  color: ${colors.strongText};
  font-size: 30px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: 0;
`

export const PageDescription = styled.p`
  margin: 10px 0 0;
  color: ${colors.muted};
  font-size: 15px;
  line-height: 1.55;
`

export const PlaceSelect = styled.select`
  min-width: 180px;
  height: 40px;
  padding: 0 34px 0 12px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.text};
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
`

export const StoreSummary = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  padding: 28px 30px;
  border: 1px solid ${colors.border};
  border-top: 3px solid ${colors.primary};
  border-radius: 8px;
  background: ${colors.surface};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    padding: 24px 20px;
  }
`

export const SummaryTitleRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`

export const StoreName = styled.h2`
  margin: 0;
  color: ${colors.strongText};
  font-size: 24px;
  font-weight: 700;
  line-height: 1.35;
`

export const StatusBadge = styled.span<{ $tone: 'active' | 'pending' | 'inactive' }>`
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;

  ${({ $tone }) =>
    $tone === 'active'
      ? css`
          border-color: #76c58a;
          background: ${colors.successTint};
          color: ${colors.successText};
        `
      : $tone === 'pending'
        ? css`
            border-color: #f0c970;
            background: ${colors.warningTint};
            color: ${colors.warningText};
          `
        : css`
            border-color: ${colors.primarySoft};
            background: ${colors.primaryTint};
            color: ${colors.primary};
          `}
`

export const StoreMeta = styled.p`
  margin: 10px 0 0;
  color: ${colors.muted};
  font-size: 14px;
  line-height: 1.5;
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
    color: ${colors.primary};
    background: ${colors.primaryTint};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }
`

export const Metrics = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`

export const Metric = styled.article`
  min-height: 112px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};
`

export const MetricIcon = styled.span`
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: ${colors.primaryTint};
  color: ${colors.primary};
  font-family: 'Material Symbols Outlined';
  font-size: 20px;
  font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
`

export const MetricContent = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  span { color: ${colors.muted}; font-size: 13px; }
  strong { color: ${colors.strongText}; font-size: 24px; font-weight: 700; line-height: 1.2; }
`

export const PerformanceSection = styled.section`
  margin-top: 28px;
  padding-top: 28px;
  border-top: 1px solid ${colors.borderSoft};
`

export const PerformanceHeading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  @media (max-width: 560px) {
    flex-direction: column;
  }
`

export const PerformanceScope = styled.span`
  flex-shrink: 0;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.5;
`

export const PerformanceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

export const PerformanceMetric = styled.article`
  min-height: 96px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 18px 20px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};

  span {
    color: ${colors.muted};
    font-size: 13px;
  }

  strong {
    margin-top: 7px;
    color: ${colors.strongText};
    font-size: 24px;
    font-weight: 700;
    line-height: 1.15;
  }

  small {
    margin-top: 4px;
    color: ${colors.muted};
    font-size: 12px;
  }
`

export const PerformanceError = styled.div`
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 16px;
  padding: 16px 20px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};
  color: ${colors.muted};
  font-size: 14px;

  @media (max-width: 560px) {
    align-items: flex-start;
    flex-direction: column;
  }
`

export const PerformanceRetry = styled.button`
  min-height: 34px;
  flex-shrink: 0;
  padding: 0 10px;
  border: 1px solid ${colors.primarySoft};
  border-radius: 5px;
  background: ${colors.surface};
  color: ${colors.primary};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover { background: ${colors.primaryTint}; border-color: ${colors.primary}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const Workspace = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.22fr) minmax(320px, 0.78fr);
  gap: 24px;
  margin-top: 32px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

export const Column = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
`

export const Section = styled.section`
  scroll-margin-top: 24px;
  border-top: 1px solid ${colors.border};
  padding-top: 24px;
`

export const SectionHeading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
`

export const SectionTitle = styled.h2`
  margin: 0;
  color: ${colors.strongText};
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
`

export const SectionDescription = styled.p`
  margin: 5px 0 0;
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

export const FormFooter = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 4px;
`

export const SaveButton = styled.button`
  min-width: 104px;
  height: 42px;
  border: 1px solid ${colors.primary};
  border-radius: 6px;
  background: ${colors.primary};
  color: ${colors.primaryText};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) { background: ${colors.primaryHover}; border-color: ${colors.primaryHover}; }
  &:disabled { cursor: wait; opacity: 0.65; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const Notice = styled.div<{ $tone: 'error' | 'success' }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid ${({ $tone }) => ($tone === 'error' ? '#f2b8be' : '#b4e1c0')};
  border-radius: 6px;
  background: ${({ $tone }) => ($tone === 'error' ? colors.errorTint : colors.successTint)};
  color: ${({ $tone }) => ($tone === 'error' ? colors.error : colors.successText)};
  font-size: 13px;
  line-height: 1.5;
`

export const NoticeIcon = styled.span`
  margin-top: 1px;
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
`

export const StatusList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${colors.borderSoft};
`

export const StatusRow = styled.div`
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid ${colors.borderSoft};

  strong { display: block; color: ${colors.text}; font-size: 14px; font-weight: 700; }
  span { display: block; margin-top: 4px; color: ${colors.muted}; font-size: 12px; line-height: 1.45; }
`

export const StateText = styled.span<{ $tone?: 'active' | 'pending' | 'neutral' }>`
  margin: 0 !important;
  color: ${({ $tone = 'neutral' }) =>
    $tone === 'active' ? colors.successText : $tone === 'pending' ? colors.warningText : colors.muted} !important;
  font-weight: 700;
  text-align: right;
`

export const ResourceList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${colors.borderSoft};
`

export const ResourceRow = styled.article`
  min-width: 0;
  padding: 15px 0;
  border-bottom: 1px solid ${colors.borderSoft};

  &:last-child { border-bottom: 0; }
`

export const ResourceTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

export const ResourceTitle = styled.h3`
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: ${colors.text};
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ResourceMeta = styled.p`
  margin: 6px 0 0;
  overflow: hidden;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ResourceBadge = styled.span<{ $active?: boolean }>`
  flex-shrink: 0;
  color: ${({ $active }) => ($active ? colors.successText : colors.primary)};
  font-size: 12px;
  font-weight: 700;
`

export const Empty = styled.div`
  padding: 20px 0 4px;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.5;
`

export const EmptyStoreState = styled.section`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding: 22px 24px;
  border: 1px solid ${colors.primarySoft};
  border-radius: 8px;
  background: ${colors.primaryTint};

  @media (max-width: 680px) {
    grid-template-columns: auto minmax(0, 1fr);
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
  color: ${colors.primary};
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
  background: ${colors.primary};
  color: ${colors.primaryText};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  &:hover { background: ${colors.primaryHover}; border-color: ${colors.primaryHover}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }

  @media (max-width: 680px) {
    flex: 1;
  }
`

export const EmptyStoreSecondaryAction = styled(EmptyStoreAction)`
  border-color: ${colors.primarySoft};
  background: ${colors.surface};
  color: ${colors.primary};

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
  color: ${colors.primary};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`
