import React, { forwardRef, useImperativeHandle } from 'react'

export default forwardRef(function MapFixture({ className, markers, activeMarkerId, onMarkerClick }, ref) {
  useImperativeHandle(ref, () => ({ zoomIn() {}, zoomOut() {}, relayout() {}, fitToMarkers() {},
    moveTo(latitude, longitude, options) { window.qaMapFocus = { latitude, longitude, options } },
  }), [])
  return <div className={className} style={{ background: '#e5eee9' }} data-testid="map" data-selected={activeMarkerId}>
    <div style={{ position: 'absolute', left: 24, top: 100, zIndex: 1 }}>
      {markers.map(marker => <button key={marker.id} onClick={() => onMarkerClick(marker.id)}>지도 대상 {marker.id}</button>)}
    </div>
  </div>
})
