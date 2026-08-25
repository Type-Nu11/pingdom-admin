import styled, { css } from 'styled-components'
import KakaoMap from '../../components/map/KakaoMap'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const Layout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const surfacePanel = css`
  min-width: 0;
  padding: 26px 28px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};

  @media (max-width: 640px) { padding: 22px 20px; }
`

export const HistoryPanel = styled.section`
  ${surfacePanel}
`

export const RegistrationPanel = styled.section`
  ${surfacePanel}
`

export const PanelHeading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
`

export const PanelTitle = styled.h2`
  margin: 0;
  color: ${colors.strongText};
  font-size: 18px;
  font-weight: 700;
`

export const PanelDescription = styled.p`
  margin: 6px 0 0;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.5;
`

export const ApplicationList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${colors.borderSoft};
`

export const ApplicationItem = styled.button<{ $selected: boolean }>`
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  display: block;
  padding: 16px 12px;
  border: 0;
  border-bottom: 1px solid ${colors.borderSoft};
  border-left: 3px solid transparent;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;

  ${({ $selected }) => $selected && css`
    border-left-color: ${colors.primary};
    background: ${colors.primaryTint};
  `}

  &:hover { background: ${({ $selected }) => ($selected ? colors.primaryTint : colors.surfaceLow)}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const ApplicationTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

export const ApplicationName = styled.strong`
  min-width: 0;
  overflow: hidden;
  color: ${colors.text};
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ApplicationMeta = styled.span`
  display: block;
  margin-top: 6px;
  overflow: hidden;
  color: ${colors.muted};
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const StatusBadge = styled.span<{ $tone: 'draft' | 'pending' | 'active' | 'danger' | 'neutral' }>`
  min-height: 24px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;

  ${({ $tone }) => $tone === 'active'
    ? css`border-color: #9bd7a9; background: ${colors.successTint}; color: ${colors.successText};`
    : $tone === 'pending'
      ? css`border-color: #f0c970; background: ${colors.warningTint}; color: ${colors.warningText};`
      : $tone === 'danger'
        ? css`border-color: ${colors.primarySoft}; background: ${colors.primaryTint}; color: ${colors.primary};`
        : $tone === 'draft'
          ? css`border-color: #d9c9ff; background: #f5f1ff; color: #7150af;`
          : css`border-color: ${colors.border}; background: ${colors.surfaceLow}; color: ${colors.muted};`}
`

export const Empty = styled.p`
  margin: 0;
  padding: 12px 0 4px;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.55;
`

export const NewApplicationButton = styled.button`
  width: 100%;
  min-height: 42px;
  margin-top: 18px;
  border: 1px solid ${colors.primary};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.primary};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover { background: ${colors.primaryTint}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const Section = styled.fieldset`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  min-width: 0;
  margin: 0;
  padding: 20px 0;
  border: 0;
  border-top: 1px solid ${colors.borderSoft};

  &:first-of-type { padding-top: 0; border-top: 0; }
`

export const SectionLegend = styled.legend`
  grid-column: 1 / -1;
  width: 100%;
  margin: 0 0 14px;
  padding: 0;
  color: ${colors.text};
  font-size: 15px;
  font-weight: 700;
`

export const SectionHint = styled.p`
  grid-column: 1 / -1;
  margin: -7px 0 14px;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.5;
`

export const CategoryDropdown = styled.div`
  position: relative;
  width: 100%;
  z-index: 4;
`

export const CategoryTrigger = styled.button`
  width: 100%;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.text};
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;

  > span:last-child {
    color: ${colors.muted};
    font-family: 'Material Symbols Outlined';
    font-size: 20px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
  }

  &[aria-expanded='true'] { border-color: ${colors.primary}; box-shadow: 0 0 0 3px ${colors.primaryTint}; }
  &:hover:not(:disabled) { border-color: ${colors.primarySoft}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  &:disabled { cursor: not-allowed; background: ${colors.surfaceLow}; color: ${colors.softText}; }
`

export const CategoryMenu = styled.div`
  position: absolute;
  z-index: 12;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 242px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};
  box-shadow: 0 14px 30px ${colors.shadow};
`

export const CategoryOption = styled.button<{ $selected: boolean }>`
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid ${({ $selected }) => ($selected ? colors.primarySoft : 'transparent')};
  border-radius: 6px;
  background: ${({ $selected }) => ($selected ? colors.primaryTint : 'transparent')};
  color: ${({ $selected }) => ($selected ? colors.primary : colors.text)};
  font: inherit;
  font-size: 13px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 600)};
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible { outline: 0; background: ${colors.primaryTint}; color: ${colors.primary}; }
`

export const PlaceSearchField = styled.div<{ $wide?: boolean }>`
  position: relative;
  z-index: 5;
  grid-column: 1 / -1;
  min-width: 0;
`

export const PlaceSearchLabel = styled.label`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
`

export const PlaceSearchControl = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 8px;
`

export const PlaceSearchButton = styled.button`
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid ${colors.primary};
  border-radius: 6px;
  background: ${colors.primary};
  color: ${colors.primaryText};
  cursor: pointer;

  span {
    font-family: 'Material Symbols Outlined';
    font-size: 20px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
  }

  &:hover:not(:disabled) { background: ${colors.primaryHover}; }
  &:disabled { cursor: not-allowed; border-color: ${colors.disabled}; background: ${colors.disabled}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const PlaceSearchHint = styled.p<{ $error?: boolean }>`
  margin: 8px 0 0;
  color: ${({ $error }) => ($error ? colors.error : colors.muted)};
  font-size: 12px;
  line-height: 1.45;
`

export const PlaceSearchResults = styled.div`
  position: absolute;
  z-index: 12;
  top: 70px;
  left: 0;
  right: 0;
  max-height: 276px;
  overflow-y: auto;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};
  box-shadow: 0 14px 30px ${colors.shadow};
`

export const PlaceSearchResultsTitle = styled.strong`
  min-height: 38px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-bottom: 1px solid ${colors.borderSoft};
  color: ${colors.strongText};
  font-size: 12px;
  font-weight: 700;
`

export const PlaceSearchResult = styled.button`
  width: 100%;
  display: grid;
  gap: 5px;
  padding: 12px 14px;
  border: 0;
  border-bottom: 1px solid ${colors.borderSoft};
  background: ${colors.surface};
  color: ${colors.text};
  text-align: left;
  cursor: pointer;

  &:last-child { border-bottom: 0; }
  &:hover { background: ${colors.primaryTint}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: -2px; }

  &:hover strong { color: ${colors.primary}; }
`

export const PlaceSearchResultTop = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  strong { min-width: 0; overflow: hidden; color: ${colors.text}; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
  span { flex: 0 0 auto; color: ${colors.primary}; font-size: 11px; font-weight: 700; }
`

export const PlaceSearchResultCategory = styled.span`
  overflow: hidden;
  color: ${colors.muted};
  font-size: 11px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const PlaceSearchResultAddress = styled.small`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;

  span {
    flex: 0 0 auto;
    color: ${colors.softText};
    font-family: 'Material Symbols Outlined';
    font-size: 15px;
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 16;
  }
`

export const SelectedPlaceSummary = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding: 12px;
  border-left: 3px solid ${colors.primary};
  background: ${colors.primaryTint};
  color: ${colors.text};

  strong { font-size: 12px; font-weight: 700; }
  span { font-size: 13px; line-height: 1.45; }
  small { color: ${colors.muted}; font-size: 12px; line-height: 1.4; }
`

export const SelectedPlaceNameField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: ${colors.text};
  font-size: 12px;
  font-weight: 700;
`

export const SelectedPlaceAddress = styled.div`
  display: grid;
  gap: 3px;
`

export const ManualEntryPrompt = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 0 20px;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.5;
`

export const ManualEntryButton = styled.button`
  min-height: 34px;
  flex: 0 0 auto;
  padding: 0 10px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) { border-color: ${colors.primarySoft}; background: ${colors.primaryTint}; }
  &:disabled { cursor: not-allowed; color: ${colors.softText}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const ContactField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

export const ContactFieldLabel = styled.label`
  color: ${colors.text};
  font-size: 13px;
  font-weight: 700;
`

export const SameContactCheck = styled.label`
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: ${colors.muted};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: ${colors.primary};
  }

  input:disabled { cursor: not-allowed; }
`

export const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const TagButton = styled.button<{ $selected: boolean }>`
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid ${({ $selected }) => ($selected ? colors.primarySoft : colors.border)};
  border-radius: 6px;
  background: ${({ $selected }) => ($selected ? colors.primaryTint : colors.surface)};
  color: ${({ $selected }) => ($selected ? colors.primary : colors.muted)};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  &:disabled { cursor: not-allowed; opacity: 0.55; }
`

export const LocationMap = styled(KakaoMap)<{ $active: boolean }>`
  height: 100%;
  min-height: 0;
`

export const MapViewport = styled.div<{ $active: boolean }>`
  position: relative;
  height: ${({ $active }) => ($active ? 'clamp(360px, 46vh, 440px)' : '220px')};
  overflow: hidden;
  border-radius: 7px;
  transition: height 180ms ease;

  ${LocationMap} { min-height: 0; }
`

export const MapIdleOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.72);
  color: ${colors.muted};
  pointer-events: auto;

  span {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid ${colors.border};
    border-radius: 6px;
    background: ${colors.surface};
    color: ${colors.primary};
    font-family: 'Material Symbols Outlined';
    font-size: 19px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
  }

  strong { font-size: 12px; font-weight: 700; }
`

export const CoordinateText = styled.p`
  margin: 10px 0 0;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.5;
`

export const RegistrationForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`

export const FormWorkspace = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
  align-items: start;
  gap: 28px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

export const FormSections = styled.div`
  min-width: 0;
`

export const MapPanel = styled.aside<{ $active: boolean }>`
  position: ${({ $active }) => ($active ? 'sticky' : 'static')};
  top: 84px;
  min-width: 0;
  padding: 18px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${({ $active }) => ($active ? colors.surface : colors.surfaceLow)};
  transition: background 180ms ease;

  @media (max-width: 980px) {
    position: static;
    order: -1;
  }

  @media (max-width: 640px) {
    padding: 14px;
  }
`

export const MapHeading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
`

export const MapTitle = styled.h3`
  margin: 0;
  color: ${colors.strongText};
  font-size: 15px;
  font-weight: 700;
`

export const MapDescription = styled.p`
  margin: 5px 0 0;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.45;
`

export const MapStatus = styled.span<{ $hasLocation: boolean }>`
  min-height: 24px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid ${({ $hasLocation }) => ($hasLocation ? '#9bd7a9' : colors.primarySoft)};
  border-radius: 6px;
  background: ${({ $hasLocation }) => ($hasLocation ? colors.successTint : colors.primaryTint)};
  color: ${({ $hasLocation }) => ($hasLocation ? colors.successText : colors.primary)};
  font-size: 11px;
  font-weight: 700;
`

export const CoordinateDetails = styled.details`
  margin-top: 14px;
  border-top: 1px solid ${colors.borderSoft};

  summary {
    padding: 13px 0 0;
    color: ${colors.muted};
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
`

export const CoordinateFields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding-top: 12px;
`

export const ScheduleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const ScheduleRow = styled.div`
  display: grid;
  grid-template-columns: 38px minmax(168px, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 60px;
  padding: 8px 10px;
  border: 1px solid ${colors.border};
  border-radius: 7px;
  background: ${colors.surface};

  @media (max-width: 700px) {
    grid-template-columns: 38px 1fr;
    gap: 10px;
    padding: 10px;

    > :last-child { grid-column: 2 / -1; }
  }
`

export const DayName = styled.strong`
  color: ${colors.text};
  font-size: 13px;
`

export const DayStatus = styled.div`
  display: flex;
  gap: 4px;
`

export const DayStatusButton = styled.button<{ $selected: boolean }>`
  min-height: 32px;
  padding: 0 8px;
  border: 1px solid ${({ $selected }) => ($selected ? colors.primarySoft : colors.border)};
  border-radius: 6px;
  background: ${({ $selected }) => ($selected ? colors.primaryTint : colors.surface)};
  color: ${({ $selected }) => ($selected ? colors.primary : colors.muted)};
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;

  &:disabled { cursor: not-allowed; opacity: 0.55; }
`

export const ScheduleTimeControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: end;
  color: ${colors.muted};
  font-size: 12px;
  font-weight: 700;

  @media (max-width: 700px) {
    justify-self: start;
  }
`

export const ReadonlyBlock = styled.div`
  margin-bottom: 18px;
  padding: 14px;
  border-left: 3px solid ${colors.primary};
  background: ${colors.primaryTint};
  color: ${colors.text};
  font-size: 13px;
  line-height: 1.55;

  strong { color: ${colors.primary}; }
`

export const AttachmentNotice = styled.div`
  padding: 12px 14px;
  border: 1px solid ${colors.borderSoft};
  border-radius: 6px;
  background: ${colors.surfaceLow};
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.5;
`

export const FormActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
`

export const SecondaryButton = styled.button`
  min-height: 42px;
  padding: 0 13px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.muted};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) { border-color: ${colors.primarySoft}; color: ${colors.primary}; background: ${colors.primaryTint}; }
  &:disabled { cursor: wait; opacity: 0.65; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const DangerButton = styled(SecondaryButton)`
  border-color: #f2b8be;
  color: ${colors.error};
  &:hover:not(:disabled) { border-color: ${colors.error}; color: ${colors.error}; background: ${colors.errorTint}; }
`
