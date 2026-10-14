// Synthetic records only. Never contains credentials or contacts real endpoints.
export function reservation(id, overrides = {}) {
  return {
    id, touristUserId: 5, touristUsername: '합성 예약자', placeId: 7, placeName: '합성 장소 7',
    merchantOwnerUserId: 8, merchantOwnerUsername: '합성 상점주', availabilityId: 1,
    productId: 2, productName: '합성 예약 상품', quantity: 1, status: 'PENDING',
    reservationStartsAt: '2026-10-06T10:00:00Z', reservationEndsAt: '2026-10-06T11:00:00Z',
    createdAt: '2026-10-01T00:00:00Z', confirmedAt: null, rejectedAt: null, canceledAt: null,
    reviewedBy: null, reviewedAt: null, reviewReason: null, statusHistory: [], ...overrides,
  }
}

export function reservationPage(query, overrides = {}) {
  const page = query.page ?? 1
  const rows = Array.from({ length: page === 3 ? 1 : 10 }, (_, i) => reservation((page - 1) * 10 + i + 1, {
    status: query.status || 'PENDING', placeId: query.placeId ?? 7,
  }))
  return { reservations: rows, page, limit: 10, totalElements: 21, totalPages: 3, hasNext: page < 3, ...overrides }
}
