// A caught Axios failure may never reach console/pageerror. Report it to the
// test harness before handing it back to the production error handling.
import { verifyReservationFixture } from './reservation-fixture-contract.mjs'

export function observeFixtureAdapter(adapter) {
  return async config => {
    const info = { kind: 'fixture-api', method: (config.method || 'get').toUpperCase(), path: config.url?.split('?')[0] }
    try {
      if (typeof config.data === 'string') {
        // Only reservation endpoints are inspected by this guard; no payment policy changes.
        const path = config.url?.split('?')[0]
        if (/^\/(?:admin\/reservations|merchant-owner\/(?:reservations|availabilities))(?:\/|$)/.test(path ?? '')) verifyReservationFixture(path, JSON.parse(config.data))
      }
      const response = await adapter(config)
      verifyReservationFixture(config.url?.split('?')[0], response.data)
      if (response.status >= 400) await globalThis.__pingdomQaFailure?.({ ...info, status: response.status })
      return response
    } catch (error) {
      await globalThis.__pingdomQaFailure?.({ ...info, status: error.response?.status ?? 0, text: error.message })
      throw error
    }
  }
}
