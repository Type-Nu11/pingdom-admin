import customAxios from './customAxios'
import type { LoginRequest, LoginResponse } from '../types/auth.types'

const LOGIN_API_PATH = '/auth/admin/login'
const MERCHANT_LOGIN_API_PATH = '/auth/login'
const LOGOUT_API_PATH = '/auth/logout'

export type LoginMode = 'admin' | 'merchant'

export async function login(payload: LoginRequest, mode: LoginMode = 'admin') {
  const loginPath = mode === 'admin' ? LOGIN_API_PATH : MERCHANT_LOGIN_API_PATH
  const { data } = await customAxios.post<LoginResponse>(loginPath, payload)
  return data
}

export async function logout() {
  await customAxios.post<void>(LOGOUT_API_PATH)
}
