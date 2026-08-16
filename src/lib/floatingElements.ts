import { pageSize, type PageOrientation } from './a4Preview'

// ── Floating Elements — Tipos, defaults e helpers ──

// Tipo base para todos os floating elements
export interface FloatingElementBase {
  id: string
  type: 'floating_text' | 'floating_image' | 'shape' | 'iconify_icon'
  pageIndex: number
  x: number
  y: number
  width: number
  height?: number
  rotation: number
  opacity: number
  zIndex: number
  locked: boolean
  visible: boolean
  name: string
}

// Sombra reutilizável
export interface FloatingShadow {
  enabled: boolean
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

// Borda reutilizável
export interface FloatingBorder {
  enabled: boolean
  color: string
  width: number
  style: 'solid' | 'dashed' | 'dotted'
  radius?: number
}

// Caixa de texto flutuante
export interface FloatingText extends FloatingElementBase {
  type: 'floating_text'
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontStyle?: 'normal' | 'italic'
  color: string
  align: 'left' | 'center' | 'right'
  lineHeight: number
  letterSpacing: number
  uppercase: boolean
  background: {
    enabled: boolean
    color: string
    padding: number
    borderRadius: number
  }
  border: FloatingBorder
  shadow: FloatingShadow
}

// Imagem flutuante
export interface FloatingImage extends FloatingElementBase {
  type: 'floating_image'
  imageUrl: string
  svgCode?: string | null
  source?: string | null
  color?: string
  objectFit: 'contain' | 'cover' | 'fill'
  borderRadius: number
  shadow: FloatingShadow
  border: FloatingBorder
  flipX: boolean
  flipY: boolean
}

// Forma geométrica
export type FloatingShapeKind = 'rectangle' | 'circle' | 'line' | 'arrow' | 'star' | 'callout'

export interface FloatingShape extends FloatingElementBase {
  type: 'shape'
  shape: FloatingShapeKind
  fill: {
    type: 'solid' | 'gradient' | 'none'
    color: string
    gradientFrom?: string
    gradientTo?: string
    gradientDirection?: string
  }
  stroke: {
    color: string
    width: number
    style: 'solid' | 'dashed' | 'dotted'
  }
  borderRadius: number
}

export interface FloatingIcon extends FloatingElementBase {
  type: 'iconify_icon'
  icon: string
  color: string
  strokeWidth?: number
}

export type FloatingElement = FloatingText | FloatingImage | FloatingShape | FloatingIcon

export const FLOATING_PAGE_ASPECT_RATIO = 210 / 297

export function getFloatingAspectLockedHeight(width: number): number {
  return Math.round(width * FLOATING_PAGE_ASPECT_RATIO * 10) / 10
}

export function isFloatingElementAspectLocked(el: FloatingElement): boolean {
  if (el.type === 'iconify_icon') return true
  if (el.type === 'floating_image') return Boolean(el.svgCode)
  return el.type === 'shape' && ['circle', 'star'].includes(el.shape)
}

export function getFloatingElementHeight(el: FloatingElement): number | undefined {
  if (isFloatingElementAspectLocked(el)) return getFloatingAspectLockedHeight(el.width)
  if (el.type === 'floating_text') return el.height ?? DEFAULT_FLOATING_TEXT.height
  if (el.height != null) return el.height
  if (el.type === 'floating_image') return getFloatingAspectLockedHeight(el.width)
  return undefined
}

// ── Defaults ──

const DEFAULT_SHADOW: FloatingShadow = {
  enabled: false,
  color: '#00000030',
  blur: 8,
  offsetX: 0,
  offsetY: 2,
}

const DEFAULT_BORDER: FloatingBorder = {
  enabled: false,
  color: '#e2e8f0',
  width: 1,
  style: 'solid',
  radius: 4,
}

export const DEFAULT_FLOATING_TEXT: Omit<FloatingText, 'id'> = {
  type: 'floating_text',
  pageIndex: 0,
  x: 50,
  y: 50,
  width: 21,
  height: 3.4,
  rotation: 0,
  opacity: 1,
  zIndex: 10,
  locked: false,
  visible: true,
  name: 'Texto',
  content: '<p>Novo texto</p>',
  fontFamily: 'DM Sans',
  fontSize: 32,
  fontWeight: 400,
  fontStyle: 'normal',
  color: '#1e293b',
  align: 'left',
  lineHeight: 1.18,
  letterSpacing: 0,
  uppercase: false,
  background: { enabled: false, color: '#ffffff80', padding: 8, borderRadius: 4 },
  border: { ...DEFAULT_BORDER },
  shadow: { ...DEFAULT_SHADOW },
}

export const DEFAULT_FLOATING_IMAGE: Omit<FloatingImage, 'id' | 'imageUrl'> = {
  type: 'floating_image',
  pageIndex: 0,
  x: 50,
  y: 50,
  width: 30,
  height: getFloatingAspectLockedHeight(30),
  rotation: 0,
  opacity: 1,
  zIndex: 10,
  locked: false,
  visible: true,
  name: 'Imagem',
  objectFit: 'contain',
  borderRadius: 0,
  shadow: { ...DEFAULT_SHADOW },
  border: { ...DEFAULT_BORDER },
  flipX: false,
  flipY: false,
}

export const DEFAULT_SHAPE: Omit<FloatingShape, 'id'> = {
  type: 'shape',
  pageIndex: 0,
  x: 50,
  y: 50,
  width: 20,
  height: 20,
  rotation: 0,
  opacity: 1,
  zIndex: 5,
  locked: false,
  visible: true,
  name: 'Forma',
  shape: 'rectangle',
  fill: { type: 'solid', color: '#6366f1' },
  stroke: { color: '#4f46e5', width: 0, style: 'solid' },
  borderRadius: 0,
}

export const DEFAULT_FLOATING_ICON: Omit<FloatingIcon, 'id' | 'icon'> = {
  type: 'iconify_icon',
  pageIndex: 0,
  x: 50,
  y: 50,
  width: 8,
  height: getFloatingAspectLockedHeight(8),
  rotation: 0,
  opacity: 1,
  zIndex: 10,
  locked: false,
  visible: true,
  name: 'Ícone',
  color: '#1e3a5f',
  strokeWidth: 2,
}

const SHAPE_LABELS: Record<FloatingShapeKind, string> = {
  rectangle: 'Retângulo',
  circle: 'Círculo',
  line: 'Linha',
  arrow: 'Seta',
  star: 'Estrela',
  callout: 'Callout',
}

export function getFloatingShapeLabel(shape: FloatingShapeKind): string {
  return SHAPE_LABELS[shape]
}

export function isFloatingLinearShape(shape: FloatingShapeKind): boolean {
  return shape === 'line' || shape === 'arrow'
}

export function getFloatingShapePrimaryColor(shape: FloatingShape): string {
  return isFloatingLinearShape(shape.shape) ? shape.stroke.color : shape.fill.color
}

export function buildFloatingShapePrimaryColorUpdate(shape: FloatingShape, color: string): Partial<FloatingShape> {
  if (isFloatingLinearShape(shape.shape)) {
    return {
      stroke: {
        ...shape.stroke,
        color,
        width: shape.stroke.width || 3,
      },
    }
  }

  return {
    fill: {
      ...shape.fill,
      color,
      type: 'solid',
    },
  }
}

export function buildFloatingShapeKindUpdate(shape: FloatingShape, nextShape: FloatingShapeKind): Partial<FloatingShape> {
  const nextIsLinear = isFloatingLinearShape(nextShape)
  const currentVisibleColor = shape.fill.type === 'none'
    ? shape.stroke.color
    : shape.fill.color

  return {
    shape: nextShape,
    name: getFloatingShapeLabel(nextShape),
    ...(nextIsLinear
      ? {
          fill: { ...shape.fill, type: 'none' as const, color: 'transparent' },
          stroke: {
            ...shape.stroke,
            color: currentVisibleColor,
            width: shape.stroke.width || 3,
          },
        }
      : {}),
  }
}

export function createFloatingShape(
  shape: FloatingShapeKind,
  options: Partial<Omit<FloatingShape, 'type' | 'shape'>> & { id: string },
): FloatingShape {
  const isLinear = isFloatingLinearShape(shape)
  const isAspectLocked = shape === 'circle' || shape === 'star'
  const width = options.width ?? (isLinear ? 26 : DEFAULT_SHAPE.width)
  return {
    ...DEFAULT_SHAPE,
    ...options,
    type: 'shape',
    shape,
    name: options.name || getFloatingShapeLabel(shape),
    width,
    height: options.height ?? (isLinear ? 2 : isAspectLocked ? getFloatingAspectLockedHeight(width) : DEFAULT_SHAPE.height),
    fill: options.fill ?? (isLinear
      ? { ...DEFAULT_SHAPE.fill, type: 'none', color: 'transparent' }
      : { ...DEFAULT_SHAPE.fill }),
    stroke: options.stroke ?? {
      ...DEFAULT_SHAPE.stroke,
      width: isLinear ? 3 : DEFAULT_SHAPE.stroke.width,
    },
  }
}

export function createFloatingIcon({
  id,
  icon,
  label,
  ...options
}: Partial<Omit<FloatingIcon, 'type' | 'icon' | 'name'>> & {
  id: string
  icon: string
  label?: string
  name?: string
}): FloatingIcon {
  return {
    ...DEFAULT_FLOATING_ICON,
    ...options,
    id,
    type: 'iconify_icon',
    icon,
    name: label || options.name || 'Ícone',
  }
}

// ── Helpers ──

/** CSS base do container de um floating element */
export function floatingBaseCSS(el: FloatingElement, options: { rotate?: boolean } = {}): React.CSSProperties {
  const shouldRotate = options.rotate ?? true
  const height = isFloatingElementAspectLocked(el)
    ? getFloatingAspectLockedHeight(el.width)
    : getFloatingElementHeight(el)
  return {
    position: 'absolute',
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.width}%`,
    ...(height != null ? { height: `${height}%` } : {}),
    transform: shouldRotate
      ? `translate(-50%, -50%) rotate(${el.rotation}deg)`
      : 'translate(-50%, -50%)',
    opacity: el.opacity,
    zIndex: el.zIndex,
    cursor: el.locked ? 'default' : 'move',
    pointerEvents: el.locked ? 'none' as const : 'auto' as const,
  }
}

/** CSS para FloatingText */
export function floatingTextCSS(el: FloatingText): React.CSSProperties {
  return {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    fontFamily: `'${el.fontFamily}', sans-serif`,
    fontSize: `${el.fontSize}px`,
    fontWeight: el.fontWeight,
    fontStyle: el.fontStyle ?? 'normal',
    color: el.color,
    textAlign: el.align,
    lineHeight: el.lineHeight,
    letterSpacing: `${el.letterSpacing}px`,
    textTransform: el.uppercase ? 'uppercase' : 'none',
    ...(el.background.enabled && {
      backgroundColor: el.background.color,
      padding: `${el.background.padding}px`,
      borderRadius: `${el.background.borderRadius}px`,
    }),
    ...(el.border.enabled && {
      border: `${el.border.width}px ${el.border.style} ${el.border.color}`,
      borderRadius: `${el.border.radius || 0}px`,
    }),
    ...(el.shadow.enabled && {
      boxShadow: `${el.shadow.offsetX}px ${el.shadow.offsetY}px ${el.shadow.blur}px ${el.shadow.color}`,
    }),
    wordBreak: 'break-word' as const,
    overflow: 'visible',
  }
}

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decodeFloatingTextEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    const normalized = code.toLowerCase()
    if (normalized.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16))
    }
    if (normalized.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10))
    }
    return HTML_ENTITY_MAP[normalized] ?? entity
  })
}

function escapeFloatingTextHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function floatingTextHtmlToPlainText(html: string): string {
  return decodeFloatingTextEntities(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function floatingTextPlainTextToHtml(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  if (lines.every(line => line.trim() === '')) return '<p></p>'
  return lines
    .map(line => `<p>${line ? escapeFloatingTextHtml(line) : '<br>'}</p>`)
    .join('')
}

export function isFloatingTextContentEmpty(html: string): boolean {
  return floatingTextHtmlToPlainText(html).trim().length === 0
}

export function getFloatingTextAutoSize(
  el: Pick<FloatingText, 'content' | 'fontSize' | 'lineHeight' | 'letterSpacing'>,
  orientation: PageOrientation = 'portrait',
): { width: number; height: number } {
  const { content, fontSize, lineHeight, letterSpacing } = el
  const { width: pageW, height: pageH } = pageSize(orientation)
  const plain = floatingTextHtmlToPlainText(content) || 'Texto'
  const lines = plain.split('\n')
  const longestLineLength = Math.max(...lines.map(line => line.length), 1)
  const estimatedCharacterWidth = Math.max(4, fontSize * 0.52 + letterSpacing)
  const widthPx = longestLineLength * estimatedCharacterWidth
  const heightPx = Math.max(lines.length, 1) * fontSize * lineHeight
  return {
    width: Math.round(Math.max(6, Math.min(80, (widthPx / pageW) * 100)) * 10) / 10,
    height: Math.round(Math.max(2.4, Math.min(60, (heightPx / pageH) * 100)) * 10) / 10,
  }
}

/** CSS para FloatingImage */
export function floatingImageCSS(el: FloatingImage): React.CSSProperties {
  return {
    width: '100%',
    height: el.height ? '100%' : 'auto',
    objectFit: el.objectFit,
    borderRadius: `${el.borderRadius}px`,
    transform: `${el.flipX ? 'scaleX(-1)' : ''} ${el.flipY ? 'scaleY(-1)' : ''}`.trim() || undefined,
    ...(el.shadow.enabled && {
      filter: `drop-shadow(${el.shadow.offsetX}px ${el.shadow.offsetY}px ${el.shadow.blur}px ${el.shadow.color})`,
    }),
    ...(el.border.enabled && {
      border: `${el.border.width}px ${el.border.style} ${el.border.color}`,
    }),
  }
}

export function floatingIconCSS(el: FloatingIcon): React.CSSProperties {
  return {
    width: '100%',
    height: '100%',
    color: el.color,
    display: 'block',
  }
}

/** CSS de preenchimento para shapes */
export function shapeFillCSS(el: FloatingShape): string {
  if (el.fill.type === 'none') return 'transparent'
  if (el.fill.type === 'gradient') {
    return `linear-gradient(${el.fill.gradientDirection || 'to bottom'}, ${el.fill.gradientFrom || el.fill.color}, ${el.fill.gradientTo || el.fill.color})`
  }
  return el.fill.color
}

/** CSS de borda para shapes */
export function shapeStrokeCSS(el: FloatingShape): string {
  if (el.stroke.width <= 0) return 'none'
  return `${el.stroke.width}px ${el.stroke.style} ${el.stroke.color}`
}

// Snap-to-grid (reutilizável — mesmo padrão da capa)
export const SNAP_POINTS = [25, 33.33, 50, 66.67, 75]
export const SNAP_THRESHOLD = 2

export function snapValue(val: number): { snapped: number; guide: number | null } {
  for (const sp of SNAP_POINTS) {
    if (Math.abs(val - sp) <= SNAP_THRESHOLD) return { snapped: sp, guide: sp }
  }
  return { snapped: val, guide: null }
}
