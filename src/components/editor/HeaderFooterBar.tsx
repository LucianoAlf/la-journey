import type { HeaderFooterConfig, HeaderFooterZone, PlaceholderContext } from '@/lib/headerFooter'
import { resolvePlaceholder } from '@/lib/headerFooter'

interface HeaderFooterBarProps {
  config: HeaderFooterConfig
  type: 'header' | 'footer'
  context: PlaceholderContext
  pageIndex: number
  className?: string
}

function renderZone(zone: HeaderFooterZone, context: PlaceholderContext) {
  if (zone.type === 'empty') return <div />

  const style: React.CSSProperties = {
    fontSize: `${zone.fontSize || 10}px`,
    fontWeight: zone.fontWeight || 400,
    color: zone.color || '#94a3b8',
    fontFamily: zone.fontFamily ? `'${zone.fontFamily}', sans-serif` : "'DM Sans', sans-serif",
    textTransform: zone.uppercase ? 'uppercase' : 'none',
    letterSpacing: zone.letterSpacing ? `${zone.letterSpacing}px` : 'normal',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    maxWidth: '100%',
  }

  if (zone.type === 'text') {
    return <span style={style}>{zone.text}</span>
  }

  if (zone.type === 'placeholder' && zone.placeholder) {
    return <span style={style}>{resolvePlaceholder(zone.placeholder, context)}</span>
  }

  if (zone.type === 'image' && zone.imageUrl) {
    return (
      <img
        src={zone.imageUrl}
        alt="Logo"
        style={{
          height: `${zone.imageHeight || 24}px`,
          maxWidth: '100%',
          objectFit: 'contain',
        }}
      />
    )
  }

  return <div />
}

function hasZoneContent(zone: HeaderFooterZone): boolean {
  if (zone.type === 'image') return Boolean(zone.imageUrl)
  if (zone.type === 'text') return Boolean(zone.text)
  if (zone.type === 'placeholder') return Boolean(zone.placeholder)
  return false
}

function getZoneShellStyle(
  position: 'left' | 'center' | 'right',
  hasContent: boolean,
): React.CSSProperties {
  if (position === 'center') {
    return {
      flex: '1 1 auto',
      display: 'flex',
      justifyContent: 'center',
      minWidth: 0,
    }
  }

  return {
    flex: hasContent ? '0 1 auto' : '0 0 0px',
    display: 'flex',
    justifyContent: position === 'left' ? 'flex-start' : 'flex-end',
    maxWidth: hasContent ? '28%' : '0px',
    minWidth: 0,
    overflow: 'hidden',
  }
}

export function HeaderFooterBar({ config, type, context, pageIndex, className }: HeaderFooterBarProps) {
  if (!config.enabled) return null
  // Se showOnFirstPage está ativo, ignora startFromPage para a página 0
  if (pageIndex === 0 && !config.showOnFirstPage) return null
  // Para outras páginas, respeita startFromPage (mas só se não for a primeira com showOnFirstPage)
  if (pageIndex > 0 && pageIndex < config.startFromPage) return null
  const hasLeftContent = hasZoneContent(config.left)
  const hasRightContent = hasZoneContent(config.right)

  return (
    <div
      className={className}
      style={{
        height: `${config.height}px`,
        backgroundColor: config.backgroundColor || 'transparent',
        borderBottom: type === 'header' ? config.borderBottom : undefined,
        borderTop: type === 'footer' ? config.borderTop : undefined,
        padding: `0 ${config.paddingX}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <div style={getZoneShellStyle('left', hasLeftContent)}>
        {renderZone(config.left, context)}
      </div>
      <div style={getZoneShellStyle('center', true)}>
        {renderZone(config.center, context)}
      </div>
      <div style={getZoneShellStyle('right', hasRightContent)}>
        {renderZone(config.right, context)}
      </div>
    </div>
  )
}
