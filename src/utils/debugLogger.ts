const isDebugLogEnabled = import.meta.env.DEV

export function logDebugError(message: string, error: unknown) {
  if (!isDebugLogEnabled) {
    return
  }

  console.error(message, error)
}
