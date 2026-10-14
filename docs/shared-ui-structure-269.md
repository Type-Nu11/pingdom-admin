# 공통 화면 스타일과 책임 경계 (#269)

## 범위와 소유권

기준: 2026-10-08 develop `9f07ee0`, `codex/shared-ui-structure`의 로컬 변경. 화면 재디자인, API·인증·권한·운영 상태 처리 변경이 아닌 점진적 구조 정리다.

| 소유 모듈 | 책임 | 주요 소비자 |
| --- | --- | --- |
| `components/merchant/MerchantWorkspace.styles.ts` | 목록/편집 2열 패널, 폼, 버튼, 상태·오류·읽기 전용 표시 | 메뉴·혜택·예약 상품/운영/설정·결제·부스트·재검증·리뷰·캠페인, 예약 조건/약관 공통 컴포넌트 |
| `components/merchant/MerchantSurface.styles.ts` | 페이지/헤더, 입력·저장, 안내/빈 장소/로딩, 장소 선택 진입 | 홈·온보딩·운영 공지·운영 정보·신규 장소/운영 권한 신청 및 위 편집 화면 |
| `pages/merchantCampaign/MerchantCampaignPage.styles.ts` | 캠페인 브랜드 선택·전용 페이지네이션/다이얼로그 스타일 | 해당 페이지만 |
| `pages/merchantStore/MerchantStorePage.styles.ts` | 홈 매장 요약·성과·업무 이동·리소스·운영 상태 표시 | 해당 페이지만 |

- 두 기존 페이지 스타일 파일은 자기 페이지의 기존 namespace 사용을 위한 공통 export 호환 진입점을 유지한다. 재정의·복사본이 아니며 같은 컴포넌트 객체를 re-export한다. 외부 페이지/공통 컴포넌트는 공통 모듈을 직접 import한다.
- `CampaignList/Item/Title/Top/Meta`와 `EmptyStore*` 이름은 기존 화면들의 CSS/props 계약을 유지하는 호환 이름이다. 캠페인 API나 홈 데이터에 의존하지 않는다. 일괄 이름 변경으로 이슈 범위를 키우지 않는다.
- `PlaceSelect`는 기존 `MerchantPlaceSelect`의 호환 export다. 선택 이벤트/ID/키보드 처리는 변경하지 않는다.
- 공통 MerchantPageShell과 MerchantLayout의 기존 중첩 규칙을 유지한다. 현재 화면마다 사용하는 wrapper가 달라 이 작업에서 일괄 교체하지 않는다.

## 유지하는 변형

| 항목 | Workspace | Surface |
| --- | --- | --- |
| 폼 | 2열, 620px 이하 1열, `$wide` 전체 너비 | 동일 배치·동일 props, 기존 선언 유지 |
| Input | 42px, 기존 focus/disabled | 42px, placeholder 색·160ms transition 유지 |
| Textarea | 최소 144px | 최소 132px |
| 버튼 | ActionButton primary/danger/secondary, Create/Header 버튼 | Save/Retry/EmptyStore 버튼 |
| 상태/안내 | StatusBadge draft/published/closed, ReadonlyNotice/FormError | Notice error/success, Skeleton/Loading/EmptyStore |
| 외곽 배치 | 목록/편집 2열, 980px 이하 1열 | MerchantLayout 내부 선택자와 기존 헤더/본문 padding 유지 |

이름이 비슷하다고 CSS가 다른 입력·버튼·레이아웃을 하나로 합치지 않는다. 동일성을 확인하지 않은 스타일 변형을 새 디자인 시스템처럼 추상화하지 않는다.

## 사용자 제재 화면 경계

- `UserBanListFilters`: 목록 필터의 표시·입력·조회/초기화/새로고침 콜백 전달. 입력만 변경해서는 요청하지 않는다.
- `UserBanFilterMenu`: 기존 메뉴 열기/닫기, 외부 pointerdown·Escape, 옵션 선택. 이벤트 등록/해제를 그대로 유지한다.
- `UserSanctionHistory`: 로딩 → 실패 → 이력 → 빈 결과 표시, 이력 페이지 이동 콜백. 실패를 이력 없음으로 바꾸지 않는다.
- `userBan.format.ts`와 `userBan.options.ts`: 기존 순수 표시 함수/문구와 정적 옵션. 알 수 없는 코드·없는 값·잘못된 날짜의 fallback을 그대로 유지한다.
- `UserBanPage`: 선택 사용자, draft/applied 필터, 유효성 검증, 대상 확인, 페이지 요청, 밴/해제 payload와 busy/확인 흐름을 계속 소유한다. `useAdminBannedUsers`의 요청 ID·취소/늦은 응답·계정 변경 경계는 수정하지 않는다.

## 회귀 근거와 실행

```sh
npm run lint
npm run build
npm test
npm run test:release-browser
```

- 기준 커밋에서 추출한 선언 hash fixture는 공통 스타일의 CSS/반응형/variant 선언과 밴 화면의 상태·요청·처리 함수 및 formatter가 바뀌지 않았음을 검사한다. 선언 hash는 클래스명이나 스크린샷 동일성 검증이 아니다. 이후 의도적으로 스타일/업무 규칙을 바꿀 때 근거와 함께 baseline을 갱신해야 한다. 테스트 실행 중 과거 Git 이력을 조회하지 않는다.
- 의존성 검사는 외부 페이지 소유 스타일로의 역방향 import가 재발하는지 검사하며, SSR 검사는 기존 호환 export와 새 공통 객체의 동일성을 검사한다.
- Chromium fixture는 실제 UserBanPage/기존 hook/API를 사용하되 합성 adapter로 GET만 응답한다. 입력/조회 구분, 날짜 초 단위 정규화, 초기화, 목록→상세→이력, 사용자 교체, pagination, 빈 결과·지연·실패 후 재조회와 밴 입력창 열기/기존 바깥 영역으로 닫기를 확인한다.
- 기존 상점주 5개 모달·매장 식별·미저장 보호와 대비 검사도 새 공통 스타일을 사용한다. 주요 흐름은 1920×1080·1366×768·390×844에서 확인한다.
- fixture는 .env·개발 프록시를 읽지 않고 실제 API/외부 네트워크를 차단한다. 실사용자 승인·밴·삭제·환불은 실행하지 않는다. 5173 서버는 유지한다.

### 로컬 실행 결과

- Node.js 24.16.0 / Chromium, 위 브랜치의 미커밋 변경 기준.
- `npm test`: 697개 통과, 실패·skip 없음(신규 구조 검사 7개 포함).
- lint·TypeScript/build·diff 공백 검사 통과.
- 핵심 브라우저 7개 suite 순차 통과. UserBan 주요 흐름·날짜 팝업·입력창은 3개 화면 크기, 이력 빈 결과·지연·실패/재조회는 별도 합성 시나리오에서 통과했다.
- 1920×1080·1366×768·390×844 목록/상세·입력창 스크린샷을 임시 경로에서 확인했다. 외부 폰트를 차단한 fixture이므로 아이콘 fallback/서체의 픽셀 동일성을 주장하지 않는다.
- 추가 검사 중 로컬 Chromium 실행 파일 누락을 확인해 공식 Playwright 설치 명령으로 복구한 뒤 전체 단위 검사와 브라우저 7종을 다시 통과했다. 의존성 파일·제품 코드·CI 설정은 이 설치 때문에 변경하지 않았다.

## 보류 경계와 이유

- PlaceManage는 이미 list/map/inspector와 운영 다이얼로그로 분리되어 있다. 지도 viewport/마커, 비동기 선택/복원과 저장 후 동기화를 이 작업에서 다시 묶거나 새 hook으로 이동하지 않는다. 실제 지도·서버를 포함한 별도 근거가 필요한 후보로 남긴다.
- UserBan의 상세 정보/이력 필터와 밴·해제 확인창은 부모의 대상·busy·검증 상태를 함께 사용한다. 이번에는 표시 책임을 먼저 분리하며 대형 페이지 전체를 완료했다고 표현하지 않는다.
- 밴 입력창에는 기존부터 명시적 닫기 버튼/Escape 처리가 없고, overlay z-index 40보다 sidebar 50이 높다. QA에서는 사이드바 밖 배경으로 닫기를 확인했다. 접근성·레이어 개선은 순수 책임 분리와 별도 UX 후보이며 이번 작업에서 몰래 수정하지 않는다.
- 관리자 공통 AdminUtility/PlaceManage 스타일과 일부 상점주 페이지별 전용 변형은 그대로 남는다. 전 화면 스타일 의존성을 한 번에 개편하는 작업이 아니다.
- 실제 서버 전체 QA, 실제 서체/픽셀 스냅샷, 다른 브라우저·실기기·배포 CSP는 이 합성 회귀로 대체하지 않는다(#220·#221 유지).
- 기존 develop 원격 CI run `37720518405`는 OpenAPI 과거 기준 커밋의 파일 조회 테스트에서 실패했다. 이번 CSS/책임 분리와 별개인 #273 후속 검증 항목이며, 이 작업에서 CI 설정·OpenAPI baseline을 수정하지 않는다.
