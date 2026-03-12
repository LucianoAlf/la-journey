declare module 'svg-piano' {
  interface KeyData {
    index: number
    notes: string[]
    fill: string
    contrast: string
    stroke: string
    strokeWidth: number
    upperHeight: number
    lowerHeight: number
    upperWidth: number
    lowerWidth: number
    upperOffset: number
    offsetX: number
    scaleX: number
    scaleY: number
    visible: boolean
  }

  interface ColorizeEntry {
    keys: string[]
    color: string
  }

  interface RenderSVGOptions {
    range?: [string, string]
    colorize?: ColorizeEntry[]
    labels?: Record<string, string>
    topLabels?: boolean
    palette?: [string, string]
    stroke?: string
    strokeWidth?: number
    scaleX?: number
    scaleY?: number
    lowerWidth?: number
    upperWidth?: number
    lowerHeight?: number
    upperHeight?: number
  }

  interface PolygonProps {
    points: string
    style: {
      fill: string
      stroke: string
      strokeWidth: number
    }
  }

  interface CircleProps {
    cx: number
    cy: number
    r: number
    fill: string
    stroke: string
    strokeWidth: number
  }

  interface TextProps {
    x: number
    y: number
    textAnchor: string
    fontSize: number
    fontFamily: string
    value: string
  }

  interface RenderedChild {
    key: KeyData
    polygon: PolygonProps
    circle?: CircleProps
    text?: TextProps
  }

  interface RenderedSVG {
    svg: { width: number; height: number }
    children: (RenderedChild | undefined)[]
  }

  export function renderSVG(options: RenderSVGOptions): RenderedSVG
  export function renderKeys(options: RenderSVGOptions): KeyData[]
  export function renderPiano(container: HTMLElement, options: RenderSVGOptions): void
}
