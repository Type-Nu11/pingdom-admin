# 사용자 밴·역할 파일 정리 — #333 3단계 두 번째 묶음

## 범위와 기준

- 기준: develop `af6a7f46bf6ccaef5bc38df31cbb2f9e5f150124` (#340 병합).
- 브랜치: `refactor/admin-users-structure-333`.
- 사용자 밴 전용 9개, 역할 전용 4개, 총 **13개 파일을 이동**한다.
  import/라우터/테스트/fixture/계약표의 소스 경로를 함께 전환한다.
- README의 기존 사용자 변경과 다른 worktree/stash는 변경하지 않는다.
- 이번 묶음은 기능별 이동의 일부다. #333 전체, 큰 파일의 책임 분리,
  공통 버튼/여백 기준 통일, #337 지도 내부 로직, 보류된 #331은 완료하지 않는다.

```text
src/features/admin/
  userBans/
    pages/       UserBanPage.tsx
    components/  UserBanListFilters.tsx, UserSanctionHistory.tsx, UserBanFilterMenu.tsx
    model/       userBan.format.ts, userBan.options.ts
    hooks/       useAdminBannedUsers.ts
    api/         adminUserBanApi.ts
    types/       adminUserBan.types.ts
  userRoles/
    pages/       UserRolePage.tsx
    hooks/       useAdminUserRoles.ts
    api/         adminUserRoleApi.ts
    types/       adminUserRole.types.ts
```

이전→현재 대응표와 기준 코드의 검증값은
`tests/fixtures/admin-user-feature-baseline.json`에 기록한다.
옛 위치의 shim/재내보내기나 기능 전체를 로딩하는 index barrel은 남기지 않는다.

## 소유권과 유지한 연결

- 밴과 역할은 각각 전용 API/타입/훅을 소유한다. 둘을 거대한 사용자 관리 기능으로
  합치거나 한쪽이 다른 쪽 페이지를 import하게 만들지 않는다.
- 라우터만 각 페이지를 별도 lazy import한다. `/bans`, `/users/roles` 및
  기존 관리자 권한·Provider·페이지 수명은 변경하지 않는다.
- AuthContext/useAuth, 공통 Axios/인증 오류, 자동 메시지 정리, 관리자 레이아웃,
  알림, 날짜 입력, 페이지 이동, 대상 검색 UI/검색 어댑터는 기존 공통 원본을 사용한다.
  이 파일들을 밴·역할 기능으로 끌어오거나 복제하지 않는다.
- 밴 화면/컴포넌트는 기존 `pages/adminUtility/AdminUtilityPage.styles.ts`를,
  역할 화면은 `pages/placeMerge/PlaceMergePage.styles.ts` 및
  `pages/placeVerification/PlaceVerificationPage.styles.ts`를 계속 사용한다.
  이는 **유지한 레거시 스타일 의존성**이며 스타일 소유권 정리가 끝났다는 뜻이 아니다.
  해당 페이지나 스타일을 후속 정리할 때 사용처와 함께 전환해야 한다.
- API와 타입은 UI/훅을 역참조하지 않는다. 밴의 표현 컴포넌트는 API 호출이나
  제재 실행을 소유하지 않고 기존 페이지·훅이 상태와 실행을 계속 담당한다.
- 밴 화면 1,230줄과 훅 578줄의 내부 책임은 이번에 나누지 않는다.
  줄 수를 줄이려고 상태 소유권이나 갱신 순서를 함께 바꾸지 않는다.

## 보존 검사

- 13개 파일의 import 제외 AST, import 바인딩 및 실제 의존 대상이 기준과 같다.
  검증값을 원본 Git 커밋과도 다시 대조했다. 이벤트·상수·JSX·요청·권한·문구는 변경하지 않는다.
- 기존 밴 상태/핸들러·표현 함수 baseline은 수정하지 않고 읽는 경로만 바꾼다.
- API 소스 근거 202개의 method/path/function/callers를 이동 경로로 정규화하면
  변경 전후가 같다. 밴 6개·역할 3개 호출은 각 기능 훅에 연결되어 있다.
- 계약표 263행 중 10행의 `frontend_target` 소스 경로만 변경한다.
  schema/status/권한/확인 수준/`last_verified`/서버 문서는 변경하지 않는다.
- 경계 검사는 옛 경로·중복 파일·barrel·예상하지 않은 외부 기능 연결·UI 역참조와
  별도 lazy route 유지 여부를 검사한다. 후속 의도적 동작 변경은 별도의 설계·회귀
  근거를 갖추고 baseline도 함께 검토해야 하며 단순 이동에서 이를 갱신하지 않는다.

## 로컬 검증 — 2026-11-13

- 변경 전 단위 **1,157개 통과**. 변경 후 **1,181개 통과**, 실패/skip 없음.
  신규 경계·보존 검사 19개와 합성 실제 훅 검사 5개를 추가했다.
- 실제 훅 + 공통 Axios의 합성 adapter로 밴 처리/해제 payload, 중복 요청 차단,
  마지막 행 해제 후 페이지 보정, 선택 상세/목록/상태/이력 갱신을 확인했다.
  역할 부여·회수의 URL/사유/재조회, 처리 중 대상 변경·중복 실행 차단,
  401/403의 인증·오류 처리도 확인했다. 실제 HTTP 쓰기는 수행하지 않는다.
- 분리된 기준 소스와 변경 후 소스에서 릴리스 브라우저 **24개 스위트 모두 통과**.
- 별도 `admin-target.mjs`도 변경 전후 통과했다. 기존 계정명 검색·키보드 포커스
  검사를 유지하고 역할 부여/회수 확인창의 빈 사유 차단·취소·요청 미발생 검사를
  추가했다. 1920×1080 / 1366×768 / 390×800에서 확인했다.
- 밴 브라우저 검사는 1920×1080 / 1366×768 / 390×844에서 검색/필터/hover/
  상세/이력/페이지 이동/대상 전환/해제 확인창과 빈 결과·오류·지연 응답을 확인했다.
- 변경 전후 밴 PNG 12개 및 역할 조회/검색 PNG 6개, **총 18개가 바이트까지 동일**했다.
  역할 확인창의 추가 검사는 동작 assertion이며 별도 PNG 동일성 비교에 포함하지 않는다.
- lint, TypeScript 포함 build, `check:api-matrix`, `git diff --check` 통과.

### 한계와 후속 범위

- 합성 Chromium/SDK/계정 기준이다. 밴 검사에서는 외부 아이콘 폰트가 차단되어
  글리프가 실제 운영과 다르다. PNG 동일성은 같은 합성 환경 간 비교이며 운영 시각 QA가 아니다.
- 실제 서버 쓰기·운영 데이터 변경·실제 지도 SDK/인증 서버 읽기·Safari/Firefox·
  실기기·스크린리더·운영 배포는 검증하지 않았다.
- 이전 단계의 별도 내비게이션 390px 1px 차이, 관리자/상점주 지도 검사 timeout,
  구형 장소 상세 비교 모드 실패는 이번에 재실행하거나 해결하지 않았다.
  이는 릴리스 24개 스위트 통과와 구분한다. 기존 기록은
  `docs/admin-place-feature-structure.md`에 있다.
- 다음 기능별 이동은 나머지 관리자 기능 → 상점주 → 잔여 공통 파일 순서다.
  커밋·푸시·PR·CI·병합·배포는 로컬 검증과 별도로 승인·실행 결과를 기록한다.
