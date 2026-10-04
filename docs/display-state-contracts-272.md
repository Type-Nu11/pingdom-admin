# 날짜·금액·조회 상태 표시 (#272)

## 적용 범위와 원칙

- 공통 함수: `src/utils/displayFormat.ts`. 결제·정산, S3 리포트, 데이터 품질 및 예약 조건의 표시를 우선 연결했습니다. 다른 업무 화면을 계약 확인 없이 일괄 치환하지 않습니다.
- 성공한 조회 결과가 있는지와 현재 요청 상태를 별도로 추적합니다. 최초 미조회/실패를 0건으로 표시하지 않고, 성공한 0건은 유지합니다. 갱신 중/실패 후 남긴 목록은 ‘이전 결과’로 표시합니다.
- 예약 취소 기한·금액 계산·환불·인증·권한 계약은 변경하지 않습니다. 서버에 보낼 시간 값이나 타임스탬프를 변경하지 않습니다.

## 확인한 표시 계약

서버 소스 기준: `pingdom-api` develop `4e3996c33d3806390734d24b98534d1e2f80107f` (2026-10-05 확인). 저장소의 관리자/상점주 OpenAPI 스냅샷과 함께 대조했습니다.

| 화면/값 | 확인한 계약 | 표시 정책 | 미확정 사항 |
| --- | --- | --- | --- |
| 결제 `amountMinor`, 정산 `gross/fee/netAmountMinor` | 정수 최소 단위와 3자리 통화 문자열. 결제 성공 전 금액/통화 null 가능. 소수 자릿수 필드 없음 | 원본 정수를 보존하고 `(최소 단위)`를 명시. null/안전 정수 범위 초과/잘못된 통화 형식은 금액 정보 없음. 음수 정산도 원본 부호 보존 | 지원 통화 목록, 통화 정밀도, 서버의 통화별 검증. ISO 기본값으로 임의 변환하지 않음 |
| 예약 수락 조건 금액 | `currencyFractionDigits`가 명시됨 | 기존 정확한 정수/BigInt 기반 표시를 공통 함수에 연결. 무료/미제공, 0/2/3 소수 정밀도 구분 | 서버가 제공하지 않은 통화·정밀도는 추정하지 않음 |
| 결제·정산 일시 | `PaymentResponse`, `SettlementLedgerResponse`의 `LocalDateTime` | 유효한 달력/시간 필드를 서버 기록 그대로 `YYYY.MM.DD HH:mm` 표시. 브라우저 시간대에 따라 이동시키지 않음 | 서버 기록 시간대는 필드에 없음. KST/UTC라고 표시하지 않음 |
| S3 리포트 일시 | 서비스에서 `LocalDateTime.now()` 저장, 미제공 가능 | 서버 기록 기준. null/잘못된 값은 시각 정보 없음 | 서버 JVM 시간대 및 명시적 시간대 계약 |
| 데이터 품질 `detectedAt` | `DataQualityIssueResponse`의 `LocalDateTime` | 서버 기록 그대로 표시 | 서버 기록 시간대 |
| 예약 조건 일시 | 명시 offset/UTC와 `timezone` | offset 없는 값을 순간 시각으로 해석하지 않음. 명시된 표시 시간대로만 변환 | 기존 정책 및 서버 판단 보존 |
| 장소 목록 건수 | 성공 응답의 `totalCount` | 성공 전 조회 중/조회 결과 없음. 성공한 0건만 0개. 갱신 중/실패 후 이전 결과 표기 | 다른 목록의 상태 계약은 각 기능에서 별도 확인 |

### 서버 참고

- [PaymentResponse](https://github.com/Type-Nu11/pingdom-api/blob/4e3996c33d3806390734d24b98534d1e2f80107f/src/main/java/com/typenull/pingdom/payment/api/dto/PaymentResponse.java)
- [SettlementLedgerResponse](https://github.com/Type-Nu11/pingdom-api/blob/4e3996c33d3806390734d24b98534d1e2f80107f/src/main/java/com/typenull/pingdom/payment/api/dto/SettlementLedgerResponse.java)
- [PaymentTransaction — 통화 정밀도 검증 제외 명시](https://github.com/Type-Nu11/pingdom-api/blob/4e3996c33d3806390734d24b98534d1e2f80107f/src/main/java/com/typenull/pingdom/payment/domain/PaymentTransaction.java)
- [DataQualityIssueResponse](https://github.com/Type-Nu11/pingdom-api/blob/4e3996c33d3806390734d24b98534d1e2f80107f/src/main/java/com/typenull/pingdom/moderation/api/dto/DataQualityIssueResponse.java)

## S3 리포트 부재 계약

- `report/status`에서 ID 생략 시 최신 Redis 리포트를 사용합니다. 최신 키가 없으면 404 + `생성된 S3 고아 파일 리포트가 없습니다.`를 반환합니다. TTL은 1시간입니다. 미생성과 만료를 구분할 수 없으므로 원인을 확정해 안내하지 않습니다.
- `GlobalExceptionHandler.handleResponseStatusException`은 reason을 `message`로 유지합니다. 이 특정 응답만 빈 상태로 취급하며, 인증 갱신 실패·다른 404·명시적 잘못된 ID·5xx는 오류로 유지합니다. ProblemDetail의 동일 `detail`도 허용합니다.
- 서버 서비스는 메타데이터가 없을 때 성공 응답에 `status: NOT_FOUND`도 제공합니다. ID 생략 요청이면 빈 상태, 명시 ID 요청이면 확인 실패로 처리합니다. S3 응답 타입은 이를 반영합니다.
- 파일 비교/상태 조회/후보 조회의 loading·error를 분리해 한 요청의 성공이 다른 오류를 지우지 않게 합니다. 늦은 응답·unmount 이후 응답도 반영하지 않습니다.
- 기존 결과를 보존할 수 있지만 최신 상태·후보 조회가 모두 완료돼야 삭제 가능합니다. 리포트 없음은 삭제 후보 0건이 아닙니다. `RUNNING`의 미완성 0건도 최종 0건으로 표시하지 않습니다.
- 자동 생성 POST/자동 삭제는 추가하지 않았습니다. 재조회는 GET이며 생성은 기존 수동 버튼만 사용합니다. 실데이터 삭제는 QA하지 않습니다.
- Swagger에 404 부재 계약 및 `NOT_FOUND` 값이 빠져 있다면 서버 문서화가 필요합니다. 전역 404 예외 처리로 대체하지 않습니다.

참고: [리포트 서비스](https://github.com/Type-Nu11/pingdom-api/blob/4e3996c33d3806390734d24b98534d1e2f80107f/src/main/java/com/typenull/pingdom/post/infrastructure/storage/MapImageS3OrphanReportService.java), [컨트롤러](https://github.com/Type-Nu11/pingdom-api/blob/4e3996c33d3806390734d24b98534d1e2f80107f/src/main/java/com/typenull/pingdom/moderation/api/post/AdminPostController.java), [예외 처리기](https://github.com/Type-Nu11/pingdom-api/blob/4e3996c33d3806390734d24b98534d1e2f80107f/src/main/java/com/typenull/pingdom/shared/exception/handler/GlobalExceptionHandler.java).

## 용어

- 메뉴·상단 제목·페이지·경로 안내: ‘미연결 파일 관리’.
- `dry-run`: ‘파일 비교 · 삭제 없음’. prefix: ‘저장 경로 접두어’.
- 데이터 품질은 ‘확인 전용’ 안내. 조회 전용 기능에 가상의 수정 버튼을 추가하지 않습니다.

## 검증과 제약

- `tests/display-consistency.test.mjs`: 날짜 유효성·브라우저 시간대 차이·통화 정밀도·null/부호/안전 정수·리포트 부재와 오류 분리·경합·이전 결과·조회 상태 DOM 검사.
- `tests/reservation-conditions.test.mjs`: 기존 수락 조건·금액·취소 기한 회귀.
- `node tests/browser/display-consistency-server.mjs`: 격리된 합성 QA 서버. 출력된 URL에 `scenario=empty|error|complete|running|failed|loading`, `screen=payments`로 확인. 원본 페이지/훅을 사용하되 모든 API 요청을 합성 adapter로 대체하고 mutation을 차단합니다. 실제 상점주/관리자 전체 QA와 구분합니다.
- 1920×1080·1366×768 합성 화면에서 빈 상태·조회 실패·생성 중·생성 실패·완료 후보·결제 표시를 확인했습니다. 가로 넘침이 없었으며 삭제 확인 모달의 배치와 최종 확인 전 비활성 상태를 검증했습니다. 실제 삭제는 실행하지 않았습니다.
- 실제 로그인된 로컬 `s3-orphans` 화면에서 파일 비교 GET 성공과 최신 리포트 부재 안내를 확인했습니다. 부재를 오류나 후보 0건으로 표시하지 않았고, 해당 검증 탭의 콘솔 오류는 없었습니다. 실제 리포트 생성·삭제·환불·승인 등의 쓰기 요청은 하지 않았습니다. 실제 완료 리포트·만료 ID 경계 사례는 합성 테스트로만 검증했습니다.
- Chrome DevTools의 `startTime` 예외는 앱 예외를 숨기는 코드로 대응하지 않습니다. Chrome 153 이상으로 재시작 후 원래 상호작용에서 재발 확인은 별도 미수행입니다.
- 운영 서버의 통화 정밀도·시간대 계약 확인과 전체 실계정 QA는 별도이며 이 문서의 합성 검증으로 완료 처리하지 않습니다.
