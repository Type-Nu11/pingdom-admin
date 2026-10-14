import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [dockerfile, ignored, compose, nginx, security, vercel] = await Promise.all([
  read('Dockerfile'), read('.dockerignore'), read('compose.yml'), read('deploy/nginx/default.conf.template'), read('deploy/nginx/security-headers.conf'), read('vercel.json'),
])
test('EC2 ships only the built site, excludes local secrets, and avoids existing gateway ports', () => {
  assert.match(dockerfile, /FROM node:24.* AS build/)
  assert.match(dockerfile, /RUN npm ci/)
  assert.match(dockerfile, /COPY --from=build \/app\/dist \/usr\/share\/nginx\/html/)
  assert.doesNotMatch(dockerfile, /COPY \. \./)
  for (const pattern of ['.git', '.env', '.env.*', '*.local', '*.pem', '*.key', 'node_modules']) assert.ok(ignored.split('\n').includes(pattern))
  assert.match(compose, /127\.0\.0\.1:\$\{PINGDOM_WEB_PORT:-8083\}:8080/)
  assert.match(compose, /restart: unless-stopped/)
  assert.match(dockerfile, /HEALTHCHECK/)
})
test('EC2 security headers match the existing Report-Only policy without dropping Worker support', () => {
  for (const { key, value } of JSON.parse(vercel).headers[0].headers) assert.ok(security.includes(`add_header ${key} "${value}" always;`), key)
  assert.doesNotMatch(security, /add_header Content-Security-Policy "/)
})
test('API proxy does not fall back to HTML or weaken refresh cookies; only hashed assets are immutable', () => {
  const api = nginx.split('location ^~ /api/ {')[1].split('\n    }')[0]
  assert.match(api, /proxy_pass http:\/\/\$\{PINGDOM_API_UPSTREAM\}\//)
  assert.match(api, /proxy_intercept_errors off/)
  assert.doesNotMatch(api, /try_files|error_page|proxy_cookie_flags/)
  assert.match(api, /proxy_cookie_path ~\^\/auth/)
  assert.match(nginx, /location = \/index\.html \{[\s\S]*?no-store/)
  assert.match(nginx, /try_files \$uri =404/)
  assert.match(nginx, /application\/javascript mjs;/)
})
