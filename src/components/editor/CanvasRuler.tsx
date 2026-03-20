import { useMemo, useState, useCallback, useRef } from 'react'
import type { PageGuide, PageMargins } from '@/lib/blockStyles'

interface CanvasRulerProps {
  zoom: number
  margins?: PageMargins
  guides?: PageGuide[]
  onGuidesChange?: (guides: PageGuide[]) => void
  orientation?: 'horizontal' | 'vertical'
}

// A4 dimensions in mm
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const PX_PER_MM = 3.78

export function CanvasRuler({ 
  zoom, 
  margins, 
  guides = [], 
  onGuidesChange,
  orientation = 'horizontal' 
}: CanvasRulerProps) {
  const pxPerMm = PX_PER_MM * zoom
  const isHorizontal = orientation === 'horizontal'
  const totalMm = isHorizontal ? A4_WIDTH_MM : A4_HEIGHT_MM
  const totalPx = totalMm * pxPerMm

  const [draggingGuide, setDraggingGuide] = useState<string | null>(null)
  const rulerRef = useRef<HTMLDivElement>(null)

  const marks = useMemo(() => {
    const result: { mm: number; major: boolean }[] = []
    for (let mm = 0; mm <= totalMm; mm += 5) {
      result.push({ mm, major: mm % 10 === 0 })
    }
    return result
  }, [totalMm])

  // Converter margens de px para mm para mostrar na régua
  const marginMarks = useMemo(() => {
    if (!margins) return []
    const result: { position: number; side: string }[] = []
    if (isHorizontal) {
      result.push({ position: margins.left / PX_PER_MM, side: 'left' })
      result.push({ position: A4_WIDTH_MM - (margins.right / PX_PER_MM), side: 'right' })
    } else {
      result.push({ position: margins.top / PX_PER_MM, side: 'top' })
      result.push({ position: A4_HEIGHT_MM - (margins.bottom / PX_PER_MM), side: 'bottom' })
    }
    return result
  }, [margins, isHorizontal])

  // Adicionar nova guia ao clicar duas vezes na régua
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!onGuidesChange) return
    const rect = rulerRef.current?.getBoundingClientRect()
    if (!rect) return

    const pos = isHorizontal 
      ? (e.clientX - rect.left) / zoom
      : (e.clientY - rect.top) / zoom

    const newGuide: PageGuide = {
      id: crypto.randomUUID(),
      type: isHorizontal ? 'vertical' : 'horizontal',
      position: Math.round(pos),
      color: '#6366f1',
    }
    onGuidesChange([...guides, newGuide])
  }, [guides, onGuidesChange, zoom, isHorizontal])

  // Arrastar guia existente
  const handleGuideMouseDown = useCallback((e: React.MouseEvent, guideId: string) => {
    e.stopPropagation()
    setDraggingGuide(guideId)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!rulerRef.current || !onGuidesChange) return
      const rect = rulerRef.current.getBoundingClientRect()
      const pos = isHorizontal
        ? (moveEvent.clientX - rect.left) / zoom
        : (moveEvent.clientY - rect.top) / zoom

      onGuidesChange(guides.map(g => 
        g.id === guideId ? { ...g, position: Math.max(0, Math.round(pos)) } : g
      ))
    }

    const handleMouseUp = () => {
      setDraggingGuide(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [guides, onGuidesChange, zoom, isHorizontal])

  // Remover guia ao arrastar para fora
  const handleGuideDoubleClick = useCallback((e: React.MouseEvent, guideId: string) => {
    e.stopPropagation()
    if (!onGuidesChange) return
    onGuidesChange(guides.filter(g => g.id !== guideId))
  }, [guides, onGuidesChange])

  // Filtrar guias por orientação
  const relevantGuides = guides.filter(g => 
    (isHorizontal && g.type === 'vertical') || (!isHorizontal && g.type === 'horizontal')
  )

  if (isHorizontal) {
    return (
      <div
        ref={rulerRef}
        className="h-5 bg-card/80 border-b border-border flex items-end overflow-visible select-none relative"
        style={{ width: `${totalPx}px`, marginLeft: 'auto', marginRight: 'auto' }}
        onDoubleClick={handleDoubleClick}
        title="Duplo-clique para adicionar guia"
      >
        <svg width={totalPx} height={20} className="overflow-visible">
          {/* Marcas da régua */}
          {marks.map(({ mm, major }) => {
            const x = mm * pxPerMm
            return (
              <g key={mm}>
                <line
                  x1={x} y1={major ? 8 : 14}
                  x2={x} y2={20}
                  stroke="currentColor"
                  className="text-text3/40"
                  strokeWidth={major ? 0.8 : 0.4}
                />
                {mm % 50 === 0 && (
                  <text x={x + 2} y={9} fontSize={8} className="fill-text3/50">
                    {mm}
                  </text>
                )}
              </g>
            )
          })}

          {/* Indicadores de margem */}
          {marginMarks.map(({ position, side }) => (
            <line
              key={side}
              x1={position * pxPerMm}
              y1={0}
              x2={position * pxPerMm}
              y2={20}
              stroke="#f43f5e"
              strokeWidth={1.5}
              strokeDasharray="2,2"
              className="pointer-events-none"
            />
          ))}
        </svg>

        {/* Guias arrastáveis */}
        {relevantGuides.map(guide => (
          <div
            key={guide.id}
            className={`absolute top-0 h-full cursor-ew-resize group ${draggingGuide === guide.id ? 'z-50' : 'z-10'}`}
            style={{ 
              left: `${guide.position * zoom}px`,
              transform: 'translateX(-50%)',
            }}
            onMouseDown={e => handleGuideMouseDown(e, guide.id)}
            onDoubleClick={e => handleGuideDoubleClick(e, guide.id)}
            title="Arraste para mover • Duplo-clique para remover"
          >
            {/* Triângulo indicador */}
            <div 
              className="w-0 h-0 mx-auto"
              style={{
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: `6px solid ${guide.color}`,
              }}
            />
            {/* Linha da guia (visual) */}
            <div 
              className="w-0.5 h-3 mx-auto opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: guide.color }}
            />
          </div>
        ))}
      </div>
    )
  }

  // Régua vertical
  return (
    <div
      ref={rulerRef}
      className="w-5 bg-card/80 border-r border-border flex items-start overflow-visible select-none relative"
      style={{ height: `${totalPx}px` }}
      onDoubleClick={handleDoubleClick}
      title="Duplo-clique para adicionar guia"
    >
      <svg width={20} height={totalPx} className="overflow-visible">
        {marks.map(({ mm, major }) => {
          const y = mm * pxPerMm
          return (
            <g key={mm}>
              <line
                x1={major ? 8 : 14}
                y1={y}
                x2={20}
                y2={y}
                stroke="currentColor"
                className="text-text3/40"
                strokeWidth={major ? 0.8 : 0.4}
              />
              {mm % 50 === 0 && (
                <text 
                  x={2} 
                  y={y + 3} 
                  fontSize={7} 
                  className="fill-text3/50"
                  style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                >
                  {mm}
                </text>
              )}
            </g>
          )
        })}

        {/* Indicadores de margem */}
        {marginMarks.map(({ position, side }) => (
          <line
            key={side}
            x1={0}
            y1={position * pxPerMm}
            x2={20}
            y2={position * pxPerMm}
            stroke="#f43f5e"
            strokeWidth={1.5}
            strokeDasharray="2,2"
            className="pointer-events-none"
          />
        ))}
      </svg>

      {/* Guias arrastáveis */}
      {relevantGuides.map(guide => (
        <div
          key={guide.id}
          className={`absolute left-0 w-full cursor-ns-resize group ${draggingGuide === guide.id ? 'z-50' : 'z-10'}`}
          style={{ 
            top: `${guide.position * zoom}px`,
            transform: 'translateY(-50%)',
          }}
          onMouseDown={e => handleGuideMouseDown(e, guide.id)}
          onDoubleClick={e => handleGuideDoubleClick(e, guide.id)}
          title="Arraste para mover • Duplo-clique para remover"
        >
          {/* Triângulo indicador */}
          <div 
            className="h-0 w-0 my-auto"
            style={{
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderLeft: `6px solid ${guide.color}`,
            }}
          />
          {/* Linha da guia (visual) */}
          <div 
            className="h-0.5 w-3 my-auto opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: guide.color }}
          />
        </div>
      ))}
    </div>
  )
}
