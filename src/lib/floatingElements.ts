// ── Floating Elements — Tipos, defaults e helpers ──

// Tipo base para todos os floating elements
export interface FloatingElementBase {
  id: string
  type: 'floating_text' | 'floating_image' | 'shape'
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
  objectFit: 'contain' | 'cover' | 'fill'
  borderRadius: number
  shadow: FloatingShadow
  border: FloatingBorder
  flipX: boolean
  flipY: boolean
}

// Forma geométrica
export interface FloatingShape extends FloatingElementBase {
  type: 'shape'
  shape: 'rectangle' | 'circle' | 'line' | 'arrow'
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

export type FloatingElement = FloatingText | FloatingImage | FloatingShape

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
  width: 40,
  rotation: 0,
  opacity: 1,
  zIndex: 10,
  locked: false,
  visible: true,
  name: 'Texto',
  content: '<p>Novo texto</p>',
  fontFamily: 'DM Sans',
  fontSize: 16,
  fontWeight: 400,
  color: '#1e293b',
  align: 'left',
  lineHeight: 1.4,
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

// ── Helpers ──

/** CSS base do container de um floating element */
export function floatingBaseCSS(el: FloatingElement): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.width}%`,
    ...(el.height != null ? { height: `${el.height}%` } : {}),
    transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
    opacity: el.opacity,
    zIndex: el.zIndex,
    cursor: el.locked ? 'default' : 'move',
    pointerEvents: el.locked ? 'none' as const : 'auto' as const,
  }
}

/** CSS para FloatingText */
export function floatingTextCSS(el: FloatingText): React.CSSProperties {
  return {
    fontFamily: `'${el.fontFamily}', sans-serif`,
    fontSize: `${el.fontSize}px`,
    fontWeight: el.fontWeight,
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
