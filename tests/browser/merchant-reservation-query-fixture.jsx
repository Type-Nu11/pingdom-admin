import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { merchantControlTheme } from '../../src/styles/merchantControlTheme'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { MerchantPlaceContext } from '../../src/app/providers/MerchantPlaceContext'
import { MerchantPlaceIdentityContext } from '../../src/app/providers/MerchantPlaceIdentityContext'
import Page from '../../src/pages/merchantReservationOperations/MerchantReservationOperationsPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
import { observeFixtureAdapter } from '../helpers/fixture-adapter.mjs'

const scenario = new URLSearchParams(location.search).get('scenario') || 'normal'
const rows = Array.from({ length: 24 }, (_, i) => ({ id: i + 1, touristUserId: 100 + i, availabilityId: i % 2 ? 8 : 7,
  quantity: i % 4 + 1, status: ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELED'][i % 4],
  reservationStartsAt: '2030-10-24T05:00:00', reservationEndsAt: '2030-10-24T06:00:00',
  bookerName: '테스트 예약자 ' + (i + 1), bookerPhone: '010-1234-5678',
  requestNote: '창가 쪽 조용한 자리 부탁드립니다. 긴 요청사항도 잘리지 않고 전체 내용을 확인할 수 있어야 합니다.',
  createdAt: '2030-10-20T10:00:00', updatedAt: '2030-10-20T10:00:00', reviewedBy: i % 4 ? 3 : null,
  reviewedAt: i % 4 ? '2030-10-20T11:00:00' : null, reviewReason: i % 4 === 2 ? '영업 일정 조정' : null,
  confirmedAt: i % 4 === 1 ? '2030-10-20T11:00:00' : null, rejectedAt: null, canceledAt: null, canceledBy: null,
  confirmation: null,
}))
const calls = []
const availability = [7, 8].map(id => ({ id, placeId: id, startsAt: '2030-10-24T05:00:00', endsAt: '2030-10-24T06:00:00' }))
const reject = (config, status) => { throw Object.assign(new Error('Synthetic query failure'), { isAxiosError: true, config, response: { config, status, data: { code: status === 403 ? 'RESERVATION_FORBIDDEN' : '' }, headers: {} } }) }
client.defaults.adapter = observeFixtureAdapter(async config => {
  calls.push({ path: config.url, params: { ...config.params }, method: config.method, data: config.data ? JSON.parse(config.data) : null })
  const response = data => ({ config, data, status: 200, statusText: 'OK', headers: {} })
  if (config.method !== 'get') {
    if (!scenario.startsWith('review') || !/\/reservations\/\d+\/(confirm|reject)$/.test(config.url)) throw new Error('This query fixture forbids all mutations')
    await new Promise(resolve => setTimeout(resolve, 500))
    const row = rows.find(item => item.id === Number(config.url.split('/').at(-2)))
    if (scenario === 'review-conflict') { row.status = 'CONFIRMED'; return reject(config, 409) }
    row.status = config.url.endsWith('/confirm') ? 'CONFIRMED' : 'REJECTED'
    row.reviewReason = config.data ? JSON.parse(config.data).reason : null
    row.reviewedAt = '2030-10-20T11:00:00'
    return response(row)
  }
  if (config.url === '/merchant-owner/me') return response({ placeIds: [7, 8] })
  if (config.url === '/merchant-owner/availabilities') return response(availability)
  if (config.url === '/merchant-owner/reservations') {
    if (scenario === 'list-error') return reject(config, 500)
    const params = config.params
    const filtered = scenario === 'empty' ? [] : rows.filter(row => (!params.status || row.status === params.status)
      && (!params.placeId || row.availabilityId === params.placeId)
      && (!params.reservationFrom || row.reservationStartsAt >= params.reservationFrom)
      && (!params.reservationTo || row.reservationStartsAt < params.reservationTo))
    const totalPages = Math.ceil(filtered.length / 20)
    return response({ reservations: filtered.slice((params.page - 1) * 20, params.page * 20), page: params.page, limit: 20, totalElements: filtered.length, totalPages, hasNext: params.page < totalPages })
  }
  if (/^\/merchant-owner\/reservations\/\d+$/.test(config.url)) {
    if (scenario === 'detail-error') return reject(config, 500)
    if (scenario === 'forbidden') return reject(config, 403)
    const row = rows.find(row => row.id === Number(config.url.split('/').at(-1)))
    return response({ reservation: row, placeId: row.availabilityId, placeName: row.availabilityId === 7 ? '핑덤 테스트 식당' : '핑덤 테스트 카페',
      statusHistory: scenario === 'long-detail' ? Array.from({ length: 12 }, (_, i) => ({
        id: i + 1, status: row.status, changedBy: 3, changedAt: row.reviewedAt,
        reason: '긴 처리 이력에서도 목록이 상세 높이에 맞춰지고 예약 카드는 압축되지 않습니다. '.repeat(3),
      })) : [{ id: 1, status: 'PENDING', changedBy: row.touristUserId, reason: '예약 신청', changedAt: row.createdAt },
        ...(row.reviewedAt ? [{ id: 2, status: row.status, changedBy: 3, reason: row.reviewReason || '확인 완료', changedAt: row.reviewedAt }] : [])] })
  }
  throw new Error('Unexpected synthetic GET ' + config.url)
})
const places = { 7: { status: 'ready', name: '핑덤 테스트 식당', address: '서울 중구 테스트로 12' }, 8: { status: 'ready', name: '핑덤 테스트 카페', address: '서울 중구 테스트로 34' } }
const identity = { places, ensurePlaces() {} }
function Fixture() {
  const [selectedPlaceId, selectPlace] = useState(null)
  return <AuthContext.Provider value={{ user: { id: 1, role: 'MERCHANT_OWNER', username: 'synthetic' }, clearAuth() {}, logout() {} }}>
    <MerchantPlaceIdentityContext.Provider value={identity}><MerchantPlaceContext.Provider value={{ selectedPlaceId, selectPlace, syncPlaces(ids) { return ids[0] } }}>
      <BrowserRouter><ThemeProvider theme={merchantControlTheme}><GlobalStyle />
        <aside aria-label="합성 검증 도구" style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span>합성 데이터 · 실제 API/저장 요청 없음</span>
          <button type="button" onClick={() => selectPlace(8)}>외부 매장 전환</button>
          <button type="button" aria-label="조회 요청 내역" onClick={event => { event.currentTarget.textContent = JSON.stringify(calls) }}>요청 기록</button>
        </aside>
        <Page />
      </ThemeProvider></BrowserRouter>
    </MerchantPlaceContext.Provider></MerchantPlaceIdentityContext.Provider>
  </AuthContext.Provider>
}
createRoot(document.getElementById('root')).render(<Fixture />)
