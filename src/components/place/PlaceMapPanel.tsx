import type { ReactNode, RefObject } from 'react'
import type { KakaoMapHandle, KakaoMapMarker } from '../map/KakaoMap'
import * as S from '../../pages/place/PlaceManagePage.styles'

interface PlaceMapPanelProps {
  panelRef: RefObject<HTMLElement | null>
  mapRef: RefObject<KakaoMapHandle | null>
  markers: KakaoMapMarker[]
  displayCount: number
  fitBoundsKey: string
  selectedPlaceId: number | null
  isListCollapsed: boolean
  isInspectorOpen: boolean
  onMarkerSelect: (placeId: number) => void
  onOpenList: () => void
  inspector: ReactNode
}

export function PlaceMapPanel({
  panelRef,
  mapRef,
  markers,
  displayCount,
  fitBoundsKey,
  selectedPlaceId,
  isListCollapsed,
  isInspectorOpen,
  onMarkerSelect,
  onOpenList,
  inspector,
}: PlaceMapPanelProps) {
  return (
    <S.MapPanel ref={panelRef}>
      <S.AdminMap
        ref={mapRef}
        activeMarkerId={selectedPlaceId}
        fitBoundsKey={fitBoundsKey}
        markers={markers}
        onMarkerClick={onMarkerSelect}
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
      {!isInspectorOpen ? (
        <S.MapInfo $offsetForListToggle={isListCollapsed}>
          <S.MapInfoDot />
          <S.MapInfoText>
            <strong>{displayCount.toLocaleString()}개 장소 표시</strong>
          </S.MapInfoText>
        </S.MapInfo>
      ) : null}
    </S.MapPanel>
  )
}
