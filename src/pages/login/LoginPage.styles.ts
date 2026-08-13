import styled from 'styled-components'
import { adminColors, typography } from '../../styles/theme'

type LoginMode = 'admin' | 'merchant'

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
  transform: translateY(24px);

  @media (max-width: 640px) {
    min-height: calc(100vh - 48px);
    transform: none;
  }
`

export const CenterShell = styled(StartShell)`
  justify-content: center;
  min-height: calc(100vh - 136px);
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
  letter-spacing: -0.07em;
  line-height: ${typography.title1.bold.lineHeight};
`

export const Description = styled.p`
  margin: 14px 0 0;
  color: ${adminColors.muted};
  font-size: ${typography.body.regular.fontSize}px;
  font-weight: ${typography.body.regular.fontWeight};
  line-height: ${typography.body.regular.lineHeight};
`

export const RoleGrid = styled.div`
  width: min(100%, 620px);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px;
  margin-top: 72px;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
    max-width: 360px;
    gap: 20px;
    margin-top: 30px;
  }
`

export const RoleCard = styled.button<{ $mode: LoginMode }>`
  min-width: 0;
  min-height: 350px;
  --role-accent: ${({ $mode }) => ($mode === 'admin' ? adminColors.info : adminColors.warning)};
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  border: 2px solid var(--role-accent);
  border-radius: 24px;
  background: ${({ $mode }) => ($mode === 'admin' ? '#EFF8FF' : '#FFFBEA')};
  background: color-mix(in srgb, var(--role-accent) 8%, ${adminColors.surface});
  color: ${adminColors.text};
  text-align: center;
  cursor: pointer;
  box-shadow: 0 14px 28px ${adminColors.shadow};
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;

  &:hover {
    box-shadow: 0 20px 42px color-mix(in srgb, var(--role-accent) 24%, transparent);
    transform: translateY(-5px);
  }

  &:focus-visible {
    outline: 3px solid ${adminColors.borderDark};
    outline-offset: 4px;
  }
`

export const RoleArtwork = styled.div<{ $mode: LoginMode }>`
  position: relative;
  height: 205px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  background: transparent;
  color: ${({ $mode }) => ($mode === 'admin' ? adminColors.info : adminColors.warning)};

  &::before {
    position: absolute;
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: currentColor;
    content: '';
    opacity: 0.13;
  }

  &::after {
    position: absolute;
    inset: 18px 24px auto;
    height: 42px;
    border-radius: 999px;
    background: currentColor;
    content: '';
    opacity: 0.08;
    filter: blur(18px);
  }

  ${MaterialIcon} {
    position: relative;
    z-index: 1;
    width: 100px;
    height: 100px;
    border: 8px solid currentColor;
    border-radius: 32px;
    background: ${adminColors.surface}b8;
    font-size: 58px;
    box-shadow: 0 14px 28px color-mix(in srgb, currentColor 22%, transparent);
  }
`

export const ArtworkCircle = styled.span<{ $position: 'top' | 'bottom' }>`
  position: absolute;
  width: ${({ $position }) => ($position === 'top' ? '58px' : '34px')};
  height: ${({ $position }) => ($position === 'top' ? '58px' : '34px')};
  border-radius: 50%;
  background: currentColor;
  opacity: 0.12;
  ${({ $position }) =>
    $position === 'top'
      ? 'top: -18px; right: 28px;'
      : 'bottom: 16px; left: 28px;'}
`

export const RoleCardContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 82px;
  padding: 18px 20px 8px;
`

export const RoleTitle = styled.strong`
  color: ${adminColors.strongText};
  font-size: ${typography.headline1.bold.fontSize}px;
  font-weight: ${typography.headline1.bold.fontWeight};
  letter-spacing: -0.05em;
  line-height: ${typography.headline1.bold.lineHeight};
`

export const RoleCta = styled.span<{ $mode: LoginMode }>`
  margin-top: auto;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: ${({ $mode }) => ($mode === 'admin' ? adminColors.info : adminColors.warning)};
  color: ${({ $mode }) => ($mode === 'admin' ? adminColors.primaryText : adminColors.strongText)};
  font-size: ${typography.label.bold.fontSize}px;
  font-weight: ${typography.label.bold.fontWeight};
  line-height: ${typography.label.bold.lineHeight};
`

export const LoginPanel = styled.div`
  width: min(100%, 450px);
  margin-top: 42px;
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
  font-size: 15px;
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
  font-size: 13px;
  line-height: 1.4;
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
  border-radius: 12px;
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

export const BackButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 18px;
  padding: 0 16px;
  border: 1px solid ${adminColors.border};
  border-radius: 999px;
  background: ${adminColors.surface};
  color: ${adminColors.muted};
  font-size: ${typography.label.medium.fontSize}px;
  font-weight: ${typography.label.medium.fontWeight};
  line-height: ${typography.label.medium.lineHeight};
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease,
    border-color 160ms ease;

  &:hover {
    border-color: ${adminColors.borderDark};
    background: ${adminColors.surfaceContainer};
    color: ${adminColors.text};
  }

  &:focus-visible {
    outline: 2px solid ${adminColors.primary};
    outline-offset: 3px;
  }
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
  letter-spacing: -0.04em;
  line-height: ${typography.title2.bold.lineHeight};
`

export const SuccessDescription = styled.p`
  margin: 14px 0 0;
  color: ${adminColors.muted};
  font-size: ${typography.body.regular.fontSize}px;
  font-weight: ${typography.body.regular.fontWeight};
  line-height: ${typography.body.regular.lineHeight};
`
