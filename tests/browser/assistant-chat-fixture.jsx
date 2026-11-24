import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { MerchantPlaceContext } from '../../src/app/providers/MerchantPlaceContext'
import { AdminAssistantWorkspace, MerchantAssistantWorkspace } from '../../src/features/assistant/components/AssistantWorkspace'
import { useAssistantDetail } from '../../src/features/assistant/model/AssistantDetailContext'
import client from '../../src/api/customAxios'

const role = new URLSearchParams(location.search).get('role') === 'merchant' ? 'MERCHANT_OWNER' : 'ADMIN'
const Workspace = role === 'ADMIN' ? AdminAssistantWorkspace : MerchantAssistantWorkspace
const scopes = { ADMIN: 2, MERCHANT_OWNER: 7 }
const detail = { role, placeId: 7, facts: [{ label: '예약 상태', value: '확정' }] }
window.chatRequests = []
window.chatReads = []
window.chatRelease = null

function aiReply(content, stop_reason = 'end_turn') {
  return { type: 'message', role: 'assistant', content, stop_reason }
}
function tool(name, input = {}) {
  return aiReply([{ type: 'tool_use', id: 'tool_fixture_1', name, input }], 'tool_use')
}
function text(value) { return aiReply([{ type: 'text', text: value }]) }
client.defaults.adapter = async config => {
  let data
  if (config.method === 'post' && config.url === '/ai/chat') {
    const body = JSON.parse(config.data)
    window.chatRequests.push(body)
    const latest = body.messages.at(-1).content
    const answer = Array.isArray(latest) ? '조회 결과를 확인했어요.'
      : latest.includes('기다려') ? await new Promise(resolve => { window.chatRelease = () => resolve('이전 매장 답변') })
      : null
    const response = answer ? text(answer)
      : latest.includes('쿠폰') ? tool('navigateToPage', { page: 'offers' })
      : latest.includes('요약') ? tool('summarizeCurrentDetail')
      : latest.includes('잘못된') ? tool('getPendingWork')
      : role === 'ADMIN' ? tool('getPendingWork') : tool('getPendingReservations')
    data = JSON.stringify(response)
  } else if (config.method === 'get') {
    window.chatReads.push({ url: config.url, params: config.params })
    if (config.url === '/merchant-owner/reservations') {
      data = { page: 1, limit: 1, totalElements: 4, totalPages: 4, hasNext: true,
        reservations: [{ id: 101, quantity: 2, status: 'PENDING', bookerName: 'NOT_FOR_AI',
          bookerPhone: '010-1234-5678', requestNote: 'DO_NOT_SHARE' }] }
    } else if (config.url === '/admin/merchant-place-applications') {
      data = { total: 6 }
    } else if (config.url === '/admin/community-reports') {
      data = { totalCount: 0 }
    } else if (config.url === '/admin/place-review-deletion-requests') {
      throw new Error('Synthetic read failure')
    } else throw new Error('Unexpected fixture GET')
  } else throw new Error('Unexpected fixture mutation')
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}

function CurrentScreen() {
  const route = useLocation()
  useAssistantDetail(role === 'MERCHANT_OWNER' ? detail : null)
  return <output aria-label="검증 경로">{route.pathname}</output>
}
function Fixture() {
  const [selectedPlaceId, setSelectedPlaceId] = useState(scopes[role])
  const [accountId, setAccountId] = useState(1)
  window.switchStore = () => setSelectedPlaceId(8)
  window.switchAccount = () => setAccountId(2)
  return <AuthContext.Provider value={{ user: { id: accountId, username: 'fixture', role } }}>
    <MerchantPlaceContext.Provider value={{ selectedPlaceId }}>
      <MemoryRouter initialEntries={['/initial']}><Workspace><CurrentScreen /></Workspace></MemoryRouter>
    </MerchantPlaceContext.Provider>
  </AuthContext.Provider>
}
createRoot(document.getElementById('root')).render(<Fixture />)
