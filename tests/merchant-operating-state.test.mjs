import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { MerchantPlaceProvider } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceProvider.tsx')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { useMerchantPlaceOperations } = await server.ssrLoadModule('/src/hooks/useMerchantPlaceOperations.ts')
const { useMerchantOperatingNotices } = await server.ssrLoadModule('/src/hooks/useMerchantOperatingNotices.ts')
const { MerchantOperatingSummary } = await server.ssrLoadModule('/src/components/common/MerchantOperatingSummary.tsx')
let root, state, handler, cleared
const auth = { clearAuth() { cleared++ } }
const result = (value) => ({ currentlyOperating: value, checkedAt: '2026-09-30T10:00:00', notices: [], regularHours: [], operatingExceptions: [] })
beforeEach(() => {
  root = createRoot(document.getElementById('root')); cleared = 0
  handler = async () => result(true)
  client.defaults.adapter = async config => {
    const data = config.url.endsWith('/me') ? { placeIds: [1, 2] } : config.url.endsWith('/media') ? { media: [] } : await handler(config)
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
for (const [name, hook] of [['operations', useMerchantPlaceOperations], ['notices', useMerchantOperatingNotices]]) {
  const refresh = () => name === 'operations' ? state.fetchPlaceOperations(state.selectedPlaceId) : state.fetchNotices(state.selectedPlaceId)
  const value = () => name === 'operations' ? state.operating?.currentlyOperating : state.currentlyOperating
  async function mount() {
    function Probe() { state = hook(); return null }
    await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(MerchantPlaceProvider, null, h(Probe)))))
  }
  test(name + ': boolean/absent, failure and retry do not retain old open state', async () => {
    await mount(); assert.equal(value(), true)
    for (const next of [false, null, undefined]) {
      handler = async () => result(next)
      await act(async () => refresh())
      assert.ok(value() == null || value() === false)
    }
    handler = async () => { throw new Error('synthetic failure') }
    await act(async () => refresh())
    assert.ok(value() == null)
    assert.ok(name === 'operations' ? state.operatingFailed : state.errorMessage)
    handler = async () => result(true)
    await act(async () => refresh())
    assert.equal(value(), true)
  })
  test(name + ': loading clears old value and late prior place response is ignored', async () => {
    await mount()
    const pending = []
    handler = config => new Promise(resolve => pending.push({ config, resolve }))
    await act(async () => { refresh() })
    assert.ok(value() == null)
    handler = async () => result(false)
    await act(async () => state.selectPlace(2))
    assert.equal(value(), false)
    await act(async () => pending.forEach(item => item.resolve(result(true))))
    assert.equal(value(), false)
  })
}
test('summary distinguishes missing, loading, failed and server values', async () => {
  for (const [props, text] of [
    [{ value: true }, '현재 영업시간입니다.'],
    [{ value: false }, '현재 영업시간 외입니다.'],
    [{ value: null }, '현재 영업 상태를 확인할 수 없습니다.'],
    [{ value: undefined }, '현재 영업 상태를 확인할 수 없습니다.'],
    [{ value: true, loading: true }, '영업 상태를 확인하는 중입니다.'],
    [{ value: true, failed: true }, '현재 영업 상태를 확인할 수 없습니다.'],
  ]) {
    await act(async () => root.render(h(MerchantOperatingSummary, { loading: false, failed: false, onRetry() {}, ...props })))
    assert.equal(document.querySelector('strong').textContent, text)
  }
})
