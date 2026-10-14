import styled, { css } from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export {
  AccountIcon,
  BrandLogo,
  Content,
  Empty,
  EmptyStoreAction,
  EmptyStoreActions,
  EmptyStoreDescription,
  EmptyStoreIcon,
  EmptyStoreSecondaryAction,
  EmptyStoreState,
  EmptyStoreTitle,
  Field,
  Form,
  Header,
  HeaderUser,
  Input,
  LoadingSummary,
  LogoutButton,
  Notice,
  NoticeIcon,
  Page,
  PageDescription,
  PageIntro,
  PageTitle,
  QuickLink,
  QuickLinks,
  RetryButton,
  SaveButton,
  Skeleton,
  Textarea,
  PlaceSelect,
} from '../../components/merchant/MerchantSurface.styles'

export const Eyebrow = styled.p`
  margin: 0 0 8px;
  color: ${colors.primaryForeground};
  font-size: 13px;
  font-weight: 700;

  .merchant-layout-content & {
    display: none;
  }
`

export const StoreSummary = styled.section`
  padding: 24px;
  border-radius: 8px;
  background: ${colors.surfaceContainer};

  @media (max-width: 720px) {
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
  overflow-wrap: anywhere;
  margin: 0;
  color: ${colors.strongText};
  font-size: 24px;
  font-weight: 700;
  line-height: 1.35;
`

export const StatusBadge = styled.span<{ $tone: 'active' | 'pending' | 'inactive' }>`
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
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
            color: ${colors.primaryForeground};
          `}
`

export const StoreMeta = styled.p`
  margin: 10px 0 0;
  color: ${colors.muted};
  font-size: 14px;
  line-height: 1.5;
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

export const WorkflowNav = styled.nav`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 20px;
  margin-bottom: 24px;

  @media (max-width: 680px) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }
`

export const WorkflowLink = styled.a`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 60px;
  border-bottom: 1px solid ${colors.borderSoft};
  color: ${colors.text};
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;

  &:hover { color: ${colors.primaryForeground}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const Metric = styled.article`
  min-height: 80px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 8px;
  background: ${colors.surfaceContainer};
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
  color: ${colors.primaryForeground};
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
  border-radius: 8px;
  background: ${colors.surfaceContainer};

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
  border-radius: 8px;
  background: ${colors.surfaceContainer};
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
  color: ${colors.primaryForeground};
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

export const FormFooter = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 4px;
`

export const StatusList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${colors.borderSoft};
`

export const StatusRow = styled.div`
  min-width: 0;
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid ${colors.borderSoft};

  > div { min-width: 0; flex: 1; }
  strong { display: block; color: ${colors.text}; font-size: 14px; font-weight: 700; }
  span { display: block; margin-top: 4px; color: ${colors.muted}; font-size: 12px; line-height: 1.45; }
`

export const StateText = styled.span<{ $tone?: 'active' | 'pending' | 'neutral' }>`
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
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
  color: ${({ $active }) => ($active ? colors.successText : colors.primaryForeground)};
  font-size: 12px;
  font-weight: 700;
`
