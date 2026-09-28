import { useRef, useState } from 'react'
import NaverMap from '../components/map/NaverMap'
import type { MapHandle, MapMarker } from '../components/map/map.types'

// Separate document entry: never import this into application routes. A full
// navigation keeps this synthetic QA page separate from real place workflows.
const sampleMarkers: MapMarker[] = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1, label: `검증 장소 ${index + 1}`,
  latitude: 37.5665 + Math.floor(index / 6) * 0.001,
  longitude: 126.978 + (index % 6) * 0.001,
  category: index % 2 ? 'RESTAURANT' : 'CAFE', level: [0, 5, 10, 15, 20][index % 5],
}))

export default function NaverGlPreview() {
  const map = useRef<MapHandle>(null)
  const [markers, setMarkers] = useState(sampleMarkers.slice(0, 2))
  const [active, setActive] = useState<number | null>(null)
  const [visible, setVisible] = useState(true)
  const [second, setSecond] = useState(false)
  const [compact, setCompact] = useState(false)
  const [ready, setReady] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [click, setClick] = useState('없음')
  const changeMarkers = (count: number) => {
    setActive(null)
    setMarkers(sampleMarkers.slice(0, count))
  }
  return <main style={{ padding: 16, maxWidth: 1440, margin: 'auto' }}>
    <h1>네이버 GL 지도 검증</h1>
    <p>합성 마커만 표시합니다. 실제 장소·신청 데이터는 조회하거나 변경하지 않습니다.</p>
    <p>서비스 화면에도 동일한 GL 지도가 적용됩니다. 주소 검색은 서버 API를 사용합니다.</p>
    <nav style={{ display: 'flex', gap: 16, marginBlock: 16 }}>
      <a href="/dev/naver-gl.html">GL 검증</a>
      <a href="/merchant/place-registration">신규 장소 등록</a>
    </nav>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      <button onClick={() => map.current?.zoomIn()}>확대</button>
      <button onClick={() => map.current?.zoomOut()}>축소</button>
      <button onClick={() => { setRefresh(value => value + 1); setMarkers(items => items.map(item => ({ ...item }))) }}>목록 새로고침</button>
      <button onClick={() => map.current?.moveTo(37.5665, 126.978, { offsetX: compact ? 60 : 160 })}>상세 패널 중심 보정</button>
      <button onClick={() => { setActive(null); map.current?.fitToMarkers() }}>전체 마커 맞춤</button>
      {[0, 1, 2, 30].map(count => <button key={count} onClick={() => changeMarkers(count)}>마커 {count}개</button>)}
      <button onClick={() => setCompact(value => !value)}>폭 변경</button>
      <button onClick={() => setVisible(value => !value)}>주 지도 전환</button>
      <button onClick={() => setSecond(value => !value)}>보조 지도 전환</button>
    </div>
    <output style={{ display: 'block', marginBottom: 16 }} aria-live="polite">
      준비 {ready}회 · 새로고침 {refresh}회 · 선택 {active ?? '없음'} · 클릭 좌표 {click}
    </output>
    {visible ? <section aria-label="주 지도" style={{ height: 480, width: compact ? 360 : '100%', maxWidth: '100%' }}>
      <NaverMap ref={map} markers={markers} activeMarkerId={active}
        fitBoundsKey={String(markers.length)} onMarkerClick={setActive}
        onMapClick={point => setClick(`${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`)}
        onMapReady={() => setReady(value => value + 1)} />
    </section> : null}
    {second ? <section aria-label="보조 지도" style={{ height: 360, marginTop: 16 }}>
      <NaverMap markers={sampleMarkers.slice(0, 1)} />
    </section> : null}
  </main>
}
