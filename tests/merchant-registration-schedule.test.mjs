import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { parseRegistrationSchedule, buildRegistrationOperatingDays } = await server.ssrLoadModule('/src/utils/merchantRegistrationSchedule.ts')
after(() => server.close())

test('editing an existing schedule retains multiple breaks and their time precision', () => {
  const breakTimes = [{ opensAt: '14:00:00', closesAt: '15:00:00' }, { opensAt: '17:00:30', closesAt: '17:30:30' }]
  const draft = parseRegistrationSchedule(JSON.stringify([{ dayOfWeek: 'MONDAY', status: 'OPEN', opensAt: '10:00:00', closesAt: '20:00:00', breakTimes }]))
  const request = buildRegistrationOperatingDays(draft)
  assert.deepEqual(request[0].breakTimes, breakTimes)
  request[0].breakTimes[0].opensAt = '13:00:00'
  assert.equal(draft[0].breakTimes[0].opensAt, '14:00:00', 'serializing must not mutate the draft')
})

test('closed and 24-hour days omit open-only fields; new forms retain seven-day defaults', () => {
  for (const status of ['CLOSED', 'OPEN_24_HOURS']) {
    const draft = parseRegistrationSchedule(JSON.stringify([{ dayOfWeek: 'MONDAY', status }]))
    assert.deepEqual(buildRegistrationOperatingDays(draft)[0], { dayOfWeek: 'MONDAY', status })
  }
  for (const value of [null, 'invalid', '{}']) {
    const request = buildRegistrationOperatingDays(parseRegistrationSchedule(value))
    assert.equal(request.length, 7)
    assert.deepEqual(request[0].breakTimes, [])
  }
})
