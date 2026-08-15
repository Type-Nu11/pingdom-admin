import customAxios from './customAxios'
import type { AdminRole, AdminRoleAssignment } from '../types/adminUserRole.types'

function path(userId: number) { return `/admin/users/${userId}/roles` }

export async function getAdminUserRoles(userId: number) {
  const { data } = await customAxios.get<AdminRoleAssignment[]>(path(userId))
  return data
}

export async function assignAdminUserRole(userId: number, role: AdminRole, reason: string) {
  const { data } = await customAxios.post<AdminRoleAssignment>(path(userId), { role, reason })
  return data
}

export async function revokeAdminUserRole(userId: number, role: AdminRole, reason: string) {
  const { data } = await customAxios.delete<AdminRoleAssignment>(`${path(userId)}/${role}`, { data: { reason } })
  return data
}
