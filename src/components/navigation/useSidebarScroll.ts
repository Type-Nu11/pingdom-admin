import { useContext, useLayoutEffect, useRef } from 'react'
import { AuthContext } from '../../app/providers/AuthContext'
import { getAuthSessionId } from '../../utils/authStorage'

type SidebarScope = 'admin' | 'merchant'
const positions = new Map<SidebarScope, { sessionKey: string; top: number; left: number }>()

export function useSidebarScroll(scope: SidebarScope) {
  const auth = useContext(AuthContext)
  const sessionKey = `${getAuthSessionId()}:${auth?.user?.id ?? ''}:${auth?.user?.role ?? ''}`
  const navigationRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const sideMenu = navigationRef.current?.parentElement
    if (!sideMenu) return

    const saved = positions.get(scope)
    const position = saved?.sessionKey === sessionKey ? saved : { sessionKey, top: 0, left: 0 }
    positions.set(scope, position)
    sideMenu.scrollTop = position.top
    sideMenu.scrollLeft = position.left

    const savePosition = () => {
      // Ignore a departing session's late scroll events.
      if (positions.get(scope) !== position) return
      position.top = sideMenu.scrollTop
      position.left = sideMenu.scrollLeft
    }
    sideMenu.addEventListener('scroll', savePosition, { passive: true })
    return () => {
      // Unmounting can already have reset the element's geometry.
      sideMenu.removeEventListener('scroll', savePosition)
    }
  }, [scope, sessionKey])

  return { navigationRef, sessionKey }
}
