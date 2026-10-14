# 관리자 Docker 배포

관련 이슈: #285

Node 24가 Vite를 빌드하고, 최종 Nginx 컨테이너는 `dist`만 제공합니다.
Node 의존성과 환경파일은 최종 이미지에 포함되지 않습니다.
macOS에서 SCP로 복사한 한글 파일명은 Linux에서 경로가 달라질 수 있어,
이미지 빌드 중 `src/assets`와 `public`의 파일명을 NFC로 정규화합니다.
원본 파일은 유지하고, 같은 이름 충돌은 덮어쓰기 대신 빌드 실패로 처리합니다.

## 환경 설정과 실행

```bash
cp .env.docker.example .env.docker
```

`.env.docker`에서 `VITE_PUBLIC_API_BASE_URL`을 실제 운영 API의 HTTPS 주소로
변경하고, 지도에 필요한 공개 JavaScript 키를 입력합니다.
기존 `.env.example`은 개발용이며 Docker 실행은 `.env.docker`를 사용합니다.

```bash
docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker ps
curl --fail http://127.0.0.1:8082/healthz
```

공개 환경변수도 Vite 빌드에 반영되므로 API 주소나 지도 키를 변경하면
`up -d --build`로 다시 빌드해야 합니다. `VITE_*`에 비밀번호나 API Secret을 넣지 않습니다.

## SCP로 파일 보내기

Mac에서 데스크탑의 소스를 다음과 같이 복사합니다.

```bash
scp -i "$HOME/Desktop/pingdom-key.pem" -r \
  "$HOME/Desktop/pingdom-admin-release" ubuntu@54.116.166.107:~/
```

EC2에서는 `/home/ubuntu/pingdom-admin-release`로 이동하여 위 실행 명령을 사용합니다.
이 폴더에는 `node_modules`, `.env.docker`, 개인 키를 포함하지 않는 것을 권장합니다.

## 접근 경로

- 컨테이너 내부 포트는 `8080`, EC2 기본 포트는 `127.0.0.1:8082`입니다.
- 외부 프록시가 접근한다면 `ADMIN_BIND_ADDRESS=0.0.0.0`으로 설정하고,
  AWS 보안 그룹의 TCP `8082` 소스를 해당 프록시 IP로 제한합니다.
- 임시 IP 접속도 동일하게 현재 사용자 공인 IP만 허용합니다.
  `http://54.116.166.107:8082`는 화면 확인용이며 실제 관리자 로그인은 HTTPS를 사용합니다.
- 운영 도메인을 사용하려면 HTTPS 프록시와 백엔드 CORS 허용 origin,
  Refresh Token 쿠키 정책, 카카오 지도 웹 플랫폼 도메인을 함께 확인합니다.
  포트 공개만으로 API 로그인·지도 연동까지 확인된 것은 아닙니다.

## 확인

- `/healthz`가 `200 ok`를 반환하는지 확인합니다.
- 직접 연 React Router 경로가 HTML을 반환하는지 확인합니다.
- `/assets/`의 없는 파일은 `404`, 실제 JS/CSS에는 캐시 헤더가 있는지 확인합니다.
- `restart: unless-stopped`는 Docker가 기동되면 컨테이너를 다시 실행합니다.
  EC2 부팅 시 Docker 서비스도 자동 시작하도록 설정돼 있어야 합니다.
