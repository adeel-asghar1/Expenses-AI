/** Central design tokens: colors, spacing, radii, typography, shadows, gradients. */

export const colors = {
  // Background layers
  bg0: '#0B0C1A',
  bg1: '#101126',
  // Deep purple/charcoal surfaces
  surface: '#171730',
  surfaceAlt: '#1E1C3B',
  surfaceRaised: '#252344',
  surfaceHighlight: '#2C2A52',
  // Hairlines
  line: 'rgba(255,255,255,0.08)',
  lineSoft: 'rgba(255,255,255,0.045)',
  // Text
  text: '#F3F2FB',
  textMuted: '#A8A6CC',
  textFaint: '#75719E',
  // Mint / turquoise accent
  mint: '#5FE3C0',
  mintStrong: '#35E0C3',
  mintDeep: '#2BD4BF',
  mintSoft: 'rgba(95,227,192,0.13)',
  mintLine: 'rgba(95,227,192,0.35)',
  // Semantics
  good: '#55E39F',
  coral: '#FF8F85',
  coralSoft: 'rgba(255,143,133,0.12)',
  amber: '#F5C86E',
  amberSoft: 'rgba(245,200,110,0.13)',
  amberLine: 'rgba(245,200,110,0.4)',
  white: '#FFFFFF',
} as const

export const gradients = {
  /** Signature mint gradient used on accent cards and primary buttons. */
  mintButton: ['#7CF2C4', '#2BD4BF'] as const,
  mintCard: ['#3AE0BD', '#20A99B'] as const,
  mintCardDeep: ['#2DD2B6', '#179C8F'] as const,
  hero: ['#17303B', '#121730'] as const,
  screen: ['#0B0C1A', '#11122A'] as const,
} as const

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 36 } as const
export const radius = { sm: 12, md: 16, lg: 22, xl: 26, pill: 999 } as const

export const typography = {
  display: 'Fraunces-SemiBold',
  displayBold: 'Fraunces-Bold',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemi: 'Inter-SemiBold',
} as const

/** Diffuse mint glow used under accent surfaces. */
export const glowShadow = {
  shadowColor: '#2BD4BF',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.35,
  shadowRadius: 22,
  elevation: 10,
} as const

export const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.35,
  shadowRadius: 18,
  elevation: 6,
} as const

export const avatarPalette = [
  ['#3AE0BD', '#179C8F'],
  ['#A78BFA', '#6D4BD0'],
  ['#F5C86E', '#C08A2D'],
  ['#7DD3FC', '#2563EB'],
  ['#FDA4AF', '#E11D48'],
  ['#86EFAC', '#15803D'],
] as const

/** Deterministic per-name accent pair. */
export function avatarGradient(name: string): readonly [string, string] {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return avatarPalette[hash % avatarPalette.length]
}
