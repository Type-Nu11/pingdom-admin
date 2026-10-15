# 인증 저장 및 브라우저 보안 정책 (#161)

## 결정

2026-10-15: 액세스 토큰과 사용자 프로필을 **탭별 메모리로 전환**한다. localStorage/sessionStorage/IndexedDB, 탭 간 메시지에 인증 정보를 복제하지 않는다. 2026-09-16의 잠정 localStorage 유지 결정을 대체한다. 클라이언트 암호화로 대체하지 않는다.

현재 변경은 웹 세션 저장·복구·탭 동기화에 한정한다. 기존 Spring 인증 API와 서버 권한 검사를 유지하며, 새 인증 사업자나 서버를 도입하지 않는다. CSP 강제 전환은 별도 작업이다. XSS 발생·정보 유출·권한 우회가 확인되었다는 결론이 아니다.

## 확인 근거와 한계

- 웹 기준: develop `063e838` 이후 메모리 세션 변경.
- 서버 develop 기준: `b982b49fa5070df204f2c9a224d02a6bd057d56f`. AuthServiceImpl의 refresh 회전·재사용 거부, UsersController의 `/users/me`, MyPageResponse의 `role`을 확인했다.
- 배포 Swagger `/v3/api-docs/app`의 MyPageResponse.role과 `/v3/api-docs/common`의 refresh accessToken 응답을 확인했다. merchant 그룹만 보고 공통 인증·프로필 API의 부재를 판단하지 않는다.
- 운영 웹은 `https://www.typenull.xyz/console/login`, API는 동일 출처 `/api`. 비인증 응답에서 Report-Only/nosniff/SAMEORIGIN/Referrer-Policy를 관측했다. HSTS는 관측되지 않았다. 실제 인증 Set-Cookie 속성·운영 환경변수는 별도 확인이 필요하다.
- 실제 토큰, 쿠키 값, 사용자 개인정보는 문서·테스트에 수집하지 않는다.

## 현재 인증 계약

| 항목 | 현재 동작 |
| --- | --- |
| 액세스 토큰 | `authStorage.ts`는 호환 이름이며 실제 저장은 모듈 메모리만 사용 |
| 사용자 정보 | 전체 프로필은 메모리만 사용. 기존 민감 키·스냅샷·refreshToken은 시작/로그인/로그아웃 시 두 Web Storage에서 제거. 테마 등 무관한 키는 보존 |
| 갱신 토큰 | 서버 HttpOnly 쿠키만 사용. JavaScript로 읽거나 복제하지 않음 |
| 쿠키 | 서버가 HttpOnly 강제, Path=/auth, Secure 기본 true, SameSite 기본 Lax(Strict/Lax만 허용), Domain 기본 미지정 |
| 수명 | 액세스·갱신 각각 서버 환경변수로 지정. 실제 초 단위 값 미확인. 쿠키 Max-Age는 갱신 토큰 수명 사용 |
| API | 로그인 `/auth/admin/login`, `/auth/login`; 갱신 `/auth/token/refresh`; 로그아웃 `/auth/logout` |
| 요청 | Axios withCredentials=true, 일반 API는 Bearer 토큰, 인증 API는 Bearer 첨부 제외 |
| 새로고침 | AuthProvider가 보호 UI를 대기시킴 → 쿠키 refresh → Bearer `/users/me` → ID/허용 역할/토큰 subject 확인 → 메모리 세션 확정 |
| 갱신 응답 | 웹 타입은 accessToken만 수신. 현재 사용자 ID와 JWT subject 일치를 확인한 뒤 기존 사용자 정보를 유지 |
| 멀티탭 | localStorage에는 랜덤 제어 ID와 blocked boolean만 저장. 이벤트는 무효화 신호일 뿐 인증 근거가 아님. 로그인/refresh/로그아웃은 동일 출처 Web Lock으로 직렬화 |
| 로그아웃 | 메모리를 즉시 비우고 자동 복구 차단 표식을 유지. 서버 로그아웃 실패·새로고침에도 쿠키만으로 재로그인하지 않음. 성공한 명시적 로그인만 차단 해제 |
| 복구 실패 | 401/403은 게스트·재로그인 안내. 네트워크/5xx/잘못된 프로필은 보호 화면을 열지 않고 재시도·직접 로그인 제공 |
| 개발 프록시 | Vite에서 갱신 쿠키 Secure/Domain 제거, Path=/api/auth로 변경. 개발 편의 설정이며 운영 권장 정책 아님 |

서버 SecurityConfig에서 CSRF 기능은 비활성화되어 있다. 이것만으로 CSRF 취약점을 확정하지 않는다. 쿠키 인증 경로의 Origin/Referer 검사, SameSite, CORS, 메서드 및 콘텐츠 타입 검증을 서버 담당자와 함께 확인해야 한다. CORS 자체를 CSRF 방어로 간주하지 않는다.

## 위협 모델 및 전환 조건

동일 출처에서 실행된 악성 스크립트는 저장 토큰과 개인정보를 읽거나 변조할 수 있다. HttpOnly는 갱신 쿠키의 직접 읽기를 막지만, XSS가 사용자의 세션으로 요청을 보내는 것까지 막지는 않는다. 메모리 저장은 디스크 잔존을 줄일 뿐 XSS 전체를 해결하지 않는다. 프론트 역할 가드는 UX일 뿐 서버 권한 검증의 대체가 아니다.

구현 안전장치:

1. 기존 accessToken/user 개별 키뿐 아니라 authState 스냅샷도 삭제한다. 기존 값을 인증 근거로 마이그레이션하지 않는다.
2. 초기 복구와 명시적 로그인 후 서버 프로필로 역할을 확인한다. JWT 해독은 사용자 혼용 방지용 비교일 뿐 서명·권한 검사의 대체가 아니다.
3. 같은 탭의 동시 401은 한 번만 갱신하고 재시도는 1회로 제한한다. 일반 토큰 갱신은 화면을 재마운트하지 않는다.
4. 계정 변경은 요청의 세션 ID와 개인 화면 상태를 무효화한다. 복구 중 오래된 컴포넌트의 요청을 취소하며, 이전 계정의 쓰기를 새 계정 토큰으로 재시도하지 않는다.
5. Web Locks 미지원/비보안 origin, 차단된 localStorage에서는 자동 갱신이나 안전하지 않은 잠금 폴백을 시도하지 않는다. 최신 HTTPS 브라우저·사이트 저장소 허용을 안내한다. 잠금 대기는 15초 후 재시도 가능 오류로 끝낸다.
6. 탭 간 이벤트의 payload는 신뢰하지 않고 현재 제어 레코드를 다시 읽는다. 정상 갱신에는 이벤트로 토큰을 전달하지 않는다.
7. 재로그인 복귀용 sessionStorage에는 기존의 제한된 작업 경로·대상 ID·동일 계정 확인용 ID/역할·종료 이유만 유지한다. 토큰, 전체 프로필, 자유 검색어, 작성 중 폼은 저장하지 않는다. 운영 식별 메타데이터까지 전혀 저장하지 않는 정책은 아니다.

남은 실환경 확인: 실제 TTL/쿠키 Path/Domain/Secure/SameSite, 쿠키 경로 CSRF 정책, 서버 로그아웃 및 다른 클라이언트와의 경쟁. Web Locks는 이 웹의 동일 출처 탭끼리만 보호하며 다른 앱이 같은 쿠키를 독립적으로 변경하는 것까지 막지 않는다. 기존 배포 페이지를 계속 켜 둔 구버전 탭은 업데이트 후 다시 로그인해야 한다.

## 배포 헤더와 외부 리소스

`vercel.json`은 헤더만 추가하며 기존 라우팅·빌드·API 프록시를 재정의하지 않는다. Vite dev/preview가 이를 자동 적용하지 않는다. Vercel 외 호스팅은 해당 프록시에서 별도로 설정해야 한다.

- nosniff: MIME 추측 방지. 배포 시 JS/CSS/PDF worker MIME도 확인한다.
- SAMEORIGIN: 외부 사이트 iframe 삽입 제한. 앱 내부에서 여는 지도·첨부와는 별개이며, 외부 임베딩 요구가 있다면 배포 전 재검토한다.
- strict-origin-when-cross-origin: 외부로 경로·쿼리 referrer 전달 제한. 지도 SDK의 출처 인증은 실환경에서 확인한다.
- CSP는 **Report-Only**이며 리소스를 차단하지 않는다. 위반은 브라우저 콘솔/이벤트로 관찰한다. 보고 수집 서버가 없으므로 report-uri/report-to를 만들지 않으며 중앙 수집이 된다고 주장하지 않는다.

관찰 정책의 후보 출처:

| 리소스 | 코드 근거 및 고려사항 |
| --- | --- |
| NAVER 지도 | `loadNaverMaps.ts`의 GL SDK·인증. #237에서 브라우저 geocoder/JSONP 호출을 제거하고 인증된 서버 주소 검색으로 전환했다. 기존 Report-Only CSP의 NAVER 허용 출처는 이번에 변경하지 않았으며, 운영 GL 리소스·Worker 출처 감사 후 정리한다. 카카오/다음 출처는 #226에서 제거 |
| 폰트/CSS | index.html의 Google Fonts, fonts.gstatic.com, jsDelivr Pretendard |
| 스타일 | styled-components와 inline style 사용으로 style-src에 unsafe-inline 유지. script-src에는 unsafe-inline/unsafe-eval 미허용 후보 |
| 이미지/미디어 | 사용자가 입력한 공개 HTTPS URL, API/S3 이미지, data/blob 미리보기. 따라서 img/media의 https: 허용은 의도적이며 엄격한 출처 제한 완료가 아님 |
| API/업로드 | 동일 출처 프록시, typenull API, S3 presigned 업로드. 다른 환경 API·버킷은 관찰 위반 가능 |
| PDF | 로컬 pdfjs worker 및 blob URL. object-src none은 플러그인형 임베딩 차단 후보, 현재 미리보기는 canvas 렌더링 |

관찰 정책은 완성된 allowlist가 아니다. 아직 확인하지 않은 지도 하위 리소스, 다른 API origin, 외부 이미지 fetch는 위반으로 나타날 수 있다. 검증 없이 헤더 이름을 강제 CSP로 바꾸지 않는다. Vercel preview 도구나 확장 프로그램에서 발생한 위반도 앱 위반과 분리한다.

## 검증 및 배포 확인

- 이번 로컬 검증: `npm test` 794개 통과, `npm run build`, `npm run lint`, `git diff --check` 통과.
- 독립된 두 모듈 메모리와 공유 잠금으로 콜드 스타트·StrictMode·동시 복구·계정 전환·실패한 로그아웃·지연 응답·잘못된 프로필/역할·저장소 거부·잠금 미지원 회귀를 확인했다.
- `node tests/browser/memory-auth-server.mjs` → `http://127.0.0.1:5198/console/login`에서 합성 HTTP API와 회전하는 HttpOnly 쿠키로 실제 브라우저 검증. admin-a / merchant-b와 임의의 합성 비밀번호만 사용하며 실서버 프록시·환경파일을 읽지 않는다. 로그인/새로고침/두 탭 복구/관리자→상점주 변경/503→재시도/로그아웃 503 후 두 탭 새로고침을 확인했다. 민감 저장 키 0개와 JavaScript 쿠키 읽기 불가를 확인했다.
- 위 검증은 기존 저장소 전체의 모든 스토리지 키에 운영 식별 정보가 전혀 없다는 증명이 아니다. 복귀 메타데이터의 보존 범위는 위 계약을 따른다.
- `tests/security-headers.test.mjs`: 실제 Chromium HTTP 응답에 설정 헤더를 붙여 Report-Only 위반 관찰 및 스크립트 비차단을 확인한다. 이는 Vercel 배포 성공 검증이 아니다.
- 배포 후 각 도메인의 `/login`, 관리자/상점주 deep link, JS/CSS/worker 응답 헤더·MIME를 확인한다. 중복 강제 CSP나 상위 프록시 덮어쓰기 여부를 확인한다.
- 실제 계정의 로그인·새로고침·갱신·로그아웃·멀티탭과 지도·S3 업로드·이미지·PDF·다운로드를 검증한다. Safari/Firefox 및 cross-site 쿠키 제약도 포함한다.
- Report-Only 위반의 출처/종류만 기록하고 인증 URL 쿼리, presigned 서명, 개인정보, 토큰은 저장하지 않는다. 중앙 수집은 별도 개인정보·보존 정책 결정 후 도입한다.
- 헤더와 인증 변경은 별도로 롤백한다. 메모리 전환에서 삭제한 구형 토큰을 복원하지 않으며, 구버전으로 롤백할 경우 재로그인이 필요할 수 있다.

미수행: 이번 인증 변경의 실제 운영 계정 로그인·쿠키 실측, 운영 배포, 전체 외부 SDK 실환경 검증. 합성 테스트 통과는 운영 검증 완료나 XSS 차단 완료를 의미하지 않는다.

## 참고

- https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only
- https://www.w3.org/TR/web-locks/
- https://vercel.com/docs/project-configuration
