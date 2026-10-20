import { Outlet } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { merchantControlTheme } from '../../styles/merchantControlTheme'

export function MerchantControlLayout() {
  return <ThemeProvider theme={merchantControlTheme}><Outlet /></ThemeProvider>
}
