import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { test } from 'node:test'

const root = new URL('../', import.meta.url)
async function sources(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map(entry => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
    return entry.isDirectory() ? sources(url) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [url] : []
  }))).flat()
}

test('application source has no Kakao SDK, loader or client key dependency', async () => {
  const files = await sources(new URL('src/', root))
  for (const file of files) {
    assert.doesNotMatch(file.pathname, /KakaoMap|loadKakaoMaps/)
    assert.doesNotMatch(await readFile(file, 'utf8'), /KakaoMap|loadKakaoMap|window\.kakao|VITE_KAKAO_MAP_APP_KEY|dapi\.kakao\.com|daumcdn\.net/, file.pathname)
  }
  const env = await readFile(new URL('.env.example', root), 'utf8')
  assert.match(env, /^VITE_NAVER_MAP_CLIENT_ID=$/m)
  assert.doesNotMatch(env, /^VITE_\w*(?:SECRET|KAKAO)\w*=/m)
  const html = await readFile(new URL('index.html', root), 'utf8')
  assert.match(html, /rel="preconnect" href="https:\/\/oapi\.map\.naver\.com"/)
  assert.doesNotMatch(html, /kakao|daumcdn/)
  const readme = await readFile(new URL('README.md', root), 'utf8')
  assert.doesNotMatch(readme, /VITE_KAKAO_MAP_APP_KEY|Kakao Maps/)
  assert.match(readme, /VITE_NAVER_MAP_CLIENT_ID=/)
})

test('Kakao data identifiers and geocoding provenance remain supported', async () => {
  const types = await readFile(new URL('src/types/adminPlace.types.ts', root), 'utf8')
  assert.match(types, /kakaoPlaceId\??:/)
  assert.match(types, /AdminPlaceGeocodingSource = 'KAKAO'/)
  const api = await readFile(new URL('src/api/adminPlaceApi.ts', root), 'utf8')
  assert.match(api, /kakao-place-id/)
})
