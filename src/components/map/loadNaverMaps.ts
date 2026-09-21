import type { NaverMaps } from './naverMaps.types'

const SCRIPT_ID = 'pingdom-naver-map-sdk'
const AUTH_ERROR = '네이버 지도 인증에 실패했습니다. Client ID와 웹 서비스 URL 등록을 확인해주세요.'
let pending: Promise<NaverMaps> | null = null
let loadedKey: string | null = null
let failed = false
let serial = 0
let rejectPending: ((error: Error) => void) | undefined
const authListeners = new Set<(message: string) => void>()
let authHandler: (() => void) | undefined

function installAuthHandler() {
  if (authHandler && window.navermap_authFailure === authHandler) return
  const previous = window.navermap_authFailure
  authHandler = () => {
    failed = true
    pending = null
    rejectPending?.(new Error(AUTH_ERROR))
    authListeners.forEach(listener => listener(AUTH_ERROR))
    previous?.()
  }
  window.navermap_authFailure = authHandler
}

export function subscribeNaverAuthFailure(listener: (message: string) => void) {
  installAuthHandler()
  authListeners.add(listener)
  return () => { authListeners.delete(listener) }
}

export function loadNaverMaps(clientId: string, timeoutMs = 15000): Promise<NaverMaps> {
  const key = clientId.trim()
  if (!key) return Promise.reject(new Error('네이버 지도 Client ID가 설정되지 않았습니다.'))
  if (loadedKey && loadedKey !== key) {
    return Promise.reject(new Error('다른 Client ID의 지도가 이미 로드되었습니다. 설정 변경 후 새로고침해주세요.'))
  }
  installAuthHandler()
  if (pending) return pending
  loadedKey = key
  const callbackName = '__pingdomNaverReady' + ++serial
  const callbacks = window as unknown as Record<string, (() => void) | undefined>
  document.getElementById(SCRIPT_ID)?.remove()
  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.async = true
  const url = new URL('https://oapi.map.naver.com/openapi/v3/maps.js')
  url.searchParams.set('ncpKeyId', key)
  url.searchParams.set('callback', callbackName)
  script.src = url.href
  const attempt = new Promise<NaverMaps>((resolve, reject) => {
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      script.onerror = null
      rejectPending = undefined
      // A timed-out SDK may still call its callback; never resolve another attempt.
      callbacks[callbackName] = () => {}
      if (error) {
        failed = true
        script.remove()
        reject(error)
      } else {
        failed = false
        resolve(window.naver!.maps)
      }
    }
    const timer = window.setTimeout(() => finish(new Error('네이버 지도 로딩 시간이 초과됐습니다. 다시 시도해주세요.')), timeoutMs)
    rejectPending = error => finish(error)
    callbacks[callbackName] = () => {
      const maps = window.naver?.maps
      finish(maps?.Map && maps?.OverlayView ? undefined : new Error('네이버 지도 SDK를 사용할 수 없습니다.'))
    }
    script.onerror = () => finish(new Error('네이버 지도를 불러오지 못했습니다. 네트워크 상태를 확인해주세요.'))
    document.head.appendChild(script)
  })
  pending = attempt
  void attempt.catch(() => {
    if (pending === attempt) pending = null
  })
  return attempt
}

export function hasNaverAuthFailure() { return failed }
