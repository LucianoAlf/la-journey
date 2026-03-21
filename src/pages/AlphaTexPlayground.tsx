import { useState, useMemo } from 'react'
import { AlphaTabViewer } from '@/components/music/AlphaTabViewer'
import { beatsToAlphaTex } from '@/lib/beatsToAlphaTex'
import type { Beat, BeatsToAlphaTexOptions } from '@/lib/beatsToAlphaTex'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Code, MusicNote } from '@phosphor-icons/react'

// ─── Exemplos AlphaTex pré-definidos ────────────────────────────────

interface Example {
  id: string
  label: string
  category: string
  tex: string
  description: string
}

const EXAMPLES: Example[] = [
  // ── Básicos ──
  {
    id: '1-escala',
    label: '1. Escala Dó Maior',
    category: 'Básico',
    tex: `\\track
\\staff{score} \\tuning piano
\\clef G2
\\ks Cmajor
\\ts 4 4
.
:4 c4 d4 e4 f4 | g4 a4 b4 c5 |`,
    description: 'Escala de Dó Maior em semínimas com clave de sol, 4/4.',
  },
  {
    id: '2-duracoes',
    label: '2. Durações variadas',
    category: 'Básico',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:1 c4 | :2 c4 d4 | :4 c4 d4 e4 f4 | :8 c4 d4 e4 f4 g4 a4 b4 c5 |`,
    description: 'Semibreve, mínima, semínima, colcheia. Beams automáticos nas colcheias.',
  },
  {
    id: '3-semicolcheias',
    label: '3. Semicolcheias e Fusas',
    category: 'Básico',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:16 c4 d4 e4 f4 g4 a4 b4 c5 d5 e5 f5 g5 a5 b5 c6 d6 |`,
    description: 'Semicolcheias com 2 beams. Agrupamento automático.',
  },
  {
    id: '4-ponto',
    label: '4. Ponto de aumento',
    category: 'Básico',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 3 4
.
:4 c4{d} :8 d4 :4 e4 |`,
    description: 'Semínima pontuada = 1.5 tempos + colcheia + semínima = 3 tempos.',
  },
  {
    id: '5-pausas',
    label: '5. Pausas',
    category: 'Básico',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:4 c4 r d4 r | :2 r c4 | :1 r |`,
    description: 'Pausas de semínima, mínima e semibreve.',
  },
  // ── Acordes e Acidentes ──
  {
    id: '6-acordes',
    label: '6. Acordes',
    category: 'Acordes',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:4 (c4 e4 g4) (d4 f4 a4) (e4 g4 b4) (f4 a4 c5) |`,
    description: 'Acordes empilhados verticalmente.',
  },
  {
    id: '7-acidentes',
    label: '7. Acidentes (#, b, ♮)',
    category: 'Acordes',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
c#4 db4 e4 fn4 | g#4 ab4 b4 cn5 |`,
    description: 'Sustenido (#), bemol (b), bequadro (n).',
  },
  {
    id: '8-armaduras',
    label: '8. Armaduras de clave',
    category: 'Acordes',
    tex: `\\track
\\staff{score} \\tuning piano
\\ks Gmajor
\\ts 4 4
.
g4 a4 b4 c5 | d5 e5 f#5 g5 |`,
    description: 'Sol Maior (1#). Testar também Fá Maior, Ré Maior, etc.',
  },
  // ── Articulações ──
  {
    id: '9-articulacoes',
    label: '9. Articulações',
    category: 'Efeitos',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:4 c4{st} d4{ac} e4{ten} f4{hac} |`,
    description: 'Staccato, acento, tenuto, marcato.',
  },
  {
    id: '9b-fermata',
    label: '9b. Fermata',
    category: 'Efeitos',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:4 c4{fermata medium 4} d4 e4 f4 |`,
    description: 'Fermata na primeira nota. Sintaxe: {fermata short|medium|long duration}.',
  },
  // ── Dinâmicas ──
  {
    id: '10-dinamicas',
    label: '10. Dinâmicas',
    category: 'Efeitos',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:4 c4{dy ppp} d4 e4 f4 |
c4{dy mf} d4 e4 f4 |
c4{dy ff} d4 e4 f4 |`,
    description: 'ppp, mf, ff. Testar ppp, pp, p, mp, mf, f, ff, fff, sfz.',
  },
  // ── Ligadura ──
  {
    id: '11-tie',
    label: '11. Ligadura (tie)',
    category: 'Efeitos',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:4 c4 -{-} d4 e4 |`,
    description: 'Ligadura entre duas notas C4. Usando - para tie.',
  },
  {
    id: '11b-tie-alt',
    label: '11b. Tie alternativo',
    category: 'Efeitos',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:2 a4 a4{-} |`,
    description: 'Tie usando nota repetida + efeito {-}.',
  },
  // ── Tuplets ──
  {
    id: '12-tuplet',
    label: '12. Tercina',
    category: 'Efeitos',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:8 c4{tu 3} d4{tu 3} e4{tu 3} :4 f4 g4 |`,
    description: 'Tercina de colcheias (3 no espaço de 2).',
  },
  // ── Grace notes ──
  {
    id: '13-grace',
    label: '13. Grace notes',
    category: 'Efeitos',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:8 c4{gr} :4 d4 e4 f4 g4 |`,
    description: 'Grace note (before beat). Testar também {gr ob} (on beat).',
  },
  {
    id: '13b-grace-ob',
    label: '13b. Grace on-beat',
    category: 'Efeitos',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:8 c4{gr ob} :4 d4 e4 f4 g4 |`,
    description: 'Grace note on-beat (appoggiatura).',
  },
  // ── Ornamentos ──
  {
    id: '14-trill',
    label: '14. Trill',
    category: 'Efeitos',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:4 c4{tr 14 16} d4 e4 f4 |`,
    description: 'Trill: sintaxe AlphaTab = {tr <secondNote> <speed>}. Em pitched notes, o segundo param é MIDI note ou fret.',
  },
  // ── Hairpins ──
  {
    id: '15-hairpins',
    label: '15. Crescendo / Decrescendo',
    category: 'Efeitos',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:4 c4{cre} d4{cre} e4{dec} f4{dec} |`,
    description: 'Crescendo (<) e decrescendo (>).',
  },
  // ── Volta ──
  {
    id: '16-volta',
    label: '16. Volta brackets',
    category: 'Estrutura',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
\\ro :4 c4 d4 e4 f4 |
\\ae 1 g4 a4 b4 c5 |
\\ae 2 \\rc 2 c5 b4 a4 g4 |`,
    description: 'Barra de repetição + alternate endings (\\ae). Sintaxe: \\ro (repeat open), \\rc N (repeat close N vezes), \\ae N (ending N).',
  },
  // ── Claves ──
  {
    id: '17-clave-fa',
    label: '17. Clave de Fá',
    category: 'Claves',
    tex: `\\track
\\staff{score} \\tuning piano
\\clef F4
\\ts 4 4
.
:4 c3 d3 e3 f3 | g3 a3 b3 c4 |`,
    description: 'Clave de fá com notas na região grave.',
  },
  {
    id: '18-clave-do',
    label: '18. Clave de Dó (Alto)',
    category: 'Claves',
    tex: `\\track
\\staff{score} \\tuning piano
\\clef C3
\\ts 4 4
.
:4 c4 d4 e4 f4 |`,
    description: 'Clave de dó (alto) — viola.',
  },
  {
    id: '19-percussao',
    label: '19. Percussão',
    category: 'Claves',
    tex: `\\track "Drums"
\\instrument percussion
\\clef neutral
\\ts 4 4
.
:4 36 38 42 46 | 36 38 42 46 |`,
    description: 'Percussão com General MIDI IDs. 36=bumbo, 38=caixa, 42=hi-hat, 46=hi-hat aberto.',
  },
  // ── GRANDE PAUTA ──
  {
    id: '20-piano',
    label: '20. Grande Pauta (Piano)',
    category: 'Piano',
    tex: `\\track "Piano" "pno."
\\staff{score} \\tuning piano \\instrument acousticgrandpiano
\\clef G2
\\ks Cmajor
\\ts 4 4
:4 c4 d4 e4 f4 | g4 a4 b4 c5 |
\\staff{score} \\tuning piano
\\clef F4
\\ks Cmajor
\\ts 4 4
:4 c3 d3 e3 f3 | g3 a3 b3 c4 |`,
    description: 'Duas pautas conectadas com BRACE (chave de piano). Clave de sol + clave de fá.',
  },
  // ── Cifras e Lyrics ──
  {
    id: '21-cifras',
    label: '21. Cifras',
    category: 'Texto',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:4 c4{ch "C"} e4 g4{ch "G"} b4 |`,
    description: 'Símbolos de acorde (C, G) acima da pauta.',
  },
  {
    id: '22-lyrics',
    label: '22. Lyrics',
    category: 'Texto',
    tex: `\\track
\\staff{score} \\tuning piano
\\ts 4 4
.
:4 c4 d4 e4 f4 |`,
    description: 'Lyrics: testar se AlphaTab suporta lyrics inline em score mode.',
  },
  // ── Modo livre ──
  {
    id: '25-livre',
    label: '25. Modo livre (sem compasso)',
    category: 'Estrutura',
    tex: `\\track
\\staff{score} \\tuning piano
\\clef G2
.
:4 c4 d4 e4 f4 g4 a4 b4 c5`,
    description: 'Sem fórmula de compasso, sem barlines. Notas fluem livremente.',
  },
]

// ─── Exemplo de conversão Beat[] → AlphaTex ───

function getConversionExample(): { beats: Beat[]; options: BeatsToAlphaTexOptions } {
  const beats: Beat[] = [
    { pitches: [{ pitch: 'C/4', accidental: null }], duration: 'q', tie: false, isRest: false, dotted: false, cifra: null, annotation: null, lyric: null },
    { pitches: [{ pitch: 'D/4', accidental: null }], duration: 'q', tie: false, isRest: false, dotted: false, cifra: null, annotation: null, lyric: null },
    { pitches: [{ pitch: 'E/4', accidental: null }], duration: 'q', tie: false, isRest: false, dotted: false, cifra: null, annotation: null, lyric: null },
    { pitches: [{ pitch: 'F/4', accidental: null }], duration: 'q', tie: false, isRest: false, dotted: false, cifra: null, annotation: null, lyric: null },
    { pitches: [{ pitch: 'G/4', accidental: null }], duration: 'q', tie: false, isRest: false, dotted: false, cifra: null, annotation: null, lyric: null, barAfter: true },
    { pitches: [{ pitch: 'A/4', accidental: null }], duration: 'q', tie: false, isRest: false, dotted: false, cifra: null, annotation: null, lyric: null },
    { pitches: [{ pitch: 'B/4', accidental: null }], duration: 'q', tie: false, isRest: false, dotted: false, cifra: null, annotation: null, lyric: null },
    { pitches: [{ pitch: 'C/5', accidental: null }], duration: 'q', tie: false, isRest: false, dotted: false, cifra: null, annotation: null, lyric: null },
  ]

  const options: BeatsToAlphaTexOptions = {
    clef: 'treble',
    keySignature: 'C',
    timeSignature: '4/4',
    bpm: 120,
    title: 'Escala Dó Maior (Beat[])',
  }

  return { beats, options }
}

// ─── Categorias ───

const CATEGORIES = [...new Set(EXAMPLES.map(e => e.category))]

// ─── Componente Playground ──────────────────────────────────────────

export function AlphaTexPlayground() {
  const [tex, setTex] = useState(EXAMPLES[0].tex)
  const [activeExample, setActiveExample] = useState(EXAMPLES[0].id)
  const [staveProfile, setStaveProfile] = useState<'score' | 'tab' | 'scoreTab'>('score')
  const [showTimeSignature, setShowTimeSignature] = useState(true)
  const [scale, setScale] = useState(0.9)

  // beatsToAlphaTex conversion test
  const conversionTex = useMemo(() => {
    const { beats, options } = getConversionExample()
    return beatsToAlphaTex(beats, options)
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MusicNote size={28} weight="fill" className="text-primary" />
          Playground AlphaTex
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Validação da sintaxe AlphaTex para notação de pauta. Fase 1 da migração VexFlow → AlphaTab.
        </p>
      </div>

      {/* Controles */}
      <div className="flex gap-3 items-center mb-4 flex-wrap">
        <Select value={staveProfile} onValueChange={(v: any) => setStaveProfile(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Score (pauta)</SelectItem>
            <SelectItem value="tab">Tab (tablatura)</SelectItem>
            <SelectItem value="scoreTab">Score + Tab</SelectItem>
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showTimeSignature}
            onChange={e => setShowTimeSignature(e.target.checked)}
            className="rounded"
          />
          Time Signature
        </label>

        <label className="flex items-center gap-2 text-sm">
          Escala:
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.1}
            value={scale}
            onChange={e => setScale(parseFloat(e.target.value))}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground">{scale}x</span>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda: exemplos */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Exemplos</h2>

          {CATEGORIES.map(cat => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-muted-foreground/70 mt-3 mb-1">{cat}</h3>
              <div className="space-y-1">
                {EXAMPLES.filter(e => e.category === cat).map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      setTex(ex.tex)
                      setActiveExample(ex.id)
                    }}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                      activeExample === ex.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 hover:bg-muted text-foreground'
                    }`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Botão beatsToAlphaTex */}
          <div className="pt-3 border-t">
            <h3 className="text-xs font-semibold text-muted-foreground/70 mb-1">Conversão</h3>
            <button
              onClick={() => {
                setTex(conversionTex)
                setActiveExample('conversion')
              }}
              className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                activeExample === 'conversion'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent/20 hover:bg-accent/30 text-foreground'
              }`}
            >
              <Code size={14} className="inline mr-1" />
              beatsToAlphaTex() → Escala
            </button>
          </div>
        </div>

        {/* Coluna central: textarea */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">AlphaTex</h2>
          <textarea
            value={tex}
            onChange={e => {
              setTex(e.target.value)
              setActiveExample('')
            }}
            className="w-full h-[400px] font-mono text-xs bg-muted/30 border rounded-xl p-3 resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            spellCheck={false}
          />

          {/* Descrição do exemplo ativo */}
          {activeExample && activeExample !== 'conversion' && (
            <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3">
              <strong>Verificar:</strong>{' '}
              {EXAMPLES.find(e => e.id === activeExample)?.description}
            </div>
          )}
          {activeExample === 'conversion' && (
            <div className="text-xs text-muted-foreground bg-accent/10 rounded-lg p-3">
              <strong>beatsToAlphaTex():</strong> Resultado da conversão de um array Beat[] com escala Dó Maior.
              O AlphaTex acima foi gerado pela função, não digitado manualmente.
            </div>
          )}
        </div>

        {/* Coluna direita: preview */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Preview AlphaTab</h2>
          <div className="border rounded-xl bg-card overflow-hidden min-h-[400px]">
            <AlphaTabViewer
              tex={tex}
              staveProfile={staveProfile}
              showTimeSignature={showTimeSignature}
              scale={scale}
              minHeight={400}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
