import styled from 'styled-components'
import { adminColors, typography, radius } from '../../styles/theme'

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
  font-size: 20px;
  font-weight: 400;
  line-height: 1;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 20;
`

export const Page = styled.main`
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  background:
    radial-gradient(circle at 12% 20%, ${adminColors.primaryTint}, transparent 28%),
    radial-gradient(circle at 88% 82%, ${adminColors.primaryTint}, transparent 24%),
    ${adminColors.background};
  color: ${adminColors.text};
  font-family: inherit;

  @media (max-width: 640px) {
    padding: 24px 18px;
  }
`

export const StartShell = styled.div`
  width: min(100%, 960px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);

  @media (max-width: 640px) {
    min-height: calc(100vh - 48px);
  }
`

export const CenterShell = styled(StartShell)`
  justify-content: center;
  min-height: calc(100vh - 64px);
`

export const BrandHeader = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`

export const BrandLogo = styled.img`
  width: min(320px, 82vw);
  height: auto;
  margin-top: 0;
  display: block;

  @media (max-width: 640px) {
    margin-top: 12px;
  }
`

export const WelcomeHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 46px;
  text-align: center;

  @media (max-width: 640px) {
    margin-top: 38px;
  }
`

export const Title = styled.h1`
  margin: 0;
  color: ${adminColors.strongText};
  font-size: ${typography.title1.bold.fontSize}px;
  font-weight: ${typography.title1.bold.fontWeight};
  letter-spacing: 0;
  line-height: ${typography.title1.bold.lineHeight};
`

export const Description = styled.p`
  margin: 14px 0 0;
  color: ${adminColors.muted};
  font-size: ${typography.body.regular.fontSize}px;
  font-weight: ${typography.body.regular.fontWeight};
  line-height: ${typography.body.regular.lineHeight};
`

export const LoginPanel = styled.div`
  width: min(100%, 450px);
  margin-top: 34px;
  padding: 26px;
  border: 1px solid ${adminColors.border};
  border-radius: 22px;
  background: ${adminColors.surface};
  box-shadow: 0 16px 40px ${adminColors.shadow};
`

export const RoleSwitcher = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  padding: 5px;
  border-radius: 12px;
  background: ${adminColors.surfaceContainer};
`

export const RoleSwitch = styled.button<{ $active: boolean }>`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 9px;
  background: ${({ $active }) => ($active ? adminColors.surface : 'transparent')};
  color: ${({ $active }) => ($active ? adminColors.text : adminColors.softText)};
  font-size: ${typography.label.bold.fontSize}px;
  font-weight: ${typography.label.bold.fontWeight};
  line-height: ${typography.label.bold.lineHeight};
  cursor: pointer;
  box-shadow: ${({ $active }) => ($active ? `0 4px 10px ${adminColors.shadow}` : 'none')};

  &:focus-visible {
    outline: 2px solid ${adminColors.primary};
    outline-offset: 2px;
  }
`

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  margin-top: 28px;
`

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  & + & {
    margin-top: 18px;
  }
`

export const Label = styled.label`
  color: ${adminColors.text};
  font-size: ${typography.label.bold.fontSize}px;
  font-weight: ${typography.label.bold.fontWeight};
  line-height: ${typography.label.bold.lineHeight};
`

export const InputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

export const InputIcon = styled(MaterialIcon)`
  position: absolute;
  left: 14px;
  color: ${adminColors.muted};
  pointer-events: none;
`

export const Input = styled.input<{ $hasEndAction?: boolean }>`
  width: 100%;
  height: 52px;
  padding: 0 ${({ $hasEndAction }) => ($hasEndAction ? '48px' : '16px')} 0 44px;
  box-sizing: border-box;
  border: 1px solid ${adminColors.border};
  border-radius: 12px;
  outline: 0;
  background: ${adminColors.surfaceHighest};
  color: ${adminColors.text};
  font-size: 16px;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;

  &::placeholder {
    color: ${adminColors.placeholder};
  }

  &:focus {
    border-color: ${adminColors.primary};
    background: ${adminColors.surface};
    box-shadow: 0 0 0 4px ${adminColors.primaryTint};
  }
`

export const PasswordToggleButton = styled.button`
  position: absolute;
  right: 6px;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: ${adminColors.muted};
  cursor: pointer;

  &:hover {
    background: ${adminColors.surfaceHigh};
    color: ${adminColors.text};
  }

  &:focus-visible {
    outline: 2px solid ${adminColors.primary};
    outline-offset: 2px;
  }
`

export const ErrorMessage = styled.p`
  margin: 0;
  padding: 11px 12px;
  border: 1px solid ${adminColors.error};
  border-radius: 10px;
  background: ${adminColors.errorTint};
  color: ${adminColors.error};
  font-size: 14px;
  line-height: 1.3;
`

export const ErrorMessageSlot = styled.div`
  min-height: 42px;
  margin-top: 12px;
`

export const SubmitButton = styled.button`
  width: 100%;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${adminColors.primary};
  color: ${adminColors.primaryText};
  font-size: ${typography.label.bold.fontSize}px;
  font-weight: ${typography.label.bold.fontWeight};
  line-height: ${typography.label.bold.lineHeight};
  cursor: pointer;
  box-shadow: 0 8px 18px ${adminColors.primary}33;
  transition:
    background 160ms ease,
    opacity 160ms ease,
    transform 120ms ease;

  &:hover:not(:disabled) {
    background: ${adminColors.primaryHover};
  }

  &:active:not(:disabled) {
    transform: scale(0.985);
  }

  &:disabled {
    cursor: default;
    opacity: 0.72;
  }
`

export const FooterText = styled.p`
  margin: 28px 0 0;
  color: ${adminColors.softText};
  font-size: ${typography.label.regular.fontSize}px;
  font-weight: ${typography.label.regular.fontWeight};
  line-height: ${typography.label.regular.lineHeight};
  text-align: center;
`

export const FooterLink = styled.a`
  color: ${adminColors.muted};
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
`

export const SuccessCard = styled.section`
  width: min(100%, 470px);
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 48px;
  padding: 48px 32px;
  border: 1px solid ${adminColors.border};
  border-radius: 24px;
  background: ${adminColors.surface};
  box-shadow: 0 16px 40px ${adminColors.shadow};
  text-align: center;
`

export const SuccessIconBox = styled.div`
  width: 64px;
  height: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${adminColors.successTint};
  color: ${adminColors.success};
`

export const SuccessTitle = styled.h1`
  margin: 24px 0 0;
  color: ${adminColors.strongText};
  font-size: ${typography.title2.bold.fontSize}px;
  font-weight: ${typography.title2.bold.fontWeight};
  letter-spacing: 0;
  line-height: ${typography.title2.bold.lineHeight};
`

export const SuccessDescription = styled.p`
  margin: 14px 0 0;
  color: ${adminColors.muted};
  font-size: ${typography.body.regular.fontSize}px;
  font-weight: ${typography.body.regular.fontWeight};
  line-height: ${typography.body.regular.lineHeight};
`
