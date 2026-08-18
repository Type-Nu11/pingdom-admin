export interface PlaceCategorySource {
  category?: string
  categoryName?: string
}

export const PLACE_CATEGORY_ACCENT_COLOR = '#FF4A75'

const MARKER_IMAGE_URL_BY_KIND = {
  food: new URL('../assets/placeMarkers/foodPing.svg', import.meta.url).href,
  music: new URL('../assets/placeMarkers/MusicPing2.svg', import.meta.url).href,
  fashion: new URL('../assets/placeMarkers/feshionPing.svg', import.meta.url).href,
  game: new URL('../assets/placeMarkers/gamePing.svg', import.meta.url).href,
  other: new URL('../assets/placeMarkers/EtcPing.svg', import.meta.url).href,
}

const FLAME_MARKER_IMAGE_URL_BY_KIND = {
  food: new URL('../assets/placeMarkers/foodPingFlame.svg', import.meta.url).href,
  music: new URL('../assets/placeMarkers/musicPingFlame.svg', import.meta.url).href,
  fashion: new URL('../assets/placeMarkers/fashionPingFlame.svg', import.meta.url)
    .href,
  game: new URL('../assets/placeMarkers/gamePingFlame.svg', import.meta.url).href,
  other: new URL('../assets/placeMarkers/etcPingFlame.svg', import.meta.url).href,
}

const CATEGORY_LABEL_BY_KEY: Record<string, string> = {
  음식점: '음식점',
  음악: '음악',
  팝업: '팝업',
  패션: '패션',
  뷰티: '뷰티',
  전시: '전시',
  카페: '카페',
  문화재: '문화재',
  기타: '기타',
  FOOD: '음식점',
  RESTAURANT: '음식점',
  MUSIC: '음악',
  CONCERT: '음악',
  FASHION: '패션',
  FESHION: '패션',
  STYLE: '패션',
  BEAUTY: '뷰티',
  POP_UP: '팝업',
  EXHIBITION: '전시',
  CULTURAL_HERITAGE: '문화재',
  GAME: '게임',
  ETC: '기타',
  OTHER: '기타',
}

function normalizeCategoryKey(value?: string) {
  return value?.trim().replace(/[\s-]+/g, '_').toUpperCase()
}

function getPlaceCategoryKind(place: PlaceCategorySource) {
  const categoryText = `${place.category ?? ''} ${place.categoryName ?? ''}`
    .trim()
    .toLowerCase()

  if (
    categoryText.includes('food') ||
    categoryText.includes('restaurant') ||
    categoryText.includes('음식') ||
    categoryText.includes('식당') ||
    categoryText.includes('카페')
  ) {
    return 'food'
  }

  if (
    categoryText.includes('music') ||
    categoryText.includes('concert') ||
    categoryText.includes('음악')
  ) {
    return 'music'
  }

  if (
    categoryText.includes('fashion') ||
    categoryText.includes('feshion') ||
    categoryText.includes('style') ||
    categoryText.includes('패션')
  ) {
    return 'fashion'
  }

  if (
    categoryText.includes('game') ||
    categoryText.includes('게임') ||
    categoryText.includes('play') ||
    categoryText.includes('체험')
  ) {
    return 'game'
  }

  return 'other'
}

export function getPlaceCategoryLabel(place: PlaceCategorySource) {
  const categoryName = place.categoryName?.trim()
  const category = place.category?.trim()
  const normalizedCategoryName = normalizeCategoryKey(categoryName)
  const normalizedCategory = normalizeCategoryKey(category)

  return (
    (normalizedCategoryName
      ? CATEGORY_LABEL_BY_KEY[normalizedCategoryName]
      : undefined) ||
    (normalizedCategory ? CATEGORY_LABEL_BY_KEY[normalizedCategory] : undefined) ||
    category ||
    categoryName ||
    '카테고리 없음'
  )
}

export function getPlaceCategoryIconName(place: PlaceCategorySource) {
  const categoryKind = getPlaceCategoryKind(place)

  if (categoryKind === 'food') {
    return 'restaurant'
  }

  if (categoryKind === 'music') {
    return 'music_note'
  }

  if (categoryKind === 'fashion') {
    return 'checkroom'
  }

  if (categoryKind === 'game') {
    return 'sports_esports'
  }

  return 'location_on'
}

export function getPlaceCategoryMarkerImageUrl(place: PlaceCategorySource) {
  return MARKER_IMAGE_URL_BY_KIND[getPlaceCategoryKind(place)]
}

export function getPlaceCategoryFlameMarkerImageUrl(place: PlaceCategorySource) {
  return FLAME_MARKER_IMAGE_URL_BY_KIND[getPlaceCategoryKind(place)]
}
