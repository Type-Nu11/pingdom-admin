import React, { useCallback, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { Router } from '../../src/app/router/Router'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

// Every business request terminates in memory, including unknown/removed paths.
let mode = 'success'
let report = () => {}
const requests = []
let slots = [{ id: 7, placeId: 1, startsAt: '2099-10-01T10:00:00', endsAt: '2099-10-01T11:00:00',
  totalCapacity: 6, remainingCapacity: 6, status: 'ACTIVE', reservationTerms: null, conditionsVersion: 0 }]
client.defaults.adapter = async config => {
  const body = config.data ? JSON.parse(config.data) : null
  requests.push({ method: config.method, url: config.url, body })
  report([...requests])
  const response = data => ({ config, data, status: 200, statusText: 'OK', headers: {} })
  if (mode === 'query-failure' && config.method === 'get' && config.url.endsWith('/availabilities')
    || mode === 'write-failure' && config.method !== 'get') {
    throw Object.assign(new Error('Synthetic failure'), { isAxiosError: true, config,
      response: { config, status: 500, data: { message: '합성 요청 실패' }, headers: {} } })
  }
  if (mode === 'delayed' && config.method !== 'get') await new Promise(resolve => setTimeout(resolve, 1200))
  if (config.method === 'get') {
    if (config.url === '/merchant-owner/me') return response({ userId: 99, displayName: '합성 QA', status: 'ACTIVE', placeIds: [1, 2] })
    const place = config.url.match(/^\/merchant-owner\/places\/(\d+)$/)
    if (place) return response({ id: Number(place[1]), name: `합성 매장 ${place[1]}`, roadAddress: `서울 테스트로 ${place[1]}` })
    if (config.url === '/merchant-owner/availabilities') return response(mode === 'empty' ? [] : structuredClone(slots))
    if (config.url === '/merchant-owner/reservations') return response({ reservations: [], page: 1, limit: 20, totalElements: 0, totalPages: 0, hasNext: false })
  }
  if (['post', 'put'].includes(config.method) && /^\/merchant-owner\/availabilities(?:\/\d+)?$/.test(config.url)) {
    if (JSON.stringify(Object.keys(body).sort()) !== JSON.stringify(['endsAt', 'placeId', 'startsAt', 'totalCapacity'])) throw new Error('Unexpected slot payload')
    const id = config.method === 'post' ? 8 : Number(config.url.split('/').at(-1))
    const next = { ...slots[0], ...body, id }
    slots = [...slots.filter(slot => slot.id !== id), next]
    return response(next)
  }
  const toggle = config.url.match(/^\/merchant-owner\/availabilities\/(\d+)\/(activate|deactivate)$/)
  if (config.method === 'post' && toggle) {
    slots = slots.map(slot => slot.id === Number(toggle[1]) ? { ...slot, status: toggle[2] === 'activate' ? 'ACTIVE' : 'INACTIVE' } : slot)
    return response(slots.find(slot => slot.id === Number(toggle[1])))
  }
  throw new Error(`Unexpected synthetic request: ${config.method} ${config.url}`)
}

function Fixture() {
  const guest = new URLSearchParams(location.search).has('guest')
  const [account, setAccount] = useState(guest ? null : 99)
  const [calls, setCalls] = useState([])
  const clearAuth = useCallback(() => setAccount(null), [])
  const auth = useMemo(() => ({ user: account ? { id: account, username: '합성 QA', role: 'MERCHANT_OWNER' } : null,
    isAuthenticated: account !== null, isAuthReady: true, clearAuth, logout: clearAuth }), [account, clearAuth])
  report = setCalls
  return <AuthContext.Provider value={auth}>
    <GlobalStyle />
    <aside aria-label="합성 QA 제어" style={{ position: 'fixed', zIndex: 2000, bottom: 0, right: 0, background: 'white', border: '1px solid #ddd', padding: 8, maxWidth: '100vw' }}>
      <strong>합성 QA · 실서버 요청 없음</strong>
      <select aria-label="합성 응답 모드" onChange={event => { mode = event.target.value }}>
        <option value="success">정상</option><option value="empty">빈 목록</option><option value="query-failure">조회 실패</option>
        <option value="write-failure">저장 실패</option><option value="delayed">저장 지연</option>
      </select>
      <button onClick={() => setAccount(id => id === 99 ? 100 : 99)}>합성 계정 변경</button>
      <details><summary>합성 요청 {calls.length}건</summary><pre aria-label="합성 요청 기록" style={{ maxHeight: 100, overflow: 'auto', fontSize: 10 }}>{JSON.stringify(calls)}</pre></details>
    </aside>
    <Router />
  </AuthContext.Provider>
}
createRoot(document.getElementById('root')).render(<Fixture />)
