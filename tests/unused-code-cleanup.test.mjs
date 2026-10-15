import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { inspectSourceUsage } from './helpers/source-usage.mjs'

test('exported page styles have consumers in application code or browser QA', () => {
  const { unusedStyles } = inspectSourceUsage()
  assert.deepEqual(unusedStyles.map(({ file, name }) => `${file}::${name}`), [])
})

test('unused placeholders and superseded API wrappers do not return', () => {
  assert.equal(existsSync('src/components/common/DashboardPlaceholderCard.tsx'), false)
  for (const [file, names] of [
    ['src/api/authApi.ts', ['refreshToken']],
    ['src/api/merchantOnboardingApi.ts', ['createMerchantOwnerApplicationProfile', 'updateMerchantOwnerApplicationProfile']],
    ['src/api/merchantPlaceApplicationApi.ts', ['getMerchantPlaceApplicationAttachments']],
    ['src/utils/placeCategory.ts', ['getPlaceCategoryIconName', 'PLACE_CATEGORY_ACCENT_COLOR']],
  ]) {
    const source = readFileSync(file, 'utf8')
    for (const name of names) assert.doesNotMatch(source, new RegExp(`\\b${name}\\b`))
  }
  const client = readFileSync('src/api/customAxios.ts', 'utf8')
  assert.match(client, /async function requestTokenRefresh\(sessionId: string\)/)
  assert.match(readFileSync('src/api/authSessionApi.ts', 'utf8'), /\.post<RefreshTokenResponse>/)
  const storage = readFileSync('src/utils/authStorage.ts', 'utf8')
  assert.match(storage, /cleanupLegacyAuthStorage/)
  assert.doesNotMatch(storage, /readLegacyAuthState/)
})
