import styled from 'styled-components'
import { adminColors, radius } from '../../styles/theme'

export const BannerPreview = styled.figure`
  overflow: hidden;
  margin: 16px 0 0;
  border: 1px solid ${adminColors.border};
  border-radius: 8px;
  background: ${adminColors.surfaceLow};
`

export const BannerImage = styled.img`
  display: block;
  width: 100%;
  max-height: 280px;
  object-fit: cover;
`

export const BannerFallback = styled.div`
  min-height: 180px;
  display: grid;
  place-items: center;
  padding: 20px;
  color: ${adminColors.muted};
  font-size: 14px;
  font-weight: 700;
  text-align: center;
`

export const BannerCaption = styled.figcaption`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-top: 1px solid ${adminColors.border};
  color: ${adminColors.muted};
  font-size: 12px;
`

export const ExternalLink = styled.a`
  color: ${adminColors.primary};
  font-weight: 700;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

export const DangerButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${adminColors.errorTint};
  color: ${adminColors.error};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${adminColors.error};
    color: ${adminColors.surface};
  }

  &:focus-visible {
    outline: 3px solid ${adminColors.errorTint};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`
