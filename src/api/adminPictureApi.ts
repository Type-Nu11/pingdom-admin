import customAxios from './customAxios'
import type {
  AdminPicture,
  AdminPictureListResponse,
} from '../types/adminPicture.types'

const ADMIN_PICTURES_API_PATH = '/admin/pictures'
const DEFAULT_ADMIN_PICTURE_LIMIT = 20

function normalizeAdminPictures(response: AdminPictureListResponse) {
  if (Array.isArray(response)) {
    return response
  }

  return response.pictures ?? response.content ?? response.data ?? []
}

export async function getAdminPictures(limit = DEFAULT_ADMIN_PICTURE_LIMIT) {
  const { data } = await customAxios.get<AdminPictureListResponse>(
    ADMIN_PICTURES_API_PATH,
    {
      params: {
        limit,
      },
    }
  )

  return normalizeAdminPictures(data)
}

export async function deleteAdminPicture(pictureId: number) {
  const { data } = await customAxios.delete<string>(
    `${ADMIN_PICTURES_API_PATH}/${pictureId}/delete`
  )

  return data
}

export type { AdminPicture }
