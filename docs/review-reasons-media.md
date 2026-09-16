# 리뷰 추천 이유 및 사진 표시 (#217)

2026-09-16 공개 Merchant/Admin Swagger의 `MerchantPlaceReviewResponse`,
`AdminPlaceReviewDeletionRequestResponse`, `PlaceReviewMediaResponse` 확인.

- 두 화면은 ReviewReasons/ReviewPhotos를 공유한다. 요청 URL과 삭제 요청/심사 mutation은 변경하지 않는다.
- 신규 배열이 존재하면 우선한다. 빈 배열도 명시적인 결과이며 구형 데이터로 보충하지 않는다.
- 신규 필드 누락/null일 때만 recommendReason/imageUrls로 대체한다. 신규/기존 값을 합치지 않는다.
- 추천 이유는 한국어로 표시하고 중복 제거한다. 미지원 enum은 기타 추천 이유로 표시한다. 구형 자유 입력은 보존한다.
- 사진 URL은 절대 HTTP(S)만 허용하며 자격증명 포함 URL은 제외한다. 명시된 contentType이 JPEG/PNG/WebP/GIF/AVIF가 아니면 제외한다. 누락된 MIME은 구형 응답 호환을 위해 허용한다.
- 같은 URL의 사진은 한 번 표시한다. 로딩/실패 영역은 고정 비율을 유지한다. 실패한 사진은 링크를 제거한다.
- 사진 상태의 React key는 리뷰 ID와 URL을 포함한다. 다른 리뷰로 전환할 때 실패 상태를 재사용하지 않는다.

## 검증 범위

- 단위 테스트: 신규/구형 우선순위, 빈 배열, 중복, 미지원 enum, URL/MIME 제한.
- Chromium 공통 컴포넌트 fixture: 1280px/390px, 추천 이유 7개, 이미지 실패 및 리뷰 전환 복구, 가로 넘침 확인.
- 전체 테스트와 lint/build 확인. 실제 계정의 리뷰 조회 및 삭제 요청/승인/반려는 실행하지 않았다.
- 사진 브라우저 검증은 합성 PNG이며 실서버 사진 접근 권한/만료 URL은 별도 QA가 필요하다.
