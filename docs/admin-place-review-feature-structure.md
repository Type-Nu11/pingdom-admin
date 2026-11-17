# 관리자 장소 검증·리뷰 삭제·방문자 심사 파일 정리 — #333 3단계 네 번째 묶음

## 범위와 기준

- 기준: develop `c3cd42c4bee7c5a0cf85b0ebc4e79d985aba2002` (#342 병합).
- 브랜치: `refactor/admin-place-reviews-structure-333`, 검증일 2026-11-17.
- 장소 정보 검증 10개, 리뷰 삭제 요청 5개, 방문자 제보·정정 심사 4개, **19개 파일**을
  `src/features/admin`의 기능별 위치로 이동한다. 해당 화면·전용 컴포넌트·훅·API·타입을 모은다.
- import 경로 이외의 요청·상태·JSX·CSS·URL·권한·미저장 입력 보호·승인/반려 절차는
  바꾸지 않는다. 큰 파일 내부 책임 분리·버튼/여백 변경·#337 지도 로직과 보류한 #331은 제외한다.
- 기존 README 변경·다른 worktree·stash는 보존한다. 이 묶음만으로 #333을 완료하지 않는다.

```text
src/features/admin/
  placeVerification/
    pages/       PlaceVerificationPage.tsx, PlaceVerificationPage.styles.ts
    components/  PlaceInformationEvidencePanel.tsx, PlaceInformationReportPanel.tsx,
                 PlaceInformationReverificationPanel.tsx
    hooks/       useAdminPlaceVerification.ts, useAdminPlaceInformationReports.ts
    api/         adminPlaceVerificationApi.ts
    types/       adminPlaceVerification.types.ts
    model/       placeVerificationLabels.ts
  placeReviewDeletion/
    pages/       PlaceReviewDeletionPage.tsx, PlaceReviewDeletionPage.styles.ts
    hooks/       useAdminPlaceReviewDeletionRequests.ts
    api/         adminPlaceReviewDeletionApi.ts
    types/       adminPlaceReviewDeletion.types.ts
  visitorVerification/
    pages/       VisitorVerificationPage.tsx
    hooks/       useAdminVisitorVerifications.ts
    api/         adminVisitorVerificationApi.ts
    types/       adminVisitorVerification.types.ts
```

정확한 이전→현재 대응표, 파일별 코드/의존 대상 검증값과 기존 외부 사용처는
`tests/fixtures/admin-place-review-feature-baseline.json`에 있다. 옛 파일 shim·재내보내기나
기능 전체를 동시에 불러오는 index barrel은 만들지 않는다.

## 소유권과 유지한 연결

- 라우터는 `/places/information-verification`, `/review-deletion-requests`,
  `/visitor-verifications`를 기존 관리자 `ProtectedRoute` 아래 개별 lazy import로 유지한다.
  쿼리·탭·직접 진입·Provider 수명은 변경하지 않는다.
- `adminPendingWorkApi`의 검증/삭제/방문자 개별 API 집계는 기존 연결을 그대로 사용한다.
  집계 대상·정렬·인증 정책을 바꾸지 않는다.
- 공통 검색기 `AdminPlacePicker`·`AdminTargetSearch`, 다른 관리자 화면 등의
  `PlaceVerificationPage.styles.ts` 재사용은 **기존 레거시 의존성**이다. 새 기능 위치의
  원본을 가리키게만 바꾸며 스타일을 복제하거나 공통화 완료로 간주하지 않는다.
  실제 28개 외부 참조(import 단위)를 fixture로 제한하고 신규 연결을 막는다.
- 장소 조회/증빙/재확인/신고·반박의 상태 소유권은 기존 페이지/두 훅에 남는다.
  최신 응답 확인·처리 중 중복 방지·실패 시 초안 유지·페이지당 10개 정책도 유지한다.
- 리뷰 삭제 심사와 방문자 제보/정정의 승인·반려 근거, 확인창 취소, 처리 완료 후 갱신과
  선택 해제는 기존 구현을 유지한다. 파일 이동을 이유로 미완료 기능이나 UX 변경을 끼워 넣지 않는다.
- 장소 병합 스타일, 인증/Axios/메시지·검색·일시 선택·페이지네이션·공통 화면 틀,
  지도 SDK 원본은 이번 기능으로 이동하지 않는다.
- 이전 사용자/예약·신청 심사 baseline은 import 대상 경로만 맞추고 코드 해시는 바꾸지 않는다.

## 구조·API 검증

- 고정 Git 원본에서 생성한 fixture와 19개 파일의 import 제외 AST·import 바인딩·실제 의존 대상을
  비교한다. 별도 기준 체크아웃에서 fixture를 재생성해 전체 내용이 동일한지도 확인했다.
  테스트 실행 중 과거 Git 이력을 읽지 않는다.
- 신규 단위 검사 26개: 단일 소유 위치, 파일별 보존 19개, 기존 외부 사용처,
  API/type의 UI 역참조 금지, 개별 lazy/관리자 권한 URL, 공통 원본 유지,
  옛 활성 경로 부재, 전체 API 근거 동일성을 확인한다.
- API 소스 근거 **202개**의 method/path/function/callers는 경로를 정규화하면 이전과 같다.
  이동한 API만이 아니라 전체 근거를 고정 해시와 비교한다.
- 계약표 **263행 중 19행의 frontend_target 경로만** 바뀌었다. 다른 필드·서버 계약·
  last_verified·권한·검증 수준·수집 날짜는 바꾸지 않았다. `check:api-matrix` 재현성도 유지한다.

## 로컬 검증 — 2026-11-17

- 변경 전 독립 Git 체크아웃: 단위 **1,205개**, lint·TypeScript 포함 build·계약표 검사 통과.
- 변경 후: 단위 **1,231개 통과**, 실패/skip 0 (기존 1,205개 + 구조 검사 26개),
  lint·TypeScript 포함 build·계약표 검사·`git diff --check` 통과.
- 첫 구현 커밋 `3601c82`만 별도 Git 체크아웃해 기존 단위 **1,205개 통과**를 확인했다.
  파일 이동과 검증 추가의 커밋을 나눠도 기존 검사가 깨지지 않는다.
- 변경 전 릴리스 브라우저 **24개**, 변경 후에는 기존 스위트와 신규 방문자 심사를 포함한
  **25개 스위트 전체 통과**. 실제 쓰기/실서버/운영 배포 성공을 뜻하지 않는다.
- 변경 전후 `place-verification-layout`: 1920/1449/1366/390px에서 증빙/재확인 탭,
  장소 선택/직접 ID 펼치기·라벨 간격·조회 버튼 고정 위치·빈 안내·좁은 화면 넘침 검사 통과.
- 변경 전후 `place-dispute-review`: PC/390px의 신고·반박 심사, 증빙 저장·재확인,
  확인창·실패/재시도·목록/상세 새로고침·인증 오류·빈 상태·미저장 입력 보호 검사 통과.
  응답/쓰기 모두 합성 fixture이며 운영 변경은 없다.
- 신규 `admin-place-review-structure`를 기준/변경 후 양쪽에서 실행했다. 1366×768/390×844의
  실제 방문자 페이지·훅·공통 Axios로 목록/상세, Enter 선택, 페이지/상태 변경의 선택 해제,
  탭별 조건 보존·직접 URL, 처리 완료 항목의 읽기 전용과 승인/반려 확인창의 근거 필수/취소를 검사했다.
  제보/정정 각각의 승인·반려 4개 확인창은 실제 확정 요청 없이 취소한다.
- 처음 작성한 신규 검사는 화살표 이동만으로 탭이 열릴 것으로 가정해 timeout 났다.
  기존 `AccessibleTabList`는 수동 활성화이므로 포커스 이동/선택 유지 후 Enter 활성화를
  따로 검사하도록 고쳤다. 제품 구현이나 기존 assertion·대기 제한은 변경하지 않았다.
- 방문자 PC/모바일 캡처 2장은 기준/변경 후 SHA-256까지 동일했다. 캡처와 검증 폼 배치를
  확인했지만 합성 브라우저는 외부 폰트 CSS를 대체하므로 아이콘 글리프/실제 웹폰트 렌더링은
  운영 시각 품질 근거가 아니다. 모든 화면의 픽셀 동일성이나 접근성 완료를 주장하지 않는다.

## 한계와 다음 범위

- 합성 Chromium/API/계정/지도/증빙 검사다. 실제 서버 쓰기·운영 데이터·실지도 SDK·
  실기기 Safari/Firefox·모든 키보드/스크린리더·로그인/PingCha·운영 배포는 검증하지 않는다.
- 이전에 알려진 지도 전용 timeout·내비게이션 스크롤 1px 차이·구형 상세 비교 모드는
  이번 이동에서 수정하거나 검사를 완화하지 않는다. 릴리스 스위트 통과와 전체 운영 QA를 구분한다.
- 다음 #333 범위는 잔여 관리자 기능 → 상점주 기능 → 잔여 공통 파일 이동,
  큰 파일의 책임 분리 → 역할별 버튼/화면 유형별 여백 기준 → 최종 전체 회귀다.
- 이 문서는 로컬 검증 기록이다. 현재 작업의 커밋·푸시·PR·CI·병합·배포 완료와는 별도다.

## PR 리뷰 보완 — 1번

- 새 방문자 fixture가 제보자 `reporterUserId`와 정정 요청자 `requesterUserId`를 한 객체에
  함께 넣었다. 실제 페이지는 키 존재 여부로 사용자 표시를 구분하므로 정정 요청에서도
  제보자 분기만 실행되어 요청자 표시를 검증하지 못했다. 제품 코드의 회귀가 아닌 검사 데이터 오류다.
- 실제 응답처럼 제보에는 제보자 필드만, 정정에는 요청자/원본 제보 필드만 넣는다.
  목록의 제보자 `#901`과 정정 요청자 `#902`를 각각 확인하는 assertion을 추가했다.
- 새 assertion과 이전 fixture를 임시 체크아웃에서 함께 실행하자 요청자 표시 검사에서
  종료 코드 1로 실패했다. 수정 후 기준/변경 소스의 PC/390px 검사와 lint는 통과했다.
  보완한 fixture 기준의 전후 PNG 2장도 바이트까지 동일했다. 운영 요청은 하지 않았다.
- PR 소스 `71443fd`의 단위 1,231개·lint·타입 포함 build·계약표와 관련 브라우저 3종을
  별도 체크아웃에서 재검증했다. 전체 소스 315개의 AST와 실제 import 대상을 독립 비교해
  이동 경로를 정규화하면 동일했다. 이 보완도 테스트/문서만 변경한다.
