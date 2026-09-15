import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

export const PageContent = styled.main`
  min-height: 0;
  flex: 1;
  overflow: hidden;
  padding: 20px 24px;
  background: ${adminColors.background};

  @media (max-width: 1080px) {
    overflow-y: auto;
  }

  @media (max-height: 650px) {
    overflow-y: auto;
  }

  @media (max-width: 720px) {
    padding: 24px 16px;
  }
`

export const PageStack = styled.div`
  width: min(1280px, 100%);
  min-height: 0;
  height: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 1080px) {
    height: auto;
  }

  @media (max-height: 650px) {
    height: auto;
  }
`

export const Workspace = styled.div<{ $constrained: boolean }>`
  min-height: ${({ $constrained }) => ($constrained ? '320px' : '0')};
  height: ${({ $constrained }) => ($constrained ? 'min(620px, 65dvh)' : 'auto')};
  flex: ${({ $constrained }) => ($constrained ? 'initial' : '1')};
  display: grid;
  grid-template-columns: minmax(320px, 400px) minmax(0, 1fr);
  gap: 16px;

  > * {
    min-height: 0;
    height: 100%;
  }

  @media (max-height: 650px) and (min-width: 1081px) {
    min-height: 320px;
    height: 65dvh;
    flex: initial;
  }

  @media (max-width: 1080px) {
    min-height: 360px;
    height: auto;
    flex: initial;
    grid-template-columns: 1fr;

    > * {
      height: min(620px, 65dvh);
    }
  }
`
