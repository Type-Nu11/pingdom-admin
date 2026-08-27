import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelMerchantPlaceApplication,
  createMerchantPlaceApplication,
  deleteMerchantPlaceApplicationAttachment,
  getMerchantPlaceApplication,
  getMerchantPlaceApplications,
  reopenMerchantPlaceApplication,
  reorderMerchantPlaceApplicationAttachments,
  submitMerchantPlaceApplication,
  updateMerchantPlaceApplication,
  uploadMerchantPlaceApplicationAttachment,
} from '../api/merchantPlaceApplicationApi'
import { getMerchantOwnerProfile } from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type { MerchantOwnerProfile } from '../types/merchantStore.types'
import type {
  MerchantPlaceApplication,
  MerchantPlaceApplicationAttachment,
  MerchantPlaceApplicationErrorResponse,
  MerchantNewPlaceApplicationRequest,
} from '../types/merchantPlaceApplication.types'
import type {
  MerchantPlaceRegistration,
  MerchantPlaceRegistrationRequest,
} from '../types/merchantPlaceRegistration.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type LoadStatus = 'loading' | 'ready' | 'error'
type Action = 'save' | 'submit' | 'reopen' | 'cancel' | 'detail' | 'upload' | 'delete' | 'reorder' | null

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isApiError<MerchantPlaceApplicationErrorResponse>(error)) return fallbackMessage
  return getAuthErrorMessage(error, {
    fallbackMessage,
    codeMessages: {
      ACCESS_DENIED: '상점주 권한이 필요합니다.',
      INVALID_TOKEN: '로그인이 만료되었습니다. 다시 로그인해주세요.',
    },
  })
}

function toRegistration(application: MerchantPlaceApplication): MerchantPlaceRegistration | null {
  if (application.applicationType !== 'NEW_PLACE' || !application.newPlace) return null
  const place = application.newPlace
  return {
    id: application.id,
    applicantUserId: application.applicantUserId,
    status: application.status,
    placeName: place.placeName,
    category: place.category,
    latitude: place.latitude,
    longitude: place.longitude,
    roadAddress: place.roadAddress,
    jibunAddress: place.jibunAddress,
    postalCode: place.postalCode,
    description: place.description,
    businessContactPhone: place.businessContactPhone,
    applicantContactPhone: place.applicantContactPhone,
    legalName: application.legalName,
    businessName: application.businessName,
    merchantDisplayName: application.merchantDisplayName,
    merchantContactEmail: application.merchantContactEmail,
    merchantContactPhone: application.merchantContactPhone,
    reviewReason: application.reviewReason,
    registeredPlaceId: application.placeId,
    submittedAt: application.submittedAt,
    reviewedAt: application.reviewedAt,
    registeredAt: application.completedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    submissionVersion: application.submissionVersion,
    submissionContentHash: null,
    canceledAt: application.canceledAt,
    tags: place.tags,
    attachments: application.attachments,
    timezone: place.timezone,
    operatingScheduleJson: JSON.stringify(place.operatingDays ?? []),
  }
}

function replaceRegistration(current: MerchantPlaceRegistration[], next: MerchantPlaceRegistration) {
  const index = current.findIndex((registration) => registration.id === next.id)
  if (index === -1) return [next, ...current]
  return current.map((registration) => (registration.id === next.id ? next : registration))
}

function toRequest(request: MerchantPlaceRegistrationRequest): MerchantNewPlaceApplicationRequest {
  const {
    legalName,
    businessName,
    businessRegistrationNumber,
    merchantDisplayName,
    merchantContactEmail,
    merchantContactPhone,
    merchantDescription,
    ...newPlace
  } = request
  return {
    applicationType: 'NEW_PLACE',
    legalName,
    businessName,
    businessRegistrationNumber,
    merchantDisplayName,
    merchantContactEmail,
    merchantContactPhone,
    merchantDescription,
    newPlace,
  }
}

export function useMerchantPlaceRegistrations() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const [registrations, setRegistrations] = useState<MerchantPlaceRegistration[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeAction, setActiveAction] = useState<Action>(null)
  const mountedRef = useRef(true)
  const actionRef = useRef<Action>(null)

  const clearUnauthorizedSession = useCallback((error: unknown) => {
    if (isApiError(error) && error.category === 'unauthorized') clearAuth()
  }, [clearAuth])

  const applyApplication = useCallback((application: MerchantPlaceApplication) => {
    const registration = toRegistration(application)
    if (registration) setRegistrations((current) => replaceRegistration(current, registration))
    return registration
  }, [])

  const fetchRegistrations = useCallback(async () => {
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'))
    setErrorMessage('')
    const [profileResult, applicationsResult] = await Promise.allSettled([
      getMerchantOwnerProfile(),
      getMerchantPlaceApplications({ page: 1, limit: 100 }),
    ])
    if (!mountedRef.current) return
    if (profileResult.status === 'fulfilled') setProfile(profileResult.value)
    if (applicationsResult.status === 'fulfilled') {
      setRegistrations(applicationsResult.value.items.flatMap((application) => {
        const registration = toRegistration(application)
        return registration ? [registration] : []
      }))
    }
    const failures = [profileResult, applicationsResult].filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )
    if (failures.length === 2) {
      failures.forEach((result) => clearUnauthorizedSession(result.reason))
      setStatus('error')
      setErrorMessage('신규 장소 등록 신청 정보를 불러오지 못했습니다.')
      return
    }
    setStatus('ready')
    if (failures.length > 0) {
      failures.forEach((result) => logDebugError('신규 장소 등록 신청 일부 조회 실패', result.reason))
      setErrorMessage('일부 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }, [clearUnauthorizedSession])

  useEffect(() => {
    mountedRef.current = true
    void fetchRegistrations()
    return () => { mountedRef.current = false }
  }, [fetchRegistrations])

  const runAction = useCallback(async <T,>(
    action: Exclude<Action, null>,
    task: () => Promise<T>,
    apply: (value: T) => void,
    success: string,
    fallback: string,
  ) => {
    if (actionRef.current) return null
    actionRef.current = action
    setActiveAction(action)
    setActionErrorMessage('')
    setSuccessMessage('')
    try {
      const result = await task()
      if (!mountedRef.current) return null
      apply(result)
      setSuccessMessage(success)
      return result
    } catch (error) {
      if (mountedRef.current) {
        clearUnauthorizedSession(error)
        setActionErrorMessage(getErrorMessage(error, fallback))
        logDebugError(`신규 장소 등록 신청 ${action} 실패`, error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setActiveAction(null)
    }
  }, [clearUnauthorizedSession])

  const selectRegistration = useCallback((applicationId: number) => runAction(
    'detail',
    () => getMerchantPlaceApplication(applicationId),
    applyApplication,
    '',
    '신청 상세를 불러오지 못했습니다.',
  ), [applyApplication, runAction])

  const saveRegistration = useCallback((applicationId: number | null, request: MerchantPlaceRegistrationRequest) => runAction(
    'save',
    () => applicationId
      ? updateMerchantPlaceApplication(applicationId, toRequest(request))
      : createMerchantPlaceApplication(toRequest(request)),
    applyApplication,
    applicationId ? '신규 장소 신청서를 저장했습니다.' : '신규 장소 신청서를 만들었습니다.',
    '신규 장소 신청서를 저장하지 못했습니다.',
  ).then((application) => application ? toRegistration(application) : null), [applyApplication, runAction])

  const submitRegistration = useCallback((applicationId: number) => runAction(
    'submit',
    () => submitMerchantPlaceApplication(applicationId),
    applyApplication,
    '신규 장소 등록 신청을 제출했습니다.',
    '신규 장소 등록 신청을 제출하지 못했습니다.',
  ).then((application) => application ? toRegistration(application) : null), [applyApplication, runAction])

  const reopenRegistration = useCallback((applicationId: number) => runAction(
    'reopen',
    () => reopenMerchantPlaceApplication(applicationId),
    applyApplication,
    '신청서를 다시 열었습니다. 내용을 보완한 뒤 제출해주세요.',
    '신청서를 다시 열지 못했습니다.',
  ).then((application) => application ? toRegistration(application) : null), [applyApplication, runAction])

  const cancelRegistration = useCallback((applicationId: number) => runAction(
    'cancel',
    () => cancelMerchantPlaceApplication(applicationId),
    applyApplication,
    '신규 장소 등록 신청을 취소했습니다.',
    '신규 장소 등록 신청을 취소하지 못했습니다.',
  ).then((application) => application ? toRegistration(application) : null), [applyApplication, runAction])

  const refreshAttachments = useCallback(async (applicationId: number, attachmentAction: () => Promise<unknown>) => {
    await attachmentAction()
    const application = await getMerchantPlaceApplication(applicationId)
    applyApplication(application)
  }, [applyApplication])

  const uploadAttachment = useCallback((applicationId: number, documentType: MerchantPlaceApplicationAttachment['documentType'], file: File) => runAction(
    'upload',
    () => refreshAttachments(applicationId, () => uploadMerchantPlaceApplicationAttachment(applicationId, documentType, file)),
    () => undefined,
    '증빙 파일을 추가했습니다.',
    '증빙 파일을 추가하지 못했습니다.',
  ), [refreshAttachments, runAction])

  const deleteAttachment = useCallback((applicationId: number, attachmentId: number) => runAction(
    'delete',
    () => refreshAttachments(applicationId, () => deleteMerchantPlaceApplicationAttachment(applicationId, attachmentId)),
    () => undefined,
    '증빙 파일을 삭제했습니다.',
    '증빙 파일을 삭제하지 못했습니다.',
  ), [refreshAttachments, runAction])

  const reorderAttachments = useCallback((applicationId: number, attachmentIds: number[]) => runAction(
    'reorder',
    () => refreshAttachments(applicationId, () => reorderMerchantPlaceApplicationAttachments(applicationId, attachmentIds)),
    () => undefined,
    '대표 이미지 순서를 변경했습니다.',
    '대표 이미지 순서를 변경하지 못했습니다.',
  ), [refreshAttachments, runAction])

  return {
    status, profile, registrations, errorMessage, actionErrorMessage, successMessage, activeAction,
    fetchRegistrations, selectRegistration, saveRegistration, submitRegistration,
    reopenRegistration, cancelRegistration, uploadAttachment, deleteAttachment, reorderAttachments,
  }
}
