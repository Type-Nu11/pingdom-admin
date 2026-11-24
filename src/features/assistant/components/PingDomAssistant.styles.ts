import styled, { css, keyframes } from 'styled-components'
import { adminColors as c, radius, typo } from '../../../styles/theme'

const focusRing = css`
  &:focus-visible { outline: 2px solid ${c.infoText}; outline-offset: 2px; }
`

export const LauncherHint = styled.span`
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  visibility: hidden;
  opacity: 0;
  padding: 6px 10px;
  border: 1px solid ${c.border};
  border-radius: 8px;
  background: ${c.surface};
  color: ${c.text};
  box-shadow: 0 4px 16px #0002;
  white-space: nowrap;
  pointer-events: none;
  transform: translateY(3px);
  transition: opacity 140ms ease, transform 140ms ease;
  ${typo.label.bold}
  @media (prefers-reduced-motion: reduce) { transition: none; transform: none; }
`

export const Launcher = styled.button`
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 1px solid ${c.border};
  border-radius: ${radius.pill};
  background: ${c.surface};
  color: ${c.text};
  box-shadow: 0 4px 16px #0002;
  cursor: pointer;
  &:focus-visible { border-color: ${c.primary}; }
  @media (hover: hover) {
    &:hover { border-color: ${c.primary}; background: ${c.primaryTint}; }
  }
  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    img { transition: transform 140ms ease; }
    &:hover img { transform: scale(1.08); }
  }
  ${focusRing}
`

export const LauncherAnchor = styled.div`
  position: fixed;
  right: max(24px, env(safe-area-inset-right));
  bottom: max(24px, env(safe-area-inset-bottom));
  z-index: 60;
  ${Launcher}:focus-visible + ${LauncherHint} {
    visibility: visible;
    opacity: 1;
    transform: none;
  }
  @media (hover: hover) {
    ${Launcher}:hover + ${LauncherHint} {
      visibility: visible;
      opacity: 1;
      transform: none;
    }
  }
`

export const Dialog = styled.dialog`
  position: fixed;
  inset: auto max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) auto;
  margin: 0;
  padding: 0;
  width: min(424px, calc(100vw - 48px));
  height: min(640px, calc(100dvh - 48px));
  max-width: none;
  max-height: none;
  background: ${c.surface};
  color: ${c.text};
  border: 1px solid ${c.border};
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 12px 40px #0003;
  &[open] { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; }
  &::backdrop { background: #0004; }
  @media (max-width: 600px) {
    inset: auto 12px max(12px, env(safe-area-inset-bottom)) 12px;
    width: auto;
    height: min(640px, calc(100dvh - 24px));
  }
`

export const Header = styled.header`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(110deg, ${c.primaryTint}, ${c.surface} 70%);
  border-bottom: 1px solid ${c.border};
  h2 { margin: 0; ${typo.headline2.bold} }
`
export const Brand = styled.div`display: flex; align-items: center; gap: 8px;`
export const Actions = styled.div`display: flex; align-items: center; gap: 6px; flex-wrap: wrap;`
export const Button = styled.button`
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid ${c.border};
  border-radius: ${radius.pill};
  background: ${c.surface};
  color: ${c.text};
  ${typo.label.medium}
  cursor: pointer;
  &:not(:disabled):hover { background: ${c.primaryTint}; border-color: ${c.primary}; }
  &:disabled { cursor: not-allowed; color: ${c.muted}; background: ${c.surfaceLow}; }
  ${focusRing}
`
export const IconButton = styled(Button)`
  width: 44px;
  padding: 0;
  display: inline-grid;
  place-items: center;
`

export const Transcript = styled.div`
  overflow: auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overscroll-behavior: contain;
`
export const UserBubble = styled.div`
  align-self: flex-end;
  max-width: 88%;
  padding: 10px 12px;
  border-radius: 18px 18px 4px 18px;
  background: ${c.primaryTint};
  ${typo.body.regular}
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`
export const AssistantRow = styled.div`
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  > img { margin-top: 1px; }
`
export const Response = styled.div`
  ${typo.body.regular}
  overflow-wrap: anywhere;
  p { margin: 0; white-space: pre-wrap; }
`
export const Facts = styled.dl`
  margin: 10px 0 0;
  padding: 10px 12px;
  border: 1px solid ${c.borderSoft};
  border-radius: 12px;
  background: ${c.surfaceLow};
  div { display: flex; justify-content: space-between; gap: 10px; }
  div + div { margin-top: 6px; }
  dd { margin: 0; text-align: right; ${typo.body.bold} }
`
export const Suggestions = styled(Actions)`
  margin-top: 10px;
  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 10px;
    border: 1px solid ${c.border};
    border-radius: ${radius.pill};
    color: ${c.infoText};
    ${typo.label.medium}
    ${focusRing}
  }
`
const bounce = keyframes`
  0%, 65%, 100% { transform: translateY(0); }
  30% { transform: translateY(-3px); }
`
export const TypingDots = styled.span`
  display: inline-flex;
  gap: 4px;
  span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${c.primary};
    animation: ${bounce} 950ms ease infinite;
  }
  span:nth-child(2) { animation-delay: 110ms; }
  span:nth-child(3) { animation-delay: 220ms; }
  @media (prefers-reduced-motion: reduce) { span { animation: none; } }
`
export const Pending = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  color: ${c.muted};
  ${typo.label.regular}
`
export const Hints = styled.p`margin: 0; color: ${c.muted}; ${typo.caption.regular}`
export const ErrorText = styled.p`margin: 0; color: ${c.errorText}; ${typo.caption.regular}`
export const InputLabel = styled.label`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`
export const Form = styled.form`
  padding: 12px 16px max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid ${c.border};
  display: grid;
  gap: 6px;
`
export const Composer = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 6px;
  padding: 4px;
  border: 1px solid ${c.borderDark};
  border-radius: 24px;
  background: ${c.surface};
  &:focus-within { border-color: ${c.infoText}; }
  textarea {
    width: 100%;
    padding: 10px 8px;
    border: 0;
    outline: 0;
    background: transparent;
    color: ${c.text};
    ${typo.body.regular}
    resize: none;
    field-sizing: content;
    min-height: 44px;
    max-height: 110px;
  }
`
export const SendButton = styled(IconButton)`
  border-color: transparent;
  background: ${c.primary};
  color: ${c.primaryText};
  &:not(:disabled):hover { background: ${c.primary}; filter: brightness(0.94); }
`
