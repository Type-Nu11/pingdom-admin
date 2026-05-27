import customAxios from './customAxios'
import type {
  AdminPicture,
  AdminPictureListRequest,
  AdminPictureListResponse,
} from '../types/adminPicture.types'

const ADMIN_PICTURES_API_PATH = '/admin/pictures'
const DEFAULT_ADMIN_PICTURE_PAGE = 1
const DEFAULT_ADMIN_PICTURE_LIMIT = 20
const DEFAULT_ADMIN_PICTURE_SORT_PARAM = 'LATEST'

export async function getAdminPictures({
  page = DEFAULT_ADMIN_PICTURE_PAGE,
  limit = DEFAULT_ADMIN_PICTURE_LIMIT,
  sortParam = DEFAULT_ADMIN_PICTURE_SORT_PARAM,
}: AdminPictureListRequest = {}) {
  const { data } = await customAxios.get<AdminPictureListResponse>(
    ADMIN_PICTURES_API_PATH,
    {
      params: {
        page,
        limit,
        sortParam,
      },
    }
  )

  return data
}

export async function deleteAdminPicture(pictureId: number) {
  await customAxios.delete<void>(`${ADMIN_PICTURES_API_PATH}/${pictureId}/delete`)
}

export type { AdminPicture }
