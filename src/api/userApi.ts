import customAxios from './customAxios'
import type {
  ChangePasswordRequest,
  ChangeUsernameRequest,
  MyPageResponse,
} from '../types/user.types'

const USER_PROFILE_API_PATH = '/users/me'
const USER_CHANGE_ID_API_PATH = '/users/change-id'
const USER_CHANGE_PW_API_PATH = '/users/change-pw'

export async function getUserProfile() {
  const { data } = await customAxios.get<MyPageResponse>(USER_PROFILE_API_PATH)
  return data
}

export async function changeUsername(payload: ChangeUsernameRequest) {
  const { data } = await customAxios.post<string>(USER_CHANGE_ID_API_PATH, payload)
  return data
}

export async function changePassword(payload: ChangePasswordRequest) {
  const { data } = await customAxios.post<string>(USER_CHANGE_PW_API_PATH, payload)
  return data
}
