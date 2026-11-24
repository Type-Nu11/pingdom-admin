// The mobile assistant and web share the Anthropic Messages wire contract.
export const CHAT_MODEL = 'claude-haiku-5-5'
export const CHAT_INPUT_LIMIT = 500
export const CHAT_RESPONSE_LIMIT = 32 * 1024
const REQUEST_LIMIT = 64 * 1024
const MAX_ROUNDS = 4
const MAX_HISTORY_MESSAGES = 32
const MAX_BATCH_TOOLS = 4

export type ToolDefinition = {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, { type: 'string'; enum: string[] }>
    required: string[]
    additionalProperties: false
  }
}

type TextBlock = { type: 'text'; text: string }
type ToolUse = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
type AssistantBlock = TextBlock | ToolUse
  | { type: 'thinking'; thinking: string; signature: string }
  | { type: 'redacted_thinking'; data: string }
type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string; is_error?: true }
export type ChatMessage = { role: 'user'; content: string | ToolResultBlock[] }
  | { role: 'assistant'; content: AssistantBlock[] }
export type ChatRequest = {
  model: typeof CHAT_MODEL
  max_tokens: number
  system: string
  messages: ChatMessage[]
  tools: ToolDefinition[]
}
export type ChatFact = { label: string; value: string }
export type ToolOutcome = {
  data: Record<string, unknown>
  isError?: boolean
  target?: string
  facts?: readonly ChatFact[]
}
export type ChatTurn = {
  messages: ChatMessage[]
  text: string
  targets: string[]
  facts: readonly ChatFact[]
}
export class ChatProtocolError extends Error {
  constructor(public readonly code: 'invalid' | 'limit' | 'input' | 'sensitive') { super(code) }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
export const utf8Length = (text: string) => new TextEncoder().encode(text).length
const invalid = (): never => { throw new ChatProtocolError('invalid') }

export function prepareUserText(value: string) {
  const text = value.trim()
  if (!text || text.length > CHAT_INPUT_LIMIT) throw new ChatProtocolError('input')
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)
    || /(?:^|[^\d])(?:\+?82[ .-]?(?:0)?|0)(?:1[016789]|2|[3-6][1-5]|70)[ .-]?\d{3,4}[ .-]?\d{4}(?!\d)/.test(text)
    || /\b(?:sk-ant-[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/.test(text)) {
    throw new ChatProtocolError('sensitive')
  }
  return text
}

function parseReply(raw: unknown) {
  // A transport error page, wrapper DTO, or OpenAI response is not a tool request.
  if (!isRecord(raw) || raw.type !== 'message' || raw.role !== 'assistant'
    || (raw.stop_reason !== 'end_turn' && raw.stop_reason !== 'tool_use')
    || !Array.isArray(raw.content) || !raw.content.length || raw.content.length > 16) return invalid()

  const blocks: AssistantBlock[] = []
  const tools: ToolUse[] = []
  const text: string[] = []
  for (const block of raw.content) {
    if (!isRecord(block)) return invalid()
    if (block.type === 'text' && typeof block.text === 'string') {
      text.push(block.text)
      blocks.push({ type: 'text', text: block.text })
    } else if (block.type === 'tool_use' && typeof block.id === 'string'
      && /^[A-Za-z0-9_-]{1,128}$/.test(block.id) && typeof block.name === 'string'
      && isRecord(block.input)
      && (block.caller === undefined || (isRecord(block.caller) && block.caller.type === 'direct'))) {
      const tool: ToolUse = { type: 'tool_use', id: block.id, name: block.name, input: block.input }
      tools.push(tool)
      blocks.push(tool)
    } else if (block.type === 'thinking' && typeof block.thinking === 'string'
      && typeof block.signature === 'string' && block.signature) {
      blocks.push({ type: 'thinking', thinking: block.thinking, signature: block.signature })
    } else if (block.type === 'redacted_thinking' && typeof block.data === 'string' && block.data) {
      blocks.push({ type: 'redacted_thinking', data: block.data })
    } else return invalid()
  }
  if ((raw.stop_reason === 'tool_use') !== (tools.length > 0) || tools.length > MAX_BATCH_TOOLS) return invalid()
  const answer = text.join('\n').trim()
  if (!tools.length && !answer) return invalid()
  return { blocks, tools, answer }
}

function validateInput(tool: ToolDefinition, value: Record<string, unknown>) {
  const { properties, required } = tool.input_schema
  return required.every(key => Object.hasOwn(value, key))
    && Object.keys(value).every(key => Object.hasOwn(properties, key)
      && typeof value[key] === 'string' && properties[key].enum.includes(value[key]))
}

export async function runChatTurn(options: {
  history: readonly ChatTurn[]
  userText: string
  system: string
  tools: ToolDefinition[]
  send: (request: ChatRequest, signal: AbortSignal) => Promise<unknown>
  execute: (tool: string, input: Record<string, unknown>, signal: AbortSignal) => Promise<ToolOutcome>
  signal: AbortSignal
}): Promise<ChatTurn> {
  const { signal } = options
  const userText = prepareUserText(options.userText)
  const messages: ChatMessage[] = [{ role: 'user', content: userText }]
  // Trim entire turns so a tool_use can never be detached from its tool_result.
  const prior = options.history.slice(-10)
  const targets = new Set<string>()
  const facts = new Map<string, ChatFact>()
  const usedIds = new Set<string>()
  const outcomes = new Map<string, ToolOutcome>()
  const definitions = new Map(options.tools.map(tool => [tool.name, tool]))

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    signal.throwIfAborted()
    const request: ChatRequest = {
      model: CHAT_MODEL, max_tokens: 2048, system: options.system, tools: options.tools,
      messages: [...prior.flatMap(turn => turn.messages), ...messages],
    }
    const exceedsRequestLimit = () => request.messages.length > MAX_HISTORY_MESSAGES
      || utf8Length(JSON.stringify(request)) > REQUEST_LIMIT
    while (exceedsRequestLimit()) {
      if (!prior.length) throw new ChatProtocolError('limit')
      prior.shift()
      request.messages = [...prior.flatMap(turn => turn.messages), ...messages]
    }

    const raw = await options.send(request, signal)
    signal.throwIfAborted()
    const parsed = parseReply(raw)
    if (!parsed.tools.length) {
      messages.push({ role: 'assistant', content: parsed.blocks })
      return { messages, text: parsed.answer, targets: [...targets], facts: [...facts.values()] }
    }
    if (round === MAX_ROUNDS) throw new ChatProtocolError('limit')
    // Validate the entire batch before any tool can access app data.
    for (const tool of parsed.tools) {
      const definition = definitions.get(tool.name)
      if (!definition || !validateInput(definition, tool.input) || usedIds.has(tool.id)) return invalid()
      usedIds.add(tool.id)
    }
    messages.push({ role: 'assistant', content: parsed.blocks })
    const results: ToolResultBlock[] = []
    for (const tool of parsed.tools) {
      signal.throwIfAborted()
      const key = JSON.stringify([tool.name, Object.entries(tool.input).sort(([left], [right]) => left.localeCompare(right))])
      let outcome = outcomes.get(key)
      if (!outcome) {
        outcome = await options.execute(tool.name, tool.input, signal)
        outcomes.set(key, outcome)
      }
      signal.throwIfAborted()
      if (outcome.target) targets.add(outcome.target)
      for (const fact of outcome.facts ?? []) facts.set(fact.label, fact)
      results.push({
        type: 'tool_result', tool_use_id: tool.id, content: JSON.stringify(outcome.data),
        ...(outcome.isError ? { is_error: true as const } : {}),
      })
    }
    messages.push({ role: 'user', content: results })
  }
  throw new ChatProtocolError('limit')
}
