import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const ImagePreview = styled.figure`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: ${colors.surfaceLow};

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }
`

export const Image = styled.img`
  width: 148px;
  height: 104px;
  display: block;
  border: 0;
  border-radius: 6px;
  background: ${colors.surface};
  object-fit: cover;

  @media (max-width: 460px) {
    width: 100%;
    height: 160px;
  }
`

export const ImagePreviewText = styled.figcaption`
  min-width: 0;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.5;

  strong {
    display: block;
    margin-bottom: 4px;
    color: ${colors.text};
    font-size: 13px;
  }
`
