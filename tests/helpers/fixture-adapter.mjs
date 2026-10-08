// A caught Axios failure may never reach console/pageerror. Report it to the
// test harness before handing it back to the production error handling.
export function observeFixtureAdapter(adapter) {
  return async config => {
    const info = { kind: 'fixture-api', method: (config.method || 'get').toUpperCase(), path: config.url?.split('?')[0] }
    try {
      const response = await adapter(config)
      if (response.status >= 400) await globalThis.__pingdomQaFailure?.({ ...info, status: response.status })
      return response
    } catch (error) {
      await globalThis.__pingdomQaFailure?.({ ...info, status: error.response?.status ?? 0, text: error.message })
      throw error
    }
  }
}
