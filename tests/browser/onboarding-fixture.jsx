import React from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'styled-components'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { Router } from '../../src/app/router/Router'
import { theme } from '../../src/styles/theme'
import { GlobalStyle } from '../../src/styles/globalStyle'

const context = {
  isAuthReady: true, isAuthenticated: true, accessToken: '',
  user: { id: 123, username: 'synthetic-user', role: 'USER' },
  clearAuth() {}, logout: async () => {}, updateUser() {}, login() {},
}
createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}><GlobalStyle /><AuthContext.Provider value={context}><Router /></AuthContext.Provider></ThemeProvider>,
)
