# 최신 API 계약과 배포 전 변화 검사 (#302)

## 확인된 문제와 기준

- 웹 기준: develop `40d0a3102fe23434a953b141399a5dc5be27bb97`(PR #309 병합). 서버 조사 기준: develop `2df52f73914c4c1295fb013d7cc8779de2721df2`. 커밋 기준과 실제 배포 버전은 별개다.
- 공개 GET 수집: 2026-10-19 09:00:46~47 KST. 정확한 그룹별 UTC 시각·출처·원본 SHA-256·baseline 해시는 `openapi/metadata.json`에 기록한다. 인증 헤더·쿠키·환경변수 토큰을 사용하지 않았다.
- Admin 145 operation, Merchant 81 operation을 원본으로 보존하고 계약표 260행을 대조했다. App 112, Common 14 operation은 최초 참고 수집이다. 기존 CSV 범위를 임의로 App/Common 전체로 확장하지 않으며, 이 두 그룹의 과거 비교 결과를 만들지 않는다. Consulting은 범위 밖이다.
- Swagger의 info.version은 v0여서 운영 릴리스 버전을 확인할 수 없다. 서버 기준 커밋 확인·공개 문서 확인·인증된 실제 API 성공을 혼동하지 않는다.
- 이전 스냅샷에는 예약 상품 API와 상품·금액 필드가 남아 있었다. 기존 계약표 생성기는 #296의 최신 조건 근거를 #256의 가격 포함 설명으로 되돌리고 #301의 소스 확인 API를 blocked/#207로 덮어쓸 수 있었다.

## 실질 계약 차이

- Merchant에서 `GET/POST /merchant-owner/reservable-products`, `POST /merchant-owner/reservable-products/{productId}/activate`, `POST .../deactivate` 4개 operation이 제거됐다. 소스 호출도 없으므로 계약표는 removed로 정리한다. 이는 해당 4개 API에 대한 확인이며 다른 상품 API를 일괄 삭제하지 않는다.
- AdminReservationResponse의 productId/productName, Availability 요청/응답의 productId/productType, ReservationResponse/Confirmation의 상품·가격·통화·paymentRequired·수수료/환불 필드가 제거됐다. ReservationTerms 요청/응답은 timezone/cancellable/cancellationCutoffMinutes 3필드다. required 배열의 변경과 설명·operationId 등 문서성 차이를 분리 기록했다.
- App/Merchant의 AvailabilityResponse, ReservationResponse, ReservationConfirmation은 현재 수집본의 schema가 같다. App 견적 응답은 confirmationToken/confirmation/remainingCapacity이며 금액을 추정해 채우지 않는다. Common은 공통 계약 참고 원본으로만 수집했고 과거 예약 변경 이력은 주장하지 않는다.
- 신뢰 점수 이력은 페이지 객체, 반박 심사는 반박 단건이다. #299/#300 수정과 연결한 계약 검사를 유지한다.
- 서버 Swagger에 남은 Kakao ID 수정 PATCH는 #292에서 웹 UI/호출을 제거한 범위여서 missing 기능이 아닌 excluded로 정리한다. 상세 응답의 미제공 필드를 제거하는 것과 서버 endpoint가 존재하는 것은 별개이며 서버 삭제로 기록하지 않는다.
- `GET /admin/data-quality/issues`는 서버 소스에 있지만 공개 Swagger에는 없다. Controller의 ApiAudience 누락과 기능 Tag 요구를 known-source-contracts/source-contract-gaps에 남긴다. 원본 Swagger를 합성 경로로 수정하지 않고, #301 소스·합성 구현 기록과 인증된 GET 미검증 경계를 보존한다.
- 시간 의미는 #296~#298의 소스 대조 근거를 유지한다. 슬롯/예약 schedule의 UTC LocalDateTime, confirmation의 명시 offset, 입력/표시 KST를 구분한다. OpenAPI date-time 한 단어만으로 시간대를 단정하지 않는다.

## 잔여 타입 5종

| 항목 | 최신 확인과 처리 |
| --- | --- |
| 관리자 알림 목록 userId | Controller는 @CurrentUser 관리자 ID로 조회하고 query userId를 받지 않는다. 요청 타입에서 제거하고 API 함수는 지원하는 type/read/from/to/page/limit만 전송한다. 알림 항목의 수신자 userId와 별도 배송 조회의 userId 필터는 유지한다. 기존 UI 호출은 이 잘못된 필터를 사용하지 않아 재현된 운영 장애로 과장하지 않는다. |
| 상점주 승인·반려 placeIds | MerchantOwnerReviewRequest는 reason만 가진다. review 타입과 전송 본문에서 placeIds를 제외한다. 장소 연결 PUT은 별도 계약이므로 placeIds를 유지한다. 기존 화면의 사유/대상/권한/중복 제출 정책은 변경하지 않는다. |
| S3 리포트 completedAt | S3OrphanReportStatus에는 있지만 S3OrphanReport에는 없다. 리포트 타입은 해당 필드를 상속하지 않으며 훅의 공용 표시 상태는 두 응답의 union으로 표현한다. completion 시각을 null/현재 시각으로 꾸며내지 않는다. 기존 합성 응답도 상태/리포트를 분리한다. |
| 관리자 장소 상세 kakaoPlaceId | AdminMapPlaceDetailResponse 소스와 Swagger에 없다. 미사용 타입 필드만 제거한다. KAKAO geocodingSource와 별도 병합 이력의 legacy 메타데이터는 실제 계약이므로 유지한다. 장소 레벨/불꽃 UI를 되살리지 않는다. |
| 신청 상세 businessRegistrationNumber | 권한·감사 로그를 거친 AdminMerchantPlaceApplicationResponse에 실제 존재해 유지한다. 상점주 자신의 MerchantPlaceApplicationResponse에는 없으며 응답에서 번호를 재사용하지 않는다. 새로운 번호 표시/조회 기능을 추가하지 않고 실번호는 수집하지 않는다. |

서버 소스 경로(위 고정 커밋, `Type-Nu11/pingdom-api`):

- `moderation/api/notification/AdminNotificationController.java`
- `identity/api/dto/merchant/MerchantOwnerReviewRequest.java`
- `post/infrastructure/storage/MapImageS3OrphanReportService.java`의 두 nested record
- `moderation/api/dto/place/query/AdminMapPlaceDetailResponse.java`
- `place/api/dto/registration/AdminMerchantPlaceApplicationResponse.java`, `MerchantPlaceApplicationResponse.java`

공통 접두사는 `src/main/java/com/typenull/pingdom/`이다. 테스트의 합성 번호/사유는 운영 데이터가 아니다.

## 변경 및 검사 방식

- 네 문서의 수집·검증·기준 비교가 끝난 뒤에만 명시적 refresh로 원본을 쓴다. 일부 그룹의 실패·인증/리다이렉트·HTML·invalid JSON/OpenAPI가 기존 원본/메타데이터/비교 보고서를 덮어쓰지 않는지 CLI 수준에서 검사한다.
- `npm run check:api-contracts`는 네 문서를 읽기 전용으로 비교한다. 0=contract 차이 없음, 1=contract 차이 검토 필요, 2=비교 차단이다. 문서성 차이만 있으면 0이지만 보고서에는 남긴다. 정상 추가도 1이므로 breaking 여부를 자동 단정하지 않는다.
- `npm run check:api-matrix`는 CSV·source gaps 생성 결과가 저장본과 같은지 확인하며 파일을 쓰지 않는다. 생성기는 제품별 implemented/이슈/확인 근거를 보존하고 누락 API의 known source 근거도 유지한다.
- component의 required/nullable/property 변화, path parameter·security·server 변화를 비교한다. 비교는 OpenAPI 구조 기반이며 모든 JSON Schema 의미 동치를 판정하는 정식 호환성 분석기는 아니다.
- 폐기 endpoint/field와 history 배열·전체 신고 반박 응답을 주입한 고의 결함 검사가 실패하는지 확인한다. 공용 fixture adapter와 예약 설정 fixture는 상품·가격 필드가 null이어도 거부한다. 결제/부스트 응답에는 이 금지 규칙을 적용하지 않는다.
- 릴리스 브라우저 실행기에 예약 설정·3시간대 변환·신뢰 점수 이력·반박 심사·데이터 품질·잔여 S3/금액 계약 검사 6종을 추가한다. 기존 9종과 함께 순차 실행하며 실패·timeout·미실행을 통과로 기록하지 않는다.

## 기존 결제·정산·환불 유지

- 예약.id = 결제.reservationId, 결제.id = 정산.paymentTransactionId로 구분한다. ID를 혼용하거나 예약 상품 ID를 새로 만들지 않는다.
- 기존 결제 조회·정산 원장·전액 환불 API와 운영 화면은 유지한다. 예약 가격 필드 제거를 과거 결제 금액 제거로 해석하지 않는다.
- 금액/통화 null은 정보 없음이지 무료/0원이 아니다. 통화 소수 자릿수가 없으면 최소 단위 표기를 유지하고 임의 환산하지 않는다.
- 신규 결제 거래·과거 견적 원문/상품명 공개 API를 추가하지 않는다. 실제 환불·결제·예약·심사는 실행하지 않는다.

## 검증 기록과 경계

- 공개 Swagger 네 그룹 원본 수집과 원격 읽기 전용 비교는 실제 네트워크 GET이다. 원격 비교 결과는 compatible이며 원본 해시와 일치했다. 이는 문서 간 차이가 없다는 뜻이지 실계정 업무 성공이 아니다.
- 최종 `npm test`: 990개 통과, 실패/취소/skip 없음. 관련 계약/잔여 타입/S3/CLI/실행기 검사 98개 통과. lint·TypeScript 포함 build·`git diff --check`, 계약표 읽기 전용 재생성 검사도 통과했다.
- 최종 `npm run test:release-browser`: detector-probes/dashboard/accessibility/reservation-context/merchant-safety/merchant-identity/user-ban-structure/community/merchant-draft/reservation-setup/reservation-timezone/trust-score-history/place-dispute-review/data-quality/residual-contract의 **15종 모두 통과**. 1920×1080·1366×768·390×844 주요 흐름과 시간대 3종(Asia/Seoul·UTC·America/New_York)을 포함한다. S3/품질/관련 작업의 스크린샷과 실제 조작을 확인했으며, 390px S3 기존 헤더 가독성 제약은 아래처럼 별도로 남겼다.
- 첫 전체 검사에서 과거 지도 cleanup 검사가 상세의 kakaoPlaceId 타입을 계속 요구해 1건 실패했다. 현행 소스/Swagger에 맞춰 기대를 수정하되 KAKAO 원천값·병합 메타데이터 유지 검사는 남겼다. 타입 분리 중 S3 공용 상태의 TypeScript 오류 2건도 union으로 수정했다. 둘 다 성공으로 숨기지 않고 이후 재검증한다.
- 화면 흐름: 예약 목록/시간 선택→조건·schedule 요청→UTC/KST 표시, 이력 페이지→실패/재시도, 신고/반박→합성 저장 후 GET 복구, 품질 목록→상세/페이지/권한, S3 상태→리포트, 과거 결제→정산의 금액 미상 표시다. 실제 페이지·훅·API 함수와 격리 adapter를 사용하며 서버 DTO/서비스 의미는 별도 소스·공개 계약으로 확인한다.
- 브라우저는 합성 fixture이며 승인·반려·조건 저장·취소·환불·삭제 같은 쓰기는 adapter 내부에만 존재한다. 외부/실제 API 요청은 차단한다. 사용자 5173 개발 서버나 로그인 세션을 재설정하지 않는다.
- 운영 DB·서버 런타임 로그·인증된 실서버 조회/쓰기·운영 배포 QA, Docker 이미지 재검증·Safari/Firefox·실기기 터치·스크린리더는 미수행이다. 외부 폰트 차단 fixture의 스크린샷을 운영 서체/아이콘 픽셀 검증으로 해석하지 않는다.
- S3 스크린샷에서 390px 기존 ‘삭제 후보’ 패널 헤더의 설명이 과도하게 한 글자씩 줄바꿈되는 배치를 관찰했다. 가로 넘침 검사가 통과해도 가독성 검증 전체가 통과한 것은 아니다. 본 변경은 그 CSS/레이아웃을 수정하지 않았고, 이 기존 UX 문제를 계약 오류 수정과 혼동하지 않는다.
- 현재 공개 API 예시/원본과 합성 데이터만 저장했다. JWT·GitHub/AWS 키·개인키 패턴 검사를 추가했으나 완전한 비밀정보/개인정보 감사를 대신하지 않는다. 인증정보·실사용자 신청/예약/결제 내용을 수집하지 않았다.

완료 후에도 서버의 데이터 품질 문서 audience/Tag 보완과 인증된 운영 QA는 별도다. 이 작업이 develop 병합 또는 release 배포를 자동으로 수행하는 것은 아니다.
