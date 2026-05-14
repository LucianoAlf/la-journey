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

function getZoneShellStyle(position: 'left' | 'center' | 'right'): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: position === 'left' ? 'flex-start' : position === 'center' ? 'center' : 'flex-end',
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

  return (
    <div
      className={className}
      style={{
        height: `${config.height}px`,
        backgroundColor: config.backgroundColor || 'transparent',
        borderBottom: type === 'header' ? config.borderBottom : undefined,
        borderTop: type === 'footer' ? config.borderTop : undefined,
        padding: `0 ${config.paddingX}px`,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 20%) minmax(0, 60%) minmax(0, 20%)',
        columnGap: '8px',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <div style={getZoneShellStyle('left')}>
        {renderZone(config.left, context)}
      </div>
      <div style={getZoneShellStyle('center')}>
        {renderZone(config.center, context)}
      </div>
      <div style={getZoneShellStyle('right')}>
        {renderZone(config.right, context)}
      </div>
    </div>
  )
}
