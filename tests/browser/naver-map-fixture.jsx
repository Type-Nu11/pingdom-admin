import React, { StrictMode, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import NaverMap from '../../src/components/map/NaverMap'
import { GlobalStyle } from '../../src/styles/globalStyle'

const markers = [
  { id: 1, latitude: 37.5665, longitude: 126.978, label: '합성 카페', category: 'CAFE', level: 0 },
  { id: 2, latitude: 37.5685, longitude: 126.983, label: '합성 음식점', category: 'RESTAURANT', level: 15 },
]
const real = new URLSearchParams(location.search).has('real')
window.mapQa = { selected: [], clicks: [], ready: 0 }
function Fixture() {
  const map = useRef(null)
  const [active, setActive] = useState(null)
  const [visible, setVisible] = useState(true)
  const [second, setSecond] = useState(true)
  const [items, setItems] = useState(markers)
  return <main style={{ padding: 16 }}>
    <h1>네이버 지도 공통 기반 검증</h1>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      <button onClick={() => map.current?.zoomIn()}>확대</button>
      <button onClick={() => map.current?.zoomOut()}>축소</button>
      <button onClick={() => map.current?.moveTo(37.5665, 126.978, { offsetX: 60 })}>중심 보정</button>
      <button onClick={() => map.current?.fitToMarkers()}>전체 마커</button>
      <button onClick={() => setItems([])}>마커 비우기</button>
      <button onClick={() => setItems(markers)}>마커 복원</button>
      <button onClick={() => setVisible(value => !value)}>주 지도 전환</button>
      <button onClick={() => setSecond(value => !value)}>보조 지도 전환</button>
    </div>
    {visible ? <section style={{ height: 420 }} aria-label="주 지도">
      <NaverMap ref={map} clientId={real ? undefined : 'synthetic-public-id'} markers={items}
        fitBoundsKey={String(items.length)} activeMarkerId={active}
        onMarkerClick={id => { setActive(id); window.mapQa.selected.push(id) }}
        onMapClick={coordinate => window.mapQa.clicks.push(coordinate)}
        onMapReady={() => window.mapQa.ready++}/>
    </section> : null}
    {second ? <section style={{ height: 360, marginTop: 16 }} aria-label="보조 지도">
      <NaverMap clientId={real ? undefined : 'synthetic-public-id'} />
    </section> : null}
  </main>
}
createRoot(document.getElementById('root')).render(<StrictMode><GlobalStyle/><Fixture/></StrictMode>)
