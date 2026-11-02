# ESLint 10 보안 보완

## 변경 이유

2026-11-02 재검사에서 minimatch의 [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)가 확인됐다.
ESLint 9의 기존 minimatch 3.x와 typescript-eslint의 10.x 경로를 함께 제거한다.
ESLint 9에 minimatch 11만 강제하면 legacy eslintrc의 호출 방식과 충돌하므로
ESLint 10 및 이를 지원하는 플러그인으로 함께 갱신한다.
호환성 기준은 [ESLint 10 마이그레이션 가이드](https://eslint.org/docs/latest/use/migrate-to-10.0.0)를 따른다.

- ESLint 10.14.0, @eslint/js 10.0.1
- typescript-eslint 8.72.1, react-hooks 7.1.1, react-refresh 0.5.7
- `eslint`, `@eslint/config-array`, `@typescript-eslint/typescript-estree`의
  minimatch만 11.0.3으로 제한한다. 전역 override는 사용하지 않는다.
- Node.js 24 기준을 유지한다. 런타임 의존성, API, 지도 정책, 배포 설정은 변경하지 않는다.

## React 검사 대응

새 플러그인은 기존 규칙도 더 깊게 분석한다. 렌더링용 폼 보호 상태와 예약 조건의
초깃값은 state에 보관하고, 비동기 결과를 판별하는 메뉴·가게 ref는 commit 후
layout effect에서 동기화한다. 밴 처리 콜백은 실제 사용하는 사용자 ID를 의존성으로
삼고, 리뷰 삭제 목록의 페이지 보정 재귀는 이름 있는 함수로 명확히 한다.

[`set-state-in-effect`](https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect)는
조회 함수가 시작할 때 수행하는 로딩·오류 초기화도 지적한다.
기존 조회와 재조회가 같은 함수를 공유하고 있으며, 계정·매장 변경 시 이전 정보를
지우는 순서와 요청 무효화도 이 흐름에 묶여 있다. 이번 보안 변경에서 조회 상태
전체를 재설계하거나 타이머/마이크로태스크로 경고만 우회하지 않는다.

검토한 25개 데이터 동기화 effect에만 사유를 적은 disable/enable 쌍을 둔다.
로그아웃 알림 초기화, 예약 계정 변경 초기화, 매장 전환 초기화, 비교 대상 조회,
최초 데이터 조회에 한정한다. 이 부분의 추가 렌더 최적화는 완료했다고 주장하지
않으며 구조 정리 #333에서 상태 소유권과 함께 재검토할 수 있다.
전역 규칙과 나머지 effect, ref, 의존성 검사는 유지한다.

## 검증 기준

`tests/eslint-security.test.mjs`는 실제 minimatch 해석 결과와 잠금파일을 확인하고,
TypeScript·Hooks·ref·effect·Fast Refresh의 잘못된 예제가 계속 실패하는지 검사한다.
모든 소스 TS/TSX 파일이 lint 대상에 남고 dist만 제외되는지도 확인한다.
기존 폼 보호·예약 조건·계정 및 매장 전환·지연 응답 테스트와 전체 릴리스 검증을
함께 실행한다. 브라우저 테스트는 합성 API/Chromium이며 운영 QA를 대신하지 않는다.
