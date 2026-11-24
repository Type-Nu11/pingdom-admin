import { createContext, useContext, useLayoutEffect } from 'react'
import type { AssistantDetail } from './assistantTools'

export const AssistantDetailContext = createContext<{
  register(detail: AssistantDetail): () => void
  read(): AssistantDetail | null
} | null>(null)

export function useAssistantDetail(detail: AssistantDetail | null) {
  const context = useContext(AssistantDetailContext)
  useLayoutEffect(() => {
    if (context && detail) return context.register(detail)
  }, [context, detail])
}

export function createAssistantDetailRegistry() {
  let current: { detail: AssistantDetail } | null = null
  return {
    register(detail: AssistantDetail) {
      const registration = { detail }
      current = registration
      return () => { if (current === registration) current = null }
    },
    read: () => current?.detail ?? null,
  }
}
