import customAxios from './customAxios'
import type {
  AdminPost,
  AdminPostListRequest,
  AdminPostListResponse,
} from '../types/adminPost.types'

const ADMIN_POSTS_API_PATH = '/admin/posts'
const DEFAULT_ADMIN_POST_PAGE = 1
const DEFAULT_ADMIN_POST_LIMIT = 20
const DEFAULT_ADMIN_POST_SORT_PARAM = 'LATEST'
const DEFAULT_ADMIN_POST_KEYWORD = ''

export async function getAdminPosts({
  page = DEFAULT_ADMIN_POST_PAGE,
  limit = DEFAULT_ADMIN_POST_LIMIT,
  sortParam = DEFAULT_ADMIN_POST_SORT_PARAM,
  keyword = DEFAULT_ADMIN_POST_KEYWORD,
}: AdminPostListRequest = {}) {
  const { data } = await customAxios.get<AdminPostListResponse>(
    ADMIN_POSTS_API_PATH,
    {
      params: {
        page,
        limit,
        sortParam,
        keyword,
      },
    }
  )

  return data
}

export async function getAdminPost(postId: number) {
  const { data } = await customAxios.get<AdminPost>(
    `${ADMIN_POSTS_API_PATH}/${postId}`
  )

  return data
}

export async function deleteAdminPost(postId: number) {
  await customAxios.delete<void>(`${ADMIN_POSTS_API_PATH}/${postId}/delete`)
}

export type { AdminPost }
