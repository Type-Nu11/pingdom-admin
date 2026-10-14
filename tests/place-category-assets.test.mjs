import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { after, test } from 'node:test'
import { build, createServer } from 'vite'

const root = new URL('../', import.meta.url)
const categories = [
  ['RESTAURANT', '음식점', 'restaurant'], ['MUSIC', '음악', 'music'],
  ['POP_UP', '팝업', 'popup'], ['FASHION', '패션', 'fashion'],
  ['BEAUTY', '뷰티', 'beauty'], ['EXHIBITION', '전시', 'exhibition'],
  ['CAFE', '카페', 'cafe'], ['CULTURAL_HERITAGE', '문화재', 'cultural-heritage'],
  ['OTHER', '기타', 'other'],
]
const server = await createServer({ server: { middlewareMode: true, ws: false }, build: { assetsInlineLimit: 0 }, appType: 'custom' })
const category = await server.ssrLoadModule('/src/utils/placeCategory.ts')
after(() => server.close())

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map(entry => {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
    return entry.isDirectory() ? filesIn(path) : path
  }))).flat()
}

test('all source and public image filenames are ASCII, independent of Unicode normalization', async () => {
  const files = [...await filesIn(new URL('src/', root)), ...await filesIn(new URL('public/', root))]
    .filter(path => /\.(svg|png|jpe?g|gif|webp|avif|ico)$/i.test(path.pathname))
  assert.equal(files.length, categories.length * 2 + 2)
  for (const path of files) assert.match(decodeURIComponent(path.pathname), /^[\x20-\x7e]+$/, path.href)
})

test('all category and list icons resolve to existing assets without changing Korean labels', async () => {
  for (const [key, label, filename] of categories) {
    for (const source of [{ category: key }, { categoryName: label }]) {
      assert.equal(category.getPlaceCategoryLabel(source), label)
      for (const [getter, folder, suffix] of [
        ['getPlaceCategoryMarkerImageUrl', 'category', ''],
        ['getPlaceCategoryListIconImageUrl', 'icon', ''],
      ]) {
        const asset = `src/assets/placeMarkers/${folder}/${filename}${suffix}.svg`
        assert.equal(category[getter](source), `/${asset}`)
        assert.match(await readFile(new URL(asset, root), 'utf8'), /<svg\b/)
      }
    }
  }
  assert.equal(category.getPlaceCategoryMarkerImageUrl({ category: 'UNKNOWN' }), category.getPlaceCategoryMarkerImageUrl({ category: 'OTHER' }))
})

test('production build bundles all 18 SVGs under the deployment base instead of leaving source URLs', async () => {
  const result = await build({
    root: fileURLToPath(root), base: '/operator/', logLevel: 'silent',
    build: { write: false, assetsInlineLimit: 0 },
  })
  const output = result.output
  const svgAssets = output.filter(item => item.type === 'asset' && item.fileName.endsWith('.svg'))
  assert.equal(svgAssets.length, 18)
  const scripts = output.filter(item => item.type === 'chunk').map(item => item.code).join('\n')
  assert.doesNotMatch(scripts, /\.\.\/assets\/placeMarkers\//)
  for (const asset of svgAssets) {
    assert.match(asset.fileName, /^assets\/[a-z-]+-[A-Za-z0-9_-]+\.svg$/)
    assert.ok(scripts.includes(`/operator/${asset.fileName}`), asset.fileName)
    assert.match(String(asset.source), /<svg\b/)
  }
})
