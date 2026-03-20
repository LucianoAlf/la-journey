import { useMemo } from 'react'

interface CanvasRulerProps {
  zoom: number
}

export function CanvasRuler({ zoom }: CanvasRulerProps) {
  // A4 width = 210mm, marca a cada 5mm, major a cada 10mm, número a cada 50mm
  const pxPerMm = 3.78 * zoom

  const marks = useMemo(() => {
    const result: { mm: number; major: boolean }[] = []
    for (let mm = 0; mm <= 210; mm += 5) {
      result.push({ mm, major: mm % 10 === 0 })
    }
    return result
  }, [])

  return (
    <div
      className="h-5 bg-card/60 border-b border-border flex items-end overflow-hidden select-none pointer-events-none"
      style={{ width: `${210 * pxPerMm}px`, marginLeft: 'auto', marginRight: 'auto' }}
    >
      <svg width={210 * pxPerMm} height={20} className="overflow-visible">
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
      </svg>
    </div>
  )
}
