export interface ReviewMedia {
  reviewMediaId?: number | null
  imageUrl?: string | null
  contentType?: string | null
}

export interface ReviewPresentation {
  recommendReasons?: string[] | null
  recommendReason?: string | null
  reviewMedia?: ReviewMedia[] | null
  imageUrls?: string[] | null
}
