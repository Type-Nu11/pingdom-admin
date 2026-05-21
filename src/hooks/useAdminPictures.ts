import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteAdminPicture, getAdminPictures } from '../api/adminPictureApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { useAuth } from './useAuth'
import type {
  AdminPicture,
  AdminPictureDeleteErrorResponse,
  AdminPictureListErrorResponse,
} from '../types/adminPicture.types'

const ADMIN_PICTURE_ERROR_MESSAGE = '사진 목록을 불러오는 중 오류가 발생했습니다.'
const ADMIN_PICTURE_CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked':
    '서버 응답을 읽지 못했습니다. CORS 설정 또는 서버 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}
const ADMIN_PICTURE_CODE_MESSAGES = {
  INVALID_TOKEN: '로그인이 필요합니다. 다시 로그인해주세요.',
  PICTURE_NOT_FOUND: '이미 삭제되었거나 존재하지 않는 사진입니다.',
  DELETE_ERROR: '사진 삭제 중 오류가 발생했습니다.',
  S3_CONNECTION_ERROR: '이미지 저장소 연결 중 오류가 발생했습니다.',
}

function getAdminPictureErrorMessage(error: unknown) {
  if (!isApiError<AdminPictureListErrorResponse | AdminPictureDeleteErrorResponse>(error)) {
    return ADMIN_PICTURE_ERROR_MESSAGE
  }

  return getAuthErrorMessage(error, {
    fallbackMessage: ADMIN_PICTURE_ERROR_MESSAGE,
    codeMessages: ADMIN_PICTURE_CODE_MESSAGES,
    categoryMessages: ADMIN_PICTURE_CATEGORY_MESSAGES,
  })
}

function shouldClearAuth(error: unknown) {
  return (
    isApiError<AdminPictureListErrorResponse | AdminPictureDeleteErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
  )
}

export function useAdminPictures(limit = 20) {
  const { clearAuth } = useAuth()
  const [pictures, setPictures] = useState<AdminPicture[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [deletingPictureId, setDeletingPictureId] = useState<number | null>(null)
  const latestRequestIdRef = useRef(0)
  const isFetchingRef = useRef(false)
  const deletingPictureIdRef = useRef<number | null>(null)

  const fetchAdminPictures = useCallback(async () => {
    if (isFetchingRef.current) {
      return false
    }

    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId
    isFetchingRef.current = true

    setIsError(false)
    setErrorMessage('')
    setActionErrorMessage('')

    try {
      setIsLoading(true)

      const data = await getAdminPictures(limit)

      if (requestId === latestRequestIdRef.current) {
        setPictures(data)
      }

      return true
    } catch (error) {
      if (requestId === latestRequestIdRef.current) {
        setPictures([])
        setIsError(true)
        setErrorMessage(getAdminPictureErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }
      }

      console.error('관리자 사진 목록 조회 실패', error)

      return false
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false)
      }

      isFetchingRef.current = false
    }
  }, [clearAuth, limit])

  const deletePicture = useCallback(
    async (pictureId: number) => {
      if (deletingPictureIdRef.current !== null) {
        return false
      }

      deletingPictureIdRef.current = pictureId
      setActionErrorMessage('')

      try {
        setDeletingPictureId(pictureId)

        await deleteAdminPicture(pictureId)
        setPictures((prevPictures) =>
          prevPictures.filter((picture) => picture.id !== pictureId)
        )

        return true
      } catch (error) {
        setActionErrorMessage(getAdminPictureErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        console.error('관리자 사진 삭제 실패', error)

        return false
      } finally {
        if (deletingPictureIdRef.current === pictureId) {
          deletingPictureIdRef.current = null
          setDeletingPictureId(null)
        }
      }
    },
    [clearAuth]
  )

  useEffect(() => {
    void fetchAdminPictures()
  }, [fetchAdminPictures])

  return {
    pictures,
    isLoading,
    isError,
    errorMessage,
    actionErrorMessage,
    deletingPictureId,
    fetchAdminPictures,
    deletePicture,
  }
}
