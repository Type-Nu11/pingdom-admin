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

export interface LoginResponse {
  id: number
  username: string
  email: string
  birthYear: number
  profileImageUrl: string | null
  language: string
  country: string
  message: string
  accessToken: string
  role?: string | null
}

export interface RefreshTokenResponse {
  accessToken: string
}

export type LoginErrorResponse = AuthErrorResponse<
  'INVALID_CREDENTIALS' | 'ADMIN_ACCESS_REQUIRED'
>
