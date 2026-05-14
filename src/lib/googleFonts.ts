export type GoogleFontCategory = 'serif' | 'sans' | 'display' | 'handwriting' | 'kids' | 'monospace'

export interface GoogleFontDefinition {
  family: string
  weights: string[]
  style: string
}

export const GOOGLE_FONT_CATEGORY_LABELS: Record<GoogleFontCategory, string> = {
  serif: 'Clássicas / leitura',
  sans: 'Modernas / sans',
  display: 'Display / títulos',
  handwriting: 'Manuscritas',
  kids: 'Infantis / lúdicas',
  monospace: 'Técnicas / cifras',
}

export const GOOGLE_FONTS: Record<GoogleFontCategory, GoogleFontDefinition[]> = {
  serif: [
    { family: 'Playfair Display', weights: ['400', '600', '700', '900'], style: 'Editorial clássica' },
    { family: 'Lora', weights: ['400', '500', '600', '700'], style: 'Leitura elegante' },
    { family: 'Merriweather', weights: ['400', '700'], style: 'Texto longo' },
    { family: 'Crimson Text', weights: ['400', '600'], style: 'Acadêmica' },
  ],
  sans: [
    { family: 'DM Sans', weights: ['300', '400', '500', '600', '700'], style: 'Padrão LA Journey' },
    { family: 'Inter', weights: ['400', '500', '600', '700'], style: 'Moderna limpa' },
    { family: 'Nunito', weights: ['400', '600', '700'], style: 'Amigável' },
    { family: 'Poppins', weights: ['300', '400', '500', '600', '700'], style: 'Geométrica' },
    { family: 'Raleway', weights: ['300', '400', '600', '700'], style: 'Display elegante' },
    { family: 'Montserrat', weights: ['300', '400', '500', '600', '700', '800', '900'], style: 'Títulos fortes' },
    { family: 'Roboto', weights: ['400', '500', '700'], style: 'Interface neutra' },
    { family: 'Open Sans', weights: ['400', '600', '700'], style: 'Leitura simples' },
    { family: 'Lato', weights: ['400', '700'], style: 'Educacional limpa' },
    { family: 'Oswald', weights: ['400', '500', '700'], style: 'Condensada forte' },
  ],
  display: [
    { family: 'Abril Fatface', weights: ['400'], style: 'Impacto editorial' },
    { family: 'Bebas Neue', weights: ['400'], style: 'Condensada de capa' },
    { family: 'Fredoka', weights: ['400', '600', '700'], style: 'Divertida arredondada' },
    { family: 'Righteous', weights: ['400'], style: 'Geométrica display' },
  ],
  handwriting: [
    { family: 'Pacifico', weights: ['400'], style: 'Manuscrita casual' },
    { family: 'Dancing Script', weights: ['400', '700'], style: 'Cursiva fluida' },
    { family: 'Caveat', weights: ['400', '700'], style: 'Manuscrita natural' },
    { family: 'Kalam', weights: ['400', '700'], style: 'Escrita à mão' },
  ],
  kids: [
    { family: 'Bubblegum Sans', weights: ['400'], style: 'Infantil divertida' },
    { family: 'Schoolbell', weights: ['400'], style: 'Quadro negro' },
    { family: 'Chewy', weights: ['400'], style: 'Cartoon' },
  ],
  monospace: [
    { family: 'DM Mono', weights: ['400', '500'], style: 'Cifra limpa' },
    { family: 'JetBrains Mono', weights: ['400', '700'], style: 'Código/cifra' },
    { family: 'Source Code Pro', weights: ['400', '600'], style: 'Técnica' },
  ],
}

export const GOOGLE_FONT_LIST = Object.entries(GOOGLE_FONTS).flatMap(([category, fonts]) =>
  fonts.map(font => ({
    ...font,
    category: category as GoogleFontCategory,
    categoryLabel: GOOGLE_FONT_CATEGORY_LABELS[category as GoogleFontCategory],
  })),
)

export const COVER_FONT_OPTIONS = GOOGLE_FONT_LIST.map(font => ({
  value: font.family,
  label: font.family,
  category: font.categoryLabel,
  style: font.style,
  weights: font.weights,
}))

export const RICH_TEXT_FONT_OPTIONS = [
  { label: 'DM Sans (padrão)', value: '' },
  ...GOOGLE_FONT_LIST.map(font => ({ label: font.family, value: font.family })),
]

export function findGoogleFont(family: string | null | undefined) {
  if (!family) return null
  return GOOGLE_FONT_LIST.find(font => font.family === family) ?? null
}

export function getGoogleFontWeights(family: string) {
  return findGoogleFont(family)?.weights ?? ['400', '700']
}
