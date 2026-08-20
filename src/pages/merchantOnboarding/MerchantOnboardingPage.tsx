import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantOnboarding } from '../../hooks/useMerchantOnboarding'
import type {
  MerchantOwnerApplicationProfile,
  MerchantOwnerApplicationRequest,
  MerchantOwnerApplicationStatus,
  MerchantVerification,
  MerchantVerificationRequest,
  MerchantVerificationStatus,
} from '../../types/merchantOnboarding.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from './MerchantOnboardingPage.styles'

const OWNER_STATUS: Record<MerchantOwnerApplicationStatus, { label: string; tone: 'active' | 'pending' | 'danger' }> = {
  ACTIVE: { label: '승인 완료', tone: 'active' },
  PENDING: { label: '심사 중', tone: 'pending' },
  REJECTED: { label: '반려', tone: 'danger' },
  REVOKED: { label: '권한 회수', tone: 'danger' },
}

const VERIFICATION_STATUS: Record<MerchantVerificationStatus, { label: string; tone: 'active' | 'pending' | 'danger' }> = {
  APPROVED: { label: '승인', tone: 'active' },
  PENDING: { label: '심사 중', tone: 'pending' },
  REJECTED: { label: '반려', tone: 'danger' },
}

const ONBOARDING_STATUS = {
  NOT_STARTED: '시작 전',
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
} as const

function getStepState(profile: MerchantOwnerApplicationProfile | null, verification: MerchantVerification | null) {
  const verificationApproved = verification?.identityStatus === 'APPROVED' && verification.businessStatus === 'APPROVED'

  return {
    profileComplete: Boolean(profile),
    verificationComplete: verificationApproved,
    reviewActive: Boolean(profile && verification),
  }
}

function ProfileForm({
  profile,
  isSaving,
  disabled,
  onSave,
}: {
  profile: MerchantOwnerApplicationProfile | null
  isSaving: boolean
  disabled: boolean
  onSave: (request: MerchantOwnerApplicationRequest) => Promise<boolean>
}) {
  const [businessName, setBusinessName] = useState(profile?.businessName ?? '')
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [description, setDescription] = useState(profile?.description ?? '')
  const [contactEmail, setContactEmail] = useState(profile?.contactEmail ?? '')
  const [contactPhone, setContactPhone] = useState(profile?.contactPhone ?? '')
  const [formError, setFormError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    if (!businessName.trim() || !displayName.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      setFormError('필수 항목을 모두 입력해주세요.')
      return
    }

    if (!contactEmail.includes('@')) {
      setFormError('이메일 형식을 확인해주세요.')
      return
    }

    await onSave({
      businessName: businessName.trim(),
      displayName: displayName.trim(),
      description,
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
    })
  }

  return (
    <Store.Form onSubmit={submit}>
      <Store.Field>
        사업자명
        <Store.Input value={businessName} maxLength={100} disabled={disabled || isSaving} onChange={(event) => setBusinessName(event.target.value)} />
      </Store.Field>
      <Store.Field>
        상점주 노출명
        <Store.Input value={displayName} maxLength={100} disabled={disabled || isSaving} onChange={(event) => setDisplayName(event.target.value)} />
      </Store.Field>
      <Store.Field>
        연락 이메일
        <Store.Input type="email" value={contactEmail} maxLength={255} disabled={disabled || isSaving} onChange={(event) => setContactEmail(event.target.value)} />
      </Store.Field>
      <Store.Field>
        연락처
        <Store.Input value={contactPhone} maxLength={30} disabled={disabled || isSaving} onChange={(event) => setContactPhone(event.target.value)} />
      </Store.Field>
      <Store.Field $wide>
        상점 소개
        <Store.Textarea value={description} maxLength={1000} disabled={disabled || isSaving} onChange={(event) => setDescription(event.target.value)} />
        <S.FormHint>{description.length}/1000</S.FormHint>
      </Store.Field>
      {formError ? <S.FormNotice><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{formError}</Store.Notice></S.FormNotice> : null}
      {!disabled ? <Store.FormFooter><Store.SaveButton type="submit" disabled={isSaving}>{isSaving ? '저장 중' : profile ? '신청 정보 저장' : '상점주 정보 신청'}</Store.SaveButton></Store.FormFooter> : null}
    </Store.Form>
  )
}

function VerificationForm({
  verification,
  isSaving,
  disabled,
  onSave,
}: {
  verification: MerchantVerification | null
  isSaving: boolean
  disabled: boolean
  onSave: (request: MerchantVerificationRequest) => Promise<boolean>
}) {
  const [legalName, setLegalName] = useState(verification?.legalName ?? '')
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('')
  const [formError, setFormError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    if (!legalName.trim() || !businessRegistrationNumber.trim()) {
      setFormError('법적 성명과 사업자등록번호를 입력해주세요.')
      return
    }

    await onSave({
      legalName: legalName.trim(),
      businessRegistrationNumber: businessRegistrationNumber.trim(),
    })
  }

  return (
    <Store.Form onSubmit={submit}>
      <Store.Field>
        법적 성명
        <Store.Input value={legalName} maxLength={100} disabled={disabled || isSaving} onChange={(event) => setLegalName(event.target.value)} />
      </Store.Field>
      <Store.Field>
        기존 사업자등록번호
        <S.ReadonlyValue>{verification?.maskedBusinessRegistrationNumber ?? '아직 등록되지 않았습니다.'}</S.ReadonlyValue>
      </Store.Field>
      {!disabled ? <Store.Field $wide>
        사업자등록번호
        <Store.Input value={businessRegistrationNumber} inputMode="numeric" maxLength={30} placeholder={verification ? '변경하거나 재신청할 번호를 입력하세요.' : '사업자등록번호를 입력하세요.'} disabled={isSaving} onChange={(event) => setBusinessRegistrationNumber(event.target.value)} />
        <S.FormHint>보안을 위해 저장된 번호는 일부만 표시됩니다. 수정·재신청 시 번호를 다시 입력해야 합니다.</S.FormHint>
      </Store.Field> : null}
      {formError ? <S.FormNotice><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{formError}</Store.Notice></S.FormNotice> : null}
      {!disabled ? <Store.FormFooter><Store.SaveButton type="submit" disabled={isSaving}>{isSaving ? '저장 중' : verification ? '검증 정보 저장' : '사업자 검증 신청'}</Store.SaveButton></Store.FormFooter> : null}
    </Store.Form>
  )
}

function MerchantOnboardingPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const onboarding = useMerchantOnboarding()
  const { profile, verification } = onboarding
  const stepState = getStepState(profile, verification)
  const profileStatus = profile ? OWNER_STATUS[profile.status] : null
  const identityStatus = verification ? VERIFICATION_STATUS[verification.identityStatus] : null
  const businessStatus = verification ? VERIFICATION_STATUS[verification.businessStatus] : null
  const isLocked = profile?.status === 'ACTIVE' || profile?.status === 'REVOKED'

  useEffect(() => {
    if (profile?.status === 'ACTIVE') {
      navigate('/merchant', { replace: true })
    }
  }, [navigate, profile?.status])

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  if (onboarding.status === 'error') {
    return (
      <Store.Page>
        <Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header>
        <Store.Content>
          <Store.PageIntro><div><Store.Eyebrow>Merchant Portal</Store.Eyebrow><Store.PageTitle>상점주 신청</Store.PageTitle></div></Store.PageIntro>
          <Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{onboarding.errorMessage}</Store.Notice>
          <div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void onboarding.fetchOnboarding()}>다시 시도</Store.RetryButton></div>
        </Store.Content>
      </Store.Page>
    )
  }

  return (
    <Store.Page>
      <Store.Header>
        <Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
        <Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{user?.username ?? '사용자'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser>
      </Store.Header>
      <Store.Content>
        <Store.PageIntro>
          <div>
            <Store.Eyebrow>Merchant Portal</Store.Eyebrow>
            <Store.PageTitle>상점주 신청</Store.PageTitle>
            <Store.PageDescription>상점주 정보와 사업자 검증을 제출하면 관리자가 순서대로 심사합니다.</Store.PageDescription>
          </div>
        </Store.PageIntro>

        <S.Stack>
          <S.Progress aria-label="상점주 신청 진행 상태">
            <S.ProgressStep $active={!stepState.profileComplete} $complete={stepState.profileComplete}><S.StepNumber $active={!stepState.profileComplete} $complete={stepState.profileComplete}>{stepState.profileComplete ? '✓' : '1'}</S.StepNumber><S.StepText><strong>상점주 정보</strong><span>사업자와 연락처를 등록합니다.</span></S.StepText></S.ProgressStep>
            <S.ProgressStep $active={stepState.profileComplete && !stepState.verificationComplete} $complete={stepState.verificationComplete}><S.StepNumber $active={stepState.profileComplete && !stepState.verificationComplete} $complete={stepState.verificationComplete}>{stepState.verificationComplete ? '✓' : '2'}</S.StepNumber><S.StepText><strong>사업자 검증</strong><span>신원과 사업자 정보를 확인합니다.</span></S.StepText></S.ProgressStep>
            <S.ProgressStep $active={stepState.reviewActive && !stepState.verificationComplete}><S.StepNumber $active={stepState.reviewActive && !stepState.verificationComplete}>3</S.StepNumber><S.StepText><strong>심사 결과</strong><span>승인 후 가게 관리가 열립니다.</span></S.StepText></S.ProgressStep>
          </S.Progress>

          {onboarding.errorMessage ? <Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{onboarding.errorMessage}</Store.Notice> : null}
          {onboarding.successMessage ? <Store.Notice $tone="success" role="status"><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{onboarding.successMessage}</Store.Notice> : null}

          <S.Panel>
            <S.PanelHeading><div><S.PanelTitle>신청 현황</S.PanelTitle><S.PanelDescription>각 신청은 별도로 저장됩니다. 심사 상태는 새로고침해도 유지됩니다.</S.PanelDescription></div>{profileStatus ? <S.StatusBadge $tone={profileStatus.tone}>{profileStatus.label}</S.StatusBadge> : <S.StatusBadge $tone="neutral">신청 전</S.StatusBadge>}</S.PanelHeading>
            <S.StatusRows>
              <S.StatusRow><strong>상점주 신청</strong><span>{profileStatus?.label ?? '신청 전'}</span></S.StatusRow>
              <S.StatusRow><strong>신원 검증</strong><span>{identityStatus?.label ?? '미제출'}</span></S.StatusRow>
              <S.StatusRow><strong>사업자 검증</strong><span>{businessStatus?.label ?? '미제출'}</span></S.StatusRow>
              {profile ? <S.StatusRow><strong>온보딩</strong><span>{ONBOARDING_STATUS[profile.onboardingStatus]} · {profile.onboardingCompletionRate}% 완료</span></S.StatusRow> : null}
            </S.StatusRows>
            {verification?.reviewReason ? <S.ReviewReason><strong>검토 의견</strong>{verification.reviewReason}</S.ReviewReason> : null}
          </S.Panel>

          <S.Panel>
            <S.PanelHeading><div><S.PanelTitle>상점주 정보</S.PanelTitle><S.PanelDescription>상점주 승인과 운영 안내에 사용하는 기본 정보입니다.</S.PanelDescription></div>{profileStatus ? <S.StatusBadge $tone={profileStatus.tone}>{profileStatus.label}</S.StatusBadge> : null}</S.PanelHeading>
            {onboarding.profileErrorMessage ? <div style={{ marginBottom: 16 }}><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{onboarding.profileErrorMessage}</Store.Notice></div> : null}
            <ProfileForm key={profile?.updatedAt ?? 'new-profile'} profile={profile} isSaving={onboarding.isSavingProfile} disabled={isLocked} onSave={onboarding.saveProfile} />
          </S.Panel>

          <S.Panel>
            <S.PanelHeading><div><S.PanelTitle>사업자 검증</S.PanelTitle><S.PanelDescription>법적 성명과 사업자등록번호를 기준으로 신원·사업자 정보를 심사합니다.</S.PanelDescription></div>{verification ? <S.StatusBadge $tone={identityStatus?.tone === 'danger' || businessStatus?.tone === 'danger' ? 'danger' : identityStatus?.tone === 'active' && businessStatus?.tone === 'active' ? 'active' : 'pending'}>{identityStatus?.label === '승인' && businessStatus?.label === '승인' ? '검증 완료' : '검증 진행 중'}</S.StatusBadge> : null}</S.PanelHeading>
            {onboarding.verificationErrorMessage ? <div style={{ marginBottom: 16 }}><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{onboarding.verificationErrorMessage}</Store.Notice></div> : null}
            <VerificationForm key={verification?.updatedAt ?? 'new-verification'} verification={verification} isSaving={onboarding.isSavingVerification} disabled={isLocked} onSave={onboarding.saveVerification} />
          </S.Panel>
        </S.Stack>
      </Store.Content>
    </Store.Page>
  )
}

export default MerchantOnboardingPage
