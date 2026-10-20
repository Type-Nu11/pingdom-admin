import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { UnsavedChangesProvider } from '../../src/components/common/UnsavedChangesProvider'
import { GlobalStyle } from '../../src/styles/globalStyle'
import Page from '../../src/pages/merchantCampaign/MerchantCampaignPage'
import client from '../../src/api/customAxios'
import { observeFixtureAdapter } from '../helpers/fixture-adapter.mjs'

const scenario = new URLSearchParams(location.search).get('scenario') || 'multiple'
const brand = id => ({ id, name: `합성 브랜드 ${id}`, description: `브랜드 ${id} 소개`, logoUrl: id === 2 ? location.origin + '/broken-logo.png' : null, createdAt: '2030-01-01', updatedAt: '2030-01-01' })
let brands = scenario === 'zero' ? [] : scenario === 'one' ? [brand(1)] : [brand(1), brand(2)]
let campaigns = scenario === 'existing' || scenario === 'failure' ? [{ id: 9, brandId: 2, brandName: '합성 브랜드 2', placeId: 1, title: '저장된 이벤트', description: '기존 소개', startsAt: '2030-01-01T10:00', endsAt: '2030-01-01T11:00', status: 'DRAFT', updatedAt: '2030-01-01' }] : []
let brandReads = 0
window.brandQA = { calls: [] }
client.defaults.adapter = observeFixtureAdapter(async config => {
  const body = config.data ? JSON.parse(config.data) : null
  window.brandQA.calls.push({ method: config.method, path: config.url, body })
  const response = data => ({ config, data: structuredClone(data), status: 200, statusText: 'OK', headers: {} })
  if (config.method === 'get') {
    if (config.url.endsWith('/me')) return response({ placeIds: [1, 2] })
    if (/\/places\/\d+$/.test(config.url)) return response({ id: Number(config.url.split('/').at(-1)), name: '합성 매장', roadAddress: '합성로 1' })
    if (config.url.endsWith('/brands')) {
      if (scenario === 'failure' && ++brandReads === 1) throw new Error('Synthetic brand list failure')
      await new Promise(resolve => setTimeout(resolve, 80))
      return response({ items: brands, page: 1, totalPages: 1, totalElements: brands.length, hasNext: false })
    }
    if (config.url.endsWith('/campaigns')) return response({ items: campaigns, page: 1, totalPages: 1, totalCount: campaigns.length, hasNext: false })
  }
  if (config.method === 'post' && config.url.endsWith('/campaigns/brands')) {
    const next = { ...brand(3), ...body }
    brands = [...brands, next]
    return response(next)
  }
  if (config.method === 'post' && config.url.endsWith('/campaigns')) {
    const next = { ...body, id: 20, brandName: brands.find(brand => brand.id === body.brandId)?.name, status: 'DRAFT', updatedAt: '2030-01-01' }
    campaigns = [...campaigns, next]
    return response(next)
  }
  throw new Error('Unexpected synthetic brand request')
})
const router = createBrowserRouter([{ path: '*', element: <UnsavedChangesProvider><GlobalStyle /><Page /></UnsavedChangesProvider> }])
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={{ user: { id: 1, role: 'MERCHANT_OWNER' }, clearAuth() {}, logout() {} }}><RouterProvider router={router} /></AuthContext.Provider>)
