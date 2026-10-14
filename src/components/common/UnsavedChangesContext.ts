import { createContext } from 'react'

export interface FormProtection {
  dirty: boolean
  busy: boolean
}

export const UnsavedChangesContext = createContext<{
  update: (id: string, protection: FormProtection | null) => void
  request: (action: () => void, id?: string) => void
} | null>(null)
