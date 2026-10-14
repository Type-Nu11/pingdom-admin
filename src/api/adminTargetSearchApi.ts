import customAxios from './customAxios'
import { getAdminPlaces } from './adminPlaceApi'

export interface AdminTarget { id: number; name: string; description?: string }
export interface AdminTargetPage { items: AdminTarget[]; totalCount: number; totalPages: number; hasNext: boolean }
export async function searchAdminPlaces(keyword: string, page: number): Promise<AdminTargetPage> {
  const data = await getAdminPlaces({ keyword, page, limit: 10 })
  return { ...data, items: data.places.map(place => ({ id: place.id, name: place.name, description: place.address })) }
}
export async function searchAdminRoleTargets(keyword: string, page: number): Promise<AdminTargetPage> {
  const { data } = await customAxios.get<{ users: { userId: number; username: string }[]; totalCount: number; totalPages: number; hasNext: boolean }>(
    '/admin/users/role-targets', { params: { keyword, page, limit: 10 } },
  )
  return { ...data, items: data.users.map(user => ({ id: user.userId, name: user.username })) }
}
