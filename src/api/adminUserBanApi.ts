import customAxios from './customAxios'
import type {
  AdminBannedUserDetail,
  AdminBannedUserListRequest,
  AdminBannedUserListResponse,
  AdminUserBanRequest,
  AdminUserBanResponse,
  AdminUserBanReleaseRequest,
  AdminUserBanReleaseResponse,
  AdminUserSanctionHistoryRequest,
  AdminUserSanctionHistoryResponse,
  AdminUserSanctionStatus,
} from '../types/adminUserBan.types'

const ADMIN_BANNED_USERS_API_PATH = '/admin/users/banned'
const ADMIN_BAN_API_PATH = '/admin/ban'
const ADMIN_USERS_API_PATH = '/admin/users'
const DEFAULT_ADMIN_BANNED_USER_PAGE = 1
const DEFAULT_ADMIN_BANNED_USER_LIMIT = 20
const DEFAULT_ADMIN_BANNED_USER_KEYWORD = ''
const DEFAULT_ADMIN_USER_SANCTION_HISTORY_PAGE = 1
const DEFAULT_ADMIN_USER_SANCTION_HISTORY_LIMIT = 5

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
  const normalizedKeyword = keyword.trim()

  return {
    page,
    limit,
    keyword: normalizedKeyword || undefined,
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

export async function banAdminUser(
  userId: number,
  payload: AdminUserBanRequest
) {
  const { data } = await customAxios.post<AdminUserBanResponse>(
    `${ADMIN_BAN_API_PATH}/${userId}`,
    payload
  )

  return data
}

export async function getAdminUserSanctionStatus(userId: number) {
  const { data } = await customAxios.get<AdminUserSanctionStatus>(
    `${ADMIN_USERS_API_PATH}/${userId}/sanction`
  )

  return data
}

export async function getAdminUserSanctionHistories(
  userId: number,
  {
    page = DEFAULT_ADMIN_USER_SANCTION_HISTORY_PAGE,
    limit = DEFAULT_ADMIN_USER_SANCTION_HISTORY_LIMIT,
    banType,
    action,
    from,
    to,
  }: AdminUserSanctionHistoryRequest = {}
) {
  const { data } = await customAxios.get<AdminUserSanctionHistoryResponse>(
    `${ADMIN_USERS_API_PATH}/${userId}/sanctions`,
    {
      params: {
        page,
        limit,
        banType,
        action,
        from,
        to,
      },
    }
  )

  return data
}
