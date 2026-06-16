import customAxios from './customAxios'
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '../types/auth.types'

const LOGIN_API_PATH = '/auth/admin/login'
const TOKEN_REFRESH_API_PATH = '/auth/token/refresh'
const LOGOUT_API_PATH = '/auth/logout'

export async function login(payload: LoginRequest) {
  const { data } = await customAxios.post<LoginResponse>(LOGIN_API_PATH, payload)
  return data
}

export async function refreshToken(payload: RefreshTokenRequest) {
  const { data } = await customAxios.post<RefreshTokenResponse>(
    TOKEN_REFRESH_API_PATH,
    payload
  )
  return data
}

export async function logout(payload: RefreshTokenRequest) {
  await customAxios.post<void>(LOGOUT_API_PATH, payload)
}
