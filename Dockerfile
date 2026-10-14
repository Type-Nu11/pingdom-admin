# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig*.json vite.config.ts index.html ./
COPY build ./build
COPY src ./src
COPY public ./public
ARG VITE_PUBLIC_API_BASE_URL=/api
ARG VITE_APP_BASE_PATH=/
ARG VITE_NAVER_MAP_CLIENT_ID
ENV VITE_PUBLIC_API_BASE_URL=${VITE_PUBLIC_API_BASE_URL} \
    VITE_APP_BASE_PATH=${VITE_APP_BASE_PATH} \
    VITE_NAVER_MAP_CLIENT_ID=${VITE_NAVER_MAP_CLIENT_ID}
# These values are deliberately public. Secrets must never be passed as VITE_*.
RUN node -e "if (process.env.VITE_PUBLIC_API_BASE_URL !== '/api') throw new Error('EC2 image requires same-origin /api'); if (!/^[A-Za-z0-9_-]+$/.test(process.env.VITE_NAVER_MAP_CLIENT_ID || '')) throw new Error('Public NAVER Maps Client ID is required')" \
    && npm run build

FROM nginx:stable-alpine AS runtime
ENV PINGDOM_API_UPSTREAM=host.docker.internal:8081 \
    NGINX_ENVSUBST_FILTER=^PINGDOM_API_UPSTREAM$
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
