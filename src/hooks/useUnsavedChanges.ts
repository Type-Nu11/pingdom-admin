import { useContext, useId, useLayoutEffect } from 'react'
import { UnsavedChangesContext } from '../components/common/UnsavedChangesContext'

export function useUnsavedNavigation() {
  const protection = useContext(UnsavedChangesContext)
  return (action: () => void) => protection ? protection.request(action) : action()
}

export function useUnsavedChanges(dirty: boolean, busy = false) {
  const protection = useContext(UnsavedChangesContext)
  const id = useId()
  useLayoutEffect(() => {
    protection?.update(id, { dirty, busy })
  }, [protection, id, dirty, busy])
  useLayoutEffect(() => () => protection?.update(id, null), [protection, id])
  return {
    request: (action: () => void) => protection ? protection.request(action, id) : action(),
    markClean: () => protection?.update(id, { dirty: false, busy: false }),
  }
}
