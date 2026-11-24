import { useState, type PropsWithChildren } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { getAuthSessionId } from '../../../utils/authStorage'
import { useMerchantPlaceSelection } from '../../../app/providers/MerchantPlaceContext'
import { AssistantDetailContext, createAssistantDetailRegistry } from '../model/AssistantDetailContext'
import type { AssistantRole } from '../model/assistantTools'
import { PingDomAssistant } from './PingDomAssistant'

const enabled = import.meta.env.VITE_ENABLE_PINGDOM_AI === 'true'

function AssistantScope({ children, role, placeId }: PropsWithChildren<{ role: AssistantRole; placeId: number | null }>) {
  const [details] = useState(createAssistantDetailRegistry)
  return <AssistantDetailContext.Provider value={details}>
    {children}
    <PingDomAssistant key={placeId ?? 'no-place'} role={role} selectedPlaceId={placeId} readDetail={details.read} />
  </AssistantDetailContext.Provider>
}

function AuthenticatedAssistantWorkspace({ children, role, placeId = null }: PropsWithChildren<{ role: AssistantRole; placeId?: number | null }>) {
  const { user } = useAuth()
  const accountScope = `${getAuthSessionId()}:${user?.id ?? ''}:${user?.username ?? ''}:${role}`
  return <AssistantScope key={accountScope} role={role} placeId={placeId}>{children}</AssistantScope>
}

export function AdminAssistantWorkspace({ children }: PropsWithChildren) {
  return enabled ? <AuthenticatedAssistantWorkspace role="ADMIN">{children}</AuthenticatedAssistantWorkspace> : children
}

export function MerchantAssistantWorkspace({ children }: PropsWithChildren) {
  const { selectedPlaceId } = useMerchantPlaceSelection()
  return enabled ? <AuthenticatedAssistantWorkspace role="MERCHANT_OWNER" placeId={selectedPlaceId}>{children}</AuthenticatedAssistantWorkspace> : children
}
