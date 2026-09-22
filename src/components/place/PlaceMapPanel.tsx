import type { ReactNode, RefObject } from 'react'
import type { MapHandle, MapMarker } from '../map/map.types'
import * as S from '../../pages/place/PlaceManagePage.styles'

interface PlaceMapPanelProps {
  mapRevision: number
  panelRef: RefObject<HTMLElement | null>
  mapRef: RefObject<MapHandle | null>
  markers: MapMarker[]
  displayCount: number
  fitBoundsKey: string
  selectedPlaceId: number | null
  isListCollapsed: boolean
  onMarkerSelect: (placeId: number) => void
  onMapReady: () => void
  onOpenList: () => void
  inspector: ReactNode
}

export function PlaceMapPanel({
  mapRevision,
  panelRef,
  mapRef,
  markers,
  displayCount,
  fitBoundsKey,
  selectedPlaceId,
  isListCollapsed,
  onMarkerSelect,
  onMapReady,
  onOpenList,
  inspector,
}: PlaceMapPanelProps) {
  return (
    <S.MapPanel ref={panelRef}>
      <S.AdminMap
        key={mapRevision}
        ref={mapRef}
        activeMarkerId={selectedPlaceId}
        fitBoundsKey={fitBoundsKey}
        markers={markers}
        onMarkerClick={onMarkerSelect}
        onMapReady={onMapReady}
      />
      {inspector}
      {isListCollapsed ? (
        <S.MapListToggleButton
          type="button"
          aria-label="장소 목록 열기"
          onClick={onOpenList}
        >
          <S.MaterialIcon aria-hidden="true">keyboard_double_arrow_right</S.MaterialIcon>
          <span>목록</span>
        </S.MapListToggleButton>
      ) : null}
      <S.MapControlGroup>
        <S.MapControlButton
          type="button"
          aria-label="지도 확대"
          onClick={() => mapRef.current?.zoomIn()}
        >
          <S.MaterialIcon aria-hidden="true">add</S.MaterialIcon>
        </S.MapControlButton>
        <S.MapControlButton
          type="button"
          aria-label="지도 축소"
          onClick={() => mapRef.current?.zoomOut()}
        >
          <S.MaterialIcon aria-hidden="true">remove</S.MaterialIcon>
        </S.MapControlButton>
      </S.MapControlGroup>
      <S.MapInfo>
        <S.MapInfoDot />
        <S.MapInfoText>
          <strong>{displayCount.toLocaleString()}개 장소 표시</strong>
        </S.MapInfoText>
      </S.MapInfo>
    </S.MapPanel>
  )
}
