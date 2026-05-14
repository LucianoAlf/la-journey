import type { HeaderFooterConfig, HeaderFooterZone } from './headerFooter'

type HeaderFooterType = 'header' | 'footer'
type HeaderFooterPosition = 'left' | 'center' | 'right'

const ZONES: HeaderFooterPosition[] = ['left', 'center', 'right']

const STYLE_KEYS = [
  'fontSize',
  'fontWeight',
  'color',
  'fontFamily',
  'uppercase',
  'letterSpacing',
] as const

type ZoneStyleKey = (typeof STYLE_KEYS)[number]
type ZoneStyle = Pick<HeaderFooterZone, ZoneStyleKey>

function getLine(config: HeaderFooterConfig, type: HeaderFooterType) {
  return type === 'header' ? config.borderBottom : config.borderTop
}

function setLine(config: HeaderFooterConfig, type: HeaderFooterType, line: string | undefined): HeaderFooterConfig {
  if (type === 'header') {
    return { ...config, borderBottom: line }
  }

  return { ...config, borderTop: line }
}

function zoneHasTextStyle(zone: HeaderFooterZone) {
  return zone.type === 'text' || zone.type === 'placeholder'
}

function pickZoneStyle(zone: HeaderFooterZone): ZoneStyle {
  return STYLE_KEYS.reduce<ZoneStyle>((style, key) => {
    if (zone[key] !== undefined) {
      style[key] = zone[key] as never
    }
    return style
  }, {})
}

function applyZoneStyle(zone: HeaderFooterZone, style: ZoneStyle | undefined): HeaderFooterZone {
  if (!style || !zoneHasTextStyle(zone)) return zone
  return { ...zone, ...style }
}

function firstSourceTextStyle(source: HeaderFooterConfig): ZoneStyle | undefined {
  const textZone = ZONES.map(zone => source[zone]).find(zoneHasTextStyle)
  return textZone ? pickZoneStyle(textZone) : undefined
}

export function copyHeaderFooterAppearance({
  source,
  sourceType,
  target,
  targetType,
}: {
  source: HeaderFooterConfig
  sourceType: HeaderFooterType
  target: HeaderFooterConfig
  targetType: HeaderFooterType
}): HeaderFooterConfig {
  const fallbackTextStyle = firstSourceTextStyle(source)
  const next = setLine({
    ...target,
    backgroundColor: source.backgroundColor,
  }, targetType, getLine(source, sourceType))

  return {
    ...next,
    left: applyZoneStyle(target.left, zoneHasTextStyle(source.left) ? pickZoneStyle(source.left) : fallbackTextStyle),
    center: applyZoneStyle(target.center, zoneHasTextStyle(source.center) ? pickZoneStyle(source.center) : fallbackTextStyle),
    right: applyZoneStyle(target.right, zoneHasTextStyle(source.right) ? pickZoneStyle(source.right) : fallbackTextStyle),
  }
}
