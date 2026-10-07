// Synthetic contract-shaped data only. No credentials or production records.
export function createIdentityExtensionData(count = 2, longName = false) {
  const time = '2026-10-07T12:30:00'
  const ids = Array.from({ length: count }, (_, index) => index + 1)
  const name = longName ? 'InternationalFlagshipStore'.repeat(6) : '같은 매장명'
  const address = id => `서울특별시 합성도로 ${id}${longName ? ' 긴상세주소'.repeat(15) : ''}`
  const profile = { userId: 99, displayName: '합성 QA', businessName: '합성 사업자', status: 'ACTIVE', placeIds: ids }
  const products = [1, 2].map(productId => ({ productId, name: `합성 상품 ${productId}`, description: '합성 상품 설명', durationDays: 5, currency: 'KRW', priceAmount: 1000, status: 'ACTIVE' }))
  const selections = ids.map(placeId => ({ id: 10 + placeId, productId: 1, placeId, selectedAt: time }))
  const executions = ids.map(placeId => ({ id: 20 + placeId, selectionId: 10 + placeId, productId: 1, placeId, status: 'ACTIVE', startedAt: time, endsAt: time, stoppedAt: null }))
  const requests = ids.map(placeId => ({ requestId: 30 + placeId, placeId, merchantOwnerUserId: 99, status: 'REQUESTED', reason: `합성 사유 ${placeId}`, requestedAt: time, dueAt: time, lastRemindedAt: null, reminderCount: 0, respondedAt: null, responseNote: null, completedAt: null }))
  const page = (key, items, countKey = 'totalElements') => ({ [key]: structuredClone(items), page: 1, limit: 20, [countKey]: items.length, totalPages: items.length ? 1 : 0, hasNext: false })
  return {
    name, address, profile,
    read(url) {
      if (url === '/merchant-owner/me') return structuredClone(profile)
      if (/^\/merchant-owner\/places\/\d+$/.test(url)) return { id: Number(url.split('/').at(-1)), name, roadAddress: address(Number(url.split('/').at(-1))) }
      if (url.endsWith('/verified-boost-products')) return page('products', products)
      if (url.endsWith('/verified-boost-selections')) return page('selections', selections)
      if (url.endsWith('/verified-boost-executions')) return page('executions', executions, 'totalCount')
      if (url.endsWith('/place-information-reverification-requests')) return page('requests', requests, 'totalCount')
      throw new Error(`Unexpected synthetic GET ${url}`)
    },
    write(url, input) {
      if (url.endsWith('/verified-boost-selections')) {
        const next = { id: 100, productId: input.productId, placeId: input.placeId, selectedAt: time }
        selections.push(next); return next
      }
      if (url.endsWith('/verified-boost-executions')) {
        const selection = selections.find(item => item.id === input.selectionId)
        const execution = { id: 200, selectionId: selection.id, productId: selection.productId, placeId: selection.placeId, status: 'ACTIVE', startedAt: time, endsAt: time, stoppedAt: null }
        executions.push(execution); return { ...execution }
      }
      if (/\/verified-boost-executions\/\d+\/stop$/.test(url)) {
        const execution = executions.find(item => item.id === Number(url.split('/').at(-2)))
        Object.assign(execution, { status: 'STOPPED', stoppedAt: time }); return { ...execution }
      }
      if (/\/place-information-reverification-requests\/\d+\/responses$/.test(url)) {
        const request = requests.find(item => item.requestId === Number(url.split('/').at(-2)))
        Object.assign(request, { status: 'RESPONDED', responseNote: input.responseNote, respondedAt: time }); return { ...request }
      }
      throw new Error(`Unexpected synthetic POST ${url}`)
    },
  }
}
