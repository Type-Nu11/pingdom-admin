import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import UserBanPage from '../../src/pages/userBan/UserBanPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
import { observeFixtureAdapter } from '../helpers/fixture-adapter.mjs'

const scenario = new URLSearchParams(location.search).get('scenario') || 'normal'
window.banQa = { calls: [], releaseHistory: null, failHistory: scenario === 'history-error' }
const users = [901, 902].map(userId => ({ userId, username: `합성 사용자 ${userId}`, banned: true, banType: 'TEMPORARY', bannedAt: '2026-01-01T01:00:00Z', banExpiresAt: '2026-01-08T01:00:00Z' }))
client.defaults.adapter = observeFixtureAdapter(async config => {
  if (config.method !== 'get') throw new Error('Synthetic QA blocked operational write')
  window.banQa.calls.push({ method: config.method, path: config.url, params: config.params })
  let data
  const fail = () => { throw Object.assign(new Error('합성 제재 이력 조회 실패'), { isAxiosError: true, config, response: { config, status: 500, data: {}, headers: {} } }) }
  if (config.url === '/admin/users/banned') {
    const empty = scenario === 'empty'
    data = { users: empty ? [] : users, page: config.params.page, limit: 20, totalCount: empty ? 0 : 2, totalPages: empty ? 0 : 1, hasNext: false, counts: { total: empty ? 0 : 2, permanent: 0, temporary: empty ? 0 : 2 } }
  } else if (/^\/admin\/users\/banned\/\d+$/.test(config.url)) {
    data = { ...users.find(user => config.url.endsWith(`/${user.userId}`)), email: 'synthetic@example.invalid', banReason: 'SPAM', role: 'USER', country: 'KR' }
  } else if (/^\/admin\/users\/\d+\/sanctions$/.test(config.url)) {
    if (scenario === 'slow') await new Promise(resolve => { window.banQa.releaseHistory = resolve })
    if (window.banQa.failHistory) fail()
    const targetUserId = Number(config.url.split('/')[3]), page = config.params.page
    data = { histories: scenario === 'history-empty' ? [] : [{ historyId: targetUserId * 10 + page, targetUserId, banType: 'TEMPORARY', action: 'APPLIED', reason: `합성 이력 ${targetUserId} 페이지 ${page}`, startedAt: '2026-01-01T01:00:00Z', endedAt: '2026-01-08T01:00:00Z', adminUsername: '합성 관리자', processedAt: '2026-01-01T01:00:00Z' }], page, limit: 5, totalCount: scenario === 'history-empty' ? 0 : 6, totalPages: scenario === 'history-empty' ? 0 : 2, hasNext: page === 1 }
  } else throw new Error(`Unexpected UserBan fixture API ${config.url}`)
  return { config, data, status: 200, statusText: 'OK', headers: {} }
})
const auth = { user: { username: '합성 QA', role: 'ADMIN' }, clearAuth() { throw new Error('Unexpected auth clearing') }, logout() {}, isAuthenticated: true, isAuthReady: true }
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkEntries: [], pendingWorkCount: 0, pendingWorkStatus: 'success', pendingWorkErrorMessage: '', status: 'success', errorMessage: '', isUnreadCountLoading: false, isActionLoading: false, fetchNotifications: async () => {}, refreshUnreadCount: async () => {}, refreshPendingWork: async () => {} }
createRoot(document.getElementById('root')).render(<><GlobalStyle /><AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><MemoryRouter initialEntries={['/bans']}><UserBanPage /></MemoryRouter></AdminNotificationContext.Provider></AuthContext.Provider></>)
