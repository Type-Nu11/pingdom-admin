import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

interface DashboardPlaceholderCardProps {
  icon: string
  label: string
  description: string
}

const MaterialIcon = styled.span`
  width: 1em;
  height: 1em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Material Symbols Outlined';
  font-size: 20px;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 20;
`

const Card = styled.article`
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid ${adminColors.border};
  border-radius: 8px;
  background: ${adminColors.surfaceHighest};
`

const CardTop = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: ${adminColors.surfaceContainer};
  color: ${adminColors.muted};

  ${MaterialIcon} {
    font-size: 18px;
  }
`

const CardContent = styled.div`
  min-width: 0;
`

const CardLabel = styled.strong`
  color: ${adminColors.text};
  font-size: 14px;
  font-weight: 500;
`

const CardDescription = styled.p`
  margin: 2px 0 0;
  color: ${adminColors.softText};
  font-size: 14px;
  line-height: 1.3;
`

function DashboardPlaceholderCard({
  icon,
  label,
  description,
}: DashboardPlaceholderCardProps) {
  return (
    <Card>
      <CardTop>
        <MaterialIcon aria-hidden="true">{icon}</MaterialIcon>
      </CardTop>
      <CardContent>
        <CardLabel>{label}</CardLabel>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  )
}

export default DashboardPlaceholderCard
