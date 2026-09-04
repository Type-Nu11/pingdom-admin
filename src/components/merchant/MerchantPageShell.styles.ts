import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

export const Page = styled.main`
  min-height: calc(100vh - 64px);
  padding: 0;
  background: transparent;
`

export const Content = styled.div`
  width: min(calc(100% - 64px), 1100px);
  margin: 0 auto;
  padding: 36px 0 48px;

  @media (max-width: 720px) {
    width: calc(100% - 32px);
    padding: 28px 0 36px;
  }
`

export const Header = styled.section`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 34px;

  @media (max-width: 640px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 28px;
  }
`

export const Eyebrow = styled.p`
  margin: 0 0 8px;
  color: ${adminColors.primary};
  font-size: 13px;
  font-weight: 700;
`

export const Title = styled.h1`
  margin: 0 0 6px;
  color: ${adminColors.strongText};
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
`

export const Description = styled.p`
  margin: 0;
  color: ${adminColors.muted};
  font-size: 16px;
  line-height: 1.5;
`
