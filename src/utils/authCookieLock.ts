import { AuthSessionError } from './authSessionError'

// All cookie-mutating auth requests in this app share one origin-wide lock.
export async function withAuthCookieLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') return action()
  if (!window.navigator.locks) {
    throw new AuthSessionError('안전한 로그인에 필요한 브라우저 기능을 사용할 수 없습니다. 최신 브라우저의 HTTPS 환경에서 다시 시도해주세요.')
  }
  try {
    localStorage.setItem('pingdom-auth-storage-probe', '1')
    localStorage.removeItem('pingdom-auth-storage-probe')
  } catch {
    throw new AuthSessionError('브라우저 저장소가 차단되어 로그인 상태를 안전하게 동기화할 수 없습니다. 사이트 저장소를 허용한 뒤 다시 시도해주세요.')
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    return await window.navigator.locks.request('pingdom-auth-cookie', { signal: controller.signal }, async () => {
      clearTimeout(timer)
      return action()
    })
  } catch (error) {
    if (controller.signal.aborted) throw new AuthSessionError('다른 창에서 로그인 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.')
    throw error
  } finally { clearTimeout(timer) }
}
