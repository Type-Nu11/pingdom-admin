# Web API 계약 매트릭스 운영 기준

## 이번 확인 범위

- 최신 갱신 이슈: #302 (2026-10-19 KST). #254·#207은 과거 수집/레거시 정리 근거로 보존합니다.
- 정확한 수집 기준은 metadata.json과 그룹별 스냅샷을 참조한다. 현재 operation 수는 갱신 스크립트 출력과 테스트로 확인한다.
- 출처·수집 시각: [metadata.json](openapi/metadata.json)
- 매트릭스 범위 원본: [admin.json](openapi/admin.json), [merchant.json](openapi/merchant.json)
- 참고 수집 원본: [app.json](openapi/app.json), [common.json](openapi/common.json). App의 예약·결제 응답을 Merchant와 교차 확인한다. 두 그룹은 최초 수집이라 과거 차이를 주장하지 않고 CSV 전체 범위로 확장하지 않는다. Consulting은 제외한다. 기존 범위 밖 CSV 행은 확인일을 갱신하지 않고 보존한다.
- Swagger에 없는 경로는 문서에서 제거된 것으로만 판단한다. 서버 기능 삭제나 실제 404 응답을 확정하지 않는다.
- 인증 API 실행·실서버 mutation·운영 QA는 수행하지 않았다.

## 상태

| 상태 | 의미 |
| --- | --- |
| implemented | 기존 구현 기록과 소스 참조가 일치하거나 이번에 직접 흐름을 확인함. 실서버 QA 완료 의미 아님 |
| partial | API 함수 및 호출 참조는 있으나 이번 정적 대조만으로 화면 전체 동작·확인 절차까지 확정하지 않음 |
| missing | 문서 계약은 있으나 직접 호출 근거 없음. 제품 범위 제외 여부는 별도 확인 |
| alternative | 직접 호출 대신 기존 목록·상세 응답으로 화면에 필요한 정보 제공 |
| blocked | 사용 중인 호출이 현재 그룹 문서에 없음. 서버 계약 확인 필요 |
| removed | 과거 기록은 있지만 현재 그룹 문서와 호출 근거에서 제외됨 |
| excluded | 서버 문서에는 존재하지만 현 제품 기획에서 제외하여 웹에서 호출하지 않음. 서버 API 삭제 의미 아님 |

canonical_status의 documented는 해당 그룹 OpenAPI에 존재한다는 뜻이다. 기존 범위 밖 행은 out-of-scope로 표시한다.
last_verified는 문서·소스 대조일이며 런타임 성공 확인일이 아니다. 기존 confirmation은 과거 기록을 보존한 것이므로 이번 실행으로 재검증한 것으로 해석하지 않는다.

## 주요 정리

- Claim 함수 8개와 전용 타입을 제거했다. 통합 장소 신청 호출과 사용 중인 온보딩은 유지한다.
- 탐색 미디어 업로드 URL 발급 후 POST 완료 등록이 연결되어 있다. 순서 변경은 PATCH의 displayOrder에 이동 대상 인덱스를 보내며 서버가 중복 없는 연속 순서를 보장한다. targetIndex라는 요청 필드는 사용하지 않는다.
- 메뉴 단건 조회는 메뉴 목록으로, 상점주 신청 첨부 목록 조회는 신청 상세 attachments로 대체한다. 직접 호출하지 않는다고 전체 기능 미구현으로 세지 않는다.
- #207은 옛 MapImage 신고 사용자·이의제기 화면과 전용 API/훅/타입을 제거한다. #205의 일괄 신고·삭제 API도 missing이 아닌 excluded로 기록한다. 기존 운영 URL은 관리자 인증 가드 안에서 대시보드로 전환한다.
- 대시보드는 혼합 pending-items 대신 `adminPendingWorkApi.ts`의 예약·장소 신청·리뷰 삭제·커뮤니티 신고·검증·중복·Scout·Trust Score 개별 API 집계를 사용한다. 카테고리별 실패와 0건을 구분한다. 알림 집계의 옛 이의제기 조회는 제거 상태를 유지한다.
- 리뷰·커뮤니티 계약, 사용자 밴·역할·감사 이력, 탐색 미디어 및 sourceMapImageId 역사 메타데이터, S3 고아 파일 정리 도구는 보존한다. posts가 포함된 경로 전체를 삭제하지 않는다.
- 팀원 관리는 #204에 연결한다. 팀원 관리는 현재 제품 범위 제외 결정이며 서버 차단이 아니다.
- #203: 구형 merchant-verification 호출과 별도 검증 폼을 제거하고 기존 통합 장소 신청 화면으로 연결했다. 직접 Owner 프로필 GET/POST/PUT 계약은 유지하며, 미신청은 GET의 PROFILE_NOT_FOUND만 인정한다. 일반 USER는 신청 경로만 접근하며 운영 경로는 기존 권한 가드를 유지한다. 승인 후에는 재로그인으로 서버가 발급한 최신 역할을 적용한다.

## 재현

저장소 루트에서 실행한다. Python 3 표준 csv/json과 프로젝트 TypeScript 파서를 사용한다.

```bash
npm ci
node scripts/api-source-inventory.mjs
node scripts/refresh-openapi-snapshots.mjs --refresh --baseline <갱신_전_스냅샷이_있는_커밋> --server-ref <직접_확인한_서버_커밋_40자리>
python3 scripts/refresh-api-contract-matrix.py
npm run check:api-matrix
node --test tests/api-contract-matrix.test.mjs tests/openapi-refresh.test.mjs tests/current-api-contract.test.mjs
```

갱신 스크립트는 저장된 두 OpenAPI와 현재 소스를 읽어 CSV 및 source-contract-gaps.json을 갱신한다. 네트워크 호출은 하지 않는다.
원본의 parameters, schema, responses, security, description은 스냅샷에 보존되므로 이후 JSON 비교로 경로 이외의 변경도 추적할 수 있다.

새 수집은 각 metadata.sources URL에서 성공 응답을 받아 JSON/OpenAPI paths를 확인한 뒤 스냅샷과 수집 시각을 함께 갱신한다. 실패 응답으로 기존 스냅샷을 덮어쓰지 않는다.

수집 스크립트는 네 그룹의 HTTP 200·OpenAPI 검증과 기준 커밋 비교가 모두 성공한 뒤 생성 파일을 갱신한다. 리다이렉트는 따라가지 않으며 인증 헤더나 환경변수의 토큰을 사용하지 않는다. URL의 사용자명·비밀번호·query·fragment는 거부한다. 원본 응답 문자열을 변경하지 않고 저장하며 그룹별 조회 시각·SHA-256·웹 기준 커밋과 조사한 서버 커밋을 별도로 기록한다. `--server-ref` 생략 시 서버 기준은 null이며 운영 배포 버전을 추정하지 않는다. 원본 baseline은 `metadata.comparison_baseline` 커밋에 보존한다. 과거 참조 원본이 없는 App/Common은 initial_collection으로 기록한다.

`contract-changes.json`은 고정 baseline과 최신 스냅샷의 오프라인 비교 결과다. 추가/삭제 operation과 schema, 기존 항목의 contract/documentation 변경을 구분한다. `$ref`가 같아도 component의 required/nullable/property 변화는 별도로 추적한다. 이름·설명·예시 분류는 자동 보조이며 breaking change 판정이나 서버 런타임 검증을 대신하지 않는다.

상세 최신 결과와 제한: [#302 갱신 기록](api-contract-verification-302.md). 매트릭스의 새 호출은 기본 partial이며, 이전 implemented 기록과 제품별 #295~#301의 확인 근거를 보존한다. 과거 #256의 조건/가격 문구로 새 검증 기록을 덮어쓰지 않는다. 기존 implemented 상태도 과거 구현 근거를 보존하는 것으로, 이번 실행의 실제 서버 성공을 의미하지 않는다.

## 배포 전 원격 변화 검사 (파일 수정 없음)

```bash
npm run check:api-matrix
npm run check:api-contracts
```

- `check:api-matrix`는 저장된 스냅샷·소스에서 CSV/gaps가 재현되는지 검사하며 파일을 쓰지 않는다. 차이가 있으면 실패한다.
- `check:api-contracts`는 저장된 원본의 SHA-256을 확인하고 네 공개 Swagger를 새로 받아 비교한다. 스냅샷·메타데이터·보고서를 덮어쓰지 않는다.
- 종료 코드 0: contract 차이 없음(태그·설명 등 documentation 차이는 출력되더라도 0). 호환성 전체나 실제 업무 성공을 보증하지 않는다.
- 종료 코드 1: operation/schema/요청·응답·required/nullable/security/server 등 contract 차이 발견. 정상적인 추가도 포함하므로 사람의 영향 검토가 필요하다. 자동으로 breaking change라고 단정하지 않는다.
- 종료 코드 2: 네트워크·timeout·HTTP 인증/리다이렉트·HTML·비정상 OpenAPI·저장 해시 문제로 비교 차단. 호환 상태로 간주하거나 기존 기준 파일을 갱신하지 않는다. 원격 HTML/응답·인증정보는 오류 로그에 출력하지 않는다.
- 차단 결과는 안전한 reason(network/http/invalid-document/source-or-stored-snapshot), 그룹명과 HTTP 상태만 포함한다. 원격 응답 본문이나 원본 네트워크 오류의 URL/자격정보를 복사하지 않는다.
- 배포 후보에서 변경 감지가 나오면 계약 영향 검토 → 명시적 refresh → 원본/매트릭스 diff 리뷰 → 단위·브라우저 회귀 순서로 확인한다. `--check`와 `--refresh`는 동시에 사용할 수 없다.
- 외부 장애를 매번 PR 실패로 만들지 않기 위해 기본 CI에서는 저장된 원본 기반 검사를 수행한다. 실제 원격 명령은 배포 전 명시적으로 실행한다. 시크릿·스케줄·배포 설정을 새로 추가하지 않는다.

## 정적 분석 한계

TypeScript AST로 문자열·템플릿·상수·간단한 경로 반환 함수를 읽고 API 함수의 참조 파일을 기록한다. 동적 작업명은 경로 패턴으로 대조한다. 중괄호 인자 이름 차이는 비교에서 무시하지만 CSV는 Swagger 원래 경로명을 보존한다.
참조 파일이 있다는 사실만으로 실제 라우트 노출·권한·성공 응답을 보장하지 않는다. 새 연결은 partial로 보수적으로 기록하며, 불확실한 항목을 implemented로 자동 승격하지 않는다.
[소스 계약 차이](openapi/source-contract-gaps.json)는 사용 중이지만 현재 대상 그룹에 없는 호출 후보로, 신규 서버 버그나 제거 확정 목록이 아니다.

`known-source-contracts.json`은 서버 소스로 별도 확인한 문서 누락 근거다. 데이터 품질 GET의 AdminOnly·페이지 DTO·ApiAudience/기능 Tag 후속을 원본 Swagger와 분리한다. 생성기는 이 근거와 #301 구현 상태를 보존하지만 실제 GET 성공을 만들어내지 않는다. 서버 문서가 보완되면 새 원본과 함께 known gap의 해소 여부도 검토한다.

## PR 규칙

API 계약 변경 여부와 관련 METHOD /path를 기록하고, 변경 작업의 확인 절차를 별도로 검증한다. 문서 갱신이나 프론트 코드 정리를 서버 배포 완료로 표현하지 않는다.
