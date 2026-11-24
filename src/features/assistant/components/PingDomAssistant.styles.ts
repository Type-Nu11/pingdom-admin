import styled from 'styled-components'
import { adminColors as c, typo } from '../../../styles/theme'

export const Launcher = styled.button`
  position: fixed;
  right: max(24px, env(safe-area-inset-right));
  bottom: max(24px, env(safe-area-inset-bottom));
  z-index: 60;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid ${c.border};
  border-radius: 999px;
  background: ${c.surface};
  color: ${c.text};
  font: inherit;
  font-weight: 700;
  box-shadow: 0 4px 16px #0002;
  cursor: pointer;
  &:hover { border-color: ${c.primary}; background: ${c.primaryTint}; }
`

export const Dialog = styled.dialog`
  position: fixed;
  inset: auto max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) auto;
  margin: 0;
  padding: 0;
  width: min(400px, calc(100vw - 48px));
  height: min(600px, calc(100dvh - 48px));
  max-width: none;
  max-height: none;
  background: ${c.surface};
  color: ${c.text};
  border: 1px solid ${c.border};
  border-radius: 16px;
  box-shadow: 0 12px 40px #0003;
  &[open] { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; }
  &::backdrop { background: #0003; }
  @media (max-width: 600px) {
    inset: auto 12px max(12px, env(safe-area-inset-bottom)) 12px;
    width: auto;
    height: min(620px, calc(100dvh - 24px));
  }
`

export const Header = styled.header`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid ${c.border};
  h2 { margin: 0; ${typo.headline2.bold} }
`
export const Actions = styled.div`display: flex; gap: 6px; flex-wrap: wrap;`
export const Button = styled.button`
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid ${c.border};
  border-radius: 8px;
  background: ${c.surface};
  color: ${c.text};
  font: inherit;
  cursor: pointer;
  &:not(:disabled):hover { background: ${c.primaryTint}; border-color: ${c.primary}; }
  &:disabled { cursor: not-allowed; color: ${c.muted}; background: ${c.surfaceLow}; }
`
export const Transcript = styled.div`
  overflow: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overscroll-behavior: contain;
`
export const Line = styled.div<{ $user?: boolean }>`
  align-self: ${({ $user }) => $user ? 'flex-end' : 'flex-start'};
  max-width: 96%;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ $user }) => $user ? c.primaryTint : c.surfaceLow};
  ${typo.body.regular}
  overflow-wrap: anywhere;
  p { margin: 0; white-space: pre-wrap; }
  dl { margin: 8px 0; }
  dl div { display: flex; justify-content: space-between; gap: 10px; }
  dd { margin: 0; text-align: right; ${typo.body.bold} }
  a { display: inline-block; margin: 6px 10px 0 0; color: ${c.infoText}; }
`
export const Hints = styled.p`margin: 0; color: ${c.muted}; ${typo.caption.regular}`
export const ErrorText = styled.p`margin: 0; color: ${c.errorText}; ${typo.caption.regular}`
export const Form = styled.form`
  padding: 12px 16px;
  border-top: 1px solid ${c.border};
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px;
  label, p { grid-column: 1 / -1; }
  textarea {
    width: 100%;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid ${c.borderDark};
    background: ${c.surface};
    color: ${c.text};
    font: inherit;
    resize: vertical;
    min-height: 44px;
    max-height: 110px;
  }
`
