import assert from 'node:assert/strict'
import { retiredReservationFields } from './reservation-fixture-contract.mjs'
export { retiredReservationFields }

// Assert the specific source-confirmed web contract, not every API in the service.
export function verifyCurrentContracts(docs) {
  const properties = (group, name) => {
    const value = docs[group]?.components?.schemas?.[name]?.properties
    assert.ok(value, `Missing ${group} schema ${name}`)
    return value
  }
  for (const [group, names] of [
    ['merchant', ['AvailabilityUpsertRequest', 'AvailabilityResponse', 'ReservationTermsRequest', 'ReservationTermsResponse', 'ReservationResponse', 'ReservationConfirmation']],
    ['admin', ['AdminReservationResponse']],
    ['app', ['ReservationCreateRequest', 'ReservationQuoteResponse', 'AvailabilityResponse', 'ReservationTermsResponse', 'ReservationResponse', 'ReservationConfirmation']],
  ]) {
    for (const name of names) for (const field of retiredReservationFields) {
      assert.ok(!(field in properties(group, name)), `Retired reservation field ${group}.${name}.${field}`)
    }
    assert.ok(!Object.keys(docs[group].paths).some(path => path.includes('reservable-products')), 'Retired product endpoint')
  }
  assert.deepEqual(Object.keys(properties('merchant', 'ReservationTermsRequest')).sort(), ['timezone', 'cancellable', 'cancellationCutoffMinutes'].sort())
  for (const name of ['AvailabilityResponse', 'ReservationResponse', 'ReservationConfirmation']) {
    assert.deepEqual(docs.merchant.components.schemas[name], docs.app.components.schemas[name], `App/merchant ${name} diverged`)
  }
  assert.deepEqual(Object.keys(properties('admin', 'AdminTrustScoreChangeHistoryResponse')).sort(), ['items', 'page', 'limit', 'total', 'totalPages', 'hasNext'].sort())
  const dispute = docs.admin.paths['/admin/place-information-reports/{reportId}/disputes/{disputeId}/review'].post.responses['200']
  assert.ok(Object.values(dispute.content).every(value => value.schema.$ref === '#/components/schemas/PlaceInformationDisputeResponse'), 'Dispute review must return one dispute')
  assert.ok(!docs.admin.paths['/admin/notifications'].get.parameters.some(value => value.name === 'userId'), 'Notifications are current-admin scoped')
  assert.deepEqual(Object.keys(properties('admin', 'MerchantOwnerReviewRequest')), ['reason'])
  assert.ok(!('completedAt' in properties('admin', 'S3OrphanReport')))
  assert.ok('completedAt' in properties('admin', 'S3OrphanReportStatus'))
  assert.ok(!('kakaoPlaceId' in properties('admin', 'AdminMapPlaceDetailResponse')))
  assert.ok('businessRegistrationNumber' in properties('admin', 'AdminMerchantPlaceApplicationResponse'))
  assert.ok(!('businessRegistrationNumber' in properties('merchant', 'MerchantPlaceApplicationResponse')))
  // Retired reservation prices do not imply removal of historical payment/refund APIs.
  for (const field of ['id', 'reservationId', 'amountMinor', 'currency']) assert.ok(field in properties('merchant', 'PaymentResponse'))
  for (const field of ['id', 'paymentTransactionId', 'grossAmountMinor', 'feeAmountMinor', 'netAmountMinor']) assert.ok(field in properties('merchant', 'SettlementLedgerResponse'))
  for (const [path, method] of [['/merchant-owner/payments', 'get'], ['/merchant-owner/payments/settlements', 'get'], ['/merchant-owner/payments/{paymentId}/refund', 'post']]) assert.ok(docs.merchant.paths[path]?.[method], 'Historical payments must remain')
}
