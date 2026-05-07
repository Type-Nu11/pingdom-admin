export interface LoginRequest {
  username: string
  password: string
}

export interface SignupRequest {
  username: string
  name: string
  email: string
  password: string
}

export type SignupField = 'username' | 'name' | 'email' | 'password'

export type SignupFieldErrors = Partial<Record<SignupField, string>>

export interface EmailVerifyRequest {
  email: string
  code: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface LoginResponse {
  id: number
  username: string
  name: string
  message: string
  accessToken: string
  refreshToken: string
}

export interface SignupResponse {
  id: number
  username: string
  name: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

export interface ValidationErrorResponse {
  message: string
  errors: Record<string, string>
}

export interface LoginErrorResponse {
  message: string
  code?: 'INVALID_CREDENTIALS'
  errors?: Record<string, string>
}

export interface SignupErrorResponse {
  message: string
  code?: 'DUPLICATE_USERNAME'
  errors?: SignupFieldErrors
}

export interface EmailVerifyErrorResponse {
  message: string
  code?: 'USER_NOT_FOUND'
  errors?: Record<string, string>
}

export interface RefreshTokenErrorResponse {
  message: string
  code?: 'INVALID_TOKEN' | 'USER_NOT_FOUND'
  errors?: Record<string, string>
}
