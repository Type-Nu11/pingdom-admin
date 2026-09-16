import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ReviewReasons, ReviewPhotos } from '../../src/components/common/ReviewPresentation'
function Fixture() {
  const [id, setId] = useState(1)
  const modern = { recommendReasons: ['FRIENDLY', 'EASY_TO_FIND', 'GOOD_FOOD', 'MULTILINGUAL_SUPPORT', 'PARKING', 'PHOTO_SPOT', 'CLEAN'], reviewMedia: [{ imageUrl: `${location.origin}/photo.png`, contentType: 'image/png' }] }
  const legacy = { recommendReasons: [], recommendReason: '기존 추천 이유', reviewMedia: [], imageUrls: [`${location.origin}/photo.png`, `${location.origin}/photo.png`] }
  const empty = { recommendReasons: [], reviewMedia: [] }
  const review = id === 3 ? legacy : id === 4 ? empty : modern
  return <main style={{ maxWidth: 440, margin: '24px auto', padding: 16, background: '#fff' }}><h1>리뷰 원문</h1><ReviewReasons review={review} /><ReviewPhotos review={review} reviewId={id} /><button onClick={() => setId(id + 1)}>다음 리뷰</button></main>
}
createRoot(document.getElementById('root')).render(<Fixture />)
