# 관리자 커뮤니티 조회·신고 심사 (#216)

## 구현 범위

- `/community`: 현행 커뮤니티 글 목록/상세 및 댓글 목록/상세. 카테고리 ID·글/댓글 숨김 필터, 서버 기준 10개 페이지네이션.
- `/community-reports`: 처리 대기 기본 조회, 처리 상태·글/댓글 필터, 신고 상세와 원문 확인, 수락/반려 확인창.
- 운영 이력: COMMUNITY_REPORT_ACCEPTED·COMMUNITY_REPORT_DECLINED 작업 및 COMMUNITY_REPORT 대상의 한국어 라벨, 필터 입력 제안.
- 공통 목록·페이지네이션·드롭다운·확인창을 재사용한다. 숨김 콘텐츠도 관리자 조회 계약에 따라 표시하며 글·댓글 원문은 HTML로 실행하지 않는다.
- 과거 MapImage 게시글(`/admin/posts`) 복원, 직접 삭제, 숨김 복원, 서버가 제공하지 않는 키워드 검색은 범위에서 제외한다.

## 서버 계약과 배포 차이

2026-09-17 확인한 서버 develop 및 [PR #1649](https://github.com/Type-Nu11/pingdom-api/pull/1649)는 신고 상세 `postId`를 필수로 제공한다.
POST에서는 targetId와 같고 COMMENT에서는 댓글의 부모 글 ID이다. 숨김 여부와 관계없이 반환하는 계약이다.
하지만 같은 날 조회한 [공개 Admin OpenAPI](https://www.typenull.xyz/v3/api-docs/admin)의 AdminCommunityReportResponse에는 postId가 없다.
서버 이슈 #1648 종료만으로 실제 배포 응답이 확인된 것으로 간주하지 않는다.

| 용도 | API |
| --- | --- |
| 글 목록·상세 | GET /admin/community/posts, GET /admin/community/posts/{postId} |
| 댓글 목록·상세 | GET /admin/community/posts/{postId}/comments, GET /admin/community/posts/{postId}/comments/{commentId} |
| 신고 목록·상세 | GET /admin/community-reports, GET /admin/community-reports/{reportId} |
| 신고 처리 | POST /admin/community-reports/{reportId}/accept 또는 /decline (요청 본문 없음) |

- 목록은 page=1부터 시작, limit=10을 명시하고 totalCount·totalPages·hasNext를 이용한다.
- POST 원문은 기존 targetId만으로 조회 가능하다. COMMENT에서 postId가 누락/무효하면 원문 관계를 추정하거나 전체 글을 순회하지 않는다. 안내 후 심사를 차단한다.
- 상세/원문의 ID 일치와 PENDING 상태를 확인한 경우에만 심사 버튼을 활성화한다. 원문 조회 실패·미지원 유형·이미 처리됨도 차단한다.
- 수락은 대상 숨김 + 신고 ACCEPTED, 반려는 신고 DECLINED만 변경한다. 원문 수정이나 별도의 처리 메모 API는 추가하지 않는다.

## 상태·실패 처리

- 조회마다 AbortController를 사용하고 결과를 조회 키에 연결하여 이전 페이지/필터/선택 응답이 현재 화면을 덮어쓰지 못하게 한다.
- 목록 재조회 결과 현재 페이지가 마지막 페이지를 초과하면 유효한 마지막 페이지를 한 번 재조회한다. 보정 조회 실패도 화면 갱신 실패로 반환하고, 재시도는 보정된 페이지를 사용한다.
- 0건과 로딩/오류를 구분하며 실패 시 재시도를 제공한다. 필터 변경 시 페이지와 선택을 초기화한다.
- 신고 확인창은 reportId·targetId·targetType·결정을 고정한다. 동기 잠금으로 중복 요청을 차단하고 처리 중에는 닫기/선택 변경을 제한한다.
- 401/403/404/409는 공통 인증·오류 정책을 적용한다. 오류 후에도 최신 상태를 재조회한다.
- 처리 성공을 먼저 기록하고 목록/상세 재조회 결과를 별도로 처리한다. 갱신 실패는 성공을 뒤집지 않으며 재처리를 차단하고 조회 재시도를 안내한다.

## 검증

- `node --test tests/community.test.mjs`: API 경로/페이지/본문, ID·상태 검사, 응답 역전, 이전 배포의 postId 누락, 원문 403/404, 신고 401/403/404/409, 중복 제출과 갱신 실패.
- `npm run test:community-browser`: 격리된 합성 Axios 응답으로 1280px/390px에서 글/댓글 페이지 이동·필터, 원문 조회, 처리 이력 읽기 전용, 연결 정보 누락 차단, 확인창 취소/Escape/포커스, 수락·반려·갱신 실패, 감사 로그 라벨/필터, 가로 넘침 여부를 검사한다.
- `npm test`, `npm run lint`, `npm run build`, `git diff --check`를 함께 실행한다.
- 브라우저 검증은 모의 데이터이며 실서버 신고 처리/계정 권한 통합 QA나 운영 배포 검증이 아니다. 실제 데이터에 대한 수락·반려는 실행하지 않는다.
- 후속 실서버·배포 QA는 #221에서 수행한다. COMMENT 상세의 postId 실제 반환 및 동일 댓글 조회를 확인해야 한다.

### 2026-09-17 실행 결과

- 커뮤니티 전용 자동 테스트 22개, 전체 자동 테스트 366개 통과.
- 1280px/390px Chromium 모의 브라우저 검증 통과. 원문 연결 누락 차단, 이미 처리된 신고 읽기 전용, 확인창 취소·수락·반려, 갱신 실패, 감사 로그 필터 요청을 확인했다. 페이지 오류와 가로 넘침은 발견하지 못했다.
- lint·build·git diff --check 통과.
- 실서버 인증 조회·신고 수락/반려·운영 배포는 미수행이다.
- PR #227 후속 검증: 1280px/390px에서 대기 신고 11건 중 2페이지 마지막 1건 처리 후 1페이지 10건 자동 표시를 확인했다. 보정 조회 실패·재시도와 필터 변경 후 늦은 응답 무시도 자동 테스트로 검증했다.
