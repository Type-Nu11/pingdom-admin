# Web API 계약 매트릭스 운영 기준

## 이번 확인 범위

- 이슈: #207
- Admin 136개, Merchant 82개, 총 218개 operation
- 출처·수집 시각: [metadata.json](openapi/metadata.json)
- 원본: [admin.json](openapi/admin.json), [merchant.json](openapi/merchant.json)
- App, Common, Consulting은 이번 대조 대상에서 제외한다. 기존 범위 밖 CSV 행은 확인일을 갱신하지 않고 보존한다.
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

canonical_status의 documented는 해당 그룹 OpenAPI에 존재한다는 뜻이다. 기존 범위 밖 행은 out-of-scope로 표시한다.
last_verified는 문서·소스 대조일이며 런타임 성공 확인일이 아니다. 기존 confirmation은 과거 기록을 보존한 것이므로 이번 실행으로 재검증한 것으로 해석하지 않는다.

## 주요 정리

- Claim 함수 8개와 전용 타입을 제거했다. 통합 장소 신청 호출과 사용 중인 온보딩은 유지한다.
- 탐색 미디어 업로드 URL 발급 후 POST 완료 등록이 연결되어 있다. 순서 변경은 PATCH의 displayOrder에 이동 대상 인덱스를 보내며 서버가 중복 없는 연속 순서를 보장한다. targetIndex라는 요청 필드는 사용하지 않는다.
- 메뉴 단건 조회는 메뉴 목록으로, 상점주 신청 첨부 목록 조회는 신청 상세 attachments로 대체한다. 직접 호출하지 않는다고 전체 기능 미구현으로 세지 않는다.
- 대시보드 pending-items는 #206, 게시글 운영 미연동은 #205, 팀원 관리는 #204에 연결한다. 팀원 관리는 현재 제품 범위 제외 결정이며 서버 차단이 아니다.
- #203: 구형 merchant-verification 호출과 별도 검증 폼을 제거하고 기존 통합 장소 신청 화면으로 연결했다. 직접 Owner 프로필 GET/POST/PUT 계약은 유지하며, 미신청은 GET의 PROFILE_NOT_FOUND만 인정한다. 일반 USER는 신청 경로만 접근하며 운영 경로는 기존 권한 가드를 유지한다. 승인 후에는 재로그인으로 서버가 발급한 최신 역할을 적용한다.

## 재현

저장소 루트에서 실행한다. Python 3 표준 csv/json과 프로젝트 TypeScript 파서를 사용한다.

```bash
npm ci
node scripts/api-source-inventory.mjs
python3 scripts/refresh-api-contract-matrix.py
node --test tests/api-contract-matrix.test.mjs
```

갱신 스크립트는 저장된 두 OpenAPI와 현재 소스를 읽어 CSV 및 source-contract-gaps.json을 갱신한다. 네트워크 호출은 하지 않는다.
원본의 parameters, schema, responses, security, description은 스냅샷에 보존되므로 이후 JSON 비교로 경로 이외의 변경도 추적할 수 있다.

새 수집은 각 metadata.sources URL에서 성공 응답을 받아 JSON/OpenAPI paths를 확인한 뒤 스냅샷과 수집 시각을 함께 갱신한다. 실패 응답으로 기존 스냅샷을 덮어쓰지 않는다.

## 정적 분석 한계

TypeScript AST로 문자열·템플릿·상수·간단한 경로 반환 함수를 읽고 API 함수의 참조 파일을 기록한다. 동적 작업명은 경로 패턴으로 대조한다. 중괄호 인자 이름 차이는 비교에서 무시하지만 CSV는 Swagger 원래 경로명을 보존한다.
참조 파일이 있다는 사실만으로 실제 라우트 노출·권한·성공 응답을 보장하지 않는다. 새 연결은 partial로 보수적으로 기록하며, 불확실한 항목을 implemented로 자동 승격하지 않는다.
[소스 계약 차이](openapi/source-contract-gaps.json)는 사용 중이지만 현재 대상 그룹에 없는 호출 후보로, 신규 서버 버그나 제거 확정 목록이 아니다.

## PR 규칙

API 계약 변경 여부와 관련 METHOD /path를 기록하고, 변경 작업의 확인 절차를 별도로 검증한다. 문서 갱신이나 프론트 코드 정리를 서버 배포 완료로 표현하지 않는다.
