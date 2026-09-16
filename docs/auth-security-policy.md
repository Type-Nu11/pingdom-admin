# 인증 저장 및 브라우저 보안 정책 (#161)

## 결정

2026-09-16: 현재 localStorage 액세스 토큰 저장은 **잠정 유지**한다. 안전한 저장이라는 뜻이 아니며, 메모리 전환의 세션 복구 및 운영 쿠키 조건이 확인될 때 다시 검토한다. sessionStorage나 클라이언트 암호화로 대체하지 않는다. 이들은 동일 출처 JavaScript가 접근 가능한 문제를 해결하지 못한다.

이번 변경은 기본 응답 헤더와 CSP 관찰 모드, 정책 및 검증을 추가한다. 인증 API, 토큰 저장 코드, 역할 판정, 서버 쿠키 정책은 변경하지 않는다. XSS 발생·정보 유출·권한 우회가 확인되었다는 결론이 아니다.

## 확인 근거와 한계

- 웹 기준: `8b4021897522c6270897f60c31267ac20d834bee`.
- 서버 develop 기준: `5a0935548219cbebf99280a56d3735518e9f82af`, `shared/security/refresh/RefreshTokenCookieService.java`, `RefreshTokenCookieProperties.java`, `shared/security/config/SecurityConfig.java`, `shared/security/jwt/JwtProperties.java`, `application.yaml`.
- 서버 설정의 허용 출처에 있는 `https://pingdom-admin.vercel.app`에 비인증 HEAD 요청: 200, HSTS 있음, CSP/Report-Only/X-Frame-Options/X-Content-Type-Options/Referrer-Policy는 관측되지 않음. 다른 경로·도메인의 정책까지 동일하다고 단정하지 않는다.
- 실제 운영 환경변수, 인증 Set-Cookie 응답, Vercel 프로젝트 설정은 확인하지 않았다. 저장소 코드의 기본값과 배포된 실제 값은 구분한다.
- 실제 토큰, 쿠키 값, 사용자 개인정보는 문서·테스트에 수집하지 않는다.

## 현재 인증 계약

| 항목 | 현재 동작 |
| --- | --- |
| 액세스 토큰 | `authStorage.ts`에서 localStorage 개별 키 및 `pingdom-auth-storage-commit`의 authState에 중복 저장 |
| 사용자 정보 | ID, 사용자명, 이메일, 출생연도, 이미지 URL, 언어, 국가, 역할 등도 저장; XSS 시 함께 노출 가능한 정보 |
| 갱신 토큰 | 신규 저장은 하지 않고 구형 `refreshToken` 키를 로그인·로그아웃·레거시 읽기에서 제거 |
| 쿠키 | 서버가 HttpOnly 강제, Path=/auth, Secure 기본 true, SameSite 기본 Lax(Strict/Lax만 허용), Domain 기본 미지정 |
| 수명 | 액세스·갱신 각각 서버 환경변수로 지정. 실제 초 단위 값 미확인. 쿠키 Max-Age는 갱신 토큰 수명 사용 |
| API | 로그인 `/auth/admin/login`, `/auth/login`; 갱신 `/auth/token/refresh`; 로그아웃 `/auth/logout` |
| 요청 | Axios withCredentials=true, 일반 API는 Bearer 토큰, 인증 API는 Bearer 첨부 제외 |
| 새로고침 | AuthProvider가 저장된 완전한 스냅샷으로 시작. 메모리만 사용하는 콜드 스타트 복구는 구현되어 있지 않음 |
| 갱신 응답 | 웹 타입은 accessToken만 수신. 현재 사용자 ID와 JWT subject 일치를 확인한 뒤 기존 사용자 정보를 유지 |
| 멀티탭 | storage 이벤트로 완전한 스냅샷을 동기화. 같은 탭의 동시 갱신은 합치지만 Map 기반으로 탭 간 요청 잠금은 아님 |
| 개발 프록시 | Vite에서 갱신 쿠키 Secure/Domain 제거, Path=/api/auth로 변경. 개발 편의 설정이며 운영 권장 정책 아님 |

서버 SecurityConfig에서 CSRF 기능은 비활성화되어 있다. 이것만으로 CSRF 취약점을 확정하지 않는다. 쿠키 인증 경로의 Origin/Referer 검사, SameSite, CORS, 메서드 및 콘텐츠 타입 검증을 서버 담당자와 함께 확인해야 한다. CORS 자체를 CSRF 방어로 간주하지 않는다.

## 위협 모델 및 전환 조건

동일 출처에서 실행된 악성 스크립트는 저장 토큰과 개인정보를 읽거나 변조할 수 있다. HttpOnly는 갱신 쿠키의 직접 읽기를 막지만, XSS가 사용자의 세션으로 요청을 보내는 것까지 막지는 않는다. 메모리 저장은 디스크 잔존을 줄일 뿐 XSS 전체를 해결하지 않는다. 프론트 역할 가드는 UX일 뿐 서버 권한 검증의 대체가 아니다.

전환 전 다음을 확인한다.

1. 배포 웹/API의 실제 origin 및 site 관계, 프록시·쿠키 Path/Domain, Secure/SameSite/만료를 확인한다. `vercel.app`와 `typenull.xyz`는 서로 다른 site이므로 직접 요청에서 Lax 쿠키가 전달된다고 가정하지 않는다. localhost 프록시 성공을 운영 성공 근거로 삼지 않는다.
2. 콜드 스타트에서 갱신 후 사용자 정보와 역할을 서버에서 복구할 수 있는 계약을 확인한다. JWT 해독만으로 권한을 새로 신뢰하거나 프로필 API 부재를 단정하지 않는다.
3. 쿠키 갱신 회전·재사용 정책을 확인하고 여러 탭의 동시 갱신·계정 전환·로그아웃 경쟁을 설계한다. 저장 키 하나만 제거하면 기존 스냅샷에 토큰이 남는 점을 포함한다.
4. 실패 유형별 복구 UX와 오프라인 처리, 모든 토큰 저장 위치의 마이그레이션·삭제 정책을 정한다.

서버 담당: 실제 TTL/쿠키 값, 갱신 회전, 사용자 복구 API, 쿠키 경로 CSRF 정책 확인. 배포 담당: 웹/API origin, 프록시 경로, CSP 관찰 및 헤더 실측 확인. 웹 담당: 이후 메모리 세션 부트스트랩·민감정보 최소화·멀티탭 재설계 및 회귀 테스트. 서버 코드 수정 필요 여부는 계약 확인 후 판단한다.

## 배포 헤더와 외부 리소스

`vercel.json`은 헤더만 추가하며 기존 라우팅·빌드·API 프록시를 재정의하지 않는다. Vite dev/preview가 이를 자동 적용하지 않는다. Vercel 외 호스팅은 해당 프록시에서 별도로 설정해야 한다.

- nosniff: MIME 추측 방지. 배포 시 JS/CSS/PDF worker MIME도 확인한다.
- SAMEORIGIN: 외부 사이트 iframe 삽입 제한. 앱 내부에서 여는 지도·첨부와는 별개이며, 외부 임베딩 요구가 있다면 배포 전 재검토한다.
- strict-origin-when-cross-origin: 외부로 경로·쿼리 referrer 전달 제한. 지도 SDK의 출처 인증은 실환경에서 확인한다.
- CSP는 **Report-Only**이며 리소스를 차단하지 않는다. 위반은 브라우저 콘솔/이벤트로 관찰한다. 보고 수집 서버가 없으므로 report-uri/report-to를 만들지 않으며 중앙 수집이 된다고 주장하지 않는다.

관찰 정책의 후보 출처:

| 리소스 | 코드 근거 및 고려사항 |
| --- | --- |
| Kakao 지도 | `KakaoMap.tsx`의 dapi.kakao.com SDK, daumcdn 지도 리소스. 동적으로 로드하는 전체 하위 출처는 실제 지도 QA로 추가 확인 |
| 폰트/CSS | index.html의 Google Fonts, fonts.gstatic.com, jsDelivr Pretendard |
| 스타일 | styled-components와 inline style 사용으로 style-src에 unsafe-inline 유지. script-src에는 unsafe-inline/unsafe-eval 미허용 후보 |
| 이미지/미디어 | 사용자가 입력한 공개 HTTPS URL, API/S3 이미지, data/blob 미리보기. 따라서 img/media의 https: 허용은 의도적이며 엄격한 출처 제한 완료가 아님 |
| API/업로드 | 동일 출처 프록시, typenull API, S3 presigned 업로드. 다른 환경 API·버킷은 관찰 위반 가능 |
| PDF | 로컬 pdfjs worker 및 blob URL. object-src none은 플러그인형 임베딩 차단 후보, 현재 미리보기는 canvas 렌더링 |

관찰 정책은 완성된 allowlist가 아니다. 아직 확인하지 않은 지도 하위 리소스, 다른 API origin, 외부 이미지 fetch는 위반으로 나타날 수 있다. 검증 없이 헤더 이름을 강제 CSP로 바꾸지 않는다. Vercel preview 도구나 확장 프로그램에서 발생한 위반도 앱 위반과 분리한다.

## 검증 및 배포 확인

- `npm test`: 기존 로그인 저장·초기 복구·갱신 실패·로그아웃·계정 전환·멀티탭·라우팅 회귀와 새 헤더 구성/브라우저 정책 테스트.
- `tests/security-headers.test.mjs`: 실제 Chromium HTTP 응답에 설정 헤더를 붙여 Report-Only 위반 관찰 및 스크립트 비차단을 확인한다. 이는 Vercel 배포 성공 검증이 아니다.
- 배포 후 각 도메인의 `/login`, 관리자/상점주 deep link, JS/CSS/worker 응답 헤더·MIME를 확인한다. 중복 강제 CSP나 상위 프록시 덮어쓰기 여부를 확인한다.
- 실제 계정의 로그인·새로고침·갱신·로그아웃·멀티탭과 지도·S3 업로드·이미지·PDF·다운로드를 검증한다. Safari/Firefox 및 cross-site 쿠키 제약도 포함한다.
- Report-Only 위반의 출처/종류만 기록하고 인증 URL 쿼리, presigned 서명, 개인정보, 토큰은 저장하지 않는다. 중앙 수집은 별도 개인정보·보존 정책 결정 후 도입한다.
- 문제가 있으면 해당 헤더만 조정/롤백한다. 인증 저장 코드는 이번에 변경하지 않았으므로 토큰 마이그레이션 롤백은 없다.

미수행: 실제 계정 로그인·쿠키 실측, 운영 배포 및 프로젝트 설정 조회, 전체 외부 SDK 실환경 검증. 관찰 헤더는 XSS 차단 완료를 의미하지 않는다.

## 참고

- https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only
- https://vercel.com/docs/project-configuration
