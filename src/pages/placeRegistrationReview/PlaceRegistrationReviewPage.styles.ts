import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const Reason = styled.p`
  margin: 12px 0 0;
  padding: 12px;
  border: 1px solid ${colors.borderSoft};
  border-radius: 8px;
  background: ${colors.surfaceLow};
  color: ${colors.text};
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
`

export const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
`

export const Tag = styled.span`
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border: 1px solid ${colors.primarySoft};
  border-radius: 6px;
  background: ${colors.primaryTint};
  color: ${colors.primary};
  font-size: 11px;
  font-weight: 700;
`

export const AttachmentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
`

export const AttachmentRow = styled.article`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid ${colors.borderSoft};
  border-radius: 8px;
  background: ${colors.surfaceLow};

  strong {
    overflow: hidden;
    color: ${colors.strongText};
    font-size: 12px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: ${colors.muted};
    font-size: 11px;
    line-height: 1.45;
  }
`

export const ScheduleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 12px;
`

export const ScheduleRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid ${colors.borderSoft};
  border-radius: 8px;
  background: ${colors.surfaceLow};
  color: ${colors.text};
  font-size: 12px;

  strong {
    color: ${colors.strongText};
    font-weight: 800;
  }
`

export const MetaNotice = styled.p`
  margin: 10px 0 0;
  color: ${colors.muted};
  font-size: 11px;
  line-height: 1.5;
`
