import { Link, Navigate } from 'react-router-dom'
import { useChangeUsername } from '../../hooks/useChangeUsername'
import { useUserProfile } from '../../hooks/useUserProfile'

function ProfilePage() {
  const accessToken = localStorage.getItem('accessToken')
  const { profile, isLoading, isError, errorMessage, fetchUserProfile } = useUserProfile()
  const {
    newUsername,
    setNewUsername,
    isLoading: isChangeUsernameLoading,
    isError: isChangeUsernameError,
    errorMessage: changeUsernameErrorMessage,
    successMessage: changeUsernameSuccessMessage,
    fieldErrors: changeUsernameFieldErrors,
    handleChangeUsername,
  } = useChangeUsername()

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '32px 24px',
        background: '#f9fafb',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '760px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            alignItems: 'center',
          }}
        >
          <div>
            <h1 style={{ margin: '0 0 8px' }}>프로필</h1>
            <p style={{ margin: 0, color: '#6b7280' }}>내 계정 정보를 확인할 수 있습니다.</p>
          </div>

          <Link to="/main">메인으로 이동</Link>
        </header>

        <section
          style={{
            padding: '20px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#ffffff',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '20px' }}>내 정보</h2>
            <button
              type="button"
              onClick={() => {
                void fetchUserProfile()
              }}
              disabled={isLoading}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                background: '#ffffff',
                cursor: isLoading ? 'default' : 'pointer',
              }}
            >
              {isLoading ? '조회 중...' : '새로고침'}
            </button>
          </div>

          {isLoading ? <p style={{ margin: 0 }}>내 정보를 불러오는 중입니다.</p> : null}

          {isError && errorMessage ? (
            <p
              style={{
                margin: 0,
                padding: '12px',
                borderRadius: '8px',
                background: '#fef2f2',
                color: '#b91c1c',
              }}
            >
              {errorMessage}
            </p>
          ) : null}

          {profile ? (
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: '12px',
                margin: 0,
              }}
            >
              <dt style={{ color: '#6b7280' }}>번호</dt>
              <dd style={{ margin: 0 }}>{profile.id}</dd>
              <dt style={{ color: '#6b7280' }}>아이디</dt>
              <dd style={{ margin: 0 }}>{profile.username}</dd>
              <dt style={{ color: '#6b7280' }}>이름</dt>
              <dd style={{ margin: 0 }}>{profile.name}</dd>
              <dt style={{ color: '#6b7280' }}>이메일</dt>
              <dd style={{ margin: 0 }}>{profile.email}</dd>
            </dl>
          ) : null}
        </section>

        <section
          style={{
            padding: '20px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#ffffff',
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: '20px' }}>아이디 변경</h2>
          <form
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            onSubmit={async (event) => {
              event.preventDefault()

              const isSuccess = await handleChangeUsername()

              if (isSuccess) {
                void fetchUserProfile()
              }
            }}
          >
            <label htmlFor="newUsername">새 아이디</label>
            <input
              id="newUsername"
              type="text"
              placeholder="새 아이디"
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
              style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
            />
            {changeUsernameFieldErrors.newUsername ? (
              <p style={{ margin: 0, color: '#dc2626', fontSize: '14px' }}>
                {changeUsernameFieldErrors.newUsername}
              </p>
            ) : null}

            {isChangeUsernameError && changeUsernameErrorMessage ? (
              <p
                style={{
                  margin: 0,
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  color: '#b91c1c',
                }}
              >
                {changeUsernameErrorMessage}
              </p>
            ) : null}

            {changeUsernameSuccessMessage ? (
              <p
                style={{
                  margin: 0,
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#ecfdf5',
                  color: '#047857',
                }}
              >
                {changeUsernameSuccessMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isChangeUsernameLoading}
              style={{
                padding: '12px',
                border: 0,
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                cursor: isChangeUsernameLoading ? 'default' : 'pointer',
              }}
            >
              {isChangeUsernameLoading ? '변경 중...' : '아이디 변경'}
            </button>
          </form>
        </section>

        <section
          style={{
            padding: '20px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#ffffff',
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: '20px' }}>비밀번호 변경</h2>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label htmlFor="currentPassword">현재 비밀번호</label>
            <input
              id="currentPassword"
              type="password"
              placeholder="현재 비밀번호"
              disabled
              style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
            />

            <label htmlFor="newPassword">새 비밀번호</label>
            <input
              id="newPassword"
              type="password"
              placeholder="새 비밀번호"
              disabled
              style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
            />

            <label htmlFor="confirmPassword">새 비밀번호 확인</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="새 비밀번호 확인"
              disabled
              style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
            />

            <button
              type="button"
              disabled
              style={{
                padding: '12px',
                border: 0,
                borderRadius: '8px',
                background: '#9ca3af',
                color: '#ffffff',
              }}
            >
              비밀번호 변경
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

export default ProfilePage
