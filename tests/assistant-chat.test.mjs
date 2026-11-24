import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from './helpers/isolated-vite.mjs'

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
after(() => server.close())
const { runChatTurn } = await server.ssrLoadModule('/src/features/assistant/model/chatProtocol.ts')
const { getAssistantPrompt, getAssistantTools, executeAssistantTool } = await server.ssrLoadModule('/src/features/assistant/model/assistantTools.ts')
const { isAiProviderAuthFailure } = await server.ssrLoadModule('/src/api/aiChatPolicy.ts')

const tool = (name, input = {}, id = 'tool_1') => ({ type: 'tool_use', name, input, id })
const reply = (...content) => ({ type: 'message', role: 'assistant', content,
  stop_reason: content.some(item => item.type === 'tool_use') ? 'tool_use' : 'end_turn' })
const text = (value = '답변') => ({ type: 'text', text: value })
const options = (overrides = {}) => ({
  history: [], userText: '승인 대기 확인해줘', system: getAssistantPrompt('MERCHANT_OWNER'),
  tools: getAssistantTools('MERCHANT_OWNER'), signal: new AbortController().signal,
  send: async () => reply(text()), execute: async () => { assert.fail('unexpected tool execution') },
  ...overrides,
})

test('uses the app wire format, validates tools, returns a matching tool_result, and keeps finished conversation history', async () => {
  const calls = []
  const done = await runChatTurn(options({
    send: async request => {
      calls.push(request)
      return calls.length === 1 ? reply(tool('getPendingReservations')) : reply(text('승인 대기 3건이에요.'))
    },
    execute: async (name, args) => {
      assert.equal(name, 'getPendingReservations')
      assert.deepEqual(args, {})
      return { data: { pendingReservations: 3 }, facts: [{ label: '승인 대기', value: '3건' }] }
    },
  }))
  assert.equal(calls[0].model, 'claude-haiku-5-5')
  assert.deepEqual(calls[0].tools.map(item => item.name), ['getPendingReservations', 'summarizeCurrentDetail', 'navigateToPage'])
  assert.deepEqual(calls[0].messages, [{ role: 'user', content: '승인 대기 확인해줘' }])
  assert.deepEqual(calls[1].messages.at(-1), {
    role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tool_1', content: '{"pendingReservations":3}' }],
  })
  assert.equal(done.text, '승인 대기 3건이에요.')
  assert.equal(done.facts[0].value, '3건')
  await runChatTurn(options({
    history: [done], userText: '고마워',
    send: async request => {
      assert.deepEqual(request.messages.slice(0, 4), done.messages)
      assert.equal(request.messages.at(-1).content, '고마워')
      return reply(text())
    },
  }))
})

test('rejects the entire unsafe batch before executing any tool', async () => {
  const unsafe = [
    tool('getPendingWork', {}, 'tool_2'),
    tool('navigateToPage', { page: '/admin/users' }, 'tool_2'),
    tool('navigateToPage', { page: 'offers', url: '/admin/users' }, 'tool_2'),
    tool('getPendingReservations', { placeId: 5 }, 'tool_2'),
    tool('getPendingReservations', {}, 'tool_1'),
  ]
  for (const item of unsafe) {
    await assert.rejects(runChatTurn(options({ send: async () => reply(tool('getPendingReservations'), item) })), { code: 'invalid' })
  }
  await assert.rejects(runChatTurn(options({ send: async () => ({ choices: [{ message: 'old format' }] }) })), { code: 'invalid' })
})

test('bounded tool rounds and duplicate intents never repeat the operation', async () => {
  let sends = 0, reads = 0
  await assert.rejects(runChatTurn(options({
    send: async () => reply(tool('getPendingReservations', {}, 'tool_' + ++sends)),
    execute: async () => { reads++; return { data: { pendingReservations: 0 } } },
  })), { code: 'limit' })
  assert.equal(sends, 4)
  assert.equal(reads, 1)
})

test('canceling a pending tool prevents result transmission', async () => {
  let started, finish, sends = 0
  const controller = new AbortController()
  const toolStarted = new Promise(resolve => { started = resolve })
  const result = runChatTurn(options({
    signal: controller.signal,
    send: async () => { sends++; return reply(tool('getPendingReservations')) },
    execute: async () => { started(); await new Promise(resolve => { finish = resolve }); return { data: { pendingReservations: 1 } } },
  }))
  await toolStarted
  controller.abort()
  finish()
  await assert.rejects(result, { name: 'AbortError' })
  assert.equal(sends, 1)
})

test('projects tool scope without allowing the model to choose the store or approve anything', async () => {
  const scope = {
    role: 'MERCHANT_OWNER', selectedPlaceId: null, detail: null,
    input: {}, signal: new AbortController().signal,
  }
  assert.deepEqual(await executeAssistantTool({ ...scope, tool: 'getPendingReservations' }), {
    data: { status: 'select_place_first' }, isError: true,
  })
  assert.deepEqual((await executeAssistantTool({ ...scope, tool: 'approveReservation' })).data, { status: 'unsupported' })
  const detail = { role: 'MERCHANT_OWNER', placeId: 2, facts: [{ label: '상태', value: '승인 대기' }] }
  assert.deepEqual((await executeAssistantTool({ ...scope, tool: 'summarizeCurrentDetail', selectedPlaceId: 1, detail })).data,
    { status: 'no_detail_selected' })
  assert.deepEqual((await executeAssistantTool({ ...scope, tool: 'summarizeCurrentDetail', selectedPlaceId: 2, detail })).data,
    { status: 'done', facts: detail.facts })
})

test('rejects obvious personal inputs and distinguishes a provider 401 from the web session', async () => {
  for (const userText of ['문의 010-1234-5678', '메일 sample@example.test', 'x'.repeat(501)]) {
    await assert.rejects(runChatTurn(options({ userText, send: async () => { assert.fail('sent blocked input') } })))
  }
  assert.equal(isAiProviderAuthFailure('{"type":"error","error":{"type":"authentication_error"}}'), true)
  assert.equal(isAiProviderAuthFailure({ code: 'INVALID_TOKEN' }), false)
})
