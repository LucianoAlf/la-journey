import type { HeaderFooterConfig } from './headerFooter'

export type HeaderFooterLineStyle = 'solid' | 'dashed' | 'dotted'

export interface HeaderFooterLineConfig {
  enabled: boolean
  width: number
  style: HeaderFooterLineStyle
  color: string
}

const DEFAULT_LINE_CONFIG: HeaderFooterLineConfig = {
  enabled: false,
  width: 1,
  style: 'solid',
  color: '#e2e8f0',
}

const BORDER_RE = /^\s*(\d+(?:\.\d+)?)px\s+(solid|dashed|dotted)\s+(#[0-9a-fA-F]{3,8}|rgb\([^)]+\))\s*$/

function rgbToHex(value: string): string {
  const match = value.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)
  if (!match) return value
  return `#${match.slice(1, 4).map(part => Number(part).toString(16).padStart(2, '0')).join('')}`
}

export function parseHeaderFooterLine(border?: string): HeaderFooterLineConfig {
  if (!border) return { ...DEFAULT_LINE_CONFIG }

  const match = border.match(BORDER_RE)
  if (!match) {
    return {
      ...DEFAULT_LINE_CONFIG,
      enabled: true,
    }
  }

  return {
    enabled: true,
    width: Number(match[1]),
    style: match[2] as HeaderFooterLineStyle,
    color: rgbToHex(match[3]),
  }
}

export function getHeaderFooterLineConfig(
  config: HeaderFooterConfig,
  type: 'header' | 'footer',
): HeaderFooterLineConfig {
  return parseHeaderFooterLine(type === 'header' ? config.borderBottom : config.borderTop)
}

export function buildHeaderFooterLine(config: HeaderFooterLineConfig): string | undefined {
  if (!config.enabled) return undefined
  return `${config.width}px ${config.style} ${config.color}`
}
