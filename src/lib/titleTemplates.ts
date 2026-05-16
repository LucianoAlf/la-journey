export type TitleTemplateId =
  | 'editorial_classic'
  | 'module_premium'
  | 'brand_band'
  | 'lesson_card'
  | 'musical_staff'
  | 'chapter_divider'

export interface TitleTemplatePreset {
  id: TitleTemplateId
  name: string
  description: string
  tone: string
}

export const TITLE_TEMPLATE_PRESETS: TitleTemplatePreset[] = [
  {
    id: 'module_premium',
    name: 'Modulo premium',
    description: 'Badge forte, fundo suave e titulo de abertura.',
    tone: 'Modulo',
  },
  {
    id: 'editorial_classic',
    name: 'Editorial',
    description: 'Linha elegante para materiais mais classicos.',
    tone: 'Aula',
  },
  {
    id: 'brand_band',
    name: 'Faixa brand',
    description: 'Barra cheia com cores da escola.',
    tone: 'Destaque',
  },
  {
    id: 'lesson_card',
    name: 'Licao limpa',
    description: 'Card leve para titulos de licao.',
    tone: 'Licao',
  },
  {
    id: 'musical_staff',
    name: 'Pauta musical',
    description: 'Detalhe musical discreto e sofisticado.',
    tone: 'Teoria',
  },
  {
    id: 'chapter_divider',
    name: 'Capitulo',
    description: 'Divisor amplo para abrir secoes importantes.',
    tone: 'Capitulo',
  },
]

export const DEFAULT_TITLE_TEMPLATE_ID: TitleTemplateId = 'module_premium'

export function getTitleTemplatePreset(id?: string | null) {
  return TITLE_TEMPLATE_PRESETS.find(template => template.id === id) ?? null
}

export function getTitleTemplateAccent(renderData: Record<string, unknown> | null | undefined, fallback?: string) {
  if (renderData?.title_color_mode === 'custom' && renderData.title_accent_color) {
    return String(renderData.title_accent_color)
  }
  return String(fallback || renderData?.brand_primary_color || '#1E3A5F')
}

export function getTitleTemplateSecondary(renderData: Record<string, unknown> | null | undefined, fallback?: string) {
  if (renderData?.title_color_mode === 'custom' && renderData.title_secondary_color) {
    return String(renderData.title_secondary_color)
  }
  return String(fallback || renderData?.brand_secondary_color || '#FF2D78')
}
