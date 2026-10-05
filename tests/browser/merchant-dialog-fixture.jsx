import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { MerchantPlaceContext } from '../../src/app/providers/MerchantPlaceContext'
import PaymentPage from '../../src/pages/merchantPayments/MerchantPaymentsPage'
import BoostPage from '../../src/pages/merchantVerifiedBoost/MerchantVerifiedBoostPage'
import ResponsePage from '../../src/pages/merchantPlaceReverification/MerchantPlaceReverificationPage'
import ReviewPage from '../../src/pages/merchantPlaceReview/MerchantPlaceReviewPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
import { createMerchantDialogData } from './merchant-dialog-data.mjs'

const params = new URLSearchParams(location.search)
const screen = params.get('screen') || 'refund'
const scenario = params.get('scenario') || 'success'
const data = createMerchantDialogData()
let notify = () => {}
let mutations = 0
// The adapter never forwards requests: only the named synthetic writes exist.
client.defaults.adapter = async config => {
  let result
  if (config.method === 'get') result = data.read(config.url)
  else if (config.method === 'post') {
    mutations++
    notify(mutations)
    await new Promise(resolve => setTimeout(resolve, scenario === 'delayed' && mutations === 1 ? 12_000 : 100))
    if (scenario === 'error' || (scenario === 'delayed' && mutations === 1)) {
      throw Object.assign(new Error('Synthetic failure'), { isAxiosError: true, config, response: { config, status: 500, data: { message: '합성 처리 실패 — 입력을 유지하고 다시 시도해주세요.' }, headers: {} } })
    }
    result = data.write(config.url, config.data ? JSON.parse(config.data) : {})
  } else throw new Error(`Blocked synthetic method ${config.method}`)
  return { config, data: result, status: 200, statusText: 'OK', headers: {} }
}
const auth = { clearAuth() {}, logout() {}, user: { id: 99, username: '합성 QA', role: 'MERCHANT_OWNER' }, isAuthenticated: true, isAuthReady: true }
const selection = { selectedPlaceId: 1, syncPlaces: () => 1, selectPlace() {} }
const Page = screen === 'review' ? ReviewPage : screen === 'response' ? ResponsePage : ['selection', 'stop'].includes(screen) ? BoostPage : PaymentPage
function Fixture() {
  const [count, setCount] = useState(0)
  notify = setCount
  return <AuthContext.Provider value={auth}><MerchantPlaceContext.Provider value={selection}><MemoryRouter><GlobalStyle />
    <p role="status" style={{ margin: 0, padding: 8 }}>합성 모달 QA · 실서버 요청 없음 · 변경 요청 {count}회</p>
    <Page />
  </MemoryRouter></MerchantPlaceContext.Provider></AuthContext.Provider>
}
createRoot(document.getElementById('root')).render(<Fixture />)
