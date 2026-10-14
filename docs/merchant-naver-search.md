# 신규 장소 등록 업체명 검색 (#225)

## 계약 및 범위

- GET /users/me/merchant-place-applications/naver-place-search?query=...
- 검색어 공백 제거 후 1~100자, 응답 items 최대 5개. 각 항목은 name, roadAddress, jibunAddress, latitude, longitude.
- 2026-09-21 임시 서버 Merchant OpenAPI, 서버 PR #1695 및 현재 Controller/DTO/Service/ApiAuthorizationRules 대조. 승인 전 로그인 사용자도 접근하는 경로이며 활성 상점주 역할로 프론트에서 제한하지 않는다.
- 서버 Local Search 설정이 비활성/미설정이면 NAVER_PLACE_SEARCH_UNAVAILABLE, 외부 호출 실패는 NAVER_PLACE_SEARCH_FAILED. 클라이언트 인증정보는 서버에서만 관리한다.
- 기존 장소 운영 신청의 DB 검색과 무관하다. 검색 결과 선택만으로 장소/신청을 생성하지 않는다.
- 카테고리와 우편번호, 네이버 장소 ID를 추정하지 않는다. 이름은 React 일반 텍스트로 표시하며 카테고리는 기존 선택 유지, 우편번호는 #224 주소 검색 또는 수동 보완.
- 카카오 검색 호출·SDK 로딩은 등록 화면에서 제거했다. 미사용 컴포넌트/로더·환경 안내·출처 정책 삭제는 #226 범위다.

## 동작 검증

- API 단위 테스트: 공백/길이, query·AbortSignal 전달, 최대 5개, 0건/응답 오류 구분, 좌표 범위, 오류 메시지.
- 실제 화면 + 합성 API/지도 SDK: 승인 전 USER, PC 1280px/모바일 390px 검색·선택·수동 보완, 403/503/0건에도 입력 유지, Enter 중복 차단, 늦은 응답 무시 및 직접 입력 전환, 지도/주소 입력 회귀.
- npm test, npm run lint, npm run build, npm run test:merchant-naver-map-browser.

실제 인증된 서버 검색, 외부 네이버 응답, 운영 환경 설정 및 신청·승인 전체 QA는 이번 합성 검증에 포함하지 않는다. #220·#221에서 별도로 추적한다.
