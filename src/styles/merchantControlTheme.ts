import { css } from 'styled-components'
import { theme, adminColors as colors } from './theme'

export const merchantControlTheme = { ...theme, outlinedControls: true } as const

// The merchant route boundary also reaches controls rendered through portals.
export const outlinedControlSurface = css`
  ${({ theme: current }) => 'outlinedControls' in current && current.outlinedControls === true && css`
    min-height: 42px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    &:hover:not(:disabled) { background: ${colors.primaryTint}; border-color: ${colors.primary}; }
    &:focus-visible { border-color: ${colors.primary}; outline: 2px solid ${colors.primary}; outline-offset: 2px; }
    &:disabled { background: ${colors.surfaceContainer}; color: ${colors.softText}; }
  `}
`
