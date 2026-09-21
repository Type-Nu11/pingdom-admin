# 네이버 공통 지도 기반 (#222)

## 범위와 후속 작업

- 기능 브랜치: `feat/naver-map-core`, 기준 develop `c94aca9`.
- `NaverMap`을 추가했으며 서비스 라우트는 아직 사용하지 않는다.
- `map.types.ts`의 MapHandle·MapMarker·MapProps는 공급자 독립 계약이다. KakaoMap의 기존 export는 호환 별칭으로 유지한다.
- #223에서 관리자 화면, #224에서 상점주 등록 지도/주소, #225에서 서버 업체명 검색을 연결한다.
- 카카오 SDK·검색·데이터 필드·배포 정책 제거는 하지 않았다. 최종 정리는 #226이다.

## 사용 계약

- NaverMap은 MapProps와 선택적 공개 `clientId`를 받는다. 기본 설정은 `VITE_NAVER_MAP_CLIENT_ID`다.
- ref: zoomIn / zoomOut / relayout / moveTo(latitude, longitude, { offsetX }) / fitToMarkers.
- offsetX가 양수이면 목표 위치를 지도 중앙보다 오른쪽에 배치한다. 기존 상세 패널 보정 의미를 유지한다.
- 준비 전에 호출한 ref 동작은 무시한다. 초기 위치 이동은 onMapReady 이후 수행한다.
- 좌표는 위도→경도 순서이며 유한값·범위를 검증한다. 0 좌표는 유효하다.
- 마커 0개는 중심을 유지, 1개는 중심 이동, 여러 개는 경계를 맞춘다.
- fitBoundsKey가 바뀌고 선택 마커가 없을 때 자동 경계 맞춤. 리사이즈 시에도 선택 중이면 임의로 전체 경계로 이동하지 않는다.
- 네이버 줌은 숫자가 클수록 확대한다. 초기 16, 허용 7~21이며 기존 마커의 카테고리·레벨별 이미지/크기와 선택 강조를 유지한다.
- OverlayView 안에 native button을 유지한다. 키보드 Enter/Space 선택과 포커스를 보존하고 마커 클릭이 지도 좌표 클릭으로 전달되지 않게 한다.
- 화면 종료 시 지도 이벤트·오버레이 DOM 핸들러·ResizeObserver·예약 프레임 및 지도를 정리한다.
- 반응형 크기는 테두리 안쪽의 독립 viewport가 소유한다. SDK가 Canvas에 픽셀 크기를 쓰더라도 부모 레이아웃에 영향을 주지 않으며, viewport 크기가 실제로 바뀐 경우에만 setSize와 자동 경계 맞춤을 수행한다. 숨김 상태의 0 크기는 적용하지 않는다.

## 로더·오류

- 공식 `ncpKeyId` 및 비동기 callback 방식 사용. 같은 Client ID의 동시 호출과 재진입은 Promise를 공유한다.
- 네트워크/SDK 오류·15초 초과 시 해당 script를 제거하고 재시도를 허용한다. 이전 시도의 callback은 새 시도를 완료시키지 않는다.
- 성공 후 발생하는 navermap_authFailure도 구독 중인 지도에 전달해 오류를 표시하고 인스턴스를 제거한다.
- 실패한 오래된 SDK가 callback을 호출해도 예외를 내지 않도록 무동작 callback을 남긴다. 인증 훅은 SDK가 재사용되는 페이지 수명 동안 유지하며 개별 컴포넌트 구독은 해제한다.
- 같은 문서에서 서로 다른 Client ID를 섞지 않는다. 설정 변경 시 새로고침 안내를 제공한다.
- SDK 준비는 실제 지도 타일의 정상 표시를 보장하는 검증이 아니다.

## 설정·보안

- .env.example에는 빈 공개 Client ID만 추가했다. Client Secret은 VITE 변수·코드·문서에 넣지 않는다.
- 로컬 실제 검증은 등록된 localhost:5173에서 공개 ID 설정 후 수행한다. 임의 포트의 모의 검증 성공은 도메인 인증 검증이 아니다.
- #222는 실제 환경 값·Naver 콘솔·Vercel 설정을 변경하지 않는다.
- 현 CSP는 Report-Only이며 네이버 출처 반영/카카오 제거는 #226에서 실제 요청을 확인해 수행한다. 강제 정책을 쓰는 환경에서는 필요한 출처를 검토하기 전 사용 가능으로 판단하지 않는다.

## 검증

- `node --test tests/naver-map.test.mjs`: 설정 누락·동시 로딩·실패/시간 초과/인증 오류·재시도·오래된 callback, 좌표·마커·포커스·줌·중심 보정·경계·정리.
- `npm run test:naver-map-browser`: React StrictMode + 2개 지도, 합성 SDK 응답으로 네트워크 실패/재시도·키보드/마커·줌·좌표 클릭·리사이즈·빈 목록·재진입·늦은 인증 오류 검증. 1280px/390px Chromium.
- 모의 검증 화면은 tests/browser/naver-map-fixture.jsx이며 제품 라우트에 추가하지 않는다. 실제 타일/외부 인증을 모의하지 않은 것처럼 보고하지 않는다.
- 두 로컬 작업 폴더에 VITE_NAVER_MAP_CLIENT_ID가 없어 실제 인증·타일 검증은 미수행. 배포 도메인·타일·CSP 요청과 전체 화면 연계 검증은 #220·#221에 연결한다.

### 2026-09-21 결과

- 전체 자동 테스트 376개 통과, TypeScript 검사·lint·build·diff 검사 통과.
- 네이버 모의 SDK 브라우저 검증: Chromium 1280px/390px 통과. 2개 지도 동시 사용·StrictMode·실패 후 재시도·포커스 보존·화면 이탈 및 재진입 확인.
- 기존 관리자 대상 선택 및 장소 상세 브라우저 회귀 검증 통과. 이 테스트는 기존 지도 fixture를 사용하며 실제 카카오/네이버 타일 검증이 아니다.
- React 점검 기준으로 최신 콜백 사용·마커 DOM 재사용·리스너/관찰자 정리를 확인했다.
- 실제 네이버 인증·타일·운영 배포는 미검증이며 상점주 신규 등록과 관리자 화면의 실제 전환은 후속 이슈에서 진행한다.

### PR #230 리사이즈 회귀 수정

- 모의 SDK의 setSize도 실제 SDK처럼 Canvas의 inline width/height를 변경하도록 강화했다. 새 브라우저 크기 검사는 수정 전 코드에서 실패하고 수정 후 통과했다.
- 1280px/390px에서 크기 안정성, 화면 너비 변경, 부모 너비·높이 변경, 숨김 후 복귀를 확인했다. 단위 테스트는 동일 크기 중복 적용 방지·0 크기 무시·파괴 후 호출 무시도 확인한다.
- 별도 격리 Chromium에서 공개 SDK 원본 코드를 로드하고 외부 인증·타일 요청을 차단해 짧은 구간의 크기 동작만 확인했다. 1280px 환경에서 1262×418 → 946×498 → 1262×418로 부모 영역과 일치했다. 390px 환경도 동일 흐름을 확인했다.
- 인증 차단 시 SDK가 이후 자체 종료하므로 위 검증은 인증 종료 전의 크기 API 확인일 뿐이다. 실제 서비스 인증 성공·지도 타일 렌더링·장시간 동작 검증을 대체하지 않는다.

## 공식 계약 참고

- https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html
- https://navermaps.github.io/maps.js.ncp/docs/naver.maps.Map.html
- https://navermaps.github.io/maps.js.ncp/docs/naver.maps.OverlayView.html
