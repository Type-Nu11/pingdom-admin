import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

export const Filters = styled.form`
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: ${adminColors.surfaceLow};
  > label { min-width: 0; }
  @media (max-width: 600px) { > label { flex: 1 1 160px; } }
`
export const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
  min-width: 0;
  overflow-wrap: anywhere;
`
export const Text = styled.p`
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.7;
  margin: 0;
  color: ${adminColors.strongText};
`
export const Actions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px;
  justify-content: flex-end;
`
