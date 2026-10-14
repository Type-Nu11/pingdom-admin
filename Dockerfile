# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app

# 의존성 설치 레이어를 소스 변경과 분리하고 lockfile 기준으로 빌드합니다.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# macOS에서 SCP한 한글 파일명(NFD)을 Linux의 소스 경로(NFC)와 맞춥니다.
RUN node scripts/normalize-build-paths.mjs
ARG VITE_PUBLIC_API_BASE_URL
ARG VITE_KAKAO_MAP_APP_KEY=""
ENV VITE_PUBLIC_API_BASE_URL=${VITE_PUBLIC_API_BASE_URL} \
    VITE_KAKAO_MAP_APP_KEY=${VITE_KAKAO_MAP_APP_KEY} \
    NODE_OPTIONS=--max-old-space-size=1024
# Vite 환경변수는 이미지 실행 시점이 아니라 빌드 시 정적 번들에 반영됩니다.
RUN node -e 'const u = new URL(process.env.VITE_PUBLIC_API_BASE_URL); if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash) throw new Error("VITE_PUBLIC_API_BASE_URL must be an HTTPS URL without credentials, query, or fragment")' \
    && npm run build

FROM nginx:stable-alpine AS runtime
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
