export interface LoginRequest {
  username: string
  password: string
}

export interface AuthErrorResponse<
  TCode extends string = string,
  TErrors = Record<string, string>,
> {
  message?: string
  code?: TCode
  errors?: TErrors
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

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

export interface ValidationErrorResponse {
  message: string
  errors: Record<string, string>
}

export type LoginErrorResponse = AuthErrorResponse<'INVALID_CREDENTIALS'>

export type RefreshTokenErrorResponse = AuthErrorResponse<'INVALID_TOKEN' | 'USER_NOT_FOUND'>
