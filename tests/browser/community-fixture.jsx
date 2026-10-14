import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AxiosError } from 'axios'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import Content from '../../src/pages/community/CommunityContentPage'
import Reports from '../../src/pages/community/CommunityReportsPage'
import History from '../../src/pages/operationHistory/OperationHistoryPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

window.communityQA = { requests: [], failList: false, failAfterReview: false, holdLists: false }
const meta = { authorUserId: 44, authorUsername: '테스트 작성자', hidden: false, hiddenByAdminUserId: null, hiddenAt: null, createdAt: '2026-09-17T09:00:00' }
const posts = Array.from({ length: 11 }, (_, i) => ({ ...meta, postId: i + 1, title: `커뮤니티 글 ${i + 1}`, categoryId: 'local', content: `글 ${i + 1} 원문\n두 번째 줄`, places: [{ placeId: 7, name: '테스트 장소', deleted: false }, { placeId: 8, name: '옛 장소', deleted: true }] }))
const reports = [
  { reportId: 1, targetId: 90, postId: 1, targetType: 'COMMENT', status: 'PENDING' },
  { reportId: 2, targetId: 91, targetType: 'COMMENT', status: 'PENDING' },
  { reportId: 3, targetId: 2, postId: 2, targetType: 'POST', status: 'ACCEPTED' },
  { reportId: 4, targetId: 3, postId: 3, targetType: 'POST', status: 'PENDING' },
].map(item => ({ ...item, reason: 'SPAM', reporterUserId: 40, description: '신고 설명', targetHidden: false, createdAt: meta.createdAt, processedAt: null, processedByAdminUserId: null }))
window.communityQA.seedPendingReports = count => reports.splice(0, reports.length, ...Array.from({ length: count }, (_, i) => ({ ...reports[3], reportId: 10 + i, targetId: 3, postId: 3, targetType: 'POST', status: 'PENDING' })))
function paged(items, field, params = {}) {
  const page = params.page || 1, limit = params.limit || 10
  return { [field]: items.slice((page - 1) * limit, page * limit), page, limit, totalCount: items.length, totalPages: Math.ceil(items.length / limit), hasNext: page * limit < items.length }
}
client.defaults.adapter = async config => {
  const qa = window.communityQA
  qa.requests.push({ url: config.url, method: config.method, params: config.params })
  const response = data => ({ config, data, status: 200, statusText: 'OK', headers: {} })
  const fail = status => { throw new AxiosError('합성 오류', 'ERR_BAD_REQUEST', config, {}, { ...response({}), status }) }
  await new Promise(resolve => setTimeout(resolve, 15))
  const isList = config.url === '/admin/community/posts' || config.url === '/admin/community-reports' || /\/comments$/.test(config.url)
  if (isList && qa.holdLists) await new Promise(resolve => { qa.releaseList = resolve })
  if (config.url === '/admin/community/posts') return response(paged(posts.filter(p => (!config.params.categoryId || p.categoryId === config.params.categoryId) && (config.params.hidden === undefined || config.params.hidden === p.hidden)), 'posts', config.params))
  if (config.url === '/admin/community-reports') {
    if (qa.failList) return fail(503)
    return response(paged(reports.filter(r => (!config.params.status || r.status === config.params.status) && (!config.params.targetType || r.targetType === config.params.targetType)), 'reports', config.params))
  }
  const reportMatch = config.url.match(/^\/admin\/community-reports\/(\d+)(?:\/(accept|decline))?$/)
  if (reportMatch) {
    const item = reports.find(r => r.reportId === Number(reportMatch[1]))
    if (!item) return fail(404)
    if (reportMatch[2]) {
      if (item.status !== 'PENDING') return fail(409)
      item.status = reportMatch[2] === 'accept' ? 'ACCEPTED' : 'DECLINED'
      item.targetHidden = reportMatch[2] === 'accept'
      if (qa.failAfterReview) qa.failList = true
    }
    return response({ ...item })
  }
  const contentMatch = config.url.match(/^\/admin\/community\/posts\/(\d+)(?:\/comments(?:\/(\d+))?)?$/)
  if (contentMatch) {
    const postId = Number(contentMatch[1])
    if (config.url.includes('/comments')) {
      const comments = Array.from({ length: 11 }, (_, i) => ({ ...meta, postId, commentId: 90 + i, content: `댓글 ${90 + i} 원문` }))
      if (contentMatch[2]) return response(comments.find(c => c.commentId === Number(contentMatch[2])))
      return response(paged(comments.filter(c => config.params.hidden === undefined || c.hidden === config.params.hidden), 'comments', config.params))
    }
    return response(posts.find(p => p.postId === postId))
  }
  if (config.url === '/admin/audit-logs') return response({ auditLogs: [{ auditLogId: 1, actorUserId: 99, actorUsername: 'QA', action: 'COMMUNITY_REPORT_ACCEPTED', targetType: 'COMMUNITY_REPORT', targetId: '1', createdAt: meta.createdAt }], page: 1, limit: 5, totalCount: 1, totalPages: 1, hasNext: false })
  return fail(404)
}
const auth = { clearAuth() {}, logout() {}, user: { id: 99, username: 'QA 관리자', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><MemoryRouter initialEntries={['/community']}><GlobalStyle /><Routes><Route path="/community" element={<Content />} /><Route path="/community-reports" element={<Reports />} /><Route path="/operations/history" element={<History />} /></Routes></MemoryRouter></AdminNotificationContext.Provider></AuthContext.Provider>)
