import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GlobalStyle } from '../styles/globalStyle'
import NaverGlPreview from './NaverGlPreview'

// Separate entry prevents component Fast Refresh from creating another root.
// This HTML entry is development-only and is not a production build input.
if (import.meta.env.DEV) {
  createRoot(document.getElementById('root')!).render(<StrictMode><GlobalStyle /><NaverGlPreview /></StrictMode>)
}
