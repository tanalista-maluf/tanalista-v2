// Identidade do site (src/app/globals.css e src/app/layout.tsx): mesma paleta,
// Manrope nos títulos e Inter no texto.
export const colors = {
  background: '#0D1A14',
  foreground: '#F0FFF4',
  primary: '#4ADE80',
  primaryForeground: '#0D1A14',
  emerald: '#10B981',
  destructive: '#F87171',
  warning: '#FACC15',

  // .card-dark
  card: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.07)',
  // superfícies sólidas (barra fixa, cabeçalho): o card sobre o fundo
  surface: '#111E18',
  hero: '#080F0C',

  input: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  track: 'rgba(255,255,255,0.08)',

  // text-white/NN do site
  text: '#FFFFFF',
  text70: 'rgba(255,255,255,0.7)',
  text50: 'rgba(255,255,255,0.5)',
  text40: 'rgba(255,255,255,0.4)',
  text35: 'rgba(255,255,255,0.35)',
  text25: 'rgba(255,255,255,0.25)',
  muted: 'rgba(240,255,244,0.45)',

  glow: '#1A4A2E',
}

export const fonts = {
  headingLight: 'Manrope_300Light',
  heading: 'Manrope_700Bold',
  headingBlack: 'Manrope_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
}

export const radius = { card: 16, pill: 999 }
