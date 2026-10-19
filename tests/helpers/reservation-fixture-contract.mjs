// Shared by Node and browser fixtures. Never inspect historical payment payloads.
export const retiredReservationFields = [
  'reservationType', 'productType', 'productId', 'productName', 'productVersion', 'reservationProductId',
  'unitAmountMinor', 'additionalAmountMinor', 'totalAmountMinor', 'amountMinor', 'currency', 'currencyFractionDigits',
  'paymentRequired', 'cancellationFeeMinor', 'refundAmountMinor', 'refundableAmountMinor',
]
export function verifyReservationFixture(path, value) {
  if (!/^\/(?:admin\/reservations|merchant-owner\/(?:reservations|availabilities))(?:\/|$)/.test(path ?? '')) return
  const visit = object => {
    if (!object || typeof object !== 'object') return
    for (const [key, child] of Object.entries(object)) {
      if (retiredReservationFields.includes(key)) throw new Error(`Retired reservation fixture field: ${key}`)
      visit(child)
    }
  }
  visit(value)
}
