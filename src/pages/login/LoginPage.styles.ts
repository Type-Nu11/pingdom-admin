import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const neutral = adminColors

export const Page = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: ${neutral.background};
  color: ${neutral.text};
  font-family:
    'Hanken Grotesk',
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
`

export const LoginCard = styled.section`
  width: 100%;
  max-width: 384px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px;
  border: 1px solid ${neutral.borderSoft};
  border-top: 4px solid ${neutral.primary};
  border-radius: 8px;
  background: ${neutral.surface};
  box-shadow: 0 18px 48px ${neutral.shadow};
`

export const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
`

export const IconBox = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  border: 1px solid ${neutral.primarySoft};
  border-radius: 8px;
  background: ${neutral.primaryTint};
  color: ${neutral.primary};
`

export const MaterialIcon = styled.span`
  width: 1em;
  height: 1em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  color: currentColor;
  font-family: 'Material Symbols Outlined';
  font-size: 22px;
  font-weight: 400;
  line-height: 1;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 20;
`

export const Title = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.3;
`

export const Description = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 16px;
  line-height: 1.45;
`

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const Label = styled.label`
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 500;
`

export const InputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

export const InputIcon = styled(MaterialIcon)`
  position: absolute;
  left: 12px;
  color: ${neutral.muted};
  pointer-events: none;
`

export const Input = styled.input<{ $hasEndAction?: boolean }>`
  width: 100%;
  height: 44px;
  padding: 0 ${({ $hasEndAction }) => ($hasEndAction ? '44px' : '16px')} 0 40px;
  border: 0;
  border-radius: 8px;
  outline: 1px solid transparent;
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  font-size: 16px;
  transition:
    outline-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;

  &::placeholder {
    color: ${neutral.placeholder};
  }

  &:focus {
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px ${neutral.surfaceLow} inset;
    -webkit-text-fill-color: ${neutral.text};
  }
`

export const PasswordToggleButton = styled.button`
  position: absolute;
  right: 6px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: ${neutral.muted};
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease;

  &:hover {
    background: ${neutral.surfaceHigh};
    color: ${neutral.text};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }
`

export const ErrorMessage = styled.p`
  margin: 0;
  padding: 12px;
  border: 1px solid ${neutral.error};
  border-radius: 8px;
  background: ${neutral.errorTint};
  color: ${neutral.error};
  font-size: 14px;
  line-height: 1.4;
`

export const SubmitButton = styled.button`
  width: 100%;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.primary};
  color: ${neutral.primaryText};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    opacity 160ms ease,
    transform 120ms ease;

  &:hover:not(:disabled) {
    background: ${neutral.primaryHover};
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    cursor: default;
    opacity: 0.72;
  }
`

export const ButtonIcon = styled(MaterialIcon)`
  color: currentColor;
  font-size: 18px;
`

export const FooterText = styled.p`
  margin: -4px 0 0;
  color: ${neutral.muted};
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
`
