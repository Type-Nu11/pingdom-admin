# EC2 정적 웹 배포

## 범위와 선행 조건

Node 24에서 `npm ci`·`npm run build` 후 `dist`만 Nginx 이미지로 복사합니다.
운영에서 Vite 개발 서버를 띄우지 않습니다. 이 저장소는 웹 컨테이너를 준비하며,
실제 EC2 접속·DNS·TLS·HAProxy 변경은 자동 실행하지 않습니다.

배포 요구에 따라 웹 컨테이너의 기본 호스트 포트는 **127.0.0.1:8082**입니다.
컨테이너 내부 Nginx는 8080, API upstream의 기본 웹 인증 게이트웨이는 8081을 유지합니다.
현재 infra 저장소의 예시 설정에도 앱 게이트웨이 `8082:8082`가 있으므로 같은 EC2에서
이 설정을 그대로 함께 실행하면 충돌합니다. 별도 EC2/IP를 사용하거나 인프라 담당자가
기존 앱 게이트웨이 포트·바인딩을 조정해야 합니다. 이 웹 변경은 인프라 설정을 바꾸거나
실제 배포 구조를 확정하지 않습니다. 배포 전 `ss -ltn`으로 실제 점유를 확인하세요.

필수 확인:

- EC2에 Docker Engine과 Compose 플러그인, 이미지 빌드용 여유 메모리·디스크가 있어야 합니다.
- 외부 HTTPS 프록시가 웹 페이지를 이 컨테이너로 전달해야 합니다. 기존 프록시의 `/`는
  JWT 없이 401을 반환하므로 컨테이너를 시작하는 것만으로 웹 배포가 완료되지는 않습니다.
- 같은 `www.typenull.xyz`의 `/places` 등은 앱 API와 웹 화면이 겹칠 수 있습니다.
  기존 HAProxy 앱 분기·Swagger를 유지한 채 웹 요청만 연결해야 합니다. 분기 기준을
  확인하기 전 모든 트래픽을 새 웹 컨테이너로 돌리지 마세요.
- `/api/*`는 기존 **웹 인증 게이트웨이**로만 전달합니다. 원본 API 서버에 직접 연결해
  JWT 검증을 우회하지 않습니다. upstream에 같은 공개 웹 도메인을 넣으면 프록시 루프가
  생길 수 있으므로 내부 게이트웨이 주소를 사용합니다.
- 외부 TLS 프록시는 원래 Host와 `X-Forwarded-Proto: https`를 설정해야 합니다.
  다른 호스트/컨테이너의 프록시는 호스트의 127.0.0.1에 직접 접근할 수 없으므로,
  연결 네트워크·내부 주소를 먼저 합의하세요. 8082를 인터넷에 공개하는 것으로 해결하지 않습니다.

## 설정

```bash
cp deploy/ec2.env.example .env.ec2.local
```

`.env.ec2.local`에 고유 이미지 태그(릴리스 커밋 SHA), 공개 NAVER Maps Client ID,
빈 호스트 포트와 웹 게이트웨이 주소를 입력합니다. 컨테이너에서 접근 가능한
`host.docker.internal:8081`이 기본값입니다. 해당 게이트웨이가 호스트 loopback에만
묶여 있으면 이 주소로 접근할 수 없습니다. 그 경우 두 Compose 프로젝트가 공유하는
Docker 네트워크를 구성하고 `l7-reverse-proxy:8081` 같은 서비스 주소를 사용해야 합니다.

`VITE_PUBLIC_API_BASE_URL`은 이 EC2 이미지에서 `/api`로 고정됩니다.
Vite 변수는 **빌드 시** JS에 포함되므로 공개 ID를 바꾸면 다시 빌드해야 합니다.
이미지 실행 시 환경변수만 바꿔도 지도 ID가 바뀌는 구조가 아닙니다.
Client Secret·JWT 키·네이버 검색 비밀키는 이 파일이나 `VITE_*`·Docker build args에 넣지 않습니다.
`.dockerignore`는 `.env*`, `*.local`, 인증서 키, `.git`, `node_modules`를 빌드에서 제외합니다.
네이버 콘솔에는 실제 프론트 HTTPS URL을 등록해야 합니다.

## 빌드 및 실행

```bash
docker compose --env-file .env.ec2.local config --quiet
docker compose --env-file .env.ec2.local build --pull web
docker compose --env-file .env.ec2.local up -d --no-build web
docker compose --env-file .env.ec2.local ps
curl -fsS http://127.0.0.1:8082/healthz
```

Docker 서비스 자체도 부팅 시 시작되어야 `restart: unless-stopped`가 동작합니다.
`/healthz`는 **정적 웹의 생존 여부만** 확인하며, API·DB의 정상 상태를 의미하지 않습니다.
불건강 판정만으로 Docker가 자동 재시작하는 것은 아닙니다. 로그 크기는 10MB×3으로 제한합니다.

SCP로 소스를 전달할 때는 작업 폴더 전체나 `.env`를 복사하지 말고, 커밋된 소스만 전달합니다.
아래 값은 실제 릴리스와 EC2 접속 정보로 바꾸고, EC2에서 별도의 새 릴리스 디렉터리에 풉니다.

```bash
git archive --format=tar.gz --output=/tmp/pingdom-admin-release.tar.gz <release-commit>
scp /tmp/pingdom-admin-release.tar.gz <ssh-user>@<ec2-host>:/tmp/
```

EC2에서 빌드하므로 로컬 Mac/EC2의 CPU 구조가 달라도 로컬 이미지를 그대로 옮기는 문제를
피할 수 있습니다. CI에서 이미지를 빌드해 전달하는 방식으로 바꾸면 EC2 아키텍처를 명시하세요.
Node/Nginx 이미지는 주요 버전·stable 태그를 사용하므로 운영 릴리스에는 검증한 digest를
별도로 기록하는 것을 권장합니다.

## 라우팅·인증·캐시

- `/dashboard`, `/merchant/reservations/setup` 직접 접근은 `index.html`로 연결합니다.
- `/api/foo?bar=1`은 게이트웨이 `/foo?bar=1`로 전달하며 메서드·Authorization·X-Timestamp를 유지합니다.
- API의 401·403·404·503을 HTML 성공 응답으로 바꾸지 않습니다.
- 게이트웨이가 발급/만료시키는 `Path=/auth` 쿠키는 웹 프록시에서 `/api/auth`로 변경합니다.
  Secure·HttpOnly·SameSite는 제거하지 않습니다. 서버가 추후 `/api/auth`를 발급해도 이 규칙은
  중복으로 `/api/api/auth`를 만들지 않습니다. 최초 전환 시 기존 `/auth` 쿠키 정리 또는
  재로그인이 필요할 수 있으므로 실제 로그인→갱신→로그아웃을 반드시 확인하세요.
- Swagger UI와 `/v3/api-docs`는 기존 게이트웨이로 전달합니다. 기존 앱 분기 보존은 외부 프록시 책임입니다.
- HTML은 `no-store`, 내용 해시가 있는 `/assets/*`만 1년 immutable입니다.
  일반 정적 파일은 5분이며, 없는 JS/Worker/PDF CMap은 HTML 대신 404를 반환합니다.
  PDF.js의 `.mjs` Worker에는 JavaScript MIME을 명시해 모듈 로딩 실패를 방지합니다.
- `vercel.json`의 보안 헤더를 Nginx에도 적용합니다. CSP는 기존과 동일한 Report-Only이며
  NAVER SDK·Worker·PDF·외부 이미지의 실제 동작 확인 전 강제 정책으로 바꾸지 않습니다.

## 검증과 복구

Docker가 실행 중인 환경에서 다음을 실행하면 가짜 게이트웨이와 임시 네트워크만 사용합니다.
운영 API 호출·실제 승인/삭제는 하지 않고 임시 컨테이너·네트워크·테스트 이미지를 정리합니다.

```bash
npm run test:ec2-image
```

검사 범위: 이미지 빌드, `nginx -t`, health check, SPA 직접 접근, 캐시·보안 헤더,
PDF Worker MIME·CMap 제공·정적 파일 404, API 401·쿼리·메서드·헤더 전달, 쿠키 발급/만료 Path, Swagger.
이 검사는 실제 TLS·네이버 인증·EC2 보안 그룹·운영 로그인 성공을 증명하지 않습니다.

실배포 후에는 HTTPS에서 로그인→새로고침→토큰 갱신→로그아웃, 관리자/상점주 권한,
지도·마커·주소 검색, PDF/이미지 첨부 조회, 모바일 직접 URL, 기존 앱 API를 확인합니다.
실제 승인·삭제·밴·결제는 QA하지 않습니다. `/api`에 HTML이 오거나 앱 API 경로가
웹으로 바뀌면 배포 완료로 처리하지 말고 외부 프록시 분기부터 복구합니다.

교체 전 이전 이미지 태그와 Compose 설정을 기록하고 이전 이미지를 보존합니다.
문제 시 `.env.ec2.local`의 `PINGDOM_IMAGE_TAG`를 이전 태그로 되돌리고
`docker compose --env-file .env.ec2.local up -d --no-build web`으로 복구합니다.
확인 전 이미지 prune을 실행하지 않습니다. 단일 컨테이너 교체는 짧은 중단이 가능하며,
열려 있던 탭은 이전 해시 자산을 요청할 수 있습니다. 무중단 배포가 필요하면 두 웹 인스턴스와
프록시 전환·이전 자산 보존을 별도 구성해야 합니다.

## 아직 별도로 확인해야 하는 것

외부 TLS/HAProxy의 실제 배포 설정과 앱 분기 기준은 이 저장소에 없습니다.
이 파일을 추가했다고 DNS·인프라 연결·운영 검증이 완료된 것으로 간주하지 않습니다.
실제 EC2에서 확인한 결과만 #285와 관리자/상점주 전체 QA 이슈에 기록하세요.

### 2026-10-14 로컬 검증

`codex/release-readiness`, develop `497b8cb`에서 분기한 미커밋 변경 기준입니다.
로컬 Docker Desktop에서 이미지 빌드·Nginx 설정·SPA·캐시·보안 헤더·PDF Worker MIME·CMap·
API 오류/전달·쿠키 발급/만료·Swagger를 가짜 게이트웨이로 검사해 통과했습니다.
Compose 설정과 workflow YAML 구문도 확인했습니다. 임시 검사 자원은 정리했습니다.
실제 EC2·외부 프록시·TLS·운영 API 인증·원격 GitHub Actions는 미검증이며 완료 처리하지 않았습니다.
