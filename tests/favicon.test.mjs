import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'

test('site favicon uses the square PingDom mark without external resources', () => {
  const dom = new JSDOM(readFileSync('public/favicon.svg', 'utf8'), { contentType: 'image/svg+xml' })
  try {
    const document = dom.window.document
    assert.equal(document.documentElement.getAttribute('viewBox'), '0 0 1024 1024')
    assert.equal(document.querySelector('rect').getAttribute('fill'), '#FF1956')
    assert.equal(document.querySelector('path').getAttribute('fill'), 'white')
    assert.equal(document.querySelectorAll('script, foreignObject, image, use, [href], [xlink\\:href]').length, 0)
  } finally {
    dom.window.close()
  }
})
