import type { useChangePassword } from '../../hooks/useChangePassword'
import type { useChangeUsername } from '../../hooks/useChangeUsername'
import type { MyPageResponse } from '../../types/user.types'
import * as S from './ProfilePage.styles'

type ChangeUsernameSectionProps = ReturnType<typeof useChangeUsername> & {
  onSuccess: () => void
}
type ChangePasswordSectionProps = ReturnType<typeof useChangePassword>

interface ProfileInfoSectionProps {
  profile: MyPageResponse | null
  isLoading: boolean
  isError: boolean
  errorMessage: string
  onRefresh: () => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <S.FieldErrorText>{message}</S.FieldErrorText>
}

function FeedbackMessage({
  message,
  tone,
}: {
  message?: string
  tone: 'error' | 'success'
}) {
  if (!message) {
    return null
  }

  return <S.FeedbackText $tone={tone}>{message}</S.FeedbackText>
}

function formatProfileValue(value: string | number | null | undefined) {
  return value ?? '-'
}

export function ProfileInfoSection({
  profile,
  isLoading,
  isError,
  errorMessage,
  onRefresh,
}: ProfileInfoSectionProps) {
  return (
    <S.Card>
      <S.SectionHeader>
        <S.InlineSectionTitle>내 정보</S.InlineSectionTitle>
        <S.SecondaryButton
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          $isLoading={isLoading}
        >
          {isLoading ? '조회 중...' : '새로고침'}
        </S.SecondaryButton>
      </S.SectionHeader>

      {isLoading ? <S.Description>내 정보를 불러오는 중입니다.</S.Description> : null}
      <FeedbackMessage tone="error" message={isError ? errorMessage : ''} />

      {profile ? (
        <S.DefinitionList>
          <S.Term>번호</S.Term>
          <S.DescriptionValue>{formatProfileValue(profile.id)}</S.DescriptionValue>
          <S.Term>아이디</S.Term>
          <S.DescriptionValue>{formatProfileValue(profile.username)}</S.DescriptionValue>
          <S.Term>이름</S.Term>
          <S.DescriptionValue>{formatProfileValue(profile.name)}</S.DescriptionValue>
          <S.Term>이메일</S.Term>
          <S.DescriptionValue>{formatProfileValue(profile.email)}</S.DescriptionValue>
        </S.DefinitionList>
      ) : null}
    </S.Card>
  )
}

export function ChangeUsernameSection({
  newUsername,
  setNewUsername,
  isLoading,
  isError,
  errorMessage,
  successMessage,
  fieldErrors,
  handleChangeUsername,
  onSuccess,
}: ChangeUsernameSectionProps) {
  return (
    <S.Card>
      <S.SectionTitle>아이디 변경</S.SectionTitle>
      <S.Form
        onSubmit={async (event) => {
          event.preventDefault()

          const isSuccess = await handleChangeUsername()

          if (isSuccess) {
            onSuccess()
          }
        }}
      >
        <label htmlFor="newUsername">새 아이디</label>
        <S.TextInput
          id="newUsername"
          type="text"
          placeholder="새 아이디"
          value={newUsername}
          onChange={(event) => setNewUsername(event.target.value)}
        />
        <FieldError message={fieldErrors.newUsername} />
        <FeedbackMessage tone="error" message={isError ? errorMessage : ''} />
        <FeedbackMessage tone="success" message={successMessage} />

        <S.PrimaryButton type="submit" disabled={isLoading} $isLoading={isLoading}>
          {isLoading ? '변경 중...' : '아이디 변경'}
        </S.PrimaryButton>
      </S.Form>
    </S.Card>
  )
}

export function ChangePasswordSection({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  isLoading,
  isError,
  errorMessage,
  successMessage,
  fieldErrors,
  handleChangePassword,
}: ChangePasswordSectionProps) {
  return (
    <S.Card>
      <S.SectionTitle>비밀번호 변경</S.SectionTitle>
      <S.Form
        onSubmit={async (event) => {
          event.preventDefault()
          await handleChangePassword()
        }}
      >
        <label htmlFor="currentPassword">현재 비밀번호</label>
        <S.TextInput
          id="currentPassword"
          type="password"
          placeholder="현재 비밀번호"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          disabled={isLoading}
        />
        <FieldError message={fieldErrors.currentPassword} />

        <label htmlFor="newPassword">새 비밀번호</label>
        <S.TextInput
          id="newPassword"
          type="password"
          placeholder="새 비밀번호"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          disabled={isLoading}
        />
        <FieldError message={fieldErrors.newPassword} />

        <label htmlFor="confirmPassword">새 비밀번호 확인</label>
        <S.TextInput
          id="confirmPassword"
          type="password"
          placeholder="새 비밀번호 확인"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          disabled={isLoading}
        />
        <FieldError message={fieldErrors.confirmPassword} />
        <FeedbackMessage tone="error" message={isError ? errorMessage : ''} />
        <FeedbackMessage tone="success" message={successMessage} />

        <S.PrimaryButton type="submit" disabled={isLoading} $isLoading={isLoading}>
          {isLoading ? '변경 중...' : '비밀번호 변경'}
        </S.PrimaryButton>
      </S.Form>
    </S.Card>
  )
}
