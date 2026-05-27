import { createContext } from 'react'
import type { LoginResponse } from '../../types/auth.types'

export interface AuthUser {
  id: number | null
  username: string
  name: string
  email: string
  birthYear: number | null
  profileImageUrl: string
  language: string
  country: string
}

export interface AuthState {
  accessToken: string
  refreshToken: string
  user: AuthUser | null
}

export interface AuthContextValue extends AuthState {
  isAuthenticated: boolean
  login: (data: LoginResponse) => void
  logout: () => void
  clearAuth: () => void
  updateUser: (user: Partial<AuthUser>) => void
}

export const EMPTY_AUTH_STATE: AuthState = {
  accessToken: '',
  refreshToken: '',
  user: null,
}

export const AuthContext = createContext<AuthContextValue | null>(null)
