import restaurantMarker from '../assets/placeMarkers/category/restaurant.svg'
import restaurantListIcon from '../assets/placeMarkers/icon/restaurant.svg'
import musicMarker from '../assets/placeMarkers/category/music.svg'
import musicListIcon from '../assets/placeMarkers/icon/music.svg'
import popupMarker from '../assets/placeMarkers/category/popup.svg'
import popupListIcon from '../assets/placeMarkers/icon/popup.svg'
import fashionMarker from '../assets/placeMarkers/category/fashion.svg'
import fashionListIcon from '../assets/placeMarkers/icon/fashion.svg'
import beautyMarker from '../assets/placeMarkers/category/beauty.svg'
import beautyListIcon from '../assets/placeMarkers/icon/beauty.svg'
import exhibitionMarker from '../assets/placeMarkers/category/exhibition.svg'
import exhibitionListIcon from '../assets/placeMarkers/icon/exhibition.svg'
import cafeMarker from '../assets/placeMarkers/category/cafe.svg'
import cafeListIcon from '../assets/placeMarkers/icon/cafe.svg'
import culturalHeritageMarker from '../assets/placeMarkers/category/cultural-heritage.svg'
import culturalHeritageListIcon from '../assets/placeMarkers/icon/cultural-heritage.svg'
import otherMarker from '../assets/placeMarkers/category/other.svg'
import otherListIcon from '../assets/placeMarkers/icon/other.svg'

export interface PlaceCategorySource {
  category?: string | null
  categoryName?: string | null
}

type PlaceCategoryKind =
  | 'restaurant'
  | 'music'
  | 'popup'
  | 'fashion'
  | 'beauty'
  | 'exhibition'
  | 'cafe'
  | 'cultural-heritage'
  | 'other'

const MARKER_IMAGE_URL_BY_KIND: Record<PlaceCategoryKind, string> = {
  restaurant: restaurantMarker,
  music: musicMarker,
  popup: popupMarker,
  fashion: fashionMarker,
  beauty: beautyMarker,
  exhibition: exhibitionMarker,
  cafe: cafeMarker,
  'cultural-heritage': culturalHeritageMarker,
  other: otherMarker,
}

const LIST_ICON_IMAGE_URL_BY_KIND: Record<PlaceCategoryKind, string> = {
  restaurant: restaurantListIcon,
  music: musicListIcon,
  popup: popupListIcon,
  fashion: fashionListIcon,
  beauty: beautyListIcon,
  exhibition: exhibitionListIcon,
  cafe: cafeListIcon,
  'cultural-heritage': culturalHeritageListIcon,
  other: otherListIcon,
}

const CATEGORY_METADATA_BY_KEY: Record<
  string,
  { kind: PlaceCategoryKind; label: string }
> = {
  RESTAURANT: { kind: 'restaurant', label: '음식점' },
  음식점: { kind: 'restaurant', label: '음식점' },
  MUSIC: { kind: 'music', label: '음악' },
  음악: { kind: 'music', label: '음악' },
  POP_UP: { kind: 'popup', label: '팝업' },
  팝업: { kind: 'popup', label: '팝업' },
  FASHION: { kind: 'fashion', label: '패션' },
  패션: { kind: 'fashion', label: '패션' },
  BEAUTY: { kind: 'beauty', label: '뷰티' },
  뷰티: { kind: 'beauty', label: '뷰티' },
  EXHIBITION: { kind: 'exhibition', label: '전시' },
  전시: { kind: 'exhibition', label: '전시' },
  CAFE: { kind: 'cafe', label: '카페' },
  카페: { kind: 'cafe', label: '카페' },
  CULTURAL_HERITAGE: {
    kind: 'cultural-heritage',
    label: '문화재',
  },
  문화재: { kind: 'cultural-heritage', label: '문화재' },
  OTHER: { kind: 'other', label: '기타' },
  기타: { kind: 'other', label: '기타' },
}

function normalizeCategoryKey(value?: string | null) {
  return value?.trim().replace(/[\s-]+/g, '_').toUpperCase()
}

function getCategoryMetadata(place: PlaceCategorySource) {
  const category = normalizeCategoryKey(place.category)
  const categoryName = normalizeCategoryKey(place.categoryName)

  return (
    (category ? CATEGORY_METADATA_BY_KEY[category] : undefined) ||
    (categoryName ? CATEGORY_METADATA_BY_KEY[categoryName] : undefined)
  )
}

function getPlaceCategoryKind(place: PlaceCategorySource): PlaceCategoryKind {
  return getCategoryMetadata(place)?.kind ?? 'other'
}

export function getPlaceCategoryLabel(place: PlaceCategorySource) {
  return getCategoryMetadata(place)?.label ?? place.categoryName?.trim() ?? '미분류'
}

export function getPlaceCategoryMarkerImageUrl(place: PlaceCategorySource) {
  return MARKER_IMAGE_URL_BY_KIND[getPlaceCategoryKind(place)]
}

export function getPlaceCategoryListIconImageUrl(place: PlaceCategorySource) {
  return LIST_ICON_IMAGE_URL_BY_KIND[getPlaceCategoryKind(place)]
}
