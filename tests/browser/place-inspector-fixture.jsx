import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import Page from '../../src/pages/place/PlaceManagePage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

const canvas = document.createElement('canvas')
canvas.width = 640; canvas.height = 480
const ctx = canvas.getContext('2d')
ctx.fillStyle = '#26805c'; ctx.fillRect(0, 0, 640, 480)
ctx.fillStyle = '#fff'; ctx.font = '32px sans-serif'; ctx.fillText('Synthetic place', 60, 100)
const places = [1, 2].map(id => ({ id, name: `합성 장소 ${id}${id === 2 ? ' 긴 장소명'.repeat(20) : ''}`,
  address: '합성 주소 123', category: '카페', latitude: 37 + id / 100, longitude: 127,
  operatingStatus: 'OPERATING', discoveryStatus: 'VISIBLE', imageUrl: id === 1 ? canvas.toDataURL() : '/missing-qa-image.png',
  regularHours: [], operatingExceptions: [], posts: [], touristCategories: [] }))
window.qaRequests = []
client.defaults.adapter = async config => {
  window.qaRequests.push({ method: config.method, url: config.url })
  if (config.method !== 'get') throw new Error('Mutation forbidden in browser fixture')
  let data
  if (config.url === '/admin/places') data = { places, page: 1, limit: 10, totalCount: 2, totalPages: 1, hasNext: false }
  else if (/^\/admin\/places\/[12]$/.test(config.url)) data = places[Number(config.url.split('/').at(-1)) - 1]
  else throw new Error(`Unexpected fixture API: ${config.url}`)
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
const auth = { clearAuth() {}, user: { id: 99, username: 'synthetic', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><MemoryRouter><GlobalStyle /><Page /></MemoryRouter></AdminNotificationContext.Provider></AuthContext.Provider>)
