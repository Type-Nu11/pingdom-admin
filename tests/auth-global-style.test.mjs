import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import axios from 'axios'
import { JSDOM } from 'jsdom'
import { createServer } from './helpers/isolated-vite.mjs'
import { installAuthLocks, loginData, token } from './helpers/auth-session.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/console/login', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'Event', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
installAuthLocks(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, StrictMode } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AppProvider } = await server.ssrLoadModule('/src/app/providers/AppProvider.tsx')
const { ServerStyleSheet } = await server.ssrLoadModule('styled-components')
const auth = await server.ssrLoadModule('/src/utils/authStorage.ts')
const { restoreAuthSession } = await server.ssrLoadModule('/src/api/authSessionApi.ts')
const originalAdapter = axios.defaults.adapter
let root, release, mode, gate, sheet
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
function assertGlobalStyle() {
  // SSR-loaded styled-components collects CSS rather than applying browser layout in JSDOM.
  // The real browser check separately measures computed styles and document dimensions.
  const css = sheet.getStyleTags()
  assert.match(css, /body\{[^}]*margin:0;/)
  assert.match(css, /Pretendard/)
  assert.match(css, /box-sizing:border-box/)
}
beforeEach(() => {
  localStorage.setItem('pingdom-auth-control', JSON.stringify({ id: crypto.randomUUID(), blocked: false }))
  mode = '503'; gate = new Promise(resolve => { release = resolve })
  axios.defaults.adapter = async config => {
    if (config.url === '/auth/token/refresh') await gate
    if (mode !== 'ok') throw new axios.AxiosError('synthetic auth error', 'ERR_BAD_RESPONSE', config, {}, { ...response(config, {}), status: mode === 'expired' ? 401 : 503 })
    return response(config, config.url === '/users/me' ? loginData(1) : { accessToken: token(1) })
  }
  root = createRoot(document.getElementById('root'))
  sheet = new ServerStyleSheet()
})
afterEach(async () => {
  await act(async () => { release(); await restoreAuthSession(); root.unmount() })
  sheet.seal()
})
after(async () => { axios.defaults.adapter = originalAdapter; await server.close(); dom.window.close() })
async function mount() {
  await act(async () => root.render(sheet.collectStyles(h(StrictMode, {}, h(AppProvider, {}, h('main', { 'data-testid': 'content' }, 'ready'))))))
}

test('actual AppProvider retains global styles while cookie recovery is pending', async () => {
  await mount()
  assert.match(document.body.textContent, /로그인 상태를 확인하고 있습니다/)
  assert.equal(document.querySelector('[data-testid="content"]'), null)
  assertGlobalStyle()
})
test('actual AppProvider retains global styles on auth outage and successful retry', async () => {
  await mount()
  await act(async () => { release(); await restoreAuthSession() })
  assert.ok(document.querySelector('[role="alert"]'))
  assertGlobalStyle()
  mode = 'ok'
  await act(async () => { [...document.querySelectorAll('button')].find(button => button.textContent === '다시 확인').click(); await restoreAuthSession() })
  assert.ok(document.querySelector('[data-testid="content"]'))
  assertGlobalStyle()
})
test('global styles remain applied when an expired cookie returns to guest UI', async () => {
  mode = 'expired'; await mount()
  await act(async () => { release(); await restoreAuthSession() })
  assert.equal(auth.getStoredAuthState(), null)
  assert.ok(document.querySelector('[data-testid="content"]'))
  assertGlobalStyle()
})
