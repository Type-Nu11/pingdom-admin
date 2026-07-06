import customAxios from './customAxios'
import type {
  AdminBannedUserDetail,
  AdminBannedUserListRequest,
  AdminBannedUserListResponse,
  AdminUserBanReleaseRequest,
  AdminUserBanReleaseResponse,
} from '../types/adminUserBan.types'

const ADMIN_BANNED_USERS_API_PATH = '/admin/users/banned'
const ADMIN_BAN_API_PATH = '/admin/ban'
const DEFAULT_ADMIN_BANNED_USER_PAGE = 1
const DEFAULT_ADMIN_BANNED_USER_LIMIT = 20
const DEFAULT_ADMIN_BANNED_USER_KEYWORD = ''

function getAdminBannedUserListParams({
  page,
  limit,
  keyword,
  banType,
  from,
  to,
  sortBy,
  sortDirection,
}: Required<Pick<AdminBannedUserListRequest, 'page' | 'limit' | 'keyword'>> &
  Omit<AdminBannedUserListRequest, 'page' | 'limit' | 'keyword'>) {
  return {
    page,
    limit,
    keyword: keyword || undefined,
    banType,
    from,
    to,
    sortBy,
    sortDirection,
  }
}

export async function getAdminBannedUsers({
  page = DEFAULT_ADMIN_BANNED_USER_PAGE,
  limit = DEFAULT_ADMIN_BANNED_USER_LIMIT,
  keyword = DEFAULT_ADMIN_BANNED_USER_KEYWORD,
  banType,
  from,
  to,
  sortBy,
  sortDirection,
}: AdminBannedUserListRequest = {}) {
  const { data } = await customAxios.get<AdminBannedUserListResponse>(
    ADMIN_BANNED_USERS_API_PATH,
    {
      params: getAdminBannedUserListParams({
        page,
        limit,
        keyword,
        banType,
        from,
        to,
        sortBy,
        sortDirection,
      }),
    }
  )

  return data
}

export async function getAdminBannedUser(userId: number) {
  const { data } = await customAxios.get<AdminBannedUserDetail>(
    `${ADMIN_BANNED_USERS_API_PATH}/${userId}`
  )

  return data
}

export async function releaseAdminUserBan(
  userId: number,
  payload: AdminUserBanReleaseRequest
) {
  const { data } = await customAxios.post<AdminUserBanReleaseResponse>(
    `${ADMIN_BAN_API_PATH}/${userId}/release`,
    payload
  )

  return data
}
