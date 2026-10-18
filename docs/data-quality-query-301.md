# 데이터 품질 조회 계약·상태 구분 (#301)

## 확인 기준과 알려진 문서 누락

- 2026-10-19 KST 서버 develop 소스 기준: `2df52f73914c4c1295fb013d7cc8779de2721df2`. [Controller](https://github.com/Type-Nu11/pingdom-api/blob/2df52f73914c4c1295fb013d7cc8779de2721df2/src/main/java/com/typenull/pingdom/moderation/api/DataQualityMonitoringController.java)는 `@AdminOnly`와 `GET /admin/data-quality/issues`를 선언하고 DataQualityIssuePageResponse를 반환한다. 서버 develop 소스 확인은 운영 배포 버전/인증된 조회 성공 확인이 아니다.
- 공개 [admin Swagger](https://www.typenull.xyz/v3/api-docs/admin)는 HTTP 200/OpenAPI 3.0.1이었지만 이 경로는 없었다. Controller에는 ApiAudience가 없고 Group.resolve는 메서드/클래스에 지정된 문서 소속만 읽는다. 원본 Swagger를 임의 보정하거나 API 제거/실제 404로 분류하지 않는다.
- 백엔드 문서 후속: ApiAudience.ADMIN을 보완하고 현재 SpringdocGroupsConfig.functionalTagCustomizer가 요구하는 기능 Tag도 함께 정해야 한다. 웹에서 서버 문서 설정을 수정하지 않았다. 전체 원본 스냅샷·source-contract-gaps 갱신은 #302 범위다.

## 정확한 조회 계약

- 요청: page 기본 1(서버 최소 1 보정), limit 기본 20(서버 1~100 보정). 웹은 유효한 page와 limit만 보내며 기존 화면은 페이지당 20건이다. 심각도·상태·검색어를 서버 필터로 보내지 않는다.
- 응답: `{items,page,limit,total,totalPages,hasNext}`. 배열 응답을 추정 호환하거나 첫 페이지 길이를 전체 건수로 바꾸지 않는다.
- DataQualityMonitoringService는 readOnly이며 OPEN만 조회한다. detectedAt 내림차순, 동률은 내부 ID 내림차순이다. 응답 DTO에는 **개별 이슈 ID가 없다**. entityId는 대상 ID이지 이슈 ID가 아니다.
- 항목: entityType, entityId, ruleCode, severity, status, details, detectedAt. 엔티티가 허용하는 details=null을 수용한다. detectedAt은 오프셋 없는 LocalDateTime이며 UTC/KST 의미를 추정하지 않는다. 기존 formatLocalDateTime으로 벽시계 필드를 유지하고 잘못된 날짜는 기존 안내를 사용한다.
- 해결·무시·상태 수정 API를 새로 만들거나 호출하지 않는다. 대상 관리 열기는 기존 경로 이동만 유지한다.

## 웹 변경

- API에서 페이지 메타데이터·항목·OPEN 상태를 확인한다. legacy 배열, 잘못된 건수/페이지/항목/미해결 범위는 오류로 처리하며 가짜 빈 결과로 바꾸지 않는다.
- 조회 결과가 없을 때 전체·현재 페이지·필터 건수는 ‘—’로 표시한다. 정상 응답에서 실제 0건을 확인한 경우에만 ‘미해결 이슈가 없습니다’라고 표시한다.
- 요청 페이지와 성공 응답 페이지를 분리한다. 2페이지 실패 시 이전 1페이지·건수를 이전 결과라고 표시하고, 재시도/상단 새로고침은 실패한 2페이지를 조회한다.
- 이전 결과를 표시하는 로딩·오류 상태를 구분한다. 목록 하단에서 페이지 조회에 실패해도 상단 오류 안내로 포커스를 이동해 실패 원인·재시도 버튼을 놓치지 않도록 한다.
- 최신 요청 번호·계정/역할 소유권·인증 세션·마운트 생명주기로 응답 역전·늦은 오류·계정 전환을 보호한다. 401/403은 이전 결과를 숨기고 기존 인증 해제 정책을 유지한다. 일반 조회 실패만 검증된 이전 결과를 남긴다.
- 마지막 페이지가 줄어 요청 page가 범위를 벗어나면 실제 마지막 페이지를 최대 한 번 다시 GET한다. 이전 데이터를 다른 페이지처럼 표시하거나 페이지 번호만 낮추지 않는다.
- 심각도 필터는 표시 중인 페이지에만 적용하고 전체 건수에는 적용하지 않는다. 필터 결과 0건과 전체 미해결 0건을 별도 문구로 표시한다.
- 조회 결과 revision과 행 index를 현재 결과 내부의 선택/React key로만 사용한다. 같은 entityType/entityId/ruleCode/detectedAt을 가진 두 행도 각각 선택할 수 있다. 이 키를 서버 이슈 ID로 전송하지 않으며, 성공한 재조회·페이지/필터·계정 변경 후 이전 행 선택이 다른 항목에 붙지 않게 한다.

## 검증과 재현

- `node --test tests/data-quality-contract.test.mjs`: 41개 통과. 정확한 페이지/default 요청, 첫·중간·마지막·빈 결과, 잘못된 요청/legacy/malformed, nullable 사유와 ID 없음, LocalDateTime 보존, 최초/후속 401/403/500/네트워크 실패, 이전 결과·요청 페이지 재시도, 응답 역전·늦은 401, 계정/역할/세션/언마운트, 마지막 페이지 축소, 동일 식별 필드 행·필터 빈 결과·선택 초기화·대상 경로 이동을 확인했다.
- `npm run test:data-quality-browser`: 실제 DataQualityPage·훅·API 함수에 GET-only 합성 adapter를 연결한다. 1920×1080·1366×768·390×844에서 목록→상세→기존 대상 경로, 페이지 이동·실패/지연·재시도, 현재 페이지 필터/필터 빈 결과, 중복 식별 필드, 정상 0건·최초 실패·malformed·권한·인증·계정 변경을 검사한다.
- 격리 Vite는 .env/개발 proxy를 읽지 않는다. 외부/API 네트워크를 차단하고 예상 밖 console/HTTP/fixture 오류를 수집한다. 합성 adapter는 GET 품질 조회와 page/limit만 허용한다. 사용자 5173 서버는 재시작하지 않았다.
- 첫 전체 병렬 검사에서 기존 merchant-identity-extension 테스트가 공유 Vite deps 캐시 ENOTEMPTY로 한 번 중단됐다. 신규 테스트는 별도 임시 cacheDir를 사용하며, 기존 테스트 코드를 바꾸지 않고 전체 재실행에서 945개를 통과했다. 제품 실패나 정상 빈 결과로 숨기지 않는다.
- 최종 관련 검사 47개(품질 조회 41개+계약표 6개), 위 브라우저 세 크기, lint·TypeScript 포함 build·diff 공백 검사가 통과했다. 스크린샷을 확인했고 가로 넘침이 없으며, 페이지 하단에서 실패한 뒤 오류 안내와 재시도 버튼이 viewport 안으로 이동함을 검사했다.

## 검증 경계·남은 사항

흐름 기준은 데이터 품질 진입/페이지 이동 → GET page/limit → OPEN 정렬·페이지 DTO → 웹 건수/목록/상세/오류 복구다. 요청·응답·화면 흐름은 합성 실행으로, readOnly·조회 조건·정렬·DTO/null/ID 규칙은 위 서버 소스로 확인했다. 운영 DB·서버 런타임 로그·인증된 실제 조회를 확인한 것은 아니다.

- 대상 관리 이동은 기존 URL 도착만 검사했으며 해당 목적지의 실데이터 수정 흐름은 실행하지 않았다.
- 실계정 조회, 운영 데이터 변경, 배포 QA, Docker·전체 release browser suite·Safari/Firefox·실기기 터치·스크린리더는 미수행이다. 외부 폰트 CSS를 빈 응답으로 처리하므로 운영 폰트/아이콘 픽셀 일치를 주장하지 않는다.
- 현재 공개 Swagger 누락은 백엔드 후속이다. 계약표 1개 행은 ‘소스·웹 구현/합성 확인’으로 갱신하지만 ‘Swagger에 문서화됨’이나 ‘실서버 성공’으로 표시하지 않는다. 원본 OpenAPI와 source-contract-gaps는 그대로 두고 #302에서 종합 정리한다.
- 브라우저 실행 명령은 독립 검증이며 배포/기본 release browser 목록을 변경하지 않았다.
