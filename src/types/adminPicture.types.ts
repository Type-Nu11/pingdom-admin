import type { AuthErrorResponse } from './auth.types'

export interface AdminPicture {
  id: number
  url?: string
  imageUrl?: string
  pictureUrl?: string
  s3Key?: string
  userId?: number
  username?: string
  createdAt?: string
}

export type AdminPictureListResponse =
  | AdminPicture[]
  | {
      pictures?: AdminPicture[]
      content?: AdminPicture[]
      data?: AdminPicture[]
    }

export type AdminPictureListErrorResponse = AuthErrorResponse<'INVALID_TOKEN'>

export type AdminPictureDeleteErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'PICTURE_NOT_FOUND' | 'DELETE_ERROR' | 'S3_CONNECTION_ERROR'
>
