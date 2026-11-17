# 관리자 예약·장소 신청·상점주 파일 정리 — #333 3단계 세 번째 묶음

## 범위와 기준

- 기준: develop `19dcd4edbed6a04734371d38b10f1b713cdc464f` (#341 병합).
- 브랜치: `refactor/admin-review-workflows-structure-333`, 검증일 2026-11-17.
- 예약 관리 이력 6개, 장소 신청 심사 7개, 상점주 관리 4개, **17개 파일**을 이동한다.
- 상태·요청·JSX·CSS·URL·페이지 크기·위험 작업 확인을 변경하지 않는다.
  큰 파일 내부 책임 분리·버튼/여백 변경·#337 지도 로직·보류된 #331은 포함하지 않는다.
- 기존 README 변경·다른 worktree·stash를 보존한다. 이 묶음은 #333 전체 완료가 아니다.

```text
src/features/admin/
  reservations/
    pages/       AdminReservationReviewPage.tsx, AdminReservationReviewPage.styles.ts
    hooks/       useAdminReservations.ts
    api/         adminReservationApi.ts
    types/       adminReservation.types.ts
    model/       reservationReviewContext.ts
  merchantApplications/
    pages/       MerchantPlaceApplicationReviewPage.tsx, 같은 이름의 styles.ts
    hooks/       useAdminMerchantPlaceApplications.ts, useApplicationAttachmentPreview.ts
    api/         adminMerchantPlaceApplicationApi.ts
    types/       adminMerchantPlaceApplication.types.ts
    components/  AttachmentPreview.tsx
  merchantOwners/
    pages/       MerchantOwnerPage.tsx
    hooks/       useAdminMerchantOwners.ts
    api/         adminMerchantOwnerApi.ts
    types/       adminMerchantOwner.types.ts
```

정확한 이전→현재 대응표와 원본 AST/import 검증값은
`tests/fixtures/admin-review-feature-baseline.json`에 있다. 옛 파일 shim·재내보내기나
기능 전체를 로드하는 index barrel은 남기지 않는다.

## 소유권과 유지한 연결

- 라우터는 세 페이지를 각각 lazy import한다. `/reservations/review`,
  `/merchant-place-applications`, `/merchant-owners`와 인증·Provider 경계는 유지한다.
- `utils/authReturn.ts`는 예약 URL 조건의 읽기/쓰기를 예약 도메인의 model에서 가져온다.
  기존 로그인 후 복귀 연결을 그대로 옮긴 명시적 레거시 어댑터이며 모델이 인증/UI를
  역참조하지 않는다. 함수·인증 정책·쿼리 의미를 바꾸거나 복제하지 않는다.
- `api/adminPendingWorkApi.ts`는 신청 심사 API를 계속 사용한다. 대시보드 집계나
  관리 대상이 바뀐 것은 아니다. 기존 연결을 명시적으로 허용한다.
- 신청 심사 훅은 상점주 도메인의 API/타입으로 신청자 프로필을 조회한다.
  사업자명 비교·승인 차단과 조회/선택 변경 시 정리는 기존 훅이 계속 소유한다.
- `AttachmentPreview`와 조회 훅은 관리자 장소 신청 전용이므로 해당 기능으로 이동한다.
  범용 `PdfAttachment`, `AttachmentPreview.styles`, `AppDialog`, `FeedbackMessage`는
  공통 원본을 유지한다. PDF worker·이미지/문서 확대·Object URL 정리도 변경하지 않는다.
- 기존 `placeMerge`·`placeVerification` 페이지 스타일 재사용은 그대로 유지한 레거시
  의존성이다. 이를 공통화 완료로 간주하지 않으며 후속 스타일 소유권 정리 때 함께 다룬다.
- 장소 상세 링크는 이미 이동한 places 기능 원본을 직접 참조한다. 기존 장소 경계 검사는
  소비자 경로만 바꾸고 허용 대상/검사 강도를 늘리거나 줄이지 않는다.
- 공통 인증/Axios/메시지·검색·일시 선택·페이지네이션·목록 쿼리/레이아웃,
  상점주의 별도 장소 신청 타입은 이동하지 않는다. 같은 자료를 여러 기능에 복제하지 않는다.

## 보존과 경로 검사

- 17개 파일의 import 제외 AST, import 바인딩과 실제 의존 대상이 모두 기준과 같다.
  fixture를 고정 Git 원본에서 독립 재생성하여 다시 대조했다.
- 기존 테스트/fixture의 상대 import·직접 파일 읽기·SSR 경로를 새 소유 위치로 바꾼다.
  기존 assertion·과거 비교 코드·대기 제한은 바꾸지 않는다.
- 신규 구조 검사 24개: 단일 소유 위치, 파일별 AST/의존성 17개, 외부 소비자 명시,
  API/type/model의 UI 역참조 금지, lazy URL/10개 정책, 공통 PDF/인증 경계,
  활성 옛 경로 부재, API 근거/예약 읽기 전용 보존을 확인한다.
- 원래 외부 소비자 외에 신규 cross-feature 연결이 생기지 않았는지 검사한다.
  폴더 이동만으로 전체 레거시 계층이 정리됐다고 주장하지 않는다.
- API 소스 근거 **202개**의 method/path/function/callers를 이동 경로로 정규화하면
  변경 전후 동일하다. 이번 3개 API 모듈의 호출 지점은 15개이며 동적 상점주 심사
  action은 도구의 기존 표현을 유지한다. 예약 API는 기존 GET 2개만 남는다.
- 계약표 263행 중 **17행의 frontend_target 경로만** 변경한다. schema/status/issue/
  canonical/권한/검증 수준/수집 날짜/last_verified를 새 서버 검증처럼 갱신하지 않는다.
  `check:api-matrix`의 현재 227 operation/전체 263행 재현성도 유지한다.

## 로컬 검증 — 2026-11-17

- 변경 전 독립 Git 체크아웃: 단위 **1,181개**, lint·TypeScript 포함 build 통과.
- 변경 후 단위 **1,205개 통과**, 실패/skip 없음 (기존 1,181개 + 신규 24개).
- 변경 전후 릴리스 브라우저 **24개 스위트 전체 통과**.
- 별도 `reservation-context.mjs`: PC/390px의 조회 조건·선택·뒤로/새로고침·미적용 초안·
  실패/권한·계정 전환·빈 결과·가로 넘침 검사 통과.
- 별도 `history-filters.mjs`: PC/390px의 신청 이력 검색 Enter·필터/초기화·빈 결과·
  신청/상세 헤더 정렬·좁은 화면 검사 통과.
- 별도 `attachment-preview.mjs`: 1280px/390px에서 실제 증빙 이미지/PDF·확대/축소·
  키보드/포커스·다운로드·오류 상태·파일 행 정렬/긴 파일명 검사 통과.
- 별도 `review-actions.mjs`: 1280×800 / 1280×600 / 390×800 / 390×600에서 상세 내부
  스크롤과 고정 작업 영역, 마지막 증빙 접근, 승인 확인창/포커스/Escape, 읽기 전용 전환 통과.
- 신규 `admin-owner-structure.mjs`도 기준/변경 후 통과했다. 1366×768 / 390×844에서
  실제 상점주 페이지·훅·공통 Axios를 합성 adapter와 함께 사용해 목록/상세, 상태 필터와
  페이지 초기화, 페이지 전환 후 선택 해제, 키보드 선택, 승인/반려/연결 장소/온보딩/권한
  회수의 사유 필수/취소를 확인했다. 읽기 외 요청은 차단하며 실제 승인/변경은 하지 않는다.
- 원본 Git 소스에 새 상점주 검사 fixture/script만 제공하여 같은 검사로 비교했다.
  기준 제품 코드는 바꾸지 않았고 사용자 개발 서버·로그인 세션은 사용하지 않는다.
- 일반 캡처 **24개 중 23개가 바이트까지 동일**했다: 예약 6/6, 신청 이력 6/6,
  증빙 6/6, 심사 작업 3/4, 상점주 2/2. 다른 1개는 1280×800의 선택 카드 배경 영역이었다.
  기존 스타일에 background/border 160ms 전환이 있다. 포인터를 치우고 유한 전환을
  완료한 별도 보조 실행에서는 심사 작업 **4개 PNG 모두 동일**했다. 제품/원래 검사/
  assertion은 바꾸지 않았고 보조 안정화 스크립트는 임시 경로에만 두었다.
- 변경 후 lint, TypeScript 포함 build, `check:api-matrix`, `git diff --check` 통과.

## 한계와 다음 범위

- 합성 Chromium/API/SDK/계정/PDF 기준이다. 실제 서버 쓰기·승인/반려·운영 데이터 변경·
  실제 지도 SDK/인증 서버·실기기 Safari/Firefox·스크린리더·운영 배포는 확인하지 않는다.
- 상점주 확인창은 사유 차단/취소 검사이며 모든 실제 mutation 성공/실패 동선을
  브라우저에서 새로 통합 검증한 것은 아니다. 기존 단위 계약 검사와 코드 동일성 검사를 병행한다.
- 이전 단계의 내비게이션 390px 1px 차이·관리자/상점주 지도 timeout·구형 장소 상세 비교
  모드 실패는 이번에 재실행/해결하지 않았다. 릴리스 24개 성공과 구분한다.
- 다음은 나머지 관리자 기능 → 상점주 기능 → 잔여 공통 파일 이동이며, 이후 큰 파일 책임
  분리·버튼/여백 통일·최종 회귀를 진행한다. #337/#331은 기존 별도 범위를 유지한다.
- 로컬 검증은 커밋·푸시·PR·원격 CI·병합·운영 배포 완료 근거가 아니다. 승인 단계별로 진행한다.
