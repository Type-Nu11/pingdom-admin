import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

export const Panel = styled.section`
  overflow: hidden;
  border: 1px solid ${adminColors.border};
  border-radius: 10px;
  background: ${adminColors.surface};
`

export const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 20px;
  padding: 16px;
  border-bottom: 1px solid ${adminColors.border};

  @media (max-width: 620px) {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }
`

export const Title = styled.h2`
  margin: 0;
  color: ${adminColors.strongText};
  font-size: 16px;
  font-weight: 800;
  white-space: nowrap;
`

export const Select = styled.select`
  width: 160px;
  min-height: 42px;
  flex: 0 0 160px;
  padding: 0 32px 0 12px;
  border: 1px solid ${adminColors.border};
  border-radius: 8px;
  background: ${adminColors.surface};
  color: ${adminColors.strongText};
  font: inherit;
  font-size: 13px;

  &:focus {
    border-color: ${adminColors.primary};
    outline: 3px solid ${adminColors.primaryTint};
  }

  @media (max-width: 620px) {
    width: 100%;
    flex-basis: auto;
  }
`
