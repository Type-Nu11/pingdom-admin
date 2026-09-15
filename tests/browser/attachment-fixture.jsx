import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import Page from '../../src/pages/merchantPlaceApplicationReview/MerchantPlaceApplicationReviewPage'
import { GlobalStyle } from '../../src/styles/GlobalStyle'
import client from '../../src/api/customAxios'

const name = 'SyntheticEvidence'.repeat(14) + '.png'
const attachments = [
  { id: 1, originalFilename: name, contentType: 'image/png' },
  { id: 2, originalFilename: 'synthetic-korean.pdf', contentType: 'application/pdf' },
  { id: 3, originalFilename: 'broken.png', contentType: 'image/png' },
  { id: 4, originalFilename: 'denied.png', contentType: 'image/png' },
  { id: 5, originalFilename: 'unsupported.txt', contentType: 'text/plain' },
  { id: 6, originalFilename: 'broken.pdf', contentType: 'application/pdf' },
].map(item => ({ ...item, documentType: 'BUSINESS_LICENSE', fileSize: 100, uploadedAt: '2026-01-01T00:00:00' }))
const application = id => ({ id, status: 'PENDING', version: 1, applicantUserId: 20,
  businessName: '합성 테스트 상점', legalName: '합성 신청자', placeName: `합성 장소 ${id}`, applicationType: 'NEW_PLACE', attachments })
const canvas = document.createElement('canvas')
canvas.width = 640; canvas.height = 480
const context = canvas.getContext('2d')
context.fillStyle = '#248450'; context.fillRect(0, 0, 640, 480)
context.fillStyle = '#fff'; context.font = '32px sans-serif'; context.fillText('Synthetic evidence', 60, 100)
const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
client.defaults.adapter = async config => {
  const content = config.url.match(/attachments\/(\d+)\/content$/)
  const reply = data => ({ config, data, status: 200, statusText: 'OK', headers: {} })
  if (content) {
    const id = Number(content[1])
    if (id === 1) return reply(png)
    if (id === 2) return reply(await (await fetch('/synthetic.pdf')).blob())
    if (id === 4) throw new axios.AxiosError('Denied', 'ERR_BAD_REQUEST', config, {}, { ...reply({}), status: 403 })
    return reply(new Blob(['synthetic invalid content'], { type: id === 5 ? 'text/plain' : id === 6 ? 'application/pdf' : 'image/png' }))
  }
  if (config.url.endsWith('/attachments')) return reply(attachments)
  if (config.url.includes('/merchant-owners/')) return reply({ status: 'ACTIVE', businessName: '합성 테스트 상점' })
  if (/\/\d+$/.test(config.url)) return reply(application(Number(config.url.split('/').at(-1))))
  return reply({ items: [application(1), application(2)], page: 1, total: 2, totalPages: 1, hasNext: false })
}
const auth = { clearAuth() {}, user: { id: 99, username: 'synthetic', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><MemoryRouter><GlobalStyle /><Page /></MemoryRouter></AdminNotificationContext.Provider></AuthContext.Provider>)
