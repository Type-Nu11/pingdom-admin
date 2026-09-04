import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

export const PageContent = styled.main`
  min-height: 0;
  flex: 1;
  overflow: hidden;
  padding: 32px 32px 24px;
  background: ${adminColors.background};

  @media (max-width: 1080px) {
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
`

export const Workspace = styled.div<{ $constrained: boolean }>`
  min-height: ${({ $constrained }) => ($constrained ? '440px' : '0')};
  height: ${({ $constrained }) => ($constrained ? 'min(620px, 65dvh)' : 'auto')};
  flex: ${({ $constrained }) => ($constrained ? 'initial' : '1')};
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 16px;

  > * {
    min-height: 0;
    height: 100%;
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
