import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from './helpers/isolated-vite.mjs'
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { availabilityToInput, reservationInputToUtc, reservationTimestamp, reservationInputTimestamp, formatReservationSchedule, reservationTodayInput, formatReservationEventTime } = await server.ssrLoadModule('/src/utils/reservationTime.ts')
const { reservationConditionTime, reservationCancellationDeadlineNotice } = await server.ssrLoadModule('/src/utils/reservationConditions.ts')
after(() => server.close())

for (const [kst, utc] of [
  ['2026-10-24T14:00', '2026-10-24T05:00:00'],
  ['2026-01-01T00:30', '2025-12-31T15:30:00'],
  ['2028-03-01T01:00', '2028-02-29T16:00:00'],
  ['2030-03-10T02:30', '2030-03-09T17:30:00'],
  ['2030-11-03T01:30', '2030-11-02T16:30:00'],
]) test(`KST/UTC round trip ${kst}`, () => {
  assert.equal(reservationInputToUtc(kst), utc)
  assert.equal(availabilityToInput(utc), kst)
  assert.equal(reservationInputTimestamp(kst), Date.parse(utc + 'Z'))
})
for (const offset of ['2026-10-24T05:00:17.123456789Z', '2026-10-24T14:00:17.123456789+09:00', '2026-10-24T00:00:17.123456789-05:00']) test(`offset and nanoseconds preserved ${offset}`, () => {
  assert.equal(availabilityToInput(offset), '2026-10-24T14:00')
  assert.equal(reservationInputToUtc('2026-10-24T14:00', offset), '2026-10-24T05:00:17.123456789')
  assert.equal(reservationInputToUtc('2026-10-24T14:01', offset), '2026-10-24T05:01:00')
})
for (const invalid of ['', null, 'not a date', '2026-02-29T12:00', '2026-04-31T00:00', '2026-01-01T24:00', '2026-01-01T00:60', '2026-01-01T00:00:60', '2026-01-01T00:00:00+09:99', '2026-01-01T00:00:00+18:01']) test(`reject malformed schedule ${invalid}`, () => {
  assert.equal(reservationTimestamp(invalid), null)
  assert.equal(availabilityToInput(invalid), '')
  assert.equal(formatReservationSchedule(invalid), '시각 정보 없음')
})
test('calendar today is Korea, not the browser day; now comparisons use instants', () => {
  assert.equal(reservationTodayInput(Date.parse('2026-12-31T16:00:00Z')), '2027-01-01')
  const now = Date.parse('2026-10-24T04:59:59Z')
  assert.ok(reservationInputTimestamp('2026-10-24T14:00') > now)
  assert.ok(reservationInputTimestamp('2026-10-24T13:59') < now)
})
test('audit civil fields are not assumed UTC; explicit offset events are displayed as instants', () => {
  assert.equal(formatReservationEventTime('2026-10-24T14:00:00'), '2026.10.24 14:00')
  assert.equal(formatReservationEventTime('2026-10-24T05:00:00Z'), '2026.10.24 14:00 (한국 시각)')
})
test('confirmation offsets, configured timezone and cancellation boundaries stay authoritative', () => {
  assert.match(reservationConditionTime('2026-10-24T14:00:00+09:00', 'Asia/Seoul'), /14:00/)
  assert.match(reservationConditionTime('2026-10-24T05:00:00Z', 'Asia/Seoul'), /14:00/)
  assert.match(reservationConditionTime('2026-10-24T14:00:00+09:00', 'UTC'), /05:00/)
  const policy = { cancellable: true, cancellationDeadline: '2026-10-24T13:00:00+09:00' }
  assert.equal(reservationCancellationDeadlineNotice(policy, Date.parse('2026-10-24T03:59:59Z')), null)
  assert.ok(reservationCancellationDeadlineNotice(policy, Date.parse('2026-10-24T04:00:00Z')))
})
