import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`
export const IconButton = styled.button`
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid ${adminColors.border};
  border-radius: 6px;
  color: ${adminColors.text};
  background: ${adminColors.surface};
  cursor: pointer;
  &:disabled { opacity: 0.45; cursor: default; }
  &:focus-visible { outline: 2px solid ${adminColors.primary}; outline-offset: 2px; }
  span { font-family: 'Material Symbols Outlined'; font-size: 20px; }
`
export const Viewport = styled.div`
  height: 340px;
  max-height: 45dvh;
  overflow: auto;
  background: ${adminColors.surfaceLow};
  border: 1px solid ${adminColors.border};
  img { display: block; max-width: none; height: auto; }
  canvas { display: block; }
`
