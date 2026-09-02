import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

interface RouteLoadingFallbackProps {
  title?: string
  description?: string
}

export function RouteLoadingFallback({
  title = '관리자 화면을 불러오는 중입니다.',
  description = '잠시만 기다리면 요청한 화면으로 이동합니다.',
}: RouteLoadingFallbackProps) {
  return (
    <LoadingPage role="status" aria-live="polite">
      <LoadingCard>
        <LoadingIcon aria-hidden="true">admin_panel_settings</LoadingIcon>
        <LoadingTitle>{title}</LoadingTitle>
        <LoadingDescription>{description}</LoadingDescription>
      </LoadingCard>
    </LoadingPage>
  )
}

const LoadingPage = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: ${adminColors.background};
  color: ${adminColors.text};
  font-family: inherit;
`

const LoadingCard = styled.section`
  width: min(360px, 100%);
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 10px;
  padding: 32px;
  border: 1px solid ${adminColors.border};
  border-top: 4px solid ${adminColors.primary};
  border-radius: 8px;
  background: ${adminColors.surface};
  box-shadow: 0 18px 48px ${adminColors.shadow};
  text-align: center;
`

const LoadingIcon = styled.span`
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  border: 1px solid ${adminColors.primarySoft};
  border-radius: 8px;
  background: ${adminColors.primaryTint};
  color: ${adminColors.primary};
  font-family: 'Material Symbols Outlined';
  font-size: 24px;
  line-height: 1;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 20;
`

const LoadingTitle = styled.p`
  margin: 0;
  color: ${adminColors.strongText};
  font-size: 18px;
  font-weight: 700;
`

const LoadingDescription = styled.p`
  margin: 0;
  color: ${adminColors.muted};
  font-size: 14px;
  line-height: 1.3;
`
