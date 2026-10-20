# 예약 역할 전환 검증 기록 (#317·#318)

## 기준과 범위

- 공개 OpenAPI 수집: `2026-10-20T13:57:47.489Z`. Admin 143, Merchant 84, App 115, Common 17 operation.
- 웹 비교 기준: `bd4fe35`. 현재 후속 작업은 이 커밋 위의 작업 트리이며 아직 운영 배포본이 아니다.
- 별도 대조한 서버 release 소스: `fada91615237a7d6093afd30b68c5cbe643b6bac`.
- 서버 소스 참조와 실제 운영 배포 버전은 별개다. Swagger의 `info.version`으로 배포 커밋을 추정하지 않는다.
- 원본 bytes·그룹별 시각·해시는 `docs/openapi/metadata.json`, 기준 커밋과 구조적 차이는 `contract-changes.json`에 보존한다.

## 확인한 계약

- `AdminReservationController`: 관리자 예약 목록·상세 GET만 유지하고 confirm/reject POST는 제거됐다.
- `MerchantReservationController`: 상태·장소·예약 시작 기간·페이지 필터, 상세·이력 GET, 상점주 confirm/reject 및 기존 cancel을 제공한다.
- 승인 요청 본문은 선택이며 빈 사유는 본문 없이 전송한다. 본문이 있으면 `ReservationReviewRequest`의 공백 금지·500자 제한을 적용한다. 반려는 본문과 공백 아닌 사유가 필수다.
- 현재 장소 소유자 검사는 서버 책임이다. `reviewedBy`와 `changedBy`만으로 처리자의 역할이나 현재 소유자를 추정하지 않는다.
- `ReservationService.toAdminResponse`는 현재 장소 소유권으로 `merchantOwnerUserId`를 조회한다. 따라서 화면의 '현재 상점주'와 예약에 기록된 처리자는 구분한다.
- `confirmation = null`은 취소 불가나 무료 결제라는 뜻이 아니다. 과거 예약의 취소 조건 불명 상태를 유지한다.
- 원본 App/Common의 추가 operation도 비교 보고서에 기록했지만, 웹과 무관한 신규 기능까지 구현 완료로 표시하지 않는다.

## 웹 반영과 자동 방어선

- 관리자 승인·반려 API 함수·hook action·화면·확인창을 제거하고 기존 `/reservations/review` 링크를 조회 전용으로 유지한다.
- 현재 상점주와 당시 처리자·시각·사유·상태 변경 이력을 구분한다. 과거 이력의 사유와 처리자 ID는 보존한다.
- 관리자 대기 업무에서 예약을 제외한다. 나머지 11개 업무의 총계·조회 실패·이전 값·재시도·알림 공유 동작을 검사한다. 예약 관리 이력 바로가기는 유지한다.
- 상점주 confirm/reject 요청 경로를 각각 정적으로 식별 가능하게 해 계약 수집에서 누락되지 않도록 한다. 요청/응답 검증 동작은 유지한다.
- `reservation-role-contract.test.mjs`는 폐기 관리자 API의 재등장, 상점주 API 누락, 상세·필터·선택 승인 본문 계약을 검사한다.
- 공유 합성 adapter도 관리자 예약 mutation을 handler 실행 전에 거부한다. 실제 운영 예약을 생성·승인·반려·취소하며 검사하지 않는다.
- 최신 스냅샷에 포함된 상점주 상세는 과거 문서 누락 예외에서 제외한다. 현재 문서와 소스로 제거가 확인된 관리자 POST는 `removed`로 기록한다.

## 재현 명령

```bash
node scripts/refresh-openapi-snapshots.mjs --refresh --baseline bd4fe35 --server-ref fada91615237a7d6093afd30b68c5cbe643b6bac --issue '#318'
python3 scripts/refresh-api-contract-matrix.py
npm run check:api-matrix
npm run check:api-contracts
node --test --test-reporter=dot tests/*.test.mjs
node scripts/run-browser-regressions.mjs
npm run lint
npm run build
```

refresh 명령은 미래 시점의 원본을 다시 수집한다. 현재 기록의 구조적 diff/해시 재현은 고정 baseline과 저장된 원본으로 수행한다.

## 이번 작업 트리의 검증 결과

- 전체 단위/컴포넌트 검사 통과. 예약 역할 계약·API 수집·관리자 문맥·대시보드 11개 업무 및 배포 mock 회귀를 포함한다.
- 릴리스 브라우저 23개 묶음 통과. 관리자 조회 복귀, 상점주 필터·상세·승인/반려, 브랜드 0/1/복수·명시 선택·초안 보존·조회 오류 복구·로고 실패와 기존 메뉴/장소 기능을 합성 데이터로 검사했다.
- 최초 브랜드 검사에서 재시도 버튼이 바깥 label의 설명 전체를 접근성 이름으로 받는 문제를 발견해 group 구조로 수정했다. 수정 후 단독 검사와 전체 묶음이 통과했다.
- 최초 전체 단위 검사에서 과거 12개 대기 업무를 기대하던 검사 하나가 실패했다. 예약 요청이 없고 11개 업무를 집계하는 것으로 갱신한 뒤 전체 재실행이 통과했다.
- `check:api-matrix` 재생성 일치, `check:api-contracts` 네 그룹의 원격 비교 `compatible`, lint·타입 검사 포함 build·`git diff --check` 통과.
- 기본 회귀의 외부 폰트 CSS는 격리한다. 실제 외부 폰트 픽셀 비교나 모든 스크린리더 조합을 보증하지 않는다.

## 배포와 미수행 경계

- 기존 운영 웹 배포 커밋 `16022ff601f7ce81b78412701e1e3a3b3d197644`의 [Actions 실행](https://github.com/Type-Nu11/pingdom-admin/actions/runs/39365559003)은 Docker 인증·이미지 push·EC2 교체 단계가 성공했다. 본 작업의 새 커밋이 배포됐다는 증거는 아니다.
- `2026-10-20T14:04:09.036Z` 비로그인 공개 GET: `/console/login` HTML 200, 해당 JS 자산 200, `/consulting/` HTML 200, `/api/users/me` JSON 401.
- 실제 관리자·상점주 로그인, 핑차 경유, 소유권 이전·권한 변경을 포함한 실환경 조회는 미수행이다. 합성 회귀는 해당 검증을 대체하지 않는다.
- 후속 브랜치의 원격 CI, develop/release 병합, 새 웹 배포, 인증된 읽기 QA는 아직 남아 있다. #318을 전체 배포 완료로 종료하지 않는다.
- 정적 계약표에는 예약 이관과 무관한 기존 미구현·대체 경로 및 문서 누락 근거가 남아 있다. 실제 업무 검증 없이 일괄 `implemented`로 변경하지 않는다.
