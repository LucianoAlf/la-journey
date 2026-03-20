// --- Tipos e defaults para estilização visual de blocos (Fase 2) ---

export interface BlockStyle {
  background: {
    type: 'none' | 'solid' | 'gradient'
    color: string
    gradientFrom: string
    gradientTo: string
    gradientDirection: 'to bottom' | 'to right' | 'to bottom right' | 'to top'
  }
  padding: {
    top: number
    right: number
    bottom: number
    left: number
    linked: boolean
  }
  border: {
    enabled: boolean
    color: string
    width: number
    radius: number
    style: 'solid' | 'dashed' | 'dotted'
  }
  margin: {
    top: number
    bottom: number
  }
}

export interface SeparatorStyle {
  color: string
  width: number
  style: 'solid' | 'dashed' | 'dotted' | 'double'
  widthPercent: number
  spacing: number
  align: 'left' | 'center' | 'right'
  decoration: 'none' | 'notes' | 'star' | 'dot' | 'diamond'
}

export interface PageBackground {
  color: string
  watermark?: {
    enabled: boolean
    type: 'text' | 'image'
    text?: string
    imageUrl?: string
    opacity: number
    rotation: number
    fontSize?: number
  }
}

export interface PageMargins {
  top: number      // px
  right: number    // px
  bottom: number   // px
  left: number     // px
}

export interface PageGuide {
  id: string
  type: 'horizontal' | 'vertical'
  position: number  // px from top (horizontal) or left (vertical)
  color: string
}

export const DEFAULT_PAGE_MARGINS: PageMargins = {
  top: 60,
  right: 60,
  bottom: 60,
  left: 60,
}

export const DEFAULT_BLOCK_STYLE: BlockStyle = {
  background: {
    type: 'none',
    color: '#ffffff',
    gradientFrom: '#ffffff',
    gradientTo: '#f0f0f0',
    gradientDirection: 'to bottom',
  },
  padding: { top: 12, right: 16, bottom: 12, left: 16, linked: true },
  border: { enabled: false, color: '#e2e8f0', width: 1, radius: 8, style: 'solid' },
  margin: { top: 0, bottom: 8 },
}

export const DEFAULT_SEPARATOR_STYLE: SeparatorStyle = {
  color: '#e2e8f0',
  width: 1,
  style: 'solid',
  widthPercent: 100,
  spacing: 16,
  align: 'center',
  decoration: 'none',
}

export const DEFAULT_PAGE_BACKGROUND: PageBackground = {
  color: '#ffffff',
}

/** Mescla estilo parcial com defaults, tratando objetos aninhados */
export function mergeBlockStyle(current: Partial<BlockStyle> | undefined, updates: Partial<BlockStyle>): BlockStyle {
  const base = { ...DEFAULT_BLOCK_STYLE, ...current }
  return {
    background: { ...base.background, ...updates.background },
    padding: { ...base.padding, ...updates.padding },
    border: { ...base.border, ...updates.border },
    margin: { ...base.margin, ...updates.margin },
  }
}

/** Mescla estilo parcial do separador com defaults */
export function mergeSeparatorStyle(current: Partial<SeparatorStyle> | undefined, updates: Partial<SeparatorStyle>): SeparatorStyle {
  return { ...DEFAULT_SEPARATOR_STYLE, ...current, ...updates }
}

/** Gera o objeto CSS inline a partir de um BlockStyle */
export function blockStyleToCSS(style: BlockStyle | undefined): React.CSSProperties {
  if (!style) return {}
  const css: React.CSSProperties = {}

  // Background
  if (style.background?.type === 'solid') {
    css.backgroundColor = style.background.color
  } else if (style.background?.type === 'gradient') {
    css.background = `linear-gradient(${style.background.gradientDirection}, ${style.background.gradientFrom}, ${style.background.gradientTo})`
  }

  // Padding
  if (style.padding) {
    css.paddingTop = `${style.padding.top}px`
    css.paddingRight = `${style.padding.right}px`
    css.paddingBottom = `${style.padding.bottom}px`
    css.paddingLeft = `${style.padding.left}px`
  }

  // Border
  if (style.border?.enabled) {
    css.border = `${style.border.width}px ${style.border.style} ${style.border.color}`
    css.borderRadius = `${style.border.radius}px`
  }

  // Margin
  if (style.margin) {
    css.marginTop = `${style.margin.top}px`
    css.marginBottom = `${style.margin.bottom}px`
  }

  return css
}

/** Gera o CSS inline para o separador */
export function separatorStyleToCSS(style: SeparatorStyle | undefined): {
  wrapper: React.CSSProperties
  line: React.CSSProperties
} {
  const s = style ?? DEFAULT_SEPARATOR_STYLE
  return {
    wrapper: {
      display: 'flex',
      justifyContent: s.align === 'left' ? 'flex-start' : s.align === 'right' ? 'flex-end' : 'center',
      padding: `${s.spacing}px 0`,
    },
    line: {
      border: 'none',
      borderTop: s.style === 'double'
        ? `${s.width}px double ${s.color}`
        : `${s.width}px ${s.style} ${s.color}`,
      width: `${s.widthPercent}%`,
      margin: 0,
    },
  }
}

/** Decoração do separador */
export function getSeparatorDecoration(decoration: SeparatorStyle['decoration']): string | null {
  switch (decoration) {
    case 'notes': return '♪ ♫'
    case 'star': return '✦'
    case 'dot': return '●'
    case 'diamond': return '◆'
    default: return null
  }
}
