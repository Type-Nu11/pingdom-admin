import type { AuthErrorResponse } from './auth.types'

export interface UserProfileResponse {
  id: number
  username: string
  name: string
  email: string
}

export interface ChangeUsernameRequest {
  newUsername: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export type ChangeUsernameField = 'newUsername'

export type ChangeUsernameFieldErrors = Partial<Record<ChangeUsernameField, string>>

export type ChangePasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword'

export type ChangePasswordFieldErrors = Partial<Record<ChangePasswordField, string>>

export type UserProfileErrorResponse = AuthErrorResponse<'INVALID_TOKEN'>

export type ChangeUsernameErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'USERNAME_ALREADY_EXISTS',
  ChangeUsernameFieldErrors
>

export type ChangePasswordErrorResponse = AuthErrorResponse<
  'INVALID_CREDENTIALS' | 'INVALID_TOKEN',
  ChangePasswordFieldErrors
>
