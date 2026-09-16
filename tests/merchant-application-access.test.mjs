import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { MerchantOnboardingRoute, MerchantProtectedRoute } = await server.ssrLoadModule('/src/app/router/ProtectedRoute.tsx')
after(() => server.close())

function render(guard, role, authenticated = true) {
  return renderToString(h(AuthContext.Provider, { value: {
    isAuthReady: true, isAuthenticated: authenticated, user: role ? { role } : null, clearAuth() {},
  } }, h(MemoryRouter, null, h(Routes, null,
    h(Route, { element: h(guard) }, h(Route, { path: '/', element: h('div', null, 'protected-content') })),
  ))))
}
for (const role of ['USER', 'MERCHANT_OWNER']) {
  test(`${role} can access application routes`, () => assert.match(render(MerchantOnboardingRoute, role), /protected-content/))
}
for (const role of ['ADMIN', 'UNKNOWN', null]) {
  test(`${role} cannot access merchant application content`, () => assert.doesNotMatch(render(MerchantOnboardingRoute, role, role !== null), /protected-content/))
}
test('USER remains blocked from merchant operations', () => assert.doesNotMatch(render(MerchantProtectedRoute, 'USER'), /protected-content/))
test('MERCHANT_OWNER retains operations access', () => assert.match(render(MerchantProtectedRoute, 'MERCHANT_OWNER'), /protected-content/))
