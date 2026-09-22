# 네이버 지도 전환 마무리 (#226)

## 변경 범위

- #222~#225 소비 화면 전환 이후 호출자가 없는 `KakaoMap.tsx`, `loadKakaoMaps.ts` 및 해당 전역 타입 제거.
- `.env.example`은 공개 `VITE_NAVER_MAP_CLIENT_ID`만 안내한다. 실제 환경변수 파일·운영 설정·키 폐기는 변경하지 않는다.
- `index.html`의 카카오/다음 preconnect를 네이버 SDK 출처 한 개로 교체.
- CSP는 **Report-Only**를 유지하며 SDK 및 주소 JSONP에 필요한 정확한 출처만 추가한다. 강제 CSP 도입이나 전체 네이버 도메인 허용은 하지 않는다.
- `kakaoPlaceId`, `GeocodingSource.KAKAO`, 장소 ID 보정·중복·병합 API/타입과 OpenAPI 스냅샷은 서버 데이터 계약이므로 유지한다. 과거 QA 기록도 당시 사실로 남긴다.

## 출처 근거 (2026-09-22)

- [공식 시작 문서](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html)와 현행 `loadNaverMaps.ts`: `https://oapi.map.naver.com/openapi/v3/maps.js`, `ncpKeyId`, geocoder 서브모듈.
- 공개 SDK 3.10.3 및 geocoder 1.3.1 소스 조회: SDK/인증은 `oapi.map.naver.com`, 현재 ncpKeyId용 주소·역주소 JSONP는 `maps.apigw.ntruss.com`. 따라서 둘을 script-src 및 connect-src 후보에 반영한다. 이전 ncpClientId용 출처는 추가하지 않는다.
- SDK 이미지 자산은 `ssl.pstatic.net`, `map.pstatic.net`, `nrbe.pstatic.net` 등을 참조한다. 기존 img-src의 HTTPS 허용 범위에 포함되므로 스크립트 와일드카드로 확대하지 않는다.
- SDK 코드 내 모든 URL이 현재 화면에서 실제 요청되는 것은 아니다. 다른 지도 기능·계정·버전의 출처는 실제 네트워크/CSP 위반을 확인한 후 판단한다. 현재 정책이 모든 외부 SDK 리소스를 검증한 최종 allowlist라는 의미는 아니다.

## 검증과 남은 확인

- 2026-09-22: `npm test` 384개, `npm run lint`, `npm run build`, `git diff --check` 통과. `test:naver-map-browser`, `test:admin-naver-map-browser`, `test:merchant-naver-map-browser` 모두 PC 1280px / 모바일 390px에서 통과. README 검증 보완 후 cleanup/security 테스트 5개를 재실행해 통과했다.
- 자동 검증: 소스 내 구형 SDK 참조 부재, 빈 공개 Client ID 예시, 데이터 계약 보존 및 Chromium HTTP Report-Only 환경에서 네이버 SDK/주소 JSONP 허용·구형 SDK 위반 관찰을 검증한다. CSP 테스트 외부 응답은 합성 스크립트다.
- 지도 공통·관리자·상점주 브라우저 테스트는 합성 SDK/API이며 실제 운영 데이터 변경 없이 실행한다.
- 로컬 실제 SDK: 기능/기본 워크트리 모두 개발 환경 `VITE_NAVER_MAP_CLIENT_ID` 미설정으로 인증된 지도·주소 조회 실행은 미수행. 비밀키나 이전 대화의 인증 정보를 재사용하지 않았다.
- 배포 후: 공개 Client ID 주입, `http://localhost:5173` 및 실제 프론트 도메인의 Naver 웹 서비스 URL 등록, 지도/주소 조회 성공, 네트워크 출처 및 CSP 위반을 확인한다. 미등록 Preview URL은 지원 환경으로 간주하지 않는다.
- 운영 배포, 외부 계정 설정 변경, 실서버 업체명 검색·신청/승인 흐름은 미수행이며 #220(상점주)·#221(관리자)에서 추적한다. 모의 테스트 통과를 이 항목의 통과로 체크하지 않는다.
