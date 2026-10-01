export const NAVIGATION_STATE_KEY = 'admin-navigation-state:v1'

export interface NavigationState {
  closedGroups: string[]
  placeManagementOpen: boolean
}

export function readNavigationState(fallback: NavigationState = { closedGroups: [], placeManagementOpen: true }): NavigationState {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(NAVIGATION_STATE_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return fallback
    const stored = value as Partial<NavigationState>
    return {
      closedGroups: Array.isArray(stored.closedGroups) ? stored.closedGroups.filter((id): id is string => typeof id === 'string') : fallback.closedGroups,
      placeManagementOpen: typeof stored.placeManagementOpen === 'boolean' ? stored.placeManagementOpen : fallback.placeManagementOpen,
    }
  } catch { return fallback }
}

export function saveNavigationState(state: NavigationState) {
  try { window.sessionStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state)) }
  catch { /* Navigation remains usable when browser storage is unavailable. */ }
}
