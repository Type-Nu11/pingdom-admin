# 관리자 대기 업무 집계

## 범위와 계약

#239에서 장소 신청 개별 목록을 업무별 건수와 바로가기로 교체했다.
대시보드와 알림은 AdminNotificationProvider의 동일 상태와 AdminPendingWork 표시를 공유한다.
새 집계 API는 추가하지 않으며 과거 혼합 GET /admin/dashboard/pending-items 및 옛 신고 API는 사용하지 않는다.

| 업무 | 기존 GET API | 조건 | 건수 |
| --- | --- | --- | --- |
| 예약 심사 | /admin/reservations | status=PENDING, page=1, limit=1 | totalElements |
| 장소 신청 | /admin/merchant-place-applications | status=PENDING, page=1, limit=1 | total |
| 리뷰 삭제 요청 | /admin/place-review-deletion-requests | status=PENDING, page=1, limit=1 | totalElements |
| 커뮤니티 신고 | /admin/community-reports | status=PENDING, page=1, limit=10 (기존 클라이언트 고정) | totalCount |
| 장소 병합 | /admin/places/duplicates | 기존 그룹 조회 | totalCount |
| 중복 후보 | /admin/places/duplicate-candidates | status=PENDING | totalCount |
| 장소 정보 검증 | /admin/place-information-reports | status=SUBMITTED, page=1, limit=1 | totalCount |
| 방문자 검증 | /admin/visitor-verification-reports | status=SUBMITTED, page=1, limit=1 | totalElements |
| 방문자 정정 | /admin/visitor-verification-reports/corrections | status=SUBMITTED, page=1, limit=1 | totalElements |
| Scout 프로필 | /admin/scout-profiles | status=PENDING, page=1, limit=1 | totalCount |
| Scout 현장 제보 | /admin/scout-field-reports | status=SUBMITTED, page=1, limit=1 | totalElements |
| 신뢰 점수 이상치 | /admin/trust-score/anomalies | unresolvedOnly=true, page=1, limit=1 | totalCount |

조회 대상은 위 12개 업무이며 전체 플랫폼의 모든 미처리 업무를 의미하지 않는다.
동일 장소 등이 다른 업무 유형에 포함될 수 있으므로 합계는 고유 장소·사용자 수가 아닌 업무 건수다.
기존 API의 서버 건수를 사용하고 목록 길이로 대신 계산하지 않는다. 비정상 건수(누락·문자열·음수·비정수)는 실패로 구분한다.

## 상태와 갱신

- 업무별 로딩, 성공 0건, 성공 N건, 실패 및 마지막 성공 확인 시각을 보존한다.
- 성공한 업무의 최신 건수만 합계에 포함한다. 실패·재조회 중 이전 건수는 '이전 조회'로 표시하고 합계에서 제외한다.
- 전부 실패하면 합계는 알 수 없음(null)이다. 일부 실패 또는 로딩을 '대기 없음'으로 표시하지 않는다.
- 성공 0건 업무는 접힌 영역에서 바로가기를 유지한다. 전체 0건 안내는 모든 업무가 성공했을 때만 표시한다.
- 기존 방문자·Scout의 묶인 Promise.all을 분리하여 한 업무 실패가 다른 업무의 결과를 없애지 않는다.
- 공통 업무 갱신은 60초 간격, 대시보드 요약·최근 활동은 기존 30초 간격이다. 숨긴 탭에서는 폴링을 중지하고 다시 보일 때 갱신한다.
- 대시보드 자체의 별도 장소 신청 목록 조회를 제거했다. 알림 열기는 캐시를 사용하며 대시보드와 알림의 새로고침은 공통 in-flight 잠금으로 겹치는 요청을 차단한다.
- 세션 초기화·언마운트 후 이전 응답은 무시한다. 401은 인증 초기화, 403은 해당 업무 조회 실패로 처리한다.
- 이동은 웹 코드에 정의된 각 심사 화면으로 연결한다. 개별 신청 상세 바로 선택은 대시보드에서 제공하지 않고 심사 목록에서 수행한다.
- 승인·반려·삭제 요청 계약과 확인 절차는 변경하지 않았다.

## 검증

2026-09-30 로컬 코드와 합성 응답 기준:

- tests/dashboard-pending-query.test.mjs: 예약 조건과 건수, 공유 요청, 잘못된 건수, 부분·전체 실패, 이전 건수와 재시도, 세션 전환, 401/403, 폴링·화면 재활성화.
- tests/dashboard-priority.test.mjs: 업무 우선 배치, 예약 이동, 실패와 0건 구분, 기존 운영 카드·포커스 회귀.
- tests/legacy-post-cleanup.test.mjs: 옛 API 호출 없이 지원 업무 유지.
- tests/browser/dashboard-pending.mjs: Chromium 1920×1080, 1366×768, 390×844에서 정상/0건/부분·전체 실패/재시도/로딩, 가로 넘침, 알림 열기 요청 중복 방지, Escape와 키보드 이동 검증.

실서버 인증·실제 건수 대조, 운영 승인·반려·삭제, 배포 QA 및 Safari/Firefox는 미수행이다.
전체 관리자 QA는 #221에서 추적한다. 모의 검증을 실서버 검증으로 간주하지 않는다.
