import { useState } from 'react'
import { useUnsavedChanges } from './useUnsavedChanges'

// Callers key their form by application ID so a different draft gets a new baseline.
export function useSavedDraft(snapshot: string, { enabled = true, busy = false } = {}) {
  const [saved, setSaved] = useState(snapshot)
  const isDirty = snapshot !== saved
  const guard = useUnsavedChanges(enabled && isDirty, enabled && busy)
  return { isDirty, request: guard.request, markSaved: () => { guard.markClean(); setSaved(snapshot) } }
}
