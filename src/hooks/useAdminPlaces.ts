import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminPlaces } from '../api/adminPlaceApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { useAuth } from './useAuth'
import type {
  AdminPlaceItem,
  AdminPlaceListErrorResponse,
  AdminPlaceListRequest,
} from '../types/adminPlace.types'

const DEFAULT_ADMIN_PLACE_PAGE = 1
const DEFAULT_ADMIN_PLACE_LIMIT = 20
const MOCK_ADMIN_PLACE_TOTAL_COUNT = 23
const MOCK_ADMIN_PLACES: AdminPlaceItem[] = [
  {
    id: 1,
    name: '진주성',
    address: '경상남도 진주시 남강로 626',
    latitude: 35.1894,
    longitude: 128.0789,
    userId: 3,
  },
  {
    id: 2,
    name: '경복궁',
    address: '서울특별시 종로구 사직로 161',
    latitude: 37.5796,
    longitude: 126.977,
    userId: 4,
  },
  {
    id: 3,
    name: '광안리해수욕장',
    address: '부산광역시 수영구 광안해변로 219',
    latitude: 35.1532,
    longitude: 129.1186,
    userId: 5,
  },
  {
    id: 4,
    name: '한라산 국립공원',
    address: '제주특별자치도 제주시 1100로 2070-61',
    latitude: 33.3617,
    longitude: 126.5292,
    userId: 6,
  },
  {
    id: 5,
    name: '전주한옥마을',
    address: '전라북도 전주시 완산구 기린대로 99',
    latitude: 35.8151,
    longitude: 127.153,
    userId: 7,
  },
  {
    id: 6,
    name: '남산서울타워',
    address: '서울특별시 용산구 남산공원길 105',
    latitude: 37.5512,
    longitude: 126.9882,
    userId: 8,
  },
  {
    id: 7,
    name: '해운대해수욕장',
    address: '부산광역시 해운대구 우동',
    latitude: 35.1587,
    longitude: 129.1604,
    userId: 9,
  },
  {
    id: 8,
    name: '첨성대',
    address: '경상북도 경주시 인왕동 839-1',
    latitude: 35.8346,
    longitude: 129.219,
    userId: 10,
  },
  {
    id: 9,
    name: '대전 엑스포 과학공원',
    address: '대전광역시 유성구 대덕대로 480',
    latitude: 36.3762,
    longitude: 127.3876,
    userId: 11,
  },
  {
    id: 10,
    name: '수원화성',
    address: '경기도 수원시 장안구 영화동 320-2',
    latitude: 37.2871,
    longitude: 127.0115,
    userId: 12,
  },
  {
    id: 11,
    name: '순천만 국가정원',
    address: '전라남도 순천시 국가정원1호길 47',
    latitude: 34.9296,
    longitude: 127.5095,
    userId: 13,
  },
  {
    id: 12,
    name: '속초 중앙시장',
    address: '강원특별자치도 속초시 중앙로147번길 16',
    latitude: 38.2042,
    longitude: 128.5918,
    userId: 14,
  },
  {
    id: 13,
    name: '울산 대왕암공원',
    address: '울산광역시 동구 등대로 95',
    latitude: 35.4916,
    longitude: 129.4393,
    userId: 15,
  },
  {
    id: 14,
    name: '강릉 안목해변',
    address: '강원특별자치도 강릉시 창해로14번길',
    latitude: 37.7715,
    longitude: 128.947,
    userId: 16,
  },
  {
    id: 15,
    name: '인천 차이나타운',
    address: '인천광역시 중구 차이나타운로26번길',
    latitude: 37.475,
    longitude: 126.6195,
    userId: 17,
  },
  {
    id: 16,
    name: '대구 근대골목',
    address: '대구광역시 중구 계산동2가',
    latitude: 35.8692,
    longitude: 128.5898,
    userId: 18,
  },
  {
    id: 17,
    name: '목포 해상케이블카',
    address: '전라남도 목포시 해양대학로 240',
    latitude: 34.7854,
    longitude: 126.3756,
    userId: 19,
  },
  {
    id: 18,
    name: '통영 동피랑마을',
    address: '경상남도 통영시 동피랑1길 6-18',
    latitude: 34.8441,
    longitude: 128.4237,
    userId: 20,
  },
  {
    id: 19,
    name: '포항 영일대해수욕장',
    address: '경상북도 포항시 북구 두호동',
    latitude: 36.0595,
    longitude: 129.3782,
    userId: 21,
  },
  {
    id: 20,
    name: '담양 메타세쿼이아길',
    address: '전라남도 담양군 담양읍 학동리 633',
    latitude: 35.321,
    longitude: 126.9881,
    userId: 22,
  },
  {
    id: 21,
    name: '서울숲',
    address: '서울특별시 성동구 뚝섬로 273',
    latitude: 37.5444,
    longitude: 127.0374,
    userId: 23,
  },
  {
    id: 22,
    name: '여수 밤바다 거리',
    address: '전라남도 여수시 종화동',
    latitude: 34.7392,
    longitude: 127.7438,
    userId: 24,
  },
  {
    id: 23,
    name: '파주 출판도시',
    address: '경기도 파주시 회동길 145',
    latitude: 37.7083,
    longitude: 126.6878,
    userId: 25,
  },
]
const ADMIN_PLACE_ERROR_MESSAGE = '장소 목록을 불러오는 중 오류가 발생했습니다.'
const ADMIN_PLACE_CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked':
    '서버 응답을 읽지 못했습니다. CORS 설정 또는 서버 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}
const ADMIN_PLACE_CODE_MESSAGES = {
  INVALID_TOKEN: '로그인이 필요합니다. 다시 로그인해주세요.',
  PLACE_NOT_FOUND: '장소를 찾을 수 없습니다.',
}

function getAdminPlaceErrorMessage(error: unknown) {
  if (!isApiError<AdminPlaceListErrorResponse>(error)) {
    return ADMIN_PLACE_ERROR_MESSAGE
  }

  return getAuthErrorMessage(error, {
    fallbackMessage: ADMIN_PLACE_ERROR_MESSAGE,
    codeMessages: ADMIN_PLACE_CODE_MESSAGES,
    categoryMessages: ADMIN_PLACE_CATEGORY_MESSAGES,
  })
}

function shouldClearAuth(error: unknown) {
  return (
    isApiError<AdminPlaceListErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
  )
}

function getMockAdminPlaces({
  page = DEFAULT_ADMIN_PLACE_PAGE,
  limit = DEFAULT_ADMIN_PLACE_LIMIT,
}: AdminPlaceListRequest) {
  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const totalPages = Math.max(1, Math.ceil(MOCK_ADMIN_PLACE_TOTAL_COUNT / safeLimit))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const startIndex = (safePage - 1) * safeLimit
  const places = MOCK_ADMIN_PLACES.slice(startIndex, startIndex + safeLimit)

  return {
    places,
    page: safePage,
    limit: safeLimit,
    totalCount: MOCK_ADMIN_PLACE_TOTAL_COUNT,
    totalPages,
    hasNext: safePage < totalPages,
  }
}

interface UseAdminPlacesOptions {
  initialPage?: number
  limit?: number
  useMockData?: boolean
}

export function useAdminPlaces({
  initialPage = DEFAULT_ADMIN_PLACE_PAGE,
  limit = DEFAULT_ADMIN_PLACE_LIMIT,
  useMockData = false,
}: UseAdminPlacesOptions = {}) {
  const { clearAuth } = useAuth()
  const [places, setPlaces] = useState<AdminPlaceItem[]>([])
  const [page, setPage] = useState(initialPage)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const latestRequestIdRef = useRef(0)
  const latestListRequestRef = useRef<Required<AdminPlaceListRequest>>({
    page: initialPage,
    limit,
  })

  const fetchAdminPlaces = useCallback(async (request: AdminPlaceListRequest = {}) => {
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId

    setIsError(false)
    setErrorMessage('')

    const nextRequest = {
      page: request.page ?? latestListRequestRef.current.page,
      limit: request.limit ?? latestListRequestRef.current.limit,
    }

    try {
      setIsLoading(true)

      const data = useMockData
        ? getMockAdminPlaces(nextRequest)
        : await getAdminPlaces(nextRequest)

      if (requestId === latestRequestIdRef.current) {
        setPlaces(data.places)
        setPage(data.page)
        setTotalCount(data.totalCount)
        setTotalPages(data.totalPages)
        setHasNext(data.hasNext)
        latestListRequestRef.current = {
          page: data.page,
          limit: data.limit,
        }
      }

      return true
    } catch (error) {
      if (requestId === latestRequestIdRef.current) {
        setPlaces([])
        setIsError(true)
        setErrorMessage(getAdminPlaceErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }
      }

      console.error('관리자 장소 목록 조회 실패', error)

      return false
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [clearAuth, useMockData])

  useEffect(() => {
    void fetchAdminPlaces()
  }, [fetchAdminPlaces])

  return {
    places,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isError,
    errorMessage,
    fetchAdminPlaces,
  }
}
