// 관리자 웹에서 공통으로 사용할 스타일 기준입니다.
export const semanticColors = {
  primary: {
    normal: '#FF174F',
    alternative: '#FF416A',
    assistive: '#FFC1CE',
  },
  secondary: {
    normal: '#BFC0C2',
    alternative: '#D0D1D2',
    assistive: '#F7F7F7',
  },
  label: {
    normal: '#0B0B0C',
    strong: '#000000',
    neutral: '#45454A',
    alternative: '#65666D',
    assistive: '#85868D',
    disabled: '#EEEEEF',
  },
  line: {
    normal: '#E2E2E3',
    neutral: '#EEEEEF',
    alternative: '#F5F5F6',
  },
  fill: {
    normal: '#F7F7F8',
    neutral: '#F1F1F2',
    alternative: '#E3E3E4',
    support: '#FFFFFF',
    assistive: '#FFFFFF',
  },
  background: {
    normal: '#FFFFFF',
    neutral: '#F1F1F2',
    alternative: '#FAFAFA',
  },
  static: {
    black: '#000000',
    white: '#FFFFFF',
  },
  status: {
    error: '#F52B2F',
    info: '#118CF4',
    success: '#20DD39',
    warning: '#FFC512',
  },
} as const

export const adminColors = {
  background: semanticColors.background.normal,
  surface: semanticColors.background.normal,
  surfaceLow: semanticColors.secondary.assistive,
  surfaceContainer: semanticColors.fill.normal,
  surfaceHigh: '#EDEDEF',
  surfaceHighest: semanticColors.background.alternative,
  border: semanticColors.line.normal,
  borderSoft: semanticColors.line.neutral,
  borderDark: semanticColors.secondary.normal,
  text: semanticColors.label.normal,
  strongText: semanticColors.label.strong,
  muted: semanticColors.label.alternative,
  softText: semanticColors.label.assistive,
  placeholder: semanticColors.label.assistive,
  disabled: semanticColors.label.disabled,
  primary: semanticColors.primary.normal,
  primaryHover: semanticColors.primary.alternative,
  primarySoft: semanticColors.primary.assistive,
  primaryTint: '#FF174F12',
  primaryText: semanticColors.static.white,
  error: '#D92D3A',
  errorTint: '#D92D3A14',
  errorHover: '#C82835',
  info: semanticColors.status.info,
  infoTint: '#118CF414',
  infoText: '#0A67B5',
  success: semanticColors.status.success,
  successTint: '#EAF8EF',
  successSurface: '#F7FFFA',
  successText: '#157A36',
  warning: semanticColors.status.warning,
  warningTint: '#FFF3E3',
  warningSurface: '#FFF3D6',
  warningText: '#7A4D00',
  overlay: '#00000073',
  softOverlay: '#FFFFFFF0',
  shadow: '#00000014',
  strongShadow: '#0000002E',
} as const

export const typography = {
  title1: {
    bold: { fontSize: 28, fontWeight: 700, lineHeight: 1.3 },
    medium: { fontSize: 28, fontWeight: 500, lineHeight: 1.3 },
    regular: { fontSize: 28, fontWeight: 400, lineHeight: 1.3 },
  },
  title2: {
    bold: { fontSize: 24, fontWeight: 700, lineHeight: 1.3 },
    medium: { fontSize: 24, fontWeight: 500, lineHeight: 1.3 },
    regular: { fontSize: 24, fontWeight: 400, lineHeight: 1.3 },
  },
  headline1: {
    bold: { fontSize: 20, fontWeight: 700, lineHeight: 1.3 },
    medium: { fontSize: 20, fontWeight: 500, lineHeight: 1.3 },
    regular: { fontSize: 20, fontWeight: 400, lineHeight: 1.3 },
  },
  headline2: {
    bold: { fontSize: 18, fontWeight: 700, lineHeight: 1.3 },
    medium: { fontSize: 18, fontWeight: 500, lineHeight: 1.3 },
    regular: { fontSize: 18, fontWeight: 400, lineHeight: 1.3 },
  },
  body: {
    bold: { fontSize: 16, fontWeight: 700, lineHeight: 1.3 },
    medium: { fontSize: 16, fontWeight: 500, lineHeight: 1.3 },
    regular: { fontSize: 16, fontWeight: 400, lineHeight: 1.3 },
  },
  label: {
    bold: { fontSize: 14, fontWeight: 700, lineHeight: 1.3 },
    medium: { fontSize: 14, fontWeight: 500, lineHeight: 1.3 },
    regular: { fontSize: 14, fontWeight: 400, lineHeight: 1.3 },
  },
  caption: {
    bold: { fontSize: 12, fontWeight: 700, lineHeight: 1.3 },
    medium: { fontSize: 12, fontWeight: 500, lineHeight: 1.3 },
    regular: { fontSize: 12, fontWeight: 400, lineHeight: 1.3 },
  },
} as const

export const theme = {
  semanticColors,
  adminColors,
  typography,
  color: {
    background: adminColors.background,
    surface: adminColors.surface,
    text: adminColors.text,
    mutedText: adminColors.muted,
    border: adminColors.border,
    primary: adminColors.primary,
    danger: adminColors.error,
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  radius: {
    sm: '4px',
    md: '8px',
  },
} as const
