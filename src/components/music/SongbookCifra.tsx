import { groupCifraUnits, parseCifraBlocks } from '@/lib/cifraBlocks'

interface SongbookCifraProps {
  content: string
  showTab?: boolean
  pdfBreaks?: boolean
}

export function SongbookCifra({ content, showTab = true, pdfBreaks = false }: SongbookCifraProps) {
  const units = groupCifraUnits(parseCifraBlocks(content), showTab)

  return (
    <div
      className="songbook-cifra"
      style={{ fontFamily: "'Courier New', 'DM Mono', monospace", fontSize: 13, lineHeight: 1.55 }}
    >
      {units.map((unit, i) => (
        <div key={i} {...(pdfBreaks ? { 'data-pdf-break': 'cifra' } : {})}>
          {unit.map((block, j) => {
            switch (block.type) {
              case 'section':
                return (
                  <div
                    key={j}
                    data-cifra="section"
                    style={{ color: '#3b5998', fontWeight: 700, marginTop: 14, marginBottom: 4 }}
                  >
                    {block.text}
                  </div>
                )
              case 'tab':
                if (!showTab) return null
                return (
                  <div
                    key={j}
                    data-cifra="tab"
                    style={{
                      backgroundColor: '#f7f7f7',
                      border: '1px solid #d4d4d4',
                      borderRadius: 4,
                      padding: '8px 10px',
                      margin: '6px 0',
                      whiteSpace: 'pre',
                      color: '#111111',
                      fontSize: 12,
                    }}
                  >
                    {block.label && (
                      <div style={{ color: '#3b5998', fontWeight: 700, marginBottom: 4 }}>{block.label}</div>
                    )}
                    {block.lines.map((line, lineIndex) => (
                      <div key={lineIndex}>{line}</div>
                    ))}
                  </div>
                )
              case 'chord':
                return (
                  <div key={j} data-cifra="chord" style={{ color: '#3b5998', fontWeight: 700, whiteSpace: 'pre' }}>
                    {block.text}
                  </div>
                )
              case 'empty':
                return <div key={j} style={{ height: 8 }} />
              case 'lyric':
                return (
                  <div key={j} data-cifra="lyric" style={{ color: '#1a1a1a', whiteSpace: 'pre-wrap' }}>
                    {block.text}
                  </div>
                )
            }
          })}
        </div>
      ))}
    </div>
  )
}
