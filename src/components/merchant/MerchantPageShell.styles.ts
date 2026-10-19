import styled from 'styled-components'
import { typo, adminColors } from '../../styles/theme'

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
  color: ${adminColors.primaryForeground};
  ${typo.label.bold}
`

export const Title = styled.h1`
  margin: 0 0 6px;
  color: ${adminColors.strongText};
  ${typo.title1.bold}
`

export const Description = styled.p`
  margin: 0;
  color: ${adminColors.muted};
  ${typo.body.regular}
`
