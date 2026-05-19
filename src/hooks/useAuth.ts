import { useContext } from 'react'
import { AuthContext } from '../app/providers/AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.')
  }

  return context
}
