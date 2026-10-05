// Synthetic responses follow each endpoint's own list and pagination contract.
function page(rows) {
  return { page: 1, limit: 20, totalElements: rows.length, totalPages: rows.length ? 1 : 0, hasNext: false }
}

export function paymentFixture(scenario) {
  const payments = scenario === 'empty' ? [] : [{
    id: 1, reservationId: 2, status: 'PAID', amountMinor: 2050, currency: 'USD',
    provider: 'SYNTHETIC', providerPaymentId: 'synthetic-only',
    createdAt: '2026-10-05T12:30:00', paidAt: '2026-10-05T12:30:00', refundedAt: null,
  }]
  return { payments, ...page(payments) }
}

export function settlementFixture(scenario) {
  const entries = scenario === 'empty' ? [] : [{
    id: 1, paymentTransactionId: 1, entryType: 'PAYMENT', status: 'SETTLED',
    grossAmountMinor: 2050, feeAmountMinor: 50, netAmountMinor: 2000, currency: 'USD',
    createdAt: '2026-10-05T12:30:00', settledAt: '2026-10-05T12:31:00',
  }]
  return { entries, ...page(entries) }
}
