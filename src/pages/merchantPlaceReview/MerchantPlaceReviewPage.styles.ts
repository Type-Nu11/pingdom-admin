import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const ReviewList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: ${colors.surfaceLow};

  @media (max-width: 560px) {
    gap: 12px;
    padding: 12px;
  }
`

export const ReviewItem = styled.article`
  min-width: 0;
  border: 1px solid ${colors.border};
  border-radius: 12px;
  background: ${colors.surface};
`

export const ReviewTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid ${colors.borderSoft};

  @media (max-width: 560px) {
    flex-wrap: wrap;
    gap: 8px;
    padding: 14px 16px;
  }
`

export const ReviewIdentity = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
`

export const ReviewTitle = styled.h3`
  margin: 0;
  color: ${colors.strongText};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
`

export const VisibilityBadge = styled.span<{ $visibility: 'VISIBLE' | 'HIDDEN' | 'DELETED' }>`
  padding: 3px 9px;
  border-radius: 6px;
  background: ${({ $visibility }) => $visibility === 'VISIBLE' ? colors.successTint : colors.surfaceContainer};
  color: ${({ $visibility }) => $visibility === 'VISIBLE' ? colors.successText : colors.muted};
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
`

export const ReviewDate = styled.time`
  flex: 0 0 auto;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.45;
`

export const ReviewBody = styled.div`
  padding: 20px;

  > [aria-label='리뷰 사진'] {
    grid-template-columns: repeat(auto-fill, minmax(88px, 104px));
    margin-top: 16px;
  }

  @media (max-width: 560px) {
    padding: 16px;
  }
`

export const ReasonSection = styled.div`
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px 12px;
`

export const SectionLabel = styled.span`
  flex: 0 0 auto;
  padding-top: 4px;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.5;
`

export const ReviewContent = styled.p`
  max-width: 80ch;
  margin: 16px 0 0;
  color: ${colors.text};
  font-size: 15px;
  line-height: 1.75;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`

export const ImageList = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 14px;
  overflow-x: auto;
`

export const ReviewImage = styled.img`
  width: 82px;
  height: 82px;
  flex: 0 0 auto;
  display: block;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  object-fit: cover;
`

export const ReviewFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid ${colors.borderSoft};
  background: ${colors.surfaceHighest};
  border-radius: 0 0 12px 12px;

  @media (max-width: 560px) {
    flex-wrap: wrap;
    padding: 12px 16px;
  }
`

export const RequestActions = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
`

export const RejectionNote = styled.div`
  margin-top: 16px;
  padding: 12px 14px;
  border-left: 3px solid ${colors.error};
  border-radius: 6px;
  background: ${colors.errorTint};
  color: ${colors.text};
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-wrap;

  strong { display: block; margin-bottom: 4px; }
  p { margin: 0; }
`

export const ReviewMeta = styled.span`
  color: ${colors.softText};
  font-size: 12px;
`

export const RequestButton = styled.button`
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.text};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${colors.error};
    background: ${colors.errorTint};
    color: ${colors.errorText};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`

export const RequestedBadge = styled.span<{ $status: 'PENDING' | 'APPROVED' | 'REJECTED' }>`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border-radius: 14px;
  background: ${({ $status }) => {
    if ($status === 'APPROVED') return colors.successTint
    if ($status === 'REJECTED') return colors.errorTint
    return colors.warningTint
  }};
  color: ${({ $status }) => {
    if ($status === 'APPROVED') return colors.successText
    if ($status === 'REJECTED') return colors.errorText
    return colors.warningText
  }};
  font-size: 11px;
  font-weight: 700;
`

export const ModalDescription = styled.p`
  margin: 0 0 18px;
  color: ${colors.muted};
  font-size: 13px;
  line-height: 1.55;
`

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: ${colors.text};
  font-size: 13px;
  font-weight: 700;
`

export const Textarea = styled.textarea`
  min-height: 132px;
  width: 100%;
  padding: 12px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.text};
  font: inherit;
  font-size: 14px;
  line-height: 1.55;
  outline: 0;
  resize: vertical;

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px ${colors.primaryTint};
  }
`

export const CharacterCount = styled.span`
  color: ${colors.softText};
  font-size: 12px;
  font-weight: 500;
  text-align: right;
`
