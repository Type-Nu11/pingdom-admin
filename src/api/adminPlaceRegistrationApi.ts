import customAxios from './customAxios'
import type {
  AdminPlaceRegistrationApplication,
  AdminPlaceRegistrationPage,
  AdminPlaceRegistrationReviewRequest,
} from '../types/adminPlaceRegistration.types'

const PATH = '/admin/place-registration-applications'

export async function getAdminPlaceRegistrations(params: { page?: number; limit?: number }) {
  const { data } = await customAxios.get<AdminPlaceRegistrationPage>(PATH, { params })
  return data
}

export async function getAdminPlaceRegistration(applicationId: number) {
  const { data } = await customAxios.get<AdminPlaceRegistrationApplication>(`${PATH}/${applicationId}`)
  return data
}

export async function approveAdminPlaceRegistration(
  applicationId: number,
  request: AdminPlaceRegistrationReviewRequest,
) {
  const { data } = await customAxios.post<AdminPlaceRegistrationApplication>(
    `${PATH}/${applicationId}/approve`,
    request,
  )
  return data
}

export async function rejectAdminPlaceRegistration(
  applicationId: number,
  request: AdminPlaceRegistrationReviewRequest,
) {
  const { data } = await customAxios.post<AdminPlaceRegistrationApplication>(
    `${PATH}/${applicationId}/reject`,
    request,
  )
  return data
}
