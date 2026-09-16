# 대시보드 장소 신청 처리 대기 (#207)

## 계약과 범위

#206에서는 게시글 신고와 장소 신청을 합친 대기 API를 연결했다.
#207에서는 옛 MapImage 운영 기능을 제품에서 제외하므로 장소 신청 전용 조회로 전환한다.

- GET /admin/merchant-place-applications?status=PENDING&page=1&limit=10
- items는 대기 신청 목록, total은 같은 필터의 서버 전체 건수다.
- id → targetId, placeName(없으면 businessName) → 제목, submittedAt → 접수 시각으로 연결한다.
- 서버가 반환한 정렬 순서를 보존한다. 표시 행 수와 전체 건수는 구분한다.
- 혼합 pending-items API를 호출한 뒤 게시글만 필터링하지 않는다. 그렇게 하면 10건 안에 신청이 누락되거나 전체 건수가 달라질 수 있다.
- total이 양수인데 목록이 비면 '대기 업무가 있지만 표시할 항목이 없습니다'로 안내한다.

알림 공급자는 장소 병합·정보 검증·장소 신청·Scout 등 기존 집계를 유지하되 옛 신고 이의제기 호출을 제거한다.
알림의 신청 건수 조회(limit=1)와 대시보드 목록 조회(limit=10)는 목적이 다르다. 대시보드에서 옛 혼합 API를 추가로 조회하지 않는다.

## 이동과 복구

- PENDING 신청 + 양의 안전한 정수 ID: /merchant-place-applications의 state.applicationId로 해당 상세 선택.
- 서버 navigationPath를 웹 경로로 신뢰하지 않는다.
- 잘못된 ID는 이동 비활성화. PENDING이 아닌 목록 응답은 계약 오류로 처리한다.
- 같은 type/targetId 중복 행은 첫 항목만 표시하되 서버 total은 임의 재계산하지 않는다.
- 재조회 중·실패 시 이전 결과와 포커스를 유지한다. 실제 0건과 실패를 구분한다.
- 중복 새로고침 차단, 세션 비활성화·언마운트 후 늦은 응답 무시, 401/403 구분을 유지한다.

## 검증

- tests/dashboard-pending-query.test.mjs: 필터·page/limit·서버 total·응답 매핑, 오류·0건·응답 역전.
- tests/dashboard-priority.test.mjs: 정확한 상세 이동·잘못된 ID·중복 행·포커스·이전 결과 표시.
- tests/legacy-post-cleanup.test.mjs: 옛 API 호출 제거 및 현행 기능 보존.
- tests/browser/dashboard-pending.mjs 및 legacy-post-cleanup.mjs: PC/모바일 화면과 실제 Router 경로 이동을 합성 응답으로 확인.

모의 QA는 실서버 승인·반려·삭제 또는 운영 배포 검증이 아니다.
