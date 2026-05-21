import customAxios from './customAxios'
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '../types/auth.types'

const LOGIN_API_PATH = '/auth/login'
const TOKEN_REFRESH_API_PATH = '/auth/token/refresh'

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
