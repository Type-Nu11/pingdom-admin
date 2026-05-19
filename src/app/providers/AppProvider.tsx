import type { PropsWithChildren } from 'react'
import { ThemeProvider } from 'styled-components'
import { GlobalStyle } from '../../styles/globalStyle'
import { theme } from '../../styles/theme'
import { AuthProvider } from './AuthProvider'

// 앱 전역 provider와 전역 스타일을 연결하는 진입점입니다.
export function AppProvider({ children }: PropsWithChildren) {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <GlobalStyle />
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}
