export const AI_CHAT_PATH = '/ai/chat'

export function isAiProviderAuthFailure(body: unknown) {
  if (typeof body === 'string') {
    if (body.length > 4096) return false
    try { body = JSON.parse(body) } catch { return false }
  }
  if (!body || typeof body !== 'object') return false
  if ('code' in body && body.code === 'AI_PROVIDER_AUTH_FAILED') return true
  if (!('type' in body) || body.type !== 'error' || !('error' in body)) return false
  const detail = body.error
  return Boolean(detail && typeof detail === 'object' && 'type' in detail
    && (detail.type === 'authentication_error' || detail.type === 'permission_error'))
}
