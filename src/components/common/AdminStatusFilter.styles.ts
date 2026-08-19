import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

export const Panel = styled.section`
  border: 1px solid ${adminColors.border};
  border-radius: 8px;
  background: ${adminColors.surface};
`

export const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  padding: 8px 14px;

  @media (max-width: 460px) {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
  }
`

export const LabelGroup = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 9px;
`

export const FilterIcon = styled.span`
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  border-radius: 8px;
  border: 1px solid ${adminColors.primarySoft};
  background: ${adminColors.primaryTint};
  color: ${adminColors.primary};
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  font-variation-settings: 'FILL' 0, 'wght' 550, 'GRAD' 0, 'opsz' 20;
`

export const Heading = styled.div`
  min-width: 0;
  display: grid;
  gap: 2px;
`

export const Title = styled.span`
  margin: 0;
  color: ${adminColors.strongText};
  font-size: 13px;
  font-weight: 750;
  line-height: 1.35;
`

export const Description = styled.p`
  margin: 0;
  color: ${adminColors.muted};
  font-size: 12px;
  line-height: 1.45;
`

export const Controls = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: 6px;
  margin-left: auto;

  @media (max-width: 460px) {
    width: 100%;
    margin-left: 0;
  }
`
