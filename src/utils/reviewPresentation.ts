import type { ReviewMedia, ReviewPresentation } from '../types/reviewPresentation.types'

const labels: Record<string, string> = {
  FRIENDLY: '친절해요', EASY_TO_FIND: '찾기 쉬워요', GOOD_FOOD: '음식이 맛있어요',
  MULTILINGUAL_SUPPORT: '외국어 응대가 가능해요', PARKING: '주차가 편해요',
  PHOTO_SPOT: '사진 찍기 좋아요', CLEAN: '깨끗해요',
}

export function reviewReasons(review: ReviewPresentation): string[] {
  // An explicit empty array is authoritative; only absent fields use legacy data.
  const reasons = review.recommendReasons ?? (review.recommendReason ? [review.recommendReason] : [])
  return [...new Set(reasons.filter(value => typeof value === 'string' && value.trim()).map(value => {
    const reason = value.trim()
    return Object.hasOwn(labels, reason) ? labels[reason] : /^[A-Z][A-Z_0-9]*$/.test(reason) ? '기타 추천 이유' : reason
  }))]
}

export function reviewImages(review: ReviewPresentation): string[] {
  const media: ReviewMedia[] = review.reviewMedia ?? (review.imageUrls ?? []).map(imageUrl => ({ imageUrl }))
  const urls = media.flatMap(item => {
    if (!item || typeof item.imageUrl !== 'string') return []
    if (item.contentType && !/^image\/(jpeg|png|webp|gif|avif)$/i.test(item.contentType)) return []
    try {
      const url = new URL(item.imageUrl)
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? [url.href] : []
    } catch { return [] }
  })
  return [...new Set(urls)]
}
