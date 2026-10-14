import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { reviewReasons, reviewImages } = await server.ssrLoadModule('/src/utils/reviewPresentation.ts')
after(() => server.close())
test('new reasons are translated, deduplicated and authoritative', () => {
  assert.deepEqual(reviewReasons({ recommendReasons: ['FRIENDLY', 'FRIENDLY', 'CLEAN', 'UNKNOWN'], recommendReason: 'old' }), ['친절해요', '깨끗해요', '기타 추천 이유'])
  assert.deepEqual(reviewReasons({ recommendReasons: [], recommendReason: 'old' }), ['old'])
  assert.deepEqual(reviewReasons({ recommendReason: '기존 자유 입력' }), ['기존 자유 입력'])
  assert.deepEqual(reviewReasons({}), [])
})
test('new media wins and only supported http images are used', () => {
  assert.deepEqual(reviewImages({ reviewMedia: [
    { imageUrl: 'https://example.com/a', contentType: 'image/jpeg' },
    { imageUrl: 'https://example.com/a', contentType: 'image/png' },
    { imageUrl: 'javascript:alert(1)' }, { imageUrl: '/relative' },
    { imageUrl: 'https://example.com/video', contentType: 'video/mp4' },
    { imageUrl: 'https://user:password@example.com/a' },
  ], imageUrls: ['https://example.com/legacy'] }), ['https://example.com/a'])
  assert.deepEqual(reviewImages({ reviewMedia: [], imageUrls: ['https://example.com/legacy'] }), ['https://example.com/legacy'])
  assert.deepEqual(reviewImages({ imageUrls: ['https://example.com/legacy', 'https://example.com/legacy'] }), ['https://example.com/legacy'])
  assert.deepEqual(reviewImages({}), [])
})

for (const empty of [undefined, null, []]) {
  test(`legacy fields survive ${JSON.stringify(empty)} new collections`, () => {
    assert.deepEqual(reviewReasons({ recommendReasons: empty, recommendReason: '기존 추천 이유' }), ['기존 추천 이유'])
    assert.deepEqual(reviewImages({ reviewMedia: empty, imageUrls: ['https://example.com/old', 'https://example.com/old', 'javascript:alert(1)'] }), ['https://example.com/old'])
    assert.deepEqual(reviewReasons({ recommendReasons: empty }), [])
    assert.deepEqual(reviewImages({ reviewMedia: empty }), [])
  })
}

test('rejected new media does not bypass validation through legacy URLs', () => {
  assert.deepEqual(reviewImages({ reviewMedia: [{ imageUrl: 'https://example.com/video', contentType: 'video/mp4' }], imageUrls: ['https://example.com/video'] }), [])
})
