import { useEffect, type Dispatch, type SetStateAction } from 'react'

const DEFAULT_DISMISS_DELAY_MS = 5_000

export function useAutoDismissMessage(
  message: string,
  setMessage: Dispatch<SetStateAction<string>>,
  delayMs = DEFAULT_DISMISS_DELAY_MS,
) {
  useEffect(() => {
    if (!message) return undefined

    const timer = window.setTimeout(() => setMessage(''), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs, message, setMessage])
}
