import { useState } from 'react'
import { useUnsavedChanges } from './useUnsavedChanges'

// Key forms by entity/store so a different draft gets a new baseline.
// A successful save may supply the reset form's snapshot (e.g. an empty product name).
export function useSavedDraft(snapshot: string, { enabled = true, busy = false } = {}) {
  const [saved, setSaved] = useState(snapshot)
  const isDirty = snapshot !== saved
  const guard = useUnsavedChanges(enabled && isDirty, enabled && busy)
  return { isDirty, request: guard.request, markSaved: (nextSnapshot = snapshot) => { guard.markClean(); setSaved(nextSnapshot) } }
}
