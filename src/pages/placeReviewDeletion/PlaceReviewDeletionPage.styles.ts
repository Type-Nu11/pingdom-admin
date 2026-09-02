import styled from 'styled-components'
import { adminColors, radius } from '../../styles/theme'

const neutral = adminColors

export const RequestSummary = styled.p`
  margin: 10px 0 0;
  color: ${neutral.text};
  font-size: 12px;
  line-height: 1.3;
  white-space: pre-wrap;
`

export const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 10px;
`

export const ImageLink = styled.a`
  display: block;
  overflow: hidden;
  aspect-ratio: 1;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceLow};

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
`

export const ReviewNote = styled.div`
  margin-top: 10px;
  padding: 11px 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  font-size: 12px;
  line-height: 1.3;
  white-space: pre-wrap;
`

export const DangerButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.error};
  color: ${neutral.primaryText};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    filter: brightness(0.94);
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`
