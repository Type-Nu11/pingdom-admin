// Temporary keyword-search compatibility until #225.
import type {} from './KakaoMap'
const KAKAO_MAP_SCRIPT_ID = 'kakao-map-sdk'
let kakaoMapScriptPromise: Promise<void> | null = null
export function loadKakaoMapScript(appKey: string) {
  if (kakaoMapScriptPromise) {
    return kakaoMapScriptPromise
  }

  kakaoMapScriptPromise = new Promise<void>((resolve, reject) => {
    if (window.kakao?.maps) {
      window.kakao.maps.load(resolve)
      return
    }

    const existingScript = document.getElementById(
      KAKAO_MAP_SCRIPT_ID
    ) as HTMLScriptElement | null

    const handleLoad = () => {
      if (!window.kakao?.maps) {
        reject(new Error('카카오 지도 SDK를 찾을 수 없습니다.'))
        return
      }

      window.kakao.maps.load(resolve)
    }

    const handleError = () => {
      reject(new Error('카카오 지도 서비스 설정을 확인해주세요.'))
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = KAKAO_MAP_SCRIPT_ID
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`
    script.async = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })

    document.head.appendChild(script)
  })

  kakaoMapScriptPromise = kakaoMapScriptPromise.catch((error) => {
    kakaoMapScriptPromise = null
    throw error
  })

  return kakaoMapScriptPromise
}
