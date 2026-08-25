export interface PlaceCategorySource {
  category?: string | null
  categoryName?: string | null
}

export const PLACE_CATEGORY_ACCENT_COLOR = '#FF4A75'

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
  restaurant: new URL('../assets/placeMarkers/category/음식점.svg', import.meta.url).href,
  music: new URL('../assets/placeMarkers/category/음악.svg', import.meta.url).href,
  popup: new URL('../assets/placeMarkers/category/팝업.svg', import.meta.url).href,
  fashion: new URL('../assets/placeMarkers/category/패션.svg', import.meta.url).href,
  beauty: new URL('../assets/placeMarkers/category/뷰티.svg', import.meta.url).href,
  exhibition: new URL('../assets/placeMarkers/category/전시.svg', import.meta.url).href,
  cafe: new URL('../assets/placeMarkers/category/카페.svg', import.meta.url).href,
  'cultural-heritage': new URL('../assets/placeMarkers/category/문화재.svg', import.meta.url).href,
  other: new URL('../assets/placeMarkers/category/기타.svg', import.meta.url).href,
}

const LIST_ICON_IMAGE_URL_BY_KIND: Record<PlaceCategoryKind, string> = {
  restaurant: new URL('../assets/placeMarkers/icon/음식점.svg', import.meta.url).href,
  music: new URL('../assets/placeMarkers/icon/음악.svg', import.meta.url).href,
  popup: new URL('../assets/placeMarkers/icon/팝업.svg', import.meta.url).href,
  fashion: new URL('../assets/placeMarkers/icon/패션.svg', import.meta.url).href,
  beauty: new URL('../assets/placeMarkers/icon/뷰티.svg', import.meta.url).href,
  exhibition: new URL('../assets/placeMarkers/icon/전시.svg', import.meta.url).href,
  cafe: new URL('../assets/placeMarkers/icon/카페.svg', import.meta.url).href,
  'cultural-heritage': new URL('../assets/placeMarkers/icon/문화재.svg', import.meta.url).href,
  other: new URL('../assets/placeMarkers/icon/기타.svg', import.meta.url).href,
}

const FLAME_MARKER_IMAGE_URL_BY_KIND: Record<PlaceCategoryKind, string> = {
  restaurant: new URL('../assets/placeMarkers/category/음식점-불꽃.svg', import.meta.url).href,
  music: new URL('../assets/placeMarkers/category/음악-불꽃.svg', import.meta.url).href,
  popup: new URL('../assets/placeMarkers/category/팝업-불꽃.svg', import.meta.url).href,
  fashion: new URL('../assets/placeMarkers/category/패션-불꽃.svg', import.meta.url).href,
  beauty: new URL('../assets/placeMarkers/category/뷰티-불꽃.svg', import.meta.url).href,
  exhibition: new URL('../assets/placeMarkers/category/전시-불꽃.svg', import.meta.url).href,
  cafe: new URL('../assets/placeMarkers/category/카페-불꽃.svg', import.meta.url).href,
  'cultural-heritage': new URL('../assets/placeMarkers/category/문화재-불꽃.svg', import.meta.url)
    .href,
  other: new URL('../assets/placeMarkers/category/기타-불꽃.svg', import.meta.url).href,
}

const CATEGORY_METADATA_BY_KEY: Record<
  string,
  { kind: PlaceCategoryKind; label: string; iconName: string }
> = {
  RESTAURANT: { kind: 'restaurant', label: '음식점', iconName: 'restaurant' },
  음식점: { kind: 'restaurant', label: '음식점', iconName: 'restaurant' },
  MUSIC: { kind: 'music', label: '음악', iconName: 'headphones' },
  음악: { kind: 'music', label: '음악', iconName: 'headphones' },
  POP_UP: { kind: 'popup', label: '팝업', iconName: 'redeem' },
  팝업: { kind: 'popup', label: '팝업', iconName: 'redeem' },
  FASHION: { kind: 'fashion', label: '패션', iconName: 'checkroom' },
  패션: { kind: 'fashion', label: '패션', iconName: 'checkroom' },
  BEAUTY: { kind: 'beauty', label: '뷰티', iconName: 'palette' },
  뷰티: { kind: 'beauty', label: '뷰티', iconName: 'palette' },
  EXHIBITION: { kind: 'exhibition', label: '전시', iconName: 'museum' },
  전시: { kind: 'exhibition', label: '전시', iconName: 'museum' },
  CAFE: { kind: 'cafe', label: '카페', iconName: 'local_cafe' },
  카페: { kind: 'cafe', label: '카페', iconName: 'local_cafe' },
  CULTURAL_HERITAGE: {
    kind: 'cultural-heritage',
    label: '문화재',
    iconName: 'account_balance',
  },
  문화재: { kind: 'cultural-heritage', label: '문화재', iconName: 'account_balance' },
  OTHER: { kind: 'other', label: '기타', iconName: 'location_on' },
  기타: { kind: 'other', label: '기타', iconName: 'location_on' },
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

export function getPlaceCategoryIconName(place: PlaceCategorySource) {
  return getCategoryMetadata(place)?.iconName ?? 'location_on'
}

export function getPlaceCategoryMarkerImageUrl(place: PlaceCategorySource) {
  return MARKER_IMAGE_URL_BY_KIND[getPlaceCategoryKind(place)]
}

export function getPlaceCategoryListIconImageUrl(place: PlaceCategorySource) {
  return LIST_ICON_IMAGE_URL_BY_KIND[getPlaceCategoryKind(place)]
}

export function getPlaceCategoryFlameMarkerImageUrl(place: PlaceCategorySource) {
  return FLAME_MARKER_IMAGE_URL_BY_KIND[getPlaceCategoryKind(place)]
}
