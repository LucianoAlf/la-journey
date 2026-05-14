import {
  BookOpen, FileText, Hash, Buildings, User, Calendar, MusicNotes,
} from '@phosphor-icons/react'

// ── Tipos ──────────────────────────────────────────────────────────────

export interface HeaderFooterZone {
  type: 'text' | 'placeholder' | 'image' | 'empty'
  // Para type 'text':
  text?: string
  // Para type 'placeholder':
  placeholder?: '{titulo}' | '{subtitulo}' | '{pagina}' | '{total}' | '{pagina_de_total}' | '{pagina_barra_total}' | '{pagina_texto}'
    | '{escola}' | '{professor}' | '{data}' | '{instrumento}' | '{nivel}'
  // Para type 'image':
  imageUrl?: string
  imageHeight?: number // 16-40 px
  // Estilo da zona:
  fontSize?: number    // 7-14 px
  fontWeight?: number  // 400 | 600 | 700
  color?: string       // hex
  fontFamily?: string  // 'DM Sans' | 'Playfair Display' | etc.
  uppercase?: boolean
  letterSpacing?: number // 0-3
}

export interface HeaderFooterConfig {
  enabled: boolean
  height: number              // 24-60 px
  backgroundColor: string     // hex ou 'transparent'
  borderBottom?: string       // para header: '1px solid #e2e8f0'
  borderTop?: string          // para footer: '1px solid #e2e8f0'
  paddingX: number            // 8-40 px
  left: HeaderFooterZone
  center: HeaderFooterZone
  right: HeaderFooterZone
  showOnFirstPage: boolean
  startFromPage: number       // 0 = todas, 1 = a partir da 2ª, etc.
}

export interface HeaderFooterTemplate {
  id: string
  name: string
  type: 'header' | 'footer'
  config: HeaderFooterConfig
}

// ── Placeholders ───────────────────────────────────────────────────────

export const PLACEHOLDER_OPTIONS = [
  { value: '{titulo}', label: 'Título do material', icon: BookOpen },
  { value: '{subtitulo}', label: 'Subtítulo', icon: FileText },
  { value: '{pagina}', label: 'Nº da página (ex: 1)', icon: Hash },
  { value: '{total}', label: 'Total de páginas', icon: Hash },
  { value: '{pagina_de_total}', label: 'X de Y (ex: 1 de 9)', icon: Hash },
  { value: '{pagina_barra_total}', label: 'X/Y (ex: 1/9)', icon: Hash },
  { value: '{pagina_texto}', label: 'Página X (ex: Página 1)', icon: Hash },
  { value: '{escola}', label: 'Nome da escola', icon: Buildings },
  { value: '{professor}', label: 'Nome do professor', icon: User },
  { value: '{data}', label: 'Data atual', icon: Calendar },
  { value: '{instrumento}', label: 'Instrumento', icon: MusicNotes },
  { value: '{nivel}', label: 'Nível', icon: MusicNotes },
] as const

export interface PlaceholderContext {
  title: string
  subtitle?: string
  pageNumber: number
  totalPages: number
  schoolName: string
  professorName: string
  instrument?: string
  level?: string
}

export function resolvePlaceholder(placeholder: string, context: PlaceholderContext): string {
  const map: Record<string, string> = {
    '{titulo}': context.title || '',
    '{subtitulo}': context.subtitle || '',
    '{pagina}': String(context.pageNumber),
    '{total}': String(context.totalPages),
    '{pagina_de_total}': `${context.pageNumber} de ${context.totalPages}`,
    '{pagina_barra_total}': `${context.pageNumber}/${context.totalPages}`,
    '{pagina_texto}': `Página ${context.pageNumber}`,
    '{escola}': context.schoolName || '',
    '{professor}': context.professorName || '',
    '{data}': new Date().toLocaleDateString('pt-BR'),
    '{instrumento}': context.instrument || '',
    '{nivel}': context.level || '',
  }
  return map[placeholder] || placeholder
}

// ── Defaults ───────────────────────────────────────────────────────────

export const DEFAULT_HEADER: HeaderFooterConfig = {
  enabled: true,
  height: 40,
  backgroundColor: 'transparent',
  borderBottom: '1px solid #e2e8f0',
  paddingX: 24,
  left: {
    type: 'text',
    text: 'LA Music',
    fontSize: 10,
    fontWeight: 600,
    color: '#64748b',
    fontFamily: 'DM Sans',
    uppercase: true,
    letterSpacing: 1,
  },
  center: {
    type: 'placeholder',
    placeholder: '{titulo}',
    fontSize: 10,
    fontWeight: 400,
    color: '#94a3b8',
    fontFamily: 'DM Sans',
  },
  right: {
    type: 'image',
    imageUrl: '',
    imageHeight: 24,
  },
  showOnFirstPage: false,
  startFromPage: 1,
}

export const DEFAULT_FOOTER: HeaderFooterConfig = {
  enabled: true,
  height: 36,
  backgroundColor: 'transparent',
  borderTop: '1px solid #e2e8f0',
  paddingX: 24,
  left: {
    type: 'placeholder',
    placeholder: '{escola}',
    fontSize: 9,
    fontWeight: 400,
    color: '#94a3b8',
    fontFamily: 'DM Sans',
  },
  center: {
    type: 'empty',
  },
  right: {
    type: 'placeholder',
    placeholder: '{pagina_de_total}',
    fontSize: 9,
    fontWeight: 600,
    color: '#64748b',
    fontFamily: 'DM Sans',
  },
  showOnFirstPage: false,
  startFromPage: 1,
}

// ── Templates ──────────────────────────────────────────────────────────

export const HEADER_FOOTER_TEMPLATES: HeaderFooterTemplate[] = [
  // ── HEADERS ──
  {
    id: 'header-minimal',
    name: 'Minimal',
    type: 'header',
    config: {
      enabled: true,
      height: 36,
      backgroundColor: 'transparent',
      borderBottom: '1px solid #e2e8f0',
      paddingX: 24,
      left: { type: 'text', text: 'LA Music', fontSize: 9, fontWeight: 600, color: '#94a3b8', uppercase: true, letterSpacing: 2 },
      center: { type: 'empty' },
      right: { type: 'placeholder', placeholder: '{titulo}', fontSize: 9, fontWeight: 400, color: '#94a3b8' },
      showOnFirstPage: false,
      startFromPage: 1,
    },
  },
  {
    id: 'header-academico',
    name: 'Acadêmico',
    type: 'header',
    config: {
      enabled: true,
      height: 44,
      backgroundColor: '#f8fafc',
      borderBottom: '2px solid #1e3a5f',
      paddingX: 24,
      left: { type: 'image', imageUrl: '', imageHeight: 28 },
      center: { type: 'placeholder', placeholder: '{titulo}', fontSize: 11, fontWeight: 700, color: '#1e3a5f', fontFamily: 'Playfair Display' },
      right: { type: 'placeholder', placeholder: '{instrumento}', fontSize: 9, fontWeight: 400, color: '#64748b' },
      showOnFirstPage: false,
      startFromPage: 1,
    },
  },
  {
    id: 'header-completo',
    name: 'Completo',
    type: 'header',
    config: {
      enabled: true,
      height: 42,
      backgroundColor: 'transparent',
      borderBottom: '1px solid #e2e8f0',
      paddingX: 24,
      left: { type: 'placeholder', placeholder: '{escola}', fontSize: 9, fontWeight: 600, color: '#64748b', uppercase: true, letterSpacing: 1 },
      center: { type: 'placeholder', placeholder: '{titulo}', fontSize: 10, fontWeight: 600, color: '#1e293b' },
      right: { type: 'placeholder', placeholder: '{instrumento}', fontSize: 9, fontWeight: 400, color: '#94a3b8' },
      showOnFirstPage: false,
      startFromPage: 1,
    },
  },
  {
    id: 'header-moderno',
    name: 'Moderno',
    type: 'header',
    config: {
      enabled: true,
      height: 40,
      backgroundColor: '#1e293b',
      borderBottom: undefined,
      paddingX: 20,
      left: { type: 'text', text: 'LA Music', fontSize: 10, fontWeight: 700, color: '#ffffff', fontFamily: 'Montserrat', uppercase: true, letterSpacing: 3 },
      center: { type: 'empty' },
      right: { type: 'placeholder', placeholder: '{nivel}', fontSize: 9, fontWeight: 400, color: '#94a3b8' },
      showOnFirstPage: false,
      startFromPage: 1,
    },
  },
  {
    id: 'header-colorido',
    name: 'Colorido',
    type: 'header',
    config: {
      enabled: true,
      height: 40,
      backgroundColor: '#6366f1',
      borderBottom: undefined,
      paddingX: 20,
      left: { type: 'image', imageUrl: '', imageHeight: 24 },
      center: { type: 'placeholder', placeholder: '{titulo}', fontSize: 11, fontWeight: 700, color: '#ffffff', fontFamily: 'Poppins' },
      right: { type: 'placeholder', placeholder: '{nivel}', fontSize: 9, fontWeight: 600, color: '#e0e7ff', uppercase: true },
      showOnFirstPage: false,
      startFromPage: 1,
    },
  },
  {
    id: 'header-limpo',
    name: 'Limpo',
    type: 'header',
    config: {
      enabled: true,
      height: 32,
      backgroundColor: 'transparent',
      borderBottom: '0.5px solid #cbd5e1',
      paddingX: 32,
      left: { type: 'placeholder', placeholder: '{escola}', fontSize: 8, fontWeight: 400, color: '#94a3b8', uppercase: true, letterSpacing: 2 },
      center: { type: 'empty' },
      right: { type: 'placeholder', placeholder: '{data}', fontSize: 8, fontWeight: 400, color: '#94a3b8' },
      showOnFirstPage: false,
      startFromPage: 1,
    },
  },
  {
    id: 'header-musical',
    name: 'Musical',
    type: 'header',
    config: {
      enabled: true,
      height: 42,
      backgroundColor: 'transparent',
      borderBottom: '2px solid #f43f5e',
      paddingX: 24,
      left: { type: 'text', text: '♪', fontSize: 14, fontWeight: 400, color: '#f43f5e' },
      center: { type: 'placeholder', placeholder: '{titulo}', fontSize: 11, fontWeight: 600, color: '#1e293b', fontFamily: 'Playfair Display' },
      right: { type: 'text', text: '♫', fontSize: 14, fontWeight: 400, color: '#f43f5e' },
      showOnFirstPage: false,
      startFromPage: 1,
    },
  },

  // ── FOOTERS ──
  {
    id: 'footer-minimal',
    name: 'Minimal',
    type: 'footer',
    config: {
      enabled: true,
      height: 32,
      backgroundColor: 'transparent',
      borderTop: '1px solid #e2e8f0',
      paddingX: 24,
      left: { type: 'empty' },
      center: { type: 'placeholder', placeholder: '{pagina}', fontSize: 9, fontWeight: 600, color: '#64748b' },
      right: { type: 'empty' },
      showOnFirstPage: false,
      startFromPage: 1,
    },
  },
  {
    id: 'footer-completo',
    name: 'Completo',
    type: 'footer',
    config: {
      enabled: true,
      height: 36,
      backgroundColor: 'transparent',
      borderTop: '1px solid #e2e8f0',
      paddingX: 24,
      left: { type: 'placeholder', placeholder: '{escola}', fontSize: 8, fontWeight: 400, color: '#94a3b8' },
      center: { type: 'placeholder', placeholder: '{professor}', fontSize: 8, fontWeight: 400, color: '#94a3b8' },
      right: { type: 'placeholder', placeholder: '{pagina_de_total}', fontSize: 9, fontWeight: 600, color: '#64748b' },
      showOnFirstPage: false,
      startFromPage: 1,
    },
  },
  {
    id: 'footer-moderno',
    name: 'Moderno',
    type: 'footer',
    config: {
      enabled: true,
      height: 36,
      backgroundColor: '#1e293b',
      borderTop: undefined,
      paddingX: 20,
      left: { type: 'placeholder', placeholder: '{escola}', fontSize: 8, fontWeight: 400, color: '#94a3b8', uppercase: true, letterSpacing: 1 },
      center: { type: 'empty' },
      right: { type: 'placeholder', placeholder: '{pagina_de_total}', fontSize: 9, fontWeight: 600, color: '#ffffff' },
      showOnFirstPage: false,
      startFromPage: 1,
    },
  },
  {
    id: 'footer-colorido',
    name: 'Colorido',
    type: 'footer',
    config: {
      enabled: true,
      height: 36,
      backgroundColor: '#6366f1',
      borderTop: undefined,
      paddingX: 20,
      left: { type: 'text', text: '© LA Music', fontSize: 8, fontWeight: 400, color: '#e0e7ff' },
      center: { type: 'placeholder', placeholder: '{data}', fontSize: 8, fontWeight: 400, color: '#e0e7ff' },
      right: { type: 'placeholder', placeholder: '{pagina_de_total}', fontSize: 9, fontWeight: 700, color: '#ffffff' },
      showOnFirstPage: false,
      startFromPage: 1,
    },
  },
  {
    id: 'footer-limpo',
    name: 'Limpo',
    type: 'footer',
    config: {
      enabled: true,
      height: 28,
      backgroundColor: 'transparent',
      borderTop: '0.5px solid #cbd5e1',
      paddingX: 32,
      left: { type: 'empty' },
      center: { type: 'empty' },
      right: { type: 'placeholder', placeholder: '{pagina}', fontSize: 8, fontWeight: 400, color: '#94a3b8' },
      showOnFirstPage: false,
      startFromPage: 1,
    },
  },
]

// ── Migração legado → novo ─────────────────────────────────────────────

interface LegacyHeader {
  enabled: boolean
  leftText: string
  centerText: string
  rightText: string
  showOnFirstPage: boolean
}

interface LegacyFooter {
  enabled: boolean
  leftText: string
  centerText: string
  rightText: string
  showPageNumber: boolean
  pageNumberPosition: 'left' | 'center' | 'right'
}

/** Converte campo legado do tipo string para uma zona */
function legacyTextToZone(text: string): HeaderFooterZone {
  if (!text) return { type: 'empty' }
  // Detecta se é um placeholder puro
  if (/^\{[a-z_]+\}$/.test(text.trim())) {
    return {
      type: 'placeholder',
      placeholder: text.trim() as HeaderFooterZone['placeholder'],
      fontSize: 10,
      fontWeight: 400,
      color: '#94a3b8',
      fontFamily: 'DM Sans',
    }
  }
  return {
    type: 'text',
    text,
    fontSize: 10,
    fontWeight: 400,
    color: '#94a3b8',
    fontFamily: 'DM Sans',
  }
}

/** Migra o formato legado de header para o novo HeaderFooterConfig */
export function migrateLegacyHeader(legacy: LegacyHeader): HeaderFooterConfig {
  return {
    ...DEFAULT_HEADER,
    enabled: legacy.enabled,
    left: legacyTextToZone(legacy.leftText),
    center: legacyTextToZone(legacy.centerText),
    right: legacyTextToZone(legacy.rightText),
    showOnFirstPage: legacy.showOnFirstPage,
  }
}

/** Migra o formato legado de footer para o novo HeaderFooterConfig */
export function migrateLegacyFooter(legacy: LegacyFooter): HeaderFooterConfig {
  const config: HeaderFooterConfig = {
    ...DEFAULT_FOOTER,
    enabled: legacy.enabled,
    left: legacyTextToZone(legacy.leftText),
    center: { type: 'empty' },
    right: { type: 'empty' },
    showOnFirstPage: false,
    startFromPage: 1,
  }

  // Migrar número de página para a zona correta
  if (legacy.showPageNumber) {
    const pageZone: HeaderFooterZone = {
      type: 'placeholder',
      placeholder: '{pagina_de_total}',
      fontSize: 9,
      fontWeight: 600,
      color: '#64748b',
      fontFamily: 'DM Sans',
    }
    if (legacy.pageNumberPosition === 'left') {
      config.left = pageZone
    } else if (legacy.pageNumberPosition === 'center') {
      config.center = pageZone
    } else {
      config.right = pageZone
    }
  }

  return config
}

/** Detecta se o pageConfig usa formato legado (sem 'left'/'center'/'right' como objetos) */
export function isLegacyFormat(headerOrFooter: unknown): boolean {
  if (!headerOrFooter || typeof headerOrFooter !== 'object') return false
  const obj = headerOrFooter as Record<string, unknown>
  // Formato legado tem leftText (string), novo tem left (objeto com type)
  return typeof obj.leftText === 'string' || typeof obj.showPageNumber === 'boolean'
}
