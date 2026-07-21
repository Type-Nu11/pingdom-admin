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
  min-height: 116px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border: 1px solid ${adminColors.border};
  border-radius: 10px;
  background: ${adminColors.surfaceHighest};
`

const CardTop = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${adminColors.muted};
`

const CardLabel = styled.strong`
  color: ${adminColors.text};
  font-size: 14px;
  font-weight: 600;
`

const CardDescription = styled.p`
  margin: 0;
  color: ${adminColors.softText};
  font-size: 13px;
  line-height: 1.5;
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
        <CardLabel>{label}</CardLabel>
      </CardTop>
      <CardDescription>{description}</CardDescription>
    </Card>
  )
}

export default DashboardPlaceholderCard
