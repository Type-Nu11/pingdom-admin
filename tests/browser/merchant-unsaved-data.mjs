// In-memory data only. Unknown reads/writes fail instead of reaching a server.
export const merchantUnsavedPages = {
  products: 'merchantReservationProducts/MerchantReservationProductsPage',
  availability: 'merchantReservationSetup/MerchantReservationSetupPage',
  notices: 'merchantOperatingNotice/MerchantOperatingNoticePage',
  operations: 'merchantPlaceOperations/MerchantPlaceOperationsPage',
  response: 'merchantPlaceReverification/MerchantPlaceReverificationPage',
}
export function createMerchantUnsavedData() {
  let products = [1, 2].map(id => ({ id, placeId: 1, name: `합성 상품 ${id}`, productType: 'TICKET', status: 'ACTIVE' }))
  let availabilities = [1, 2].map(id => ({ id, placeId: 1, productId: null, productType: 'GENERAL', startsAt: `2030-01-0${id}T10:00:00`, endsAt: `2030-01-0${id}T11:00:00`, totalCapacity: 5, remainingCapacity: 5, status: 'ACTIVE', reservationTerms: null }))
  let notices = [1, 2].map(id => ({ id, placeId: 1, noticeType: 'GENERAL', severity: 'INFO', message: `합성 공지 ${id}`, startsAt: '2030-01-01T10:00:00', expiresAt: '2030-01-02T10:00:00', status: 'ACTIVE' }))
  let operating = { placeId: 1, operatingStatus: 'OPERATING', currentlyOperating: true, checkedAt: '2026-10-06T10:00:00', regularHours: [], operatingExceptions: [] }
  const request = { requestId: 1, placeId: 1, status: 'REQUESTED', reason: '합성 요청', requestedAt: '2026-10-06T10:00:00', dueAt: '2030-01-01T10:00:00', responseNote: null }
  return {
    read(url) {
      if (url === '/merchant-owner/me') return { userId: 99, status: 'ACTIVE', displayName: '합성 QA', placeIds: [1, 2] }
      if (url === '/merchant-owner/reservable-products') return structuredClone(products)
      if (url === '/merchant-owner/availabilities') return structuredClone(availabilities)
      if (/^\/merchant-owner\/places\/\d+\/operating-notices$/.test(url)) return { notices: structuredClone(notices), currentlyOperating: true, checkedAt: operating.checkedAt }
      if (/^\/merchant-owner\/places\/\d+\/operating$/.test(url)) return structuredClone(operating)
      if (/^\/merchant-owner\/places\/\d+\/media$/.test(url)) return { media: [], representativeMediaId: null }
      if (/^\/merchant-owner\/places\/\d+$/.test(url)) return { id: Number(url.split('/').at(-1)), name: '합성 매장', ...structuredClone(operating) }
      if (url === '/merchant-owner/place-information-reverification-requests') return { requests: [{ ...request }], page: 1, totalCount: 1, totalPages: 1, hasNext: false }
      throw new Error(`Unknown synthetic read ${url}`)
    },
    write(url, input) {
      if (url === '/merchant-owner/reservable-products') { const next = { id: 3, ...input, status: 'ACTIVE' }; products.push(next); return next }
      if (/^\/merchant-owner\/availabilities(?:\/\d+)?$/.test(url)) {
        const id = Number(url.split('/').at(-1)) || 3
        const next = { ...availabilities[0], ...input, id }
        availabilities = [...availabilities.filter(item => item.id !== id), next]
        return next
      }
      if (/^\/merchant-owner\/places\/\d+\/operating-notices(?:\/\d+)?$/.test(url)) {
        const id = Number(url.split('/').at(-1)) || 3
        const next = { ...notices[0], ...input, id }
        notices = [...notices.filter(item => item.id !== id), next]
        return next
      }
      if (url.endsWith('/operating-schedule')) { operating = { ...operating, regularHours: input.regularHours, operatingExceptions: input.exceptions }; return operating }
      if (url.endsWith('/operating-status')) { operating = { ...operating, ...input, checkedAt: '2026-10-06T11:00:00' }; return operating }
      if (url.endsWith('/1/responses')) { Object.assign(request, { status: 'RESPONDED', responseNote: input.responseNote }); return { ...request } }
      if (url.endsWith('/1/cancel')) { notices = notices.map(item => item.id === 1 ? { ...item, status: 'CANCELED' } : item); return notices.find(item => item.id === 1) }
      throw new Error(`Unknown synthetic write ${url}`)
    },
  }
}
