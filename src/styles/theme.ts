import { css } from 'styled-components'

// 관리자 웹에서 공통으로 사용할 스타일 기준입니다.
// PingDom Design System (Figma {TYPE-NULL} 2차디자인 / get_variable_defs) 기준값입니다.
// Semantic token 이름과 관계가 기준이며, hex 값은 Figma 변수에서 확인한 값입니다.
export const semanticColors = {
  // Primary — 브랜드 색. CTA, 선택/활성, 핵심 강조에만 제한적으로 사용합니다.
  primary: {
    normal: '#FF1956',
    alternative: '#FF4A75',
    assistive: '#FFC9D3',
  },
  secondary: {
    normal: '#BFC1C1',
    alternative: '#D1D4D5',
    assistive: '#F8F8F8',
  },
  // Label — 텍스트, 아이콘 등 전경 요소
  label: {
    normal: '#0C0C0D',
    strong: '#000000',
    neutral: '#3B3B40',
    alternative: '#5E5E66',
    assistive: '#767680',
    disabled: '#EFEFEF',
  },
  // Line — 테두리, 구분선
  line: {
    normal: '#E4E4E5',
    neutral: '#F2F2F3',
    alternative: '#F6F6F7',
  },
  // Fill — 컴포넌트 표면 (입력, 카드, 칩, hover 배경)
  fill: {
    normal: '#F6F6F7',
    neutral: '#F2F2F3',
    alternative: '#E4E4E5',
    support: '#FFFFFF',
    assistive: '#FFFFFF',
  },
  // Background — 페이지, 큰 영역
  background: {
    normal: '#FFFFFF',
    neutral: '#F2F2F3',
    alternative: '#FCFCFD',
  },
  static: {
    black: '#000000',
    white: '#FFFFFF',
  },
  // Status — 기능적 상태 의미에만 사용합니다. (Figma Status/* 변수값)
  status: {
    error: '#EE2B2B',
    info: '#008BFF',
    success: '#20DD39',
    warning: '#FFCC00',
  },
} as const

// 8자리 hex 알파 접미사 (투명도 tint 용)
const alpha = {
  a06: '0F',
  a08: '14',
  a12: '1F',
  a16: '29',
  a20: '33',
  a45: '73',
  a90: 'E6',
  a94: 'F0',
} as const

// 기존 컴포넌트가 참조하는 별칭 계층입니다. 모든 값은 semanticColors 에서 파생됩니다.
export const adminColors = {
  background: semanticColors.background.normal,
  surface: semanticColors.background.normal,
  surfaceLow: semanticColors.fill.normal,
  surfaceContainer: semanticColors.fill.neutral,
  surfaceHigh: semanticColors.fill.alternative,
  surfaceHighest: semanticColors.background.alternative,
  border: semanticColors.line.normal,
  borderSoft: semanticColors.line.neutral,
  borderDark: semanticColors.secondary.normal,
  text: semanticColors.label.normal,
  strongText: semanticColors.label.strong,
  neutralText: semanticColors.label.neutral,
  muted: semanticColors.label.alternative,
  softText: semanticColors.label.assistive,
  placeholder: semanticColors.label.assistive,
  disabled: semanticColors.label.disabled,
  disabledFill: semanticColors.secondary.alternative,
  disabledText: semanticColors.label.alternative,
  primary: semanticColors.primary.normal,
  primaryHover: semanticColors.primary.alternative,
  primarySoft: semanticColors.primary.assistive,
  primaryTint: `${semanticColors.primary.normal}${alpha.a06}`,
  primaryText: semanticColors.static.white,
  error: semanticColors.status.error,
  errorTint: `${semanticColors.status.error}${alpha.a08}`,
  errorHover: `${semanticColors.status.error}${alpha.a90}`,
  info: semanticColors.status.info,
  infoTint: `${semanticColors.status.info}${alpha.a08}`,
  infoText: '#0A67B5',
  success: semanticColors.status.success,
  successTint: `${semanticColors.status.success}${alpha.a08}`,
  successSurface: `${semanticColors.status.success}${alpha.a06}`,
  successText: '#157A36',
  warning: semanticColors.status.warning,
  warningTint: `${semanticColors.status.warning}${alpha.a12}`,
  warningSurface: `${semanticColors.status.warning}${alpha.a20}`,
  warningText: '#7A4D00',
  overlay: `${semanticColors.static.black}${alpha.a45}`,
  softOverlay: `${semanticColors.static.white}${alpha.a94}`,
  shadow: `${semanticColors.static.black}${alpha.a08}`,
  strongShadow: `${semanticColors.static.black}${alpha.a16}`,
} as const

// Typography — 모든 단계 line-height 130%.
// Title1 페이지 제목 / Title2 주요 섹션 / Headline1·2 컴포넌트·행 제목 / Body 일반 본문
// Label 버튼·입력·탭·칩·메타 / Caption 도움말·타임스탬프·주석
type TypographyScaleName =
  | 'title1'
  | 'title2'
  | 'headline1'
  | 'headline2'
  | 'body'
  | 'label'
  | 'caption'

type TypographyWeightName = 'bold' | 'medium' | 'regular'

type TypographyStyle = {
  fontSize: number
  fontWeight: 700 | 500 | 400
  lineHeight: 1.3
}

const scaleSizes: Record<TypographyScaleName, number> = {
  title1: 28,
  title2: 24,
  headline1: 20,
  headline2: 18,
  body: 16,
  label: 14,
  caption: 12,
}

const weightValues: Record<TypographyWeightName, 700 | 500 | 400> = {
  bold: 700,
  medium: 500,
  regular: 400,
}

function buildScale(size: number): Record<TypographyWeightName, TypographyStyle> {
  return {
    bold: { fontSize: size, fontWeight: weightValues.bold, lineHeight: 1.3 },
    medium: { fontSize: size, fontWeight: weightValues.medium, lineHeight: 1.3 },
    regular: { fontSize: size, fontWeight: weightValues.regular, lineHeight: 1.3 },
  }
}

export const typography: Record<
  TypographyScaleName,
  Record<TypographyWeightName, TypographyStyle>
> = {
  title1: buildScale(scaleSizes.title1),
  title2: buildScale(scaleSizes.title2),
  headline1: buildScale(scaleSizes.headline1),
  headline2: buildScale(scaleSizes.headline2),
  body: buildScale(scaleSizes.body),
  label: buildScale(scaleSizes.label),
  caption: buildScale(scaleSizes.caption),
}

function toCss(style: TypographyStyle) {
  return css`
    font-size: ${style.fontSize}px;
    font-weight: ${style.fontWeight};
    line-height: ${style.lineHeight};
  `
}

// styled-components 안에서 `${typo.label.medium}` 형태로 사용하는 mixin 입니다.
export const typo = {
  title1: {
    bold: toCss(typography.title1.bold),
    medium: toCss(typography.title1.medium),
    regular: toCss(typography.title1.regular),
  },
  title2: {
    bold: toCss(typography.title2.bold),
    medium: toCss(typography.title2.medium),
    regular: toCss(typography.title2.regular),
  },
  headline1: {
    bold: toCss(typography.headline1.bold),
    medium: toCss(typography.headline1.medium),
    regular: toCss(typography.headline1.regular),
  },
  headline2: {
    bold: toCss(typography.headline2.bold),
    medium: toCss(typography.headline2.medium),
    regular: toCss(typography.headline2.regular),
  },
  body: {
    bold: toCss(typography.body.bold),
    medium: toCss(typography.body.medium),
    regular: toCss(typography.body.regular),
  },
  label: {
    bold: toCss(typography.label.bold),
    medium: toCss(typography.label.medium),
    regular: toCss(typography.label.regular),
  },
  caption: {
    bold: toCss(typography.caption.bold),
    medium: toCss(typography.caption.medium),
    regular: toCss(typography.caption.regular),
  },
} as const

// Radius — Figma 앱 컴포넌트 기준: 버튼/칩/검색창은 pill(완전 둥근) 형태, 카드/패널은 8~16px.
export const radius = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  pill: '999px',
} as const

// Elevation — Figma SearchBox/Button 그림자 값 기준.
export const elevation = {
  low: `0 4px 20px ${semanticColors.static.black}${alpha.a16}`,
  inset: `inset 0 4px 20px ${semanticColors.static.black}${alpha.a08}`,
  high: `0 24px 64px ${semanticColors.static.black}${alpha.a16}`,
} as const

export const theme = {
  semanticColors,
  adminColors,
  typography,
  typo,
  radius,
  elevation,
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
} as const
