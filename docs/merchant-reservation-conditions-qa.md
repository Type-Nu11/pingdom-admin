# 예약 수락 조건 및 취소 안내 검증 (#255)

## 확인한 계약

- 2026-10-01 공개 merchant OpenAPI의 ReservationResponse.confirmation 및 nullable ReservationConfirmation을 확인했습니다.
- 서버 develop의 `docs/reservation-confirmation-contract.md`와 ReservationService.cancelOwned/cancel을 읽었습니다. 수락 스냅샷의 정책·기한과 환불 선행 검증을 적용하며, 확정 예약만 취소할 수 있습니다. 실제 상태 오류 코드는 INVALID_RESERVATION_STATE입니다.
- 취소 operation의 공개 Swagger 응답 목록은 200/401/403만 표시합니다. 409 두 오류 처리는 서버 문서의 CANCELLATION_NOT_ALLOWED 및 RESERVATION_REFUND_REQUIRED 계약을 근거로 구현했습니다. 실서버 409 재현의 증거는 아닙니다.

## 구현 범위

- 수락 당시 상품·장소·시간·수량·금액·통화·취소 조건을 읽기 전용으로 표시합니다. 현재 상품/슬롯 정보보다 스냅샷을 우선하며, quote expiresAt은 기존 예약 취소 기한으로 사용하지 않습니다.
- 금액은 안전한 정수와 currencyFractionDigits를 사용하여 반올림·환율 변환 없이 표시합니다. JavaScript 안전 정수 범위를 벗어난 금액은 정보 없음으로 표시합니다.
- null 스냅샷은 기존 예약의 조건 정보 없음으로 구분합니다. 무료·취소 불가·결제 완료를 추측하지 않습니다.
- 확인 가능한 정책상 취소 불가 또는 기한 경과는 표시와 요청 직전 검사에서 막습니다. 기한이 없는/잘못된 값은 서버 확인 대상으로 유지합니다. 서버가 최종 판단합니다.
- 취소 모달은 공통 AppDialog를 재사용합니다. pending 중 닫기·Escape·배경 클릭 및 중복 요청을 차단합니다. 오류 안내를 모달에 유지하고 환불 선행 오류에는 결제 내역 이동을 제공합니다.
- 실패 시 기존 예약을 유지하며, 성공 응답으로만 행을 갱신합니다. 자동 환불·자동 재시도는 추가하지 않았습니다.
- 가격·정책 설정(#256), 관리자 예약 심사, 결제·환불 화면의 데이터/동작은 변경하지 않았습니다.

## 자동 검증

- `tests/reservation-conditions.test.mjs`: 통화 최소 단위·큰 정수·무료·null 조건·시간대·기한 경계·현재 상품 변경·요청 직전 stale 상태 검사.
- 409 정책 충돌/환불 선행/잘못된 상태, 401/403/500, 네트워크 실패를 모의 응답으로 구분했습니다. 409는 로그아웃하지 않으며 취소 요청을 자동 재시도하지 않습니다.
- pending 중 중복 요청 없음, 성공 전 행 유지, 성공 후 갱신 및 이후 조회 실패 시 결과 유지를 확인했습니다.
- `tests/browser/reservation-conditions.mjs`: 실제 예약 페이지에 합성 Axios adapter를 주입하여 1920×1080 및 1366×768, America/Los_Angeles 브라우저 시간대에서 확인했습니다.
- 무료/유료/구형/취소 불가/기한 경과 표시, 모달 내부 조건 잘림 없음·뷰포트 내 배치, pending 닫기 차단, 성공 후 갱신, 충돌 안내 및 결제 내역 경로 이동을 확인했습니다. 네이버 지도나 실제 결제 API는 호출하지 않았습니다.
- 초기 브라우저 검사는 구형 예약의 상품명 fallback까지 금지하는 과도한 assertion과 성공 안내 아이콘을 고려하지 않은 exact text selector로 실패했습니다. assertion/selector를 수정한 후 통과했습니다.
- 서버·브라우저는 테스트 finally에서 종료하며 사용자의 localhost:5173 서버는 건드리지 않았습니다.

## 미수행

- 실제 상점주 계정 조회·예약 취소·환불, 배포 QA, Safari/Firefox 검증은 하지 않았습니다. 공개 Swagger 조회 이외는 모의 검증입니다.
- 실제 최신 결제 상태·환불 완료 여부는 confirmation만으로 알 수 없으므로 표시하지 않습니다. 결제 경로는 테스트용 도착 화면으로 검증했습니다.
- 전체 상점주 통합 검증은 #220에서 추적합니다.
