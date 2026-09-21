import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import styled from 'styled-components'
import { adminColors } from '../../styles/theme'
import type { MapHandle, MapProps } from './map.types'
import { loadNaverMaps, subscribeNaverAuthFailure, hasNaverAuthFailure } from './loadNaverMaps'
import { createNaverMapController, type NaverMapController } from './naverMapController'

interface Props extends MapProps { clientId?: string }

const NaverMap = forwardRef<MapHandle, Props>(function NaverMap(props, ref) {
  const { className, clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID ?? '' } = props
  const canvas = useRef<HTMLDivElement>(null)
  const controller = useRef<NaverMapController | null>(null)
  const latest = useRef(props)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState('네이버 지도를 불러오는 중입니다.')
  const [error, setError] = useState(false)
  useEffect(() => {
    latest.current = props
    controller.current?.update(props)
  }, [props])
  useImperativeHandle(ref, () => ({
    zoomIn: () => controller.current?.handle.zoomIn(),
    zoomOut: () => controller.current?.handle.zoomOut(),
    relayout: () => controller.current?.handle.relayout(),
    moveTo: (...args) => controller.current?.handle.moveTo(...args),
    fitToMarkers: () => controller.current?.handle.fitToMarkers(),
  }), [])
  useEffect(() => {
    let mounted = true
    const fail = (message: string) => {
      if (!mounted) return
      controller.current?.destroy()
      controller.current = null
      setError(true)
      setStatus(message)
    }
    const unsubscribe = subscribeNaverAuthFailure(fail)
    const delay = window.setTimeout(() => {
      if (mounted) setStatus('지도 로딩이 지연되고 있습니다. 잠시 기다려주세요.')
    }, 3000)
    void loadNaverMaps(clientId).then(maps => {
      if (!mounted || !canvas.current || hasNaverAuthFailure()) return
      const next = createNaverMapController(maps, canvas.current, {
        onMarkerClick: id => latest.current.onMarkerClick?.(id),
        onMapClick: coordinate => latest.current.onMapClick?.(coordinate),
      })
      controller.current = next
      next.update(latest.current)
      setStatus('')
      setError(false)
      latest.current.onMapReady?.()
    }).catch(reason => fail(reason instanceof Error ? reason.message : '네이버 지도를 불러오지 못했습니다.'))
      .finally(() => window.clearTimeout(delay))
    return () => {
      mounted = false
      window.clearTimeout(delay)
      unsubscribe()
      controller.current?.destroy()
      controller.current = null
    }
  }, [clientId, attempt])
  return <Frame className={className}>
    <Canvas ref={canvas} aria-label="네이버 지도" />
    {status ? <Message role={error ? 'alert' : 'status'}>
      {status}
      {error ? <button type="button" onClick={() => {
        setError(false)
        setStatus('네이버 지도를 불러오는 중입니다.')
        setAttempt(value => value + 1)
      }}>지도 다시 불러오기</button> : null}
    </Message> : null}
  </Frame>
})

const Frame = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 360px;
  max-width: 100%;
  .pingdom-map-marker:focus-visible {
    outline: 3px solid ${adminColors.primary};
    outline-offset: 3px;
    border-radius: 6px;
  }
`
const Canvas = styled.div`
  width: 100%;
  height: 100%;
  min-height: inherit;
  border: 1px solid ${adminColors.border};
  border-radius: 8px;
  overflow: hidden;
  background: ${adminColors.surfaceLow};
`
const Message = styled.div`
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  z-index: 100;
  padding: 16px;
  border-radius: 8px;
  background: ${adminColors.softOverlay};
  color: ${adminColors.text};
  button { display: block; margin-top: 8px; padding: 8px 12px; cursor: pointer; }
`
export default NaverMap
