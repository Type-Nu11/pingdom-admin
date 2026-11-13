# 장소 관리 기능 파일 정리 — #333 3단계 첫 묶음

## 범위와 기준

- 기준: develop `07a93127130a63bb1ae30cc7a2538705fd0f2772` (#339 병합).
- 브랜치: `refactor/admin-places-structure-333`.
- 장소 관리 소유의 **17개 파일을 이동**하고 사용처·라우터·검사 경로를 갱신한다.
  내부 로직 분리, 버튼/여백 변경, 새 지도 기능을 함께 구현하지 않는다.
- 기존 사용자 README 수정과 다른 worktree/stash는 변경하지 않는다.
- 이 묶음만으로 #333의 전체 기능별 이동이나 상위 이슈를 완료하지 않는다.
  사용자 밴/역할 → 나머지 관리자 → 상점주 → 잔여 공통 파일 이동은 후속 범위다.

```text
src/features/admin/places/
  pages/       PlaceManagePage.tsx, PlaceManagePage.styles.ts
  components/  목록·지도 패널·상세·편집창·상세 링크, PlaceInspector.styles.ts (10개)
  hooks/       useAdminPlaces.ts, useAdminPlaceOperatingNotices.ts
  api/         adminPlaceApi.ts, adminPlaceOperatingNoticeApi.ts
  types/       adminPlace.types.ts
```

이전→현재 파일의 정확한 대응표는 `tests/fixtures/admin-place-paths.json`에 있다.
옛 경로의 재내보내기/호환 shim이나 기능 전체를 불러오는 index barrel은 남기지 않는다.

## 소유권과 허용한 연결

- 장소 API/타입은 장소 도메인이 소유한다. 외부 사용처도 같은 원본의 개별 모듈을 직접
  참조하며 API/타입을 복제하지 않는다. API/타입 모듈에서 페이지·컴포넌트·훅을 로드하지 않는다.
- `src/api/adminTargetSearchApi.ts`는 기존 관리자 대상 검색 어댑터다. 장소 검색에
  `places/api/adminPlaceApi.ts`의 목록 함수를 계속 사용한다. 이 레거시 연결을 명시적으로
  허용하되 `shared` UI가 기능을 역참조하도록 확대하거나 조회 함수를 복제하지 않는다.
- 관리자 예약 이력과 상점주 장소 신청 심사는 `PlaceDetailLink`만 직접 사용한다.
  이 컴포넌트는 장소 상세 URL로 이동하는 장소 도메인의 작은 표현이며 페이지를 import하지 않는다.
- 기존 중복 후보 화면은 장소 상세 API/타입과 장소 전용 입력 스타일을 직접 재사용한다.
  기존 의존성을 유지한 것이며 이번에 중복 후보의 상태/로직/폴더까지 함께 옮기지 않는다.
  후속 이동 시 이 연결도 사용처와 함께 정리한다.
- 라우터만 장소 페이지를 lazy import한다. `/places`, 쿼리, 권한 및 Provider 경계를 유지한다.
- `NaverMap`, 지도 controller/types, `utils/placeCategory.ts`, 공통 Axios/인증 처리,
  공통 관리자 레이아웃은 이동하지 않는다. 지도 SDK도 카테고리 표현을 사용하므로
  이를 장소 기능으로 끌어와 하위 공통 코드가 기능을 역참조하게 만들지 않는다.

위 외부 연결은 `tests/admin-place-feature-boundary.test.mjs`에서 허용 목록으로 검사한다.
폴더 이동만으로 기존 레거시 코드 전체가 새로운 계층으로 정리됐다고 간주하지 않는다.

## 보존과 검사 도구

- 17개 파일의 import 제외 AST와 import 바인딩을 원본과 비교해 모두 동일함을 확인했다.
  상태·효과·요청·이벤트·JSX·CSS·상수/페이지 크기를 변경하지 않았다.
- 페이지당 10개, 첫 조회/새로고침/페이지 이동 시 목록 범위 맞춤, 목록·마커 선택,
  상세 열기/닫기, 위험 작업 확인·미저장 입력 보호를 유지한다. #337 내부 로직 분리,
  #331의 20개/100개 정책과 새 지도 API는 포함하지 않는다.
- 기존 파일 경로를 읽는 단위 검사·브라우저 fixture도 새 소유 위치를 직접 참조한다.
  공통 레이아웃 소비자 검사는 pages뿐 아니라 features도 조사하여 22개 모듈 검사를 유지한다.
- API 소스 목록 도구가 기존 `src/api`와 기능별 `features/**/api`를 함께 읽도록 한다.
  경로를 정규화한 변경 전후 비교에서 메서드·endpoint·함수·호출 관계 **202개가 동일**하다.
- 계약표의 14개 행에서 `frontend_target` 경로만 변경한다. schema/status/권한/확인 수준,
  서버 문서 원본·수집 날짜·`last_verified`를 새 실서버 검증처럼 바꾸지 않는다.
  계약표 재생성 검사도 통과한다(현재 문서 227 operation, 전체 263행).
- 과거 비교 검사의 고정 커밋/옛 경로는 역사적 참조로 보존한다. 해당 컴포넌트를 새
  파일 위치에 주입할 때 상대 import 세 개만 rebasing한다. 과거 JSX/핸들러나 비교 assertion,
  시간 제한은 변경하지 않는다. 이 참조만 활성 옛 경로 금지 검사에서 명시적으로 예외 처리한다.

## 로컬 검증 — 2026-11-11

- 변경 전 분리된 기준 체크아웃: 릴리스 브라우저 **24개 스위트 통과**.
- 변경 후 단위 **1,157개 통과**(기존 1,151개 + 경계 검사 6개), 실패/skip 없음.
- 변경 후 릴리스 브라우저 **24개 스위트 통과**.
- lint, TypeScript 포함 build, `check:api-matrix`, `git diff --check` 통과.
- 관리자 대상 검색/장소 상세 진입의 `admin-target.mjs` 합성 브라우저 검사 통과.
- 현재 장소 상세 검사 `place-inspector.mjs --current-only`는 변경 전후 모두 통과.
  1280×800/1280×600/390×800/390×600에서 접기·상태·긴 이름·선택 전환·위치 보기와
  넘침/스크롤을 확인했다. 기본/상태별 12개 PNG는 일반 실행에서 바이트까지 동일했다.
  긴 이름 4개는 일반 실행에서 차이가 있었으나 시각·전환 효과·caret를 고정한 보조 비교에서는
  **16개 PNG 모두 동일**했다. 이 보정을 기본 CI/프로덕션에는 적용하지 않는다.

### 변경 전후 모두 실패한 별도 검사

| 검사 | 동일하게 관찰한 실패 단계 |
| --- | --- |
| `navigation.mjs` | 390px 키보드 이동 후 스크롤 `1683 !== 1684` (`:92`) |
| `admin-naver-map.mjs` | 연속 확대 후 zoom 값 대기 10초 timeout (`:73`) |
| `merchant-naver-map.mjs` | 합성 업체 검색 결과 버튼 대기 10초 timeout (`:137`) |
| `place-inspector.mjs` 기본 전체 비교 | pre-#190 과거 컴포넌트의 `영업시간 수정` 버튼 대기 timeout (이동 전 `:50`, import rebasing 후 `:55`) |

마지막 항목은 이번에 추가로 실행해 발견한 **구형 비교 모드의 기존 실패**다.
현재 컴포넌트만 검사하는 기존 `--current-only` 옵션의 통과와 구분한다. 기본 전체 비교를
통과한 것으로 보고하거나 삭제하지 않으며 원인을 이 이동 작업에서 해결했다고 주장하지 않는다.

모든 화면 검사는 합성 Chromium/SDK 기준이다. 실제 서버 쓰기, 운영 데이터 변경,
실제 지도 SDK/인증 서버 읽기, 운영 폰트, Safari/Firefox·실기기·스크린리더 검증은 하지 않았다.
커밋·푸시·PR·원격 CI·운영 배포 완료와도 구분하며 승인된 단계만 진행한다.
