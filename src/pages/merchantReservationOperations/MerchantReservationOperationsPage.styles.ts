import styled from 'styled-components'
import { adminColors as colors, typo } from '../../styles/theme'
import * as Shared from '../../components/merchant/MerchantWorkspace.styles'

export const Filters = styled.form`
  display: grid;
  grid-template-columns: minmax(130px, 0.7fr) minmax(180px, 1fr) repeat(2, minmax(190px, 1fr));
  gap: 16px;
  padding: 20px;
  margin-bottom: 24px;
  border-radius: 8px;
  background: ${colors.surfaceContainer};
  @media (max-width: 1200px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 620px) { grid-template-columns: minmax(0, 1fr); }
`

export const Workspace = styled(Shared.Workspace)`align-items: start;`

export const List = styled(Shared.CampaignList)`
  max-height: 65vh;
  overflow-y: auto;
`

export const PanelTitle = styled(Shared.PanelTitle)`scroll-margin-top: 80px;`
export const BackToList = styled(Shared.HeaderButton)`
  display: none;
  flex-shrink: 0;
  white-space: nowrap;
  @media (max-width: 980px) { display: inline-flex; }
`

export const FilterFooter = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
`
export const Hint = styled.p`
  margin: 0;
  color: ${colors.muted};
  ${typo.caption.regular}
  overflow-wrap: anywhere;
`
export const Applied = styled(Hint)`margin: 0 0 18px;`
export const ListItem = styled.div<{ $selected: boolean }>`
  padding: 18px;
  border: 1px solid ${({ $selected }) => $selected ? colors.primary : colors.borderSoft};
  border-radius: 8px;
  background: ${colors.surface};
  & + & { margin-top: 12px; }
`
export const Title = styled.h3`
  margin: 0;
  color: ${colors.strongText};
  ${typo.body.bold}
  overflow-wrap: anywhere;
`
export const Meta = styled(Shared.CampaignMeta)`
  white-space: normal;
  overflow-wrap: anywhere;
`
export const HistoryTitle = styled(Title)`margin-top: 24px;`
export const ReviewActions = styled(Shared.FormActions)`margin-top: 24px;`
export const Detail = styled.div`
  padding: 24px;
  min-width: 0;
  color: ${colors.text};
  ${typo.label.regular}
`
export const Info = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin: 24px 0;
  dt { color: ${colors.muted}; ${typo.caption.regular} }
  dd { margin: 5px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  @media (max-width: 620px) { grid-template-columns: minmax(0, 1fr); }
`
export const Wide = styled.div`grid-column: 1 / -1;`
export const History = styled.ol`
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  li { padding: 14px 0; border-top: 1px solid ${colors.borderSoft}; overflow-wrap: anywhere; }
  p { margin: 5px 0 0; white-space: pre-wrap; }
`
