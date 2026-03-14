import { forwardRef } from 'react'
import { ChordDiagram } from '@/components/music/ChordDiagram'
import type { ChordPositions } from '@/components/music/ChordDiagram'
import { PianoKeyboard } from '@/components/music/PianoKeyboard'
import type { Chord } from '@/services/libraryService'

// Regex para detectar linhas de tablatura
const TAB_LINE_RE = /^[EBGDAe]\|[-\d\s|hpbr/\\~()xX.*^]+\|?\s*$/

interface PrintableCifraProps {
  title: string
  artist: string
  tom?: string
  chords: string[]
  guitarChordMap: Map<string, Chord>
  pianoChordMap: Map<string, Chord>
  cifraContent: string | null
  showGuitar: boolean
  showPiano: boolean
  showTab: boolean
}

/**
 * Componente renderizado off-screen para captura em PDF.
 * Usa estilos inline/classes print-friendly (fundo branco, texto preto).
 */
export const PrintableCifra = forwardRef<HTMLDivElement, PrintableCifraProps>(
  ({ title, artist, tom, chords, guitarChordMap, pianoChordMap, cifraContent, showGuitar, showPiano, showTab }, ref) => {

    // Parsear cifra em blocos (mesma lógica do RepertoireSheet)
    const blocks = cifraContent ? parseCifraBlocks(cifraContent) : []

    return (
      <div
        ref={ref}
        style={{
          width: '794px', // A4 width @ 96dpi
          padding: '32px 40px',
          backgroundColor: '#ffffff',
          color: '#1a1a1a',
          fontFamily: "'DM Sans', 'Segoe UI', Arial, sans-serif",
          fontSize: '13px',
          lineHeight: '1.5',
        }}
      >
        {/* Cabeçalho com logo da escola */}
        <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#111' }}>
              {title}
            </h1>
            <p style={{ fontSize: '15px', color: '#555', margin: '4px 0 0 0' }}>
              {artist}
              {tom && <span style={{ marginLeft: '16px', fontSize: '13px', color: '#888' }}>Tom: {tom}</span>}
            </p>
          </div>
          <img
            src="/logos/logo-escola.png"
            alt="LA Music School"
            style={{ height: '44px', objectFit: 'contain' }}
            crossOrigin="anonymous"
          />
        </div>

        {/* Acordes badges */}
        {chords.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {chords.map(chord => (
                <span
                  key={chord}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#f0f4ff',
                    color: '#3b5998',
                    border: '1px solid #d0daf0',
                  }}
                >
                  {chord}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Diagramas de Violão */}
        {showGuitar && chords.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#888', marginBottom: '8px' }}>
              Violão
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {chords.map(chordName => {
                const lib = guitarChordMap.get(chordName)
                if (!lib?.positions || typeof lib.positions !== 'object') return null
                const pos = lib.positions as any
                return (
                  <div key={chordName} style={{ textAlign: 'center' }}>
                    <ChordDiagram
                      name={chordName}
                      positions={{
                        fingers: pos.fingers ?? [],
                        barres: pos.barres ?? [],
                        muted: pos.muted ?? [],
                      }}
                      position={pos.position ?? 1}
                      size="compact"
                      forceTheme="light"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Diagramas de Teclado */}
        {showPiano && chords.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#888', marginBottom: '8px' }}>
              Teclado
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {chords.map(chordName => {
                const lib = pianoChordMap.get(chordName)
                if (!lib?.positions || typeof lib.positions !== 'object') return null
                const pos = lib.positions as any
                const keys = (pos.keys ?? []) as string[]
                if (keys.length === 0) return null
                const fingeringRh = (pos.fingering_rh ?? []) as number[]
                return (
                  <div
                    key={chordName}
                    style={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      padding: '8px',
                      backgroundColor: '#fafafa',
                    }}
                  >
                    <PianoKeyboard
                      keys={keys}
                      fingeringRH={fingeringRh.length > 0 ? fingeringRh : undefined}
                      label={chordName}
                      showLabels={fingeringRh.length > 0}
                      forceTheme="light"
                      labelColor="#1a1a1a"
                      scale={0.7}
                      className="w-full"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Separador */}
        <div style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />

        {/* Cifra formatada */}
        {cifraContent && (
          <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '12px', lineHeight: '1.7' }}>
            {blocks.map((block, i) => {
              switch (block.type) {
                case 'section': {
                  if (!showTab && /^\[Tab\b/i.test(block.text.trim())) return null
                  return (
                    <div key={i} style={{ color: '#3b5998', fontWeight: 700, marginTop: '16px', marginBottom: '4px', fontSize: '13px' }}>
                      {block.text}
                    </div>
                  )
                }
                case 'tab': {
                  if (!showTab) return null
                  return (
                    <div
                      key={i}
                      style={{
                        backgroundColor: '#f8f9fb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        margin: '6px 0',
                        whiteSpace: 'pre',
                        fontFamily: "'DM Mono', 'Courier New', monospace",
                        fontSize: '11px',
                        lineHeight: '1.4',
                        color: '#333',
                      }}
                    >
                      {block.label && (
                        <div style={{ color: '#3b5998', fontWeight: 600, marginBottom: '4px', fontSize: '11px' }}>
                          {block.label}
                        </div>
                      )}
                      {block.lines.map((line, j) => (
                        <div key={j}>{line}</div>
                      ))}
                    </div>
                  )
                }
                case 'chord':
                  return (
                    <div key={i} style={{ color: '#3b5998', fontWeight: 600, whiteSpace: 'pre' }}>
                      {block.text}
                    </div>
                  )
                case 'empty':
                  return <div key={i} style={{ height: '8px' }} />
                case 'lyric':
                  return (
                    <div key={i} style={{ color: '#1a1a1a', whiteSpace: 'pre-wrap' }}>
                      {block.text}
                    </div>
                  )
              }
            })}
          </div>
        )}

        {/* Rodapé com branding LA Journey */}
        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '20px', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '9px', color: '#aaa' }}>
            Material exclusivo — reprodução não autorizada
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '8px', color: '#bbb' }}>Powered by</span>
            <img
              src="/logos/logo-light.png"
              alt="LA Journey"
              style={{ height: '16px', objectFit: 'contain', opacity: 0.7 }}
              crossOrigin="anonymous"
            />
          </div>
        </div>
      </div>
    )
  }
)

PrintableCifra.displayName = 'PrintableCifra'

// --- Parser de cifra (duplicado simplificado do RepertoireSheet) ---

type CifraBlock =
  | { type: 'section'; text: string }
  | { type: 'chord'; text: string }
  | { type: 'lyric'; text: string }
  | { type: 'empty' }
  | { type: 'tab'; lines: string[]; label?: string }

function parseCifraBlocks(content: string): CifraBlock[] {
  const lines = content.split('\n')
  const blocks: CifraBlock[] = []
  let i = 0
  const chordPattern = /^[A-G][#b]?(?:m|M|maj|min|dim|aug|sus[24]?|add[249]?|[0-9])*(?:\/[A-G][#b]?)?$/

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (TAB_LINE_RE.test(line)) {
      const tabLines: string[] = []
      let label: string | undefined
      if (blocks.length > 0) {
        const prev = blocks[blocks.length - 1]
        if (prev.type === 'chord') {
          label = prev.text.trim()
          blocks.pop()
        }
      }
      while (i < lines.length && TAB_LINE_RE.test(lines[i])) {
        tabLines.push(lines[i])
        i++
      }
      blocks.push({ type: 'tab', lines: tabLines, label })
      continue
    }

    if (/^\[.*\]/.test(trimmed)) {
      blocks.push({ type: 'section', text: trimmed })
      i++
      continue
    }

    if (!trimmed) {
      blocks.push({ type: 'empty' })
      i++
      continue
    }

    const tokens = trimmed.split(/\s+/)
    const chordRatio = tokens.filter(t => chordPattern.test(t) || t === '|').length / (tokens.length || 1)
    if (chordRatio > 0.5) {
      blocks.push({ type: 'chord', text: line })
      i++
      continue
    }

    blocks.push({ type: 'lyric', text: line })
    i++
  }

  return blocks
}
