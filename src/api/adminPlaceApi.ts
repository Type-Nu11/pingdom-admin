import customAxios from './customAxios'
import type {
  AdminPlaceItem,
  AdminPlaceListRequest,
  AdminPlaceListResponse,
} from '../types/adminPlace.types'

const ADMIN_PLACES_API_PATH = '/admin/places'
const DEFAULT_ADMIN_PLACE_PAGE = 1
const DEFAULT_ADMIN_PLACE_LIMIT = 10
const DEFAULT_ADMIN_PLACE_SORT_PARAM = 'LATEST'

export async function getAdminPlaces({
  page = DEFAULT_ADMIN_PLACE_PAGE,
  limit = DEFAULT_ADMIN_PLACE_LIMIT,
  sortParam = DEFAULT_ADMIN_PLACE_SORT_PARAM,
}: AdminPlaceListRequest = {}) {
  const { data } = await customAxios.get<AdminPlaceListResponse>(
    ADMIN_PLACES_API_PATH,
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

export type { AdminPlaceItem }
