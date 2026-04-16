import { createGlobalStyle } from 'styled-components'

// 앱 전체에 적용되는 기본 스타일입니다.
export const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    min-height: 100%;
  }

  body {
    margin: 0;
    color: #111827;
    background: #f7f8fa;
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      sans-serif;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  main {
    min-height: 100vh;
    padding: 32px;
  }
`
