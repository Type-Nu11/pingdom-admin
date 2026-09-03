import styled from 'styled-components'
import { adminColors } from './theme'

export const ReviewContent = styled.main`
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

export const ReviewPageStack = styled.div`
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

export const ReviewWorkspace = styled.div`
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 16px;

  > section {
    min-height: 0;
    height: 100%;
  }

  @media (max-width: 1080px) {
    min-height: 360px;
    flex: initial;
    grid-template-columns: 1fr;

    > section {
      height: min(620px, 65dvh);
    }
  }
`

export const ReviewScrollWorkspace = styled(ReviewWorkspace)`
  flex: initial;
  height: min(620px, 65dvh);
  min-height: 440px;
`
