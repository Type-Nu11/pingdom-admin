import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const ReviewList = styled.div`
  display: flex;
  flex-direction: column;
`

export const ReviewItem = styled.article`
  padding: 20px 24px;
  border-bottom: 1px solid ${colors.borderSoft};

  &:last-child {
    border-bottom: 0;
  }

  @media (max-width: 560px) {
    padding: 18px;
  }
`

export const ReviewTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`

export const ReviewReason = styled.strong`
  min-width: 0;
  color: ${colors.strongText};
  font-size: 15px;
  line-height: 1.45;
`

export const ReviewDate = styled.time`
  flex: 0 0 auto;
  color: ${colors.softText};
  font-size: 12px;
  line-height: 1.45;
`

export const ReviewContent = styled.p`
  margin: 12px 0 0;
  color: ${colors.text};
  font-size: 14px;
  line-height: 1.65;
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
  margin-top: 16px;

  @media (max-width: 480px) {
    align-items: flex-start;
    flex-direction: column;
  }
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
    color: ${colors.error};
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
    if ($status === 'REJECTED') return colors.error
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
