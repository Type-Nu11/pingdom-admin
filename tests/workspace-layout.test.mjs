import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from './helpers/isolated-vite.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, useEffect } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter, useLocation, useNavigate } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { WorkspaceFrame } = await server.ssrLoadModule('/src/app/layouts/WorkspaceFrame.tsx')
const { AdminLayout } = await server.ssrLoadModule('/src/app/layouts/AdminLayout.tsx')
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
let root, logouts, auth
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear()
  root = createRoot(document.getElementById('root'))
  logouts = 0
  auth = { user: { id: 99, username: '합성 관리자', role: 'ADMIN' }, logout() { logouts++ } }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

function RouteProbe() {
  const location = useLocation(), navigate = useNavigate()
  return h('div', {}, h('output', { 'data-testid': 'location' }, location.pathname),
    h('button', { onClick: () => navigate(-1) }, '뒤로'))
}
async function render(content) {
  await act(async () => root.render(h(AuthContext.Provider, { value: auth },
    h(MemoryRouter, { basename: '/console', initialEntries: ['/console/before', '/console/bans'], initialIndex: 1 }, content, h(RouteProbe)))))
}
const logoutButton = () => [...document.querySelectorAll('button')].find(button => button.textContent.endsWith('로그아웃'))

test('workspace frame preserves sibling order and keeps overlays outside the main area without extra DOM', async () => {
  await act(async () => root.render(h(WorkspaceFrame, {
    parts: { AppShell: 'section', MainArea: 'main', TopBar: 'header' }, mainId: 'scroll-area', mainClassName: 'workspace-content',
    sidebar: h('nav', {}, '메뉴'), header: h('h1', {}, '제목'), overlays: h('aside', { role: 'dialog' }, '팝업'),
  }, h('article', {}, '본문'))))
  const shell = document.querySelector('#root > section'), main = document.getElementById('scroll-area')
  assert.deepEqual([...shell.children].map(node => node.tagName), ['NAV', 'MAIN', 'ASIDE'])
  assert.deepEqual([...main.children].map(node => node.tagName), ['HEADER', 'ARTICLE'])
  assert.equal(main.className, 'workspace-content')
  assert.equal(main.contains(document.querySelector('[role="dialog"]')), false)
})

test('admin layout preserves one sidebar, scroll ID, basename home link, account label and page-owned header action', async () => {
  let refreshes = 0
  await render(h(AdminLayout, { identifier: '합성 관리자', profileLabel: '관리자 계정',
    header: h('button', { onClick: () => refreshes++ }, '검사 새로고침') }, h('main', {}, '업무 내용')))
  assert.equal(document.querySelectorAll('nav[aria-label="관리자 메뉴"]').length, 1)
  assert.equal(document.querySelectorAll('#admin-main-scroll-area').length, 1)
  assert.equal(document.querySelector('a[aria-label="대시보드로 이동"]').getAttribute('href'), '/console/dashboard')
  assert.match(document.querySelector('[aria-label="관리자 계정"]').textContent, /합성 관리자/)
  await act(async () => [...document.querySelectorAll('header button')].find(button => button.textContent === '검사 새로고침').click())
  assert.equal(refreshes, 1)
  assert.equal(logouts, 0)
})

test('admin logout calls auth once and replaces the current basename route', async () => {
  await render(h(AdminLayout, { identifier: '관리자', header: '제목' }, '본문'))
  assert.equal(logoutButton().type, 'button')
  await act(async () => logoutButton().click())
  assert.equal(logouts, 1)
  assert.equal(document.querySelector('output').textContent, '/login')
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === '뒤로').click())
  assert.equal(document.querySelector('output').textContent, '/before')
})

test('header/account updates preserve mounted input, overlay and main DOM and use the latest logout callback', async () => {
  let mounts = 0, unmounts = 0, replacementLogouts = 0
  function Form() {
    useEffect(() => { mounts++; return () => { unmounts++ } }, [])
    return h('input', { 'aria-label': '입력', defaultValue: '초기 입력' })
  }
  const content = name => h(AdminLayout, { identifier: name, header: name, overlays: h('aside', { role: 'dialog' }, '팝업') }, h(Form))
  await render(content('첫 계정'))
  const main = document.getElementById('admin-main-scroll-area'), input = document.querySelector('input'), dialog = document.querySelector('[role="dialog"]')
  input.value = '작성 중'
  auth = { ...auth, logout() { replacementLogouts++ } }
  await render(content('다음 계정'))
  assert.equal(document.getElementById('admin-main-scroll-area'), main)
  assert.equal(document.querySelector('input'), input)
  assert.equal(input.value, '작성 중')
  assert.equal(document.querySelector('[role="dialog"]'), dialog)
  assert.equal(main.contains(dialog), false)
  assert.equal(mounts, 1); assert.equal(unmounts, 0)
  await act(async () => logoutButton().click())
  assert.equal(replacementLogouts, 1); assert.equal(logouts, 0)
})

test('community text profile preserves the existing icon-free presentation', async () => {
  await render(h(AdminLayout, { identifier: '커뮤니티 관리자', profileAppearance: 'text', header: '커뮤니티' }, '내용'))
  const footer = document.querySelector('nav').lastElementChild
  assert.doesNotMatch(footer.textContent, /admin_panel_settings|logout/)
  assert.equal(logoutButton().textContent, '로그아웃')
  assert.match(footer.textContent, /커뮤니티 관리자/)
})

test('dashboard injects its original styled components and icon without importing a page into the layout', async () => {
  const S = await server.ssrLoadModule('/src/pages/dashboard/DashboardPage.styles.ts')
  await render(h(AdminLayout, { identifier: '대시보드 관리자', parts: S, icon: S.MaterialIcon, header: h(S.TopTitle, { as: 'h1' }, '대시보드') }, '내용'))
  assert.ok(document.getElementById('admin-main-scroll-area').classList.contains(S.MainArea.styledComponentId))
  assert.ok(document.querySelector('nav').classList.contains(S.SideNav.styledComponentId))
  assert.ok(document.querySelector('header').classList.contains(S.TopBar.styledComponentId))
  assert.equal(document.querySelector('h1').textContent, '대시보드')
})

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sourceFiles(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`])
}
test('all 22 admin page shells delegate to AdminLayout; shared layouts never import page modules', () => {
  const pages = [...sourceFiles('src/pages'), ...sourceFiles('src/features')].filter(file => file.endsWith('.tsx'))
  const consumers = pages.filter(file => /import \{ AdminLayout \}/.test(readFileSync(file, 'utf8')))
  assert.equal(consumers.length, 22)
  for (const file of pages) assert.doesNotMatch(readFileSync(file, 'utf8'), /<(?:Shell|AdminShell|S)\.(?:AppShell|SideNav|MainArea|TopBar)\b/, file)
  for (const file of ['src/app/layouts/AdminLayout.tsx', 'src/app/layouts/WorkspaceFrame.tsx']) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /from ['"][^'"]*(?:pages|features)\//, file)
  }
  const merchant = readFileSync('src/app/router/MerchantLayout.tsx', 'utf8')
  assert.match(merchant, /<MerchantPlaceProvider>\s*<WorkspaceFrame/)
  assert.match(merchant, /mainId=\{MERCHANT_MAIN_SCROLL_AREA_ID\}/)
  assert.match(merchant, /mainClassName="merchant-layout-content"/)
})
