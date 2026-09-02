import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const REFRESH_TOKEN_COOKIE_PREFIX = 'PINGDOM_REFRESH_TOKEN='

function rewriteDevelopmentCookie(cookie: string) {
  if (!cookie.trimStart().startsWith(REFRESH_TOKEN_COOKIE_PREFIX)) {
    return cookie
  }

  return cookie
    .replace(/;\s*Secure(?=;|$)/gi, '')
    .replace(/;\s*Domain=[^;]+/gi, '')
    .replace(/;\s*Path=\/auth(?=;|$)/i, '; Path=/api/auth')
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    build: {
      sourcemap: false,
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyResponse) => {
              const setCookies = proxyResponse.headers['set-cookie']

              if (!setCookies) {
                return
              }

              // 개발 프록시 응답만 localhost용으로 바꾸며 운영 Cookie 정책은 유지합니다.
              proxyResponse.headers['set-cookie'] = setCookies.map(
                rewriteDevelopmentCookie
              )
            })
          },
        },
      },
    },
  }
})
