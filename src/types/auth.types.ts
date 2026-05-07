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

export interface AuthErrorResponse<
  TCode extends string = string,
  TErrors = Record<string, string>,
> {
  message?: string
  code?: TCode
  errors?: TErrors
}

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

export type LoginErrorResponse = AuthErrorResponse<'INVALID_CREDENTIALS'>

export type SignupErrorResponse = AuthErrorResponse<'DUPLICATE_USERNAME', SignupFieldErrors>

export type EmailVerifyErrorResponse = AuthErrorResponse<'USER_NOT_FOUND' | 'INVALID_TOKEN'>

export type RefreshTokenErrorResponse = AuthErrorResponse<'INVALID_TOKEN' | 'USER_NOT_FOUND'>
