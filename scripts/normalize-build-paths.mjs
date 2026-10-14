import { existsSync, readdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'

// 빌드 컨테이너의 복사본만 변경합니다. 충돌이 있으면 덮어쓰지 않고 실패합니다.
function normalizeDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const original = join(directory, entry.name)
    const normalized = join(directory, entry.name.normalize('NFC'))
    if (original !== normalized) {
      if (existsSync(normalized)) {
        throw new Error(`Unicode filename collision: ${original} -> ${normalized}`)
      }
      renameSync(original, normalized)
    }
    if (entry.isDirectory()) {
      normalizeDirectory(normalized)
    }
  }
}

for (const directory of ['src/assets', 'public']) {
  if (existsSync(directory)) {
    normalizeDirectory(directory)
  }
}
