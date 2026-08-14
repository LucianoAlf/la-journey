import { forwardRef } from 'react'
import { ChordDiagram } from '@/components/music/ChordDiagram'
import { SongbookCifra } from '@/components/music/SongbookCifra'
import { PianoKeyboard } from '@/components/music/PianoKeyboard'
import type { Chord } from '@/services/libraryService'

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
        <div data-pdf-break="header" style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <div data-pdf-break="badges" style={{ marginBottom: '14px' }}>
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
          <div data-pdf-break="guitar" style={{ marginBottom: '16px' }}>
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
          <div data-pdf-break="piano" style={{ marginBottom: '16px' }}>
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

        {cifraContent && <SongbookCifra content={cifraContent} showTab={showTab} pdfBreaks />}

      </div>
    )
  }
)

PrintableCifra.displayName = 'PrintableCifra'
