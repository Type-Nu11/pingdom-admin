# 대시보드 통합 처리 대기 (#206)

## 계약과 범위

2026-09-16 확인한 https://www.typenull.xyz/v3/api-docs 기준:

- `GET /admin/dashboard/pending-items?limit=10`
- limit 기본 10, 서버 보정 범위 1~50
- items 유형: POST_REPORT, MERCHANT_PLACE_APPLICATION
- totalCount: 필터링 전 전체 PENDING 건수. items.length 또는 전체 관리자 업무 건수가 아님
- navigationPath는 null 가능. 응답 예시의 `/admin/merchant-place-applications/12`는 웹 라우트와 다름

대시보드의 장소 신청 전용 10건 요청을 통합 요청으로 교체한다. 기존 요약·최근 활동은 유지한다.
화면은 전체 대기 건수와 표시 행 수를 구분하며, 같은 type/targetId 중복 행은 첫 항목만 표시한다.
서버 정렬을 그대로 보존하고 totalCount를 중복 제거한 목록 길이로 다시 계산하지 않는다.
items가 비었지만 totalCount가 양수이면 업무 없음으로 표시하지 않는다.

알림 공급자의 `getAdminPendingWorkSummary`는 장소 병합·이의제기·Scout 등 다른 범위를 집계하므로 유지한다.
통합 API에는 유형별 전체 건수가 없으므로 제한된 items로 장소 신청 전체 건수를 대체하지 않는다.
알림용 신청 count 조회와 대시보드 목록 조회는 목적이 다르다. 이 두 요청의 완전 통합은 이번 범위가 아니다.
대시보드 자체에서는 기존 신청 목록을 동시에 조회하지 않는다.

## 이동 정책

- PENDING 통합 신청 + 양의 안전한 정수 targetId: `/merchant-place-applications`, state.applicationId로 상세 선택
- navigationPath는 외부 URL·미지원 경로·ID 불일치 위험을 피하기 위해 이동에 직접 사용하지 않음
- 게시글 신고: 신고 ID와 게시글 ID 표시, 처리 화면 미지원 안내. 사용자 신고 화면으로 잘못 연결하지 않음
- 미지원 유형·잘못된 ID·대기 상태가 아닌 항목: 표시하되 이동 비활성화
- 게시글 신고 운영 화면 구현은 별도 #205 범위

## 상태와 검증

조회 실패와 실제 0건을 구분한다. 재조회 중·실패 시 이전 결과를 유지하고 이전 조회 결과임을 표시한다.
중복 새로고침 요청을 막고, 비활성화·언마운트된 조회의 늦은 응답은 반영하지 않는다.
401은 기존 인증 정리 정책을 따르며 403·500을 로그아웃으로 처리하지 않는다.

- `npm test`: 전체 304개 통과
- `npm run lint`, `npm run build` 통과
- `npm run test:dashboard-pending-browser`: Chromium 1280×800, 390×800 합성 화면 검증
- 계약 요청·중복 요청 차단·부분 실패·재시도·0건·잘못된 응답·비활성화 후 응답 역전 검증
- 정확한 신청 이동·외부 경로 무시·중복 행·미지원 유형·ID 오류·포커스 유지 검증
- 긴 제목·비활성 안내 표시와 가로 넘침 검사 및 화면 캡처 확인

브라우저 검증은 실제 DashboardPage와 합성 API 응답을 사용한다. 실제 계정·개인정보·업무 처리는 사용하지 않는다.
임시 서버·브라우저는 종료 시 정리하고 캡처 위치는 실행 로그에 출력한다.
실서버 인증 조회·서버 정렬의 실제 데이터 결과·배포 및 Safari/Firefox는 미검증이다.
