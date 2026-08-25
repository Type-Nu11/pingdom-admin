import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantOnboarding } from '../../hooks/useMerchantOnboarding'
import {
  getMerchantOnboardingStage,
  type MerchantOnboardingStage,
} from './merchantOnboardingStage'
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

type StatusTone = 'active' | 'pending' | 'danger' | 'neutral'

const OWNER_STATUS: Record<MerchantOwnerApplicationStatus, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: '승인 완료', tone: 'active' },
  PENDING: { label: '심사 중', tone: 'pending' },
  REJECTED: { label: '반려', tone: 'danger' },
  REVOKED: { label: '권한 회수', tone: 'danger' },
}

const VERIFICATION_STATUS: Record<MerchantVerificationStatus, { label: string; tone: StatusTone }> = {
  APPROVED: { label: '승인', tone: 'active' },
  PENDING: { label: '심사 중', tone: 'pending' },
  REJECTED: { label: '반려', tone: 'danger' },
}

function formatDateTime(value: string | null) {
  if (!value) return '기록 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function ProfileForm({
  profile,
  isSaving,
  isReapplying,
  onSave,
}: {
  profile: MerchantOwnerApplicationProfile | null
  isSaving: boolean
  isReapplying: boolean
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

  return <Store.Form onSubmit={submit}>
    <Store.Field>
      사업자명
      <Store.Input value={businessName} maxLength={100} disabled={isSaving} onChange={(event) => setBusinessName(event.target.value)} />
    </Store.Field>
    <Store.Field>
      상점주 노출명
      <Store.Input value={displayName} maxLength={100} disabled={isSaving} onChange={(event) => setDisplayName(event.target.value)} />
    </Store.Field>
    <Store.Field>
      연락 이메일
      <Store.Input type="email" value={contactEmail} maxLength={255} disabled={isSaving} onChange={(event) => setContactEmail(event.target.value)} />
    </Store.Field>
    <Store.Field>
      연락처
      <Store.Input value={contactPhone} maxLength={30} disabled={isSaving} onChange={(event) => setContactPhone(event.target.value)} />
    </Store.Field>
    <Store.Field $wide>
      상점 소개
      <Store.Textarea value={description} maxLength={1000} disabled={isSaving} onChange={(event) => setDescription(event.target.value)} />
      <S.FormHint>{description.length}/1000</S.FormHint>
    </Store.Field>
    {formError ? <S.FormNotice><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{formError}</Store.Notice></S.FormNotice> : null}
    <Store.FormFooter><Store.SaveButton type="submit" disabled={isSaving}>{isSaving ? '제출 중' : isReapplying ? '정보 수정 후 재신청' : '다음: 사업자 검증'}</Store.SaveButton></Store.FormFooter>
  </Store.Form>
}

function VerificationForm({
  verification,
  isSaving,
  isReapplying,
  onSave,
}: {
  verification: MerchantVerification | null
  isSaving: boolean
  isReapplying: boolean
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

  return <Store.Form onSubmit={submit}>
    <Store.Field>
      법적 성명
      <Store.Input value={legalName} maxLength={100} disabled={isSaving} onChange={(event) => setLegalName(event.target.value)} />
    </Store.Field>
    <Store.Field>
      기존 사업자등록번호
      <S.ReadonlyValue>{verification?.maskedBusinessRegistrationNumber ?? '아직 등록되지 않았습니다.'}</S.ReadonlyValue>
    </Store.Field>
    <Store.Field $wide>
      사업자등록번호
      <Store.Input value={businessRegistrationNumber} inputMode="numeric" maxLength={30} placeholder={verification ? '변경하거나 재신청할 번호를 입력하세요.' : '사업자등록번호를 입력하세요.'} disabled={isSaving} onChange={(event) => setBusinessRegistrationNumber(event.target.value)} />
      <S.FormHint>보안을 위해 저장된 번호는 일부만 표시됩니다. 재신청 시 번호를 다시 입력해야 합니다.</S.FormHint>
    </Store.Field>
    {formError ? <S.FormNotice><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{formError}</Store.Notice></S.FormNotice> : null}
    <Store.FormFooter><Store.SaveButton type="submit" disabled={isSaving}>{isSaving ? '제출 중' : isReapplying ? '검증 정보 재신청' : '검증 신청하기'}</Store.SaveButton></Store.FormFooter>
  </Store.Form>
}

function ApplicationProgress({ stage, profile, verification }: { stage: MerchantOnboardingStage; profile: MerchantOwnerApplicationProfile | null; verification: MerchantVerification | null }) {
  const profileComplete = Boolean(profile) && stage !== 'profile-reapply'
  const verificationComplete = Boolean(verification) && stage !== 'verification-reapply' && stage !== 'profile-reapply'
  const reviewActive = stage === 'review'

  return <S.Progress aria-label="상점주 신청 진행 상태">
    <S.ProgressStep $active={stage === 'profile' || stage === 'profile-reapply'} $complete={profileComplete}><S.StepNumber $active={stage === 'profile' || stage === 'profile-reapply'} $complete={profileComplete}>{profileComplete ? '✓' : '1'}</S.StepNumber><S.StepText><strong>상점주 정보</strong><span>사업자와 연락처를 등록합니다.</span></S.StepText></S.ProgressStep>
    <S.ProgressStep $active={stage === 'verification' || stage === 'verification-reapply'} $complete={verificationComplete}><S.StepNumber $active={stage === 'verification' || stage === 'verification-reapply'} $complete={verificationComplete}>{verificationComplete ? '✓' : '2'}</S.StepNumber><S.StepText><strong>사업자 검증</strong><span>신원과 사업자 정보를 확인합니다.</span></S.StepText></S.ProgressStep>
    <S.ProgressStep $active={reviewActive} $complete={stage === 'approved'}><S.StepNumber $active={reviewActive} $complete={stage === 'approved'}>{stage === 'approved' ? '✓' : '3'}</S.StepNumber><S.StepText><strong>심사 결과</strong><span>승인 후 가게 관리가 열립니다.</span></S.StepText></S.ProgressStep>
  </S.Progress>
}

function ApplicationSummary({ profile, verification }: { profile: MerchantOwnerApplicationProfile; verification: MerchantVerification | null }) {
  const profileStatus = OWNER_STATUS[profile.status]
  const identityStatus = verification ? VERIFICATION_STATUS[verification.identityStatus] : null
  const businessStatus = verification ? VERIFICATION_STATUS[verification.businessStatus] : null

  return <S.SummaryRows>
    <S.SummaryRow><strong>상점주 신청</strong><span>{profileStatus.label}</span><small>{formatDateTime(profile.createdAt)} 제출</small></S.SummaryRow>
    <S.SummaryRow><strong>신원 검증</strong><span>{identityStatus?.label ?? '미제출'}</span><small>{verification ? `${formatDateTime(verification.createdAt)} 제출` : '사업자 검증을 제출해주세요.'}</small></S.SummaryRow>
    <S.SummaryRow><strong>사업자 검증</strong><span>{businessStatus?.label ?? '미제출'}</span><small>{verification?.reviewedAt ? `${formatDateTime(verification.reviewedAt)} 검토` : '검토가 완료되면 결과가 표시됩니다.'}</small></S.SummaryRow>
  </S.SummaryRows>
}

function MerchantOnboardingPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const onboarding = useMerchantOnboarding()
  const { profile, verification } = onboarding
  const stage = getMerchantOnboardingStage(profile, verification)
  const isProfileReapplying = stage === 'profile-reapply'
  const isVerificationReapplying = stage === 'verification-reapply'

  useEffect(() => {
    if (stage === 'approved') navigate('/merchant', { replace: true })
  }, [navigate, stage])

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  if (onboarding.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.Eyebrow>Merchant Portal</Store.Eyebrow><Store.PageTitle>상점주 신청</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{onboarding.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void onboarding.fetchOnboarding()}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  const panelTitle = stage === 'profile' ? '상점주 정보 등록' : stage === 'profile-reapply' ? '상점주 정보 재신청' : stage === 'verification' ? '사업자 검증 신청' : stage === 'verification-reapply' ? '사업자 검증 재신청' : '신청 현황'
  const panelDescription = stage === 'profile' ? '상점 운영에 필요한 기본 정보를 등록합니다.' : stage === 'profile-reapply' ? '제출 정보를 확인하고 수정한 뒤 다시 신청하세요.' : stage === 'verification' ? '법적 성명과 사업자등록번호를 제출하면 검증이 시작됩니다.' : stage === 'verification-reapply' ? '검토 의견을 반영해 사업자 정보를 다시 제출하세요.' : '제출한 정보와 현재 심사 단계를 확인할 수 있습니다.'

  return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{user?.username ?? '사용자'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.Eyebrow>Merchant Portal</Store.Eyebrow><Store.PageTitle>상점주 신청</Store.PageTitle><Store.PageDescription>검증이 완료되면 내 가게의 정보와 운영 기능을 관리할 수 있습니다.</Store.PageDescription></div></Store.PageIntro>
    <S.Stack>
      <ApplicationProgress stage={stage} profile={profile} verification={verification} />
      {onboarding.errorMessage ? <Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{onboarding.errorMessage}</Store.Notice> : null}
      {onboarding.successMessage ? <Store.Notice $tone="success" role="status"><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{onboarding.successMessage}</Store.Notice> : null}
      <S.Panel>
        <S.PanelHeading><div><S.PanelTitle>{panelTitle}</S.PanelTitle><S.PanelDescription>{panelDescription}</S.PanelDescription></div>{stage === 'review' ? <S.StatusBadge $tone="pending">심사 중</S.StatusBadge> : isProfileReapplying || isVerificationReapplying ? <S.StatusBadge $tone="danger">보완 필요</S.StatusBadge> : null}</S.PanelHeading>
        {stage === 'profile' ? <><S.IntroNotice><strong>검증이 필요한 이유</strong><span>검증된 상점주만 장소 운영, 예약, 혜택, 정산 기능을 사용할 수 있습니다.</span></S.IntroNotice>{onboarding.profileErrorMessage ? <S.FormNotice><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{onboarding.profileErrorMessage}</Store.Notice></S.FormNotice> : null}<ProfileForm profile={null} isSaving={onboarding.isSavingProfile} isReapplying={false} onSave={onboarding.saveProfile} /></> : null}
        {stage === 'profile-reapply' && profile ? <><S.ReviewReason><strong>{profile.status === 'REVOKED' ? '권한 회수 안내' : '재신청 안내'}</strong>{verification?.reviewReason ?? '제출 정보를 확인하고 필요한 내용을 수정한 뒤 다시 신청해주세요.'}</S.ReviewReason>{onboarding.profileErrorMessage ? <S.FormNotice><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{onboarding.profileErrorMessage}</Store.Notice></S.FormNotice> : null}<ProfileForm key={profile.updatedAt} profile={profile} isSaving={onboarding.isSavingProfile} isReapplying onSave={onboarding.saveProfile} /></> : null}
        {stage === 'verification' && profile ? <><S.ReadonlySummary><strong>{profile.businessName}</strong><span>{profile.contactEmail} · {profile.contactPhone}</span></S.ReadonlySummary>{onboarding.verificationErrorMessage ? <S.FormNotice><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{onboarding.verificationErrorMessage}</Store.Notice></S.FormNotice> : null}<VerificationForm verification={null} isSaving={onboarding.isSavingVerification} isReapplying={false} onSave={onboarding.saveVerification} /></> : null}
        {stage === 'verification-reapply' && verification ? <><S.ReviewReason><strong>검토 의견</strong>{verification.reviewReason ?? '제출 정보를 확인하고 다시 신청해주세요.'}</S.ReviewReason>{onboarding.verificationErrorMessage ? <S.FormNotice><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{onboarding.verificationErrorMessage}</Store.Notice></S.FormNotice> : null}<VerificationForm key={verification.updatedAt} verification={verification} isSaving={onboarding.isSavingVerification} isReapplying onSave={onboarding.saveVerification} /></> : null}
        {stage === 'review' && profile ? <><S.ReviewState><span aria-hidden="true">schedule</span><div><strong>제출한 신청을 검토하고 있습니다.</strong><p>검토가 끝나면 상점주 권한이 활성화되고 가게 관리로 이동할 수 있습니다.</p></div></S.ReviewState><ApplicationSummary profile={profile} verification={verification} /><S.FormActions><Store.RetryButton type="button" onClick={() => void onboarding.fetchOnboarding()}>상태 새로고침</Store.RetryButton></S.FormActions></> : null}
        {stage === 'approved' ? <S.ReviewState><span aria-hidden="true">check_circle</span><div><strong>상점주 권한이 승인되었습니다.</strong><p>가게 관리 화면으로 이동하고 있습니다.</p></div></S.ReviewState> : null}
      </S.Panel>
    </S.Stack>
  </Store.Content></Store.Page>
}

export default MerchantOnboardingPage
