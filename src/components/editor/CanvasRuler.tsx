import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import type { PageGuide, PageMargins } from '@/lib/blockStyles'

interface CanvasRulerProps {
  zoom: number
  /** Escala real do container pai (transform: scale) — usado para corrigir coordenadas do mouse */
  parentScale?: number
  margins?: PageMargins
  guides?: PageGuide[]
  onGuidesChange?: (guides: PageGuide[]) => void
  orientation?: 'horizontal' | 'vertical'
}

// A4 em mm
const A4_W = 210
const A4_H = 297
const PX_MM = 3.78

/**
 * Converte coordenada do mouse (screen px) para posição interna da régua (layout px),
 * levando em conta que o container pai pode ter transform: scale().
 * getBoundingClientRect() retorna valores já escalados pelo browser,
 * então dividimos o offset pela escala real do pai.
 */
function screenToLocal(
  mousePos: number,
  rectStart: number,
  rectSize: number,
  parentScale: number,
  totalLayoutPx: number,
) {
  // rectSize já é o tamanho visual (escalado)
  // A posição interna = offset / parentScale
  const offset = mousePos - rectStart
  const local = offset / parentScale
  return Math.max(0, Math.min(totalLayoutPx, Math.round(local)))
}

export function CanvasRuler({
  zoom,
  parentScale = 1,
  margins,
  guides = [],
  onGuidesChange,
  orientation = 'horizontal',
}: CanvasRulerProps) {
  const pxMm = PX_MM * zoom
  const isH = orientation === 'horizontal'
  const totalMm = isH ? A4_W : A4_H
  const totalPx = totalMm * pxMm

  const [dragging, setDragging] = useState<string | null>(null)
  const rulerRef = useRef<HTMLDivElement>(null)
  // Ref para guides — evita stale closure no mousemove
  const guidesRef = useRef(guides)
  useEffect(() => { guidesRef.current = guides }, [guides])
  const onChangeRef = useRef(onGuidesChange)
  useEffect(() => { onChangeRef.current = onGuidesChange }, [onGuidesChange])

  const marks = useMemo(() => {
    const r: { mm: number; major: boolean }[] = []
    for (let mm = 0; mm <= totalMm; mm += 5) r.push({ mm, major: mm % 10 === 0 })
    return r
  }, [totalMm])

  const marginMarks = useMemo(() => {
    if (!margins) return []
    const r: { pos: number; side: string }[] = []
    if (isH) {
      r.push({ pos: margins.left / PX_MM, side: 'left' })
      r.push({ pos: A4_W - margins.right / PX_MM, side: 'right' })
    } else {
      r.push({ pos: margins.top / PX_MM, side: 'top' })
      r.push({ pos: A4_H - margins.bottom / PX_MM, side: 'bottom' })
    }
    return r
  }, [margins, isH])

  // Duplo-clique na régua → criar guia
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!onChangeRef.current) return
    const rect = rulerRef.current?.getBoundingClientRect()
    if (!rect) return
    const pos = isH
      ? screenToLocal(e.clientX, rect.left, rect.width, parentScale, totalPx)
      : screenToLocal(e.clientY, rect.top, rect.height, parentScale, totalPx)
    const newGuide: PageGuide = {
      id: crypto.randomUUID(),
      type: isH ? 'vertical' : 'horizontal',
      position: pos,
      color: '#6366f1',
    }
    onChangeRef.current([...guidesRef.current, newGuide])
  }, [isH, parentScale, totalPx])

  // Iniciar drag na guia
  const handleGuideMouseDown = useCallback((e: React.MouseEvent, guideId: string) => {
    e.stopPropagation()
    e.preventDefault()
    setDragging(guideId)

    const onMove = (ev: MouseEvent) => {
      const rect = rulerRef.current?.getBoundingClientRect()
      if (!rect || !onChangeRef.current) return
      const pos = isH
        ? screenToLocal(ev.clientX, rect.left, rect.width, parentScale, totalPx)
        : screenToLocal(ev.clientY, rect.top, rect.height, parentScale, totalPx)
      onChangeRef.current(
        guidesRef.current.map(g => g.id === guideId ? { ...g, position: pos } : g)
      )
    }

    const onUp = () => {
      setDragging(null)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [isH, parentScale, totalPx])

  // Duplo-clique na guia → remover
  const handleGuideDoubleClick = useCallback((e: React.MouseEvent, guideId: string) => {
    e.stopPropagation()
    onChangeRef.current?.(guidesRef.current.filter(g => g.id !== guideId))
  }, [])

  const relevantGuides = guides.filter(g =>
    (isH && g.type === 'vertical') || (!isH && g.type === 'horizontal')
  )

  // ─── Horizontal ───────────────────────────────────────────────────
  if (isH) {
    return (
      <div
        ref={rulerRef}
        className="h-6 bg-card/80 border-b border-border flex items-end select-none relative"
        style={{ width: `${totalPx}px`, marginLeft: 'auto', marginRight: 'auto', overflow: 'visible' }}
        onDoubleClick={handleDoubleClick}
        title="Duplo-clique para adicionar guia"
      >
        <svg width={totalPx} height={24} className="overflow-visible pointer-events-none">
          {marks.map(({ mm, major }) => {
            const x = mm * pxMm
            return (
              <g key={mm}>
                <line x1={x} y1={major ? 10 : 16} x2={x} y2={24}
                  stroke="currentColor" className="text-text3/40"
                  strokeWidth={major ? 0.8 : 0.4} />
                {mm % 50 === 0 && (
                  <text x={x + 2} y={10} fontSize={8} className="fill-text3/50">{mm}</text>
                )}
              </g>
            )
          })}
          {marginMarks.map(({ pos, side }) => (
            <line key={side}
              x1={pos * pxMm} y1={0} x2={pos * pxMm} y2={24}
              stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="2,2" />
          ))}
        </svg>

        {/* Guias arrastáveis */}
        {relevantGuides.map(guide => (
          <div
            key={guide.id}
            className={`absolute top-0 cursor-ew-resize group ${dragging === guide.id ? 'z-50' : 'z-10'}`}
            style={{
              left: `${guide.position}px`,
              transform: 'translateX(-50%)',
              width: '20px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onMouseDown={e => handleGuideMouseDown(e, guide.id)}
            onDoubleClick={e => handleGuideDoubleClick(e, guide.id)}
            title="Arraste para mover · Duplo-clique para remover"
          >
            <div style={{
              width: 0, height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: `9px solid ${guide.color}`,
            }} />
            <div className="opacity-70 group-hover:opacity-100 transition-opacity"
              style={{ width: '2px', flex: 1, backgroundColor: guide.color }} />
          </div>
        ))}
      </div>
    )
  }

  // ─── Vertical ─────────────────────────────────────────────────────
  return (
    <div
      ref={rulerRef}
      className="bg-card/80 border-r border-border select-none relative"
      style={{ width: '24px', height: `${totalPx}px`, overflow: 'visible', flexShrink: 0 }}
      onDoubleClick={handleDoubleClick}
      title="Duplo-clique para adicionar guia"
    >
      <svg width={24} height={totalPx} className="overflow-visible pointer-events-none">
        {marks.map(({ mm, major }) => {
          const y = mm * pxMm
          return (
            <g key={mm}>
              <line x1={major ? 10 : 16} y1={y} x2={24} y2={y}
                stroke="currentColor" className="text-text3/40"
                strokeWidth={major ? 0.8 : 0.4} />
              {mm % 50 === 0 && (
                <text x={3} y={y + 3} fontSize={7} className="fill-text3/50"
                  transform={`rotate(-90, 3, ${y + 3})`}>{mm}</text>
              )}
            </g>
          )
        })}
        {marginMarks.map(({ pos, side }) => (
          <line key={side}
            x1={0} y1={pos * pxMm} x2={24} y2={pos * pxMm}
            stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="2,2" />
        ))}
      </svg>

      {/* Guias arrastáveis */}
      {relevantGuides.map(guide => (
        <div
          key={guide.id}
          className={`absolute left-0 cursor-ns-resize group ${dragging === guide.id ? 'z-50' : 'z-10'}`}
          style={{
            top: `${guide.position}px`,
            transform: 'translateY(-50%)',
            width: '100%',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseDown={e => handleGuideMouseDown(e, guide.id)}
          onDoubleClick={e => handleGuideDoubleClick(e, guide.id)}
          title="Arraste para mover · Duplo-clique para remover"
        >
          <div style={{
            width: 0, height: 0,
            borderTop: '7px solid transparent',
            borderBottom: '7px solid transparent',
            borderLeft: `9px solid ${guide.color}`,
          }} />
          <div className="opacity-70 group-hover:opacity-100 transition-opacity"
            style={{ height: '2px', flex: 1, backgroundColor: guide.color }} />
        </div>
      ))}
    </div>
  )
}
