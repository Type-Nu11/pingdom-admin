# 예약 표시 계약 정리 (#297)

## 기준과 변경

- 2026-10-19 KST 공개 merchant/admin Swagger를 HTTP 200으로 다시 조회했다. `ReservationConfirmation`, `ReservationResponse`, `AdminReservationResponse`에는 상품·가격·결제 필요 여부 필드가 없다. 서버가 해당 정보를 안 보내는 것을 무료나 결제 불필요로 해석하지 않는다.
- 상점주 목록·취소 확인창은 수락 당시 장소·시간·인원·취소 조건·조건 버전을 표시한다. 관리자 목록·상세·승인/반려 확인창은 장소·시간·인원·신청/심사 상태를 표시한다. 상품 타입/이름/ID, 가격/통화/결제 필요 여부, 취소 수수료/정책상 환불액 타입과 참조를 제거했다.
- null confirmation은 수락 조건을 확인할 수 없다는 안내를 유지한다. 취소 불가를 명시한 정책만 로컬 차단하며, 조건이나 취소 기한이 없으면 서버 판단이 필요하다고 안내한다. 기기 시계의 기한 경과 경고는 참고일 뿐 서버 판단을 대신하지 않는다.
- 예약 가능 시간 fallback 및 예약에 저장된 snapshot 우선순위, #298 UTC/KST 입력·표시, 관리자 필터/선택/뒤로 가기 복원, 승인·반려·사유 입력, pending/중복 제출/계정 보호는 유지했다. productId 필터 수정은 없다. 현재 API가 보내지 않는 필터를 장애로 분류하지 않았다.
- 과거 결제·정산·전액 환불 API와 화면, 장소 메뉴·Verified Boost는 제거하지 않았다. 결제의 null 금액/통화는 `금액 정보 없음`이며 0원으로 바꾸지 않는다. 공용 `formatMinorAmount`도 유지했다.
- 환불 응답은 `REFUNDED`일 때만 전액 환불 완료로 안내한다. `REFUND_PROCESSING`은 요청 접수/처리 중으로 안내하고 재환불 버튼을 제공하지 않는다. 그 밖의 응답도 완료가 확인되지 않았다고 표시한다. 취소의 `RESERVATION_REFUND_REQUIRED` 오류는 실패로 유지하며 결제·환불 내역 이동만 제공한다. 자동 환불·자동 재시도는 없다.
- 연결 근거는 `reservation.id ↔ payment.reservationId`, `payment.id ↔ settlement.paymentTransactionId`다. 예약에서 모든 결제 페이지를 자동 수집하거나 새 연결 화면을 추가하지 않았다.

## 검증

- 최신 상품·가격 없는 합성 응답으로 수락 조건 null, 취소 불가, 기한 없음/경과, PENDING/CONFIRMED/REJECTED/CANCELED, 취소 정책/환불 선행/상태 충돌·401/403/500·네트워크 실패를 검증한다. 실패 시 기존 행과 안내를 유지하고 중복 요청은 막는다.
- `tests/reservation-payment-preservation.test.mjs`: 결제/정산 null 금액·관계 ID, 환불 진행 중과 완료 구분, 환불 실패 시 기존 결제 유지. 실제 결제·환불 쓰기는 없다.
- `tests/reservation-review-context.test.mjs`: 최신 응답으로 관리자 승인/반려와 사유 필수 검증, 중복 제출/닫기 차단, 상태 변경 후 목록 복원. 모든 쓰기는 합성 adapter다.
- `node tests/browser/reservation-conditions.mjs`: 1920×1080, 1366×768, 390×844에서 실제 예약 페이지·취소 dialog·결제 페이지를 검증한다. 상품/무료/결제 불필요가 없고 장소·시간·인원이 보이는지, 취소 실패/처리 중/성공, 기기 시계 차이, 결제·환불 경로 이동, null 금액과 환불 진행 안내를 확인한다.
- `npm run test:reservation-context-browser`: 같은 3개 화면 크기에서 관리자 목록→상세→승인/반려 확인창, 장소 이동/뒤로 가기/새로고침·오류/빈 결과/권한/계정 변경을 확인한다. 브라우저의 관리자 쓰기는 실행하지 않고, 승인/반려 요청 회귀는 컴포넌트 테스트가 담당한다.
- 예약 조건 브라우저도 isolated Vite로 바꿔 `.env`와 개발 proxy를 읽지 않는다. fixture adapter는 허용하지 않은 API를 거부하고 browser guard는 외부/API 네트워크와 예기치 않은 console/HTTP/fixture 오류를 검사한다. 폰트 CSS는 빈 응답이므로 스크린샷은 운영 폰트·아이콘 픽셀 검증이 아니다.
- `npm run test:reservation-timezone-browser`: 서울/UTC/뉴욕 × 3개 화면 크기에서 UTC 본문·한국 시각 재조회, 나노초 보존 및 DST-gap 달력 회귀를 실행한다.

## 실제 환경과 남은 경계

- 실제 localhost:5173의 로그인된 상점주 예약 설정 화면에서 목록으로 이동했으나 세션 만료로 로그인 안내가 나왔다. 이번 변경의 인증된 실서버 목록 렌더링 성공으로 기록하지 않는다. 재로그인 이후 실제 목록 읽기 확인은 남는다. 비밀번호·토큰을 입력하거나 추출하지 않았다.
- 운영 일정/조건/예약 승인·반려·취소/결제·환불은 변경하지 않았다. 기존 일정 #6을 다른 시각으로 정정하지 않는다.
- 원본 OpenAPI 전체 스냅샷과 전체 계약 검사 갱신은 #302다. 계약표는 이번 9개 관련 행에 범위와 합성/실서버 검증 경계만 추가했다. 배포 QA, Safari/Firefox, 실기기 터치와 운영 환불 처리 결과는 별도다.

## 실행 결과 (2026-10-19)

- `npm test`: 재실행에서 834개 통과, 실패/취소/skip 없음. 첫 전체 실행에서 변경하지 않은 `merchant-application-access.test.mjs` 파일 단위 실패가 있었으나 단독 실행 7개와 전체 재실행이 통과했다. 최초 실패 원인은 확정하지 않았으며 테스트 코드를 수정하거나 제외하지 않았다.
- 계약표 수정 후 `tests/api-contract-matrix.test.mjs` 6개 통과. lint, TypeScript 포함 build 및 diff 공백 검사 통과.
- 조건/취소/결제 이동 브라우저, 관리자 context/승인·반려 확인창 브라우저: 데스크톱/노트북/모바일 3개 크기 모두 통과. 실패 시나리오의 예상 오류만 허용했고 그 밖의 브라우저/fixture 오류는 없었다. 스크린샷에서 조건 줄바꿈과 dialog 배치를 확인했다.
- 기존 setup, terms, timezone 브라우저도 모두 통과. timezone은 서울/UTC/뉴욕 × 3개 크기를 검증했다.
- React 품질 점검: 기존 styled-components·공통 AppDialog·접근성 이름·pending 보호를 유지했고 불필요한 effect/state, 외부 라이브러리나 추가 업무 API 조회를 도입하지 않았다.
- 합성 승인·반려·취소·환불 성공은 실서버 쓰기 검증을 뜻하지 않는다. 실서버 목록 조회는 위 세션 만료 경계가 남는다.
