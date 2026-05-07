import customAxios from './customAxios'
import type {
  EmailVerifyRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SignupRequest,
  SignupResponse,
} from '../types/auth.types'

const LOGIN_API_PATH = '/auth/login'
const SIGNUP_API_PATH = '/auth/signup'
const EMAIL_VERIFY_API_PATH = '/auth/email/verify'
const TOKEN_REFRESH_API_PATH = '/auth/token/refresh'

export async function login(payload: LoginRequest) {
  const { data } = await customAxios.post<LoginResponse>(LOGIN_API_PATH, payload)
  return data
}

export async function signup(payload: SignupRequest) {
  const { data } = await customAxios.post<SignupResponse>(SIGNUP_API_PATH, payload)
  return data
}

export async function verifyEmail(payload: EmailVerifyRequest) {
  await customAxios.post(EMAIL_VERIFY_API_PATH, payload)
}

export async function refreshToken(payload: RefreshTokenRequest) {
  const { data } = await customAxios.post<RefreshTokenResponse>(
    TOKEN_REFRESH_API_PATH,
    payload
  )
  return data
}
