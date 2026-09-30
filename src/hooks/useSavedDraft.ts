import { useState } from 'react'

// Callers key their form by application ID so a different draft gets a new baseline.
export function useSavedDraft(snapshot: string) {
  const [saved, setSaved] = useState(snapshot)
  return { isDirty: snapshot !== saved, markSaved: () => setSaved(snapshot) }
}
