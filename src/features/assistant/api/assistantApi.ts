import customAxios, { isApiError } from '../../../api/customAxios'
import { isAiProviderAuthFailure, type AI_CHAT_PATH } from '../../../api/aiChatPolicy'
import { CHAT_RESPONSE_LIMIT, ChatProtocolError, utf8Length, type ChatRequest } from '../model/chatProtocol'

export class AssistantTransportError extends Error {
  constructor(public readonly code: 'session' | 'forbidden' | 'rate' | 'unavailable' | 'timeout' | 'network') {
    super(code)
  }
}

// Keep the path visible to the source API inventory; the type ties it to the auth policy.
const PATH: typeof AI_CHAT_PATH = '/ai/chat'

export async function sendAssistantMessage(request: ChatRequest, signal: AbortSignal): Promise<unknown> {
  const transport = new AbortController()
  const abort = () => transport.abort()
  let oversized = false
  signal.throwIfAborted()
  signal.addEventListener('abort', abort, { once: true })
  try {
    const { data } = await customAxios.post<unknown>(PATH, request, {
      signal: transport.signal,
      timeout: 30_000,
      responseType: 'text',
      maxContentLength: CHAT_RESPONSE_LIMIT,
      onDownloadProgress(event) {
        if (event.loaded > CHAT_RESPONSE_LIMIT) { oversized = true; transport.abort() }
      },
    })
    if (typeof data !== 'string' || utf8Length(data) > CHAT_RESPONSE_LIMIT) throw new ChatProtocolError('invalid')
    try { return JSON.parse(data) } catch { throw new ChatProtocolError('invalid') }
  } catch (error) {
    signal.throwIfAborted()
    if (oversized) throw new ChatProtocolError('invalid')
    if (!isApiError(error)) throw error
    const status = error.response?.status
    if (isAiProviderAuthFailure(error.response?.data) || status === 404 || (status && status >= 500)) {
      throw new AssistantTransportError('unavailable')
    }
    if (status === 401) throw new AssistantTransportError('session')
    if (status === 403) throw new AssistantTransportError('forbidden')
    if (status === 429) throw new AssistantTransportError('rate')
    if (error.category === 'timeout') throw new AssistantTransportError('timeout')
    throw new AssistantTransportError('network')
  } finally {
    signal.removeEventListener('abort', abort)
  }
}
