export interface MapCoordinate {
  latitude: number
  longitude: number
}

export interface MapMarker extends MapCoordinate {
  id: number
  label: string
  category?: string | null
  categoryName?: string | null
  level?: number
}

export interface MapHandle {
  zoomIn: () => void
  zoomOut: () => void
  relayout: () => void
  /** Positive offsetX places the target to the right of the viewport center. */
  moveTo: (latitude: number, longitude: number, options?: { offsetX?: number }) => void
  fitToMarkers: () => void
}

export interface MapProps {
  className?: string
  markers?: MapMarker[]
  activeMarkerId?: number | null
  fitBoundsKey?: string
  onMarkerClick?: (markerId: number) => void
  onMapClick?: (coordinate: MapCoordinate) => void
  onMapReady?: () => void
}

export function isValidMapCoordinate({ latitude, longitude }: MapCoordinate) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}
