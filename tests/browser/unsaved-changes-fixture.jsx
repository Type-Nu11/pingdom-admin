import React, { Fragment, StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AxiosError } from 'axios'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { Router } from '../../src/app/router/Router'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

window.qaRequests = []
window.qaMode = 'success'
let menus = [1, 2].map(id => ({ id, placeId: 1, name: `합성 메뉴 ${id}`, description: '', priceAmount: 10000, currency: 'KRW', imageUrl: null, displayOrder: id - 1, status: 'AVAILABLE' }))
const event = { eventId: 1, placeId: 1, placeName: '합성 장소', title: '합성 초안', description: '', eventType: 'POP_UP', publicationStatus: 'DRAFT', scheduleStatus: 'UPCOMING', startAt: '2030-01-01T09:00:00', endAt: '2030-01-02T09:00:00' }
const report = { reportId: 1, placeId: 1, reporterUserId: 5, targetType: 'NAME', reasonType: 'INCORRECT', description: '합성 신고', status: 'SUBMITTED', createdAt: '2030-01-01T00:00:00', disputes: [] }
client.defaults.adapter = async config => {
  window.qaRequests.push({ url: config.url, method: config.method, params: config.params })
  const isMenuWrite = ['post', 'patch'].includes(config.method) && /^\/merchant-owner\/places\/\d+\/menus(?:\/\d+)?$/.test(config.url)
  const isMenuOrder = config.method === 'patch' && /^\/merchant-owner\/places\/\d+\/menus\/\d+\/order$/.test(config.url)
  const isBrandWrite = config.method === 'post' && config.url === '/merchant-owner/campaigns/brands'
  if (config.method !== 'get' && !isMenuWrite && !isMenuOrder && !isBrandWrite) throw new Error('Only synthetic menu and brand saves are allowed')
  if ((isMenuWrite || isMenuOrder) && window.qaMode !== 'success') throw new AxiosError('Synthetic failure', 'ERR_BAD_RESPONSE', config, undefined, { config, status: window.qaMode === 'unauthorized' ? 401 : 500, data: { message: '합성 저장 실패' }, headers: {} })
  let data
  if (isMenuOrder) {
    const input = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    const id = Number(config.url.split('/').at(-2))
    const moved = menus.find(menu => menu.id === id)
    data = { ...moved, displayOrder: input.displayOrder }
    menus = menus.map(menu => menu.id === id ? data : menu.displayOrder === input.displayOrder ? { ...menu, displayOrder: moved.displayOrder } : menu)
  } else if (isMenuWrite) {
    const input = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    data = { ...menus[0], ...input, id: config.method === 'post' ? 3 : Number(config.url.split('/').at(-1)) }
    menus = [...menus.filter(menu => menu.id !== data.id), data]
  } else if (isBrandWrite) data = { id: 2, ...JSON.parse(config.data) }
  else if (config.url === '/merchant-owner/me') data = { userId: 99, status: 'ACTIVE', businessName: '합성 사업자', displayName: '합성 상점주', placeIds: [1, 2] }
  else if (/^\/merchant-owner\/places\/\d+\/menus$/.test(config.url)) data = menus
  else if (config.url === '/merchant-owner/campaigns') data = { items: [], page: 1, totalCount: 0, totalPages: 1, hasNext: false }
  else if (config.url === '/merchant-owner/campaigns/brands') data = { items: [{ id: 1, name: '합성 브랜드' }], page: 1, totalPages: 1, hasNext: false }
  else if (config.url === '/users/me/merchant-place-applications') data = { items: [{ id: 7, applicationType: 'NEW_PLACE', status: 'CANCELED', legalName: '합성 신청자', businessName: '합성 사업자', merchantDisplayName: '합성 상점주', merchantContactEmail: 'synthetic@example.test', merchantContactPhone: '+821049977214', attachments: [], updatedAt: '2030-01-01T00:00:00', newPlace: { placeName: '합성 취소 장소', category: 'RESTAURANT', latitude: 37, longitude: 127, roadAddress: '합성 주소', tags: [] } }], page: 1, hasNext: false }
  else if (config.url === '/users/me/merchant-owner-profile') data = { userId: 99, businessName: '합성 사업자', displayName: '합성 상점주', contactEmail: 'synthetic@example.test', contactPhone: '+821049977214', status: 'ACTIVE', placeIds: [1, 2] }
  else if (config.url === '/places/autocomplete') data = { places: [] }
  else if (config.url === '/admin/place-events') data = { events: [event], page: 1, totalCount: 1, totalPages: 1, hasNext: false }
  else if (config.url === '/admin/place-events/1') data = event
  else if (config.url === '/admin/place-information-reports') data = { reports: [report], page: 1, totalCount: 1, totalPages: 1, hasNext: false }
  else if (config.url === '/admin/place-information-reports/1') data = report
  else if (config.url === '/admin/places') data = { places: [{ id: 1, name: '합성 장소', address: '합성 주소' }], totalCount: 1, totalPages: 1, hasNext: false }
  else if (config.url.startsWith('/admin/')) data = { total: 0, totalElements: 0, totalCount: 0, totalPages: 0, hasNext: false, count: 0, unreadCount: 0, notifications: [], reservations: [], applications: [], reports: [], evidences: [], requests: [], candidates: [], items: [], products: [] }
  else throw new Error(`Unexpected synthetic API ${config.url}`)
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}

function Fixture() {
  const [account, setAccount] = useState({ id: 99, role: location.pathname.startsWith('/merchant/') ? 'MERCHANT_OWNER' : 'ADMIN' })
  window.qaSwitchAccount = () => setAccount(current => ({ ...current, id: current.id + 1 }))
  const clearAuth = () => setAccount(null)
  const auth = { accessToken: account ? 'synthetic-only' : '', user: account ? { ...account, username: 'synthetic' } : null, isAuthenticated: Boolean(account), isAuthReady: true, clearAuth, logout: async () => clearAuth(), login() {}, updateUser() {} }
  return <AuthContext.Provider value={auth}><Fragment key={account?.id ?? 'guest'}><GlobalStyle /><Router /></Fragment></AuthContext.Provider>
}
createRoot(document.getElementById('root')).render(<StrictMode><Fixture /></StrictMode>)
