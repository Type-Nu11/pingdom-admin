// All rows and writes are synthetic and local to one QA instance.
export function createMerchantDialogData() {
  const time = '2026-10-05T12:30:00'
  const place = { id: 1, name: '합성 매장', roadAddress: '합성 주소' }
  const payment = { id: 1, reservationId: 2, status: 'PAID', amountMinor: 2050, currency: 'USD', provider: 'SYNTHETIC', providerPaymentId: 'synthetic-only', createdAt: time, paidAt: time, refundedAt: null }
  const review = { reviewId: 1, placeId: 1, userId: 2, content: '합성 리뷰', recommendReason: null, recommendReasons: ['CLEAN'], imageUrls: [], createdAt: time, visibilityStatus: 'VISIBLE', deletionRequest: null }
  const request = { requestId: 1, placeId: 1, merchantOwnerUserId: 99, status: 'REQUESTED', reason: '합성 재확인 사유', requestedAt: time, dueAt: '2026-10-10T12:30:00', lastRemindedAt: null, reminderCount: 0, respondedAt: null, responseNote: null, completedAt: null }
  const products = [2, 1].map(id => ({ productId: id, name: `합성 상품 ${id}`, description: '합성 상품 설명 '.repeat(80), priceAmount: 1000, currency: 'KRW', durationDays: 5, status: 'ACTIVE' }))
  const selections = [{ id: 1, productId: 1, placeId: 1, selectedAt: time }]
  const execution = { id: 1, selectionId: 1, productId: 1, placeId: 1, status: 'ACTIVE', startedAt: time, endsAt: '2026-10-10T12:30:00', stoppedAt: null }
  const page = (key, rows, countKey = 'totalElements') => ({ [key]: structuredClone(rows), page: 1, limit: 20, [countKey]: rows.length, totalPages: rows.length ? 1 : 0, hasNext: false })
  return {
    read(url) {
      if (url === '/merchant-owner/me') return { userId: 99, businessName: '합성 사업자', displayName: '합성 QA', status: 'ACTIVE', placeIds: [1] }
      if (url === '/merchant-owner/places/1') return { ...place }
      if (url === '/merchant-owner/payments') return page('payments', [payment])
      if (url === '/merchant-owner/payments/settlements') return page('entries', [])
      if (url === '/merchant-owner/places/1/reviews') return page('reviews', [review])
      if (url === '/merchant-owner/place-information-reverification-requests') return page('requests', [request], 'totalCount')
      if (url === '/merchant-owner/verified-boost-products') return page('products', products)
      if (url === '/merchant-owner/verified-boost-selections') return page('selections', selections)
      if (url === '/merchant-owner/verified-boost-executions') return page('executions', [execution], 'totalCount')
      throw new Error(`Unexpected synthetic GET ${url}`)
    },
    write(url, input = {}) {
      if (url === '/merchant-owner/payments/1/refund') {
        Object.assign(payment, { status: 'REFUNDED', refundedAt: time })
        return { ...payment }
      }
      if (url === '/merchant-owner/places/1/reviews/1/deletion-requests') {
        review.visibilityStatus = 'HIDDEN'
        review.deletionRequest = { id: 1, status: 'PENDING', requestReason: input.requestReason }
        return { ...review.deletionRequest }
      }
      if (url === '/merchant-owner/place-information-reverification-requests/1/responses') {
        Object.assign(request, { status: 'RESPONDED', responseNote: input.responseNote, respondedAt: time })
        return { ...request }
      }
      if (url === '/merchant-owner/verified-boost-selections') {
        const selected = { id: 2, productId: input.productId, placeId: input.placeId, selectedAt: time }
        selections.push(selected)
        return { ...selected }
      }
      if (url === '/merchant-owner/verified-boost-executions/1/stop') {
        Object.assign(execution, { status: 'STOPPED', stoppedAt: time })
        return { ...execution }
      }
      throw new Error(`Unexpected synthetic POST ${url}`)
    },
  }
}
