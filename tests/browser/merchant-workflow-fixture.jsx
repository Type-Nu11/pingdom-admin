import React, { Fragment, StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AxiosError } from 'axios'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { Router } from '../../src/app/router/Router'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

const params = new URLSearchParams(location.search)
const count = Number(params.get('count') ?? 2)
const profile = { userId: 99, status: 'ACTIVE', businessName: '합성 사업자', displayName: '합성 상점주', contactEmail: 'synthetic@example.test', contactPhone: '+821049977214', placeIds: Array.from({ length: count }, (_, i) => i + 1) }
const applications = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, applicationType: 'NEW_PLACE', status: i === 29 ? 'CANCELED' : 'DRAFT', legalName: '합성 신청자', businessName: profile.businessName, merchantDisplayName: profile.displayName, merchantContactEmail: profile.contactEmail, merchantContactPhone: profile.contactPhone, attachments: [], updatedAt: '2030-01-01T00:00:00', newPlace: { placeName: `합성 신청 ${i + 1}`, category: 'RESTAURANT', latitude: 37, longitude: 127, roadAddress: '합성 주소', jibunAddress: '합성 지번', postalCode: '12345', description: '합성 소개', businessContactPhone: profile.contactPhone, applicantContactPhone: profile.contactPhone, tags: [] } }))
const offers = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, placeId: 1, title: `합성 혜택 ${i + 1}`, benefitDescription: '합성 사용 조건', status: i === 0 ? 'DRAFT' : i === 1 ? 'CLOSED' : 'PUBLISHED', startsAt: '2030-01-01T09:00:00', endsAt: '2030-02-01T09:00:00', benefitType: 'DISCOUNT', totalQuantity: 100 }))
window.qaRequests = []
window.qaMode = params.get('mode') ?? 'success'
window.qaUnexpected = []
client.defaults.adapter = async config => {
  window.qaRequests.push({ url: config.url, method: config.method, data: config.data })
  const fail = status => { throw new AxiosError('Synthetic failure', 'ERR_BAD_RESPONSE', config, undefined, { config, status, data: { message: '합성 조회 실패' }, headers: {} }) }
  const list = config.url === '/users/me/merchant-place-applications'
  if (list && window.qaMode === 'slow') await new Promise(resolve => setTimeout(resolve, 800))
  if (window.qaMode === 'unauthorized') fail(401)
  if (window.qaMode === 'failure' && (list || config.url === '/merchant-owner/offers')) fail(500)
  if (window.qaMode === 'detail-failure' && /^\/users\/me\/merchant-place-applications\/\d+$/.test(config.url)) fail(500)
  let data
  if (config.method === 'post' && config.url === '/merchant-owner/offers/coupons/redeem') {
    if (window.qaMode === 'redeem-failure') fail(500)
    data = { offerId: 3, redeemedAt: '2030-01-01T00:00:00' }
  } else if (config.method !== 'get') { window.qaUnexpected.push(config.url); throw new Error('Real mutations prohibited') }
  else if (config.url === '/merchant-owner/me' || config.url === '/users/me/merchant-owner-profile') data = profile
  else if (list) data = { items: window.qaMode === 'empty' ? [] : applications, page: 1, hasNext: false }
  else if (/^\/users\/me\/merchant-place-applications\/\d+$/.test(config.url)) data = applications.find(item => item.id === Number(config.url.split('/').at(-1)))
  else if (/^\/merchant-owner\/places\/\d+$/.test(config.url)) data = { id: Number(config.url.split('/').at(-1)), name: '합성 매장', roadAddress: '합성 매장 주소' }
  else if (config.url === '/merchant-owner/offers') data = { offers: window.qaMode === 'empty' ? [] : offers.slice(((config.params?.page ?? 1) - 1) * 20, (config.params?.page ?? 1) * 20), totalElements: window.qaMode === 'empty' ? 0 : 30, totalPages: window.qaMode === 'empty' ? 0 : 2 }
  else if (/^\/merchant-owner\/offers\/\d+$/.test(config.url)) data = offers.find(item => item.id === Number(config.url.split('/').at(-1)))
  else if (config.url === '/merchant-owner/performance') data = { placeCount: count, exposureCount: 100, clickCount: 20, bookmarkCount: 10, clickThroughRate: 20, reservationCount: 5, confirmedReservationCount: 2, reservationConversionRate: 10 }
  else if (config.url.endsWith('/information')) data = { description: '합성 가게 소개' }
  else if (config.url.endsWith('/campaigns')) data = { items: [] }
  else if (config.url.endsWith('/operating-notices')) data = { notices: [] }
  else if (config.url.endsWith('/availabilities')) data = []
  else { window.qaUnexpected.push(config.url); throw new Error(`Unexpected API ${config.url}`) }
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
function Fixture() {
  const [authenticated, setAuthenticated] = useState(true)
  const clearAuth = () => setAuthenticated(false)
  const auth = { accessToken: authenticated ? 'synthetic-only' : '', user: authenticated ? { id: 99, username: 'synthetic', role: 'MERCHANT_OWNER' } : null, isAuthenticated: authenticated, isAuthReady: true, clearAuth, logout: async () => clearAuth() }
  return <AuthContext.Provider value={auth}><Fragment key={String(authenticated)}><GlobalStyle /><Router /></Fragment></AuthContext.Provider>
}
createRoot(document.getElementById('root')).render(<StrictMode><Fixture /></StrictMode>)
