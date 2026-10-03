# #254 공개 계약 갱신 기록

## 범위·출처

- 수집일: 2026-10-04 KST. 정확한 UTC 시각과 그룹별 SHA-256은 `openapi/metadata.json`을 참조한다.
- 소스·비교 기준: `bbe199b0bc8666ae7571760c6c20b17d934ea3fa` (PR #265 병합 후 develop). 비교 기준에 저장된 스냅샷은 2026-09-16 수집본이다.
- 공개 GET: `https://www.typenull.xyz/v3/api-docs/admin`, `https://www.typenull.xyz/v3/api-docs/merchant`.
- admin 145개, merchant 85개, 합계 230개 operation. CSV는 범위 밖/제거 이력까지 보존하여 260행이다. App/Common/Consulting은 재수집하지 않았다.
- 인증된 업무 API·운영 mutation·실계정 QA·배포 설정 변경은 수행하지 않았다. UI/업무 API 코드는 변경하지 않았다.

## 이전 스냅샷과의 차이

| 구분 | 확인 결과 |
| --- | --- |
| Admin operation | 추가/삭제 없음. 기존 145개는 tags/operationId 등 문서성 변경이며 요청·응답 구조는 component 변경을 별도로 확인 |
| Merchant operation | 3개 추가, 삭제 없음. 기존 82개는 문서성 변경 |
| 새 operation | GET 신규 신청 네이버 주소 검색, GET 네이버 업체명 검색, PUT 예약 가능 시간 가격·취소 조건 |
| Admin schema | `AdminCommunityReportResponse.postId` 필수 필드 추가. 영업시간·예외·시간 구간의 나머지 3개 schema 변경은 설명 중심 |
| Merchant schema | 7개 추가: 네이버 주소/업체명 검색 각 Item·Response, ReservationConfirmation, ReservationTermsRequest·Response |
| 기존 Merchant schema | `AvailabilityResponse.reservationTerms`·`conditionsVersion`, `ReservationResponse.confirmation` 및 required 변경. confirmation/terms는 참조 schema의 nullable 선언도 함께 확인. 나머지 5개는 영업 상태/시간/공지 설명 변경 |

기존 operation에 동일한 응답 `$ref`가 남아 있어도 schema 변경은 실질 계약 차이다. 이를 단순 tags 변경으로 제외하지 않는다. 기계 비교 전체는 `openapi/contract-changes.json`이며 baseline SHA와 현재 원본을 사용해 테스트에서 재계산한다.

## 현재 웹 연동과 분류

- #256/PR #265: `GET /merchant-owner/availabilities`의 저장값·버전 조회와 PUT `reservation-terms` 연동 완료. `useMerchantReservationSetup`·`ReservationTermsEditor` 및 모의 QA 문서가 근거다. 서버 대기/미연동으로 되돌리지 않는다.
- #225: 네이버 업체명 검색은 기존 호출·후보 선택 화면에 연결돼 있다. 최신 `NaverPlaceSearchItem`의 이름·주소·WGS84 위도/경도와 최대 5개 계약을 보존한다. 옛 공용 Item 충돌을 현재 문서 문제로 단정하지 않는다. 주소 검색 역시 현재 호출 근거를 반영한다.
- #255/PR #260, #253/PR #258: 예약 수락 조건 표시·확인 시각 표시의 기존 타입과 호출을 유지한다. 이번 문서 갱신은 해당 기능을 다시 구현하거나 실서버 QA한 것이 아니다.
- 대시보드의 대체 집계 설명은 예약을 포함한 `adminPendingWorkApi.ts`로 수정했다. old pending-items API는 alternative로 유지한다.
- #204 팀원 관리: 사용자 보류/제품 범위 제외이며 서버 차단이 아니다. 호출 없는 operation은 excluded로 기록한다.
- #207의 레거시 게시글·MapImage 신고/이의제기는 excluded/removed 상태를 보존한다. S3 고아 파일·리뷰·커뮤니티 원문 계약은 삭제하지 않는다.
- Owner 프로필 POST/PUT은 공개 계약이 있으나 현재 호출 참조가 없어 missing이다. 이것만으로 온보딩 기능 전체 미구현이라고 판단하지 않는다.

## 남은 제한

- `GET /admin/data-quality/issues`: 웹의 호출은 있지만 현재 Admin 문서에는 없다. 기존 `source-contract-gaps.json`에 남긴다. 실제 404 또는 서버 기능 삭제를 확인한 결과가 아니다.
- 서버 #1749·#1750·#1751 종료는 배포 문서 확인을 대신하지 않는다. 현재 그룹 원본의 `servers.url`에는 내부 HTTP 주소가 남아 있다. 공개 swagger-config의 OAuth 리다이렉트도 내부 HTTP 주소이며 루트 `/v3/api-docs`는 슬래시 경로로 301 응답했다. 원본 URL을 웹에서 가짜 외부 주소로 보정하지 않는다.
- 실제 주소/업체 검색 성공, 인증된 가격 조건 저장·재조회·권한/동시성, 결제·환불과 실계정 전체 흐름은 #220·#221에서 별도로 검증한다. 문서/정적 대조일을 실서버 성공일로 사용하지 않는다.

## 재현·검증

```bash
node scripts/refresh-openapi-snapshots.mjs --refresh --baseline bbe199b0bc8666ae7571760c6c20b17d934ea3fa
python3 scripts/refresh-api-contract-matrix.py
node --test tests/api-contract-matrix.test.mjs tests/openapi-refresh.test.mjs
npm test
npm run lint
npm run build
git diff --check
```

앞의 수집 명령은 네트워크 문서가 다시 바뀌면 새로운 수집 시각·원본을 생성한다. 저장된 diff의 정확한 재현은 네트워크 없이 고정 baseline과 현재 스냅샷을 비교하는 테스트를 사용한다. 비교 테스트에는 baseline Git 객체가 필요하다. shallow clone은 기준 커밋이 포함되도록 이력을 추가로 가져와야 하며, 테스트가 누락 이력을 자동 다운로드하거나 비교를 통과로 건너뛰지는 않는다. 현재 저장소에는 CI workflow가 없어 원격 CI 성공을 주장하지 않는다. source inventory는 문자열·AST 참조만 확인하며 실제 화면 접근 권한·런타임 성공까지 보장하지 않는다.

### 실행 결과 (2026-10-04)

- 계약/수집·비교 검사 12개 통과, 전체 테스트 487개 통과.
- lint, TypeScript 포함 build, `git diff --check` 통과.
- 고정 baseline에 대한 구조 diff 재계산 및 두 그룹 원본 SHA-256 검증 통과. 수집 실패·리다이렉트·비정상 JSON·인증 정보가 포함된 source URL 거부를 합성 응답으로 확인했다.
- 매트릭스 재생성 결과가 동일함을 확인했다. source-contract-gaps는 재생성 후 기존 data-quality 한 건이 그대로 남았다.
- JWT 형태 값 검사는 두 원본에서 통과했으며 인증값·환경변수·개인 업무 데이터를 수집하지 않았다. 공개 schema의 예시·내부 URL은 원본 계약 자료로 보존했다.
- 새 브라우저/실계정 QA는 실행하지 않았다. 문서·정적 검사만 변경했으며 사용자의 localhost:5173 서버와 운영 데이터를 변경하지 않았다.

### PR #266 리뷰 보완 검증

- 지적 1: `responses`의 문자열·배열·빈 객체, 잘못된 상태 코드/응답 객체/참조 및 설명 누락을 수집 전에 거부한다. 유효한 응답 참조·상태 범위·default·확장 필드는 유지한다. 전체 OpenAPI 명세 검증기로 확장한 것은 아니다.
- 임시 Git 저장소에서 실제 CLI에 두 그룹 각각의 잘못된 HTTP 200 문서를 주입하여 실패 종료와 두 스냅샷·metadata·diff 원본 유지까지 확인했다. 실제 문서 URL은 호출하지 않는다.
- 기존 공개 스냅샷과 고정 baseline의 구조 diff 재계산은 그대로 통과하며 원본·수집 시각은 변경하지 않았다.
- 보완 후 계약/수집 검사 14개, 전체 테스트 489개 및 lint·TypeScript 포함 build·`git diff --check` 통과. UI·실계정 QA 범위는 기존과 동일하다.
