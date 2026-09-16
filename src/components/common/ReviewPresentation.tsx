import { useState } from 'react'
import styled from 'styled-components'
import type { ReviewPresentation } from '../../types/reviewPresentation.types'
import { reviewImages, reviewReasons } from '../../utils/reviewPresentation'
import { adminColors as colors } from '../../styles/theme'

const Reasons = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px; min-width: 0;
  span { padding: 4px 8px; border-radius: 6px; background: ${colors.primaryTint}; color: ${colors.primary}; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
`
const Grid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; margin-top: 12px;
`
const Tile = styled.div`
  position: relative; aspect-ratio: 1; min-width: 0; overflow: hidden; border: 1px solid ${colors.border}; border-radius: 6px;
  a { display: block; height: 100%; }
  a:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: -3px; }
  img { display: block; width: 100%; height: 100%; object-fit: cover; }
  span { position: absolute; inset: 0; display: grid; place-items: center; padding: 8px; text-align: center; font-size: 12px; color: ${colors.muted}; pointer-events: none; background: ${colors.surface}; }
`

export function ReviewReasons({ review }: { review: ReviewPresentation }) {
  const reasons = reviewReasons(review)
  return <Reasons aria-label="추천 이유">{reasons.length ? reasons.map(reason => <span key={reason}>{reason}</span>) : <span>추천 이유 없음</span>}</Reasons>
}

function Photo({ url, index }: { url: string; index: number }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')
  return <Tile>
    {state !== 'error' ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`리뷰 사진 ${index + 1} 원본 열기`}><img src={url} alt={`리뷰 사진 ${index + 1}`} loading="lazy" onLoad={() => setState('loaded')} onError={() => setState('error')} /></a> : null}
    {state !== 'loaded' ? <span role="status">{state === 'loading' ? '사진 로딩 중' : '사진을 불러올 수 없습니다.'}</span> : null}
  </Tile>
}

export function ReviewPhotos({ review, reviewId }: { review: ReviewPresentation; reviewId: number }) {
  const images = reviewImages(review)
  return images.length ? <Grid aria-label="리뷰 사진">{images.map((url, index) => <Photo key={`${reviewId}:${url}`} url={url} index={index} />)}</Grid> : null
}
