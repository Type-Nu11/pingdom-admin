import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AxiosError } from 'axios'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { GlobalStyle } from '../../src/styles/globalStyle'
import Claim from '../../src/pages/merchantPlaceApplication/MerchantPlaceApplicationPage'
import Registration from '../../src/pages/merchantPlaceRegistration/MerchantPlaceRegistrationPage'
import client from '../../src/api/customAxios'
const isNew = location.search.includes('new')
const base = '/users/me/merchant-place-applications'
window.qaCalls = []
window.qaFailSave = false
window.qaApplication = {
  id: 1, applicantUserId: 1, status: 'DRAFT', applicationType: isNew ? 'NEW_PLACE' : 'EXISTING_PLACE_CLAIM',
  legalName: '테스트 신청자', businessName: '테스트 사업자', merchantDisplayName: '테스트 매장',
  merchantContactEmail: 'test@example.com', merchantContactPhone: '+821012345678',
  merchantDescription: '', existingPlaceId: 7, placeName: '합성 신청 장소', claimReason: '운영자입니다.',
  updatedAt: '2026-09-30T10:00:00', createdAt: '2026-09-30T10:00:00',
  attachments: ['BUSINESS_REGISTRATION', 'IDENTITY_DOCUMENT', 'REPRESENTATIVE_IMAGE'].map((documentType, i) => ({ id: i + 1, documentType, originalFilename: documentType + '.png', fileSize: 100, displayOrder: i })),
  newPlace: { placeName: '합성 신청 장소', category: 'RESTAURANT', latitude: 37.5, longitude: 127, roadAddress: '서울 테스트로 1', jibunAddress: '서울 테스트동 1', postalCode: '12345', description: '매장 소개', businessContactPhone: '+821012345678', applicantContactPhone: '+821012345678', tags: [], timezone: 'Asia/Seoul', operatingDays: [] },
}
client.defaults.adapter = async config => {
  const payload = config.data ? JSON.parse(config.data) : undefined
  window.qaCalls.push({ method: config.method, url: config.url, payload })
  let data
  if (config.url === '/users/me/merchant-owner-profile') data = { status: 'PENDING', businessName: '테스트 사업자', placeIds: [] }
  else if (config.url === base) data = { items: [window.qaApplication], page: 1, hasNext: false }
  else if (config.url === base + '/1' && config.method === 'put') {
    if (window.qaFailSave) throw new AxiosError('conflict', 'ERR_BAD_REQUEST', config, null, { status: 409, data: { code: 'INVALID_STATE' }, config, headers: {} })
    window.qaApplication = { ...window.qaApplication, ...payload }
    data = window.qaApplication
  } else if (config.url === base + '/1/submit') {
    window.qaApplication = { ...window.qaApplication, status: 'PENDING' }; data = window.qaApplication
  } else if (config.url === base + '/1') data = window.qaApplication
  else throw new Error('Unexpected fixture request: ' + config.url)
  return { config, data: structuredClone(data), status: 200, statusText: 'OK', headers: {} }
}
const auth = { user: { id: 1, username: 'synthetic', role: 'USER' }, clearAuth() {}, logout() {} }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><BrowserRouter><GlobalStyle/>{isNew ? <Registration/> : <Claim/>}</BrowserRouter></AuthContext.Provider>)
