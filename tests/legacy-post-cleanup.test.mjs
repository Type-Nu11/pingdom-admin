import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { test, after } from 'node:test'
import { createServer } from 'vite'

test('retired modules and menu entries are removed; old links redirect without mounting them', () => {
  for (const path of [
    'api/adminReportApi.ts', 'api/adminReportAppealApi.ts',
    'hooks/useAdminReports.ts', 'hooks/useAdminReportAppeals.ts',
    'types/adminReport.types.ts', 'types/adminReportAppeal.types.ts',
    'pages/reportedUsers/ReportedUsersPage.tsx', 'pages/reportAppeal/ReportAppealPage.tsx',
  ]) assert.equal(existsSync('src/' + path), false, path)
  const menu = readFileSync('src/components/navigation/AdminNavigationMenu.tsx', 'utf8')
  assert.doesNotMatch(menu, /신고 사용자|신고 이의제기|reports\/appeals|reports\/reported-users/)
  const router = readFileSync('src/app/router/Router.tsx', 'utf8')
  for (const path of ['/reports/appeals', '/reports/reported-users']) {
    assert.ok(router.includes('path="' + path + '" element={<Navigate to="/dashboard" replace />}'))
  }
  assert.match(router, /PlaceReviewDeletionPage/)
  assert.match(menu, /사용자 밴|미연결 파일/)
})

test('no legacy post processing clients remain; shared media and S3 maintenance survive', () => {
  const inventory = JSON.parse(execFileSync('node', ['scripts/api-source-inventory.mjs'], { encoding: 'utf8' }))
  assert.ok(!inventory.some(({ path }) => /^\/admin\/(reports\/|report-appeals|posts\/(?!s3\/)|dashboard\/pending-items)/.test(path)))
  for (const path of ['/admin/posts/s3/orphans/report', '/admin/posts/s3/orphans',
    '/admin/place-review-deletion-requests', '/merchant-owner/places/{placeId}/media']) {
    assert.ok(inventory.some(r => r.path === path && r.callers.length), path)
  }
  assert.match(readFileSync('src/types/merchantStore.types.ts', 'utf8'), /sourceMapImageId/)
})

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
after(() => server.close())
test('notification pending checks never query retired reports, preserving seven current checks', async () => {
  const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
  const { getAdminPendingWorkSummary } = await server.ssrLoadModule('/src/api/adminPendingWorkApi.ts')
  const requests = []
  client.defaults.adapter = async config => {
    requests.push(config.url)
    return { config, status: 200, statusText: 'OK', headers: {}, data: { totalCount: 0, totalElements: 0, total: 0 } }
  }
  const result = await getAdminPendingWorkSummary()
  assert.equal(result.checkedCount, 7)
  assert.equal(result.failedCount, 0)
  assert.equal(result.totalCount, 0)
  assert.ok(requests.includes('/admin/merchant-place-applications'))
  assert.ok(!requests.some(path => path.startsWith('/admin/reports/') || path.startsWith('/admin/report-appeals')))
})
