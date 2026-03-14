---
name: music-notation
description: "Reference for rendering musical notation in the LA Journey platform using SVGuitar (chord diagrams), VexFlow (staff notation), and VexTab (tablature). Use this skill whenever creating or editing components that render chord diagrams, guitar neck positions, musical staff notation (treble clef, bass clef), rhythmic figures, scales on the staff, tablature for guitar/bass, or any musical visual element. Also use when the user mentions 'chord diagram', 'SVGuitar', 'VexFlow', 'VexTab', 'tablatura', 'partitura', 'notação musical', 'diagrama de acorde', 'escala na pauta', or 'figuras rítmicas'. These are niche libraries with limited training data — always follow the patterns in this skill."
---

# Music Notation Rendering — SVGuitar + VexFlow + VexTab

## Overview

LA Journey uses 3 libraries for musical elements in materials:

| Library | Purpose | Output | NPM |
|---------|---------|--------|-----|
| SVGuitar | Chord diagrams (guitar, ukulele, bass) | SVG inline | `svguitar` |
| VexFlow | Staff notation (clefs, notes, scales, rhythms) | SVG/Canvas | `vexflow` |
| VexTab | Tablature (guitar/bass tab) | Uses VexFlow | `vextab` |

## 1. SVGuitar — Chord Diagrams

### Installation
```bash
npm install svguitar
```

### Basic Usage (React Component)
```typescript
import { useEffect, useRef } from 'react'
import { SVGuitarChord } from 'svguitar'

interface ChordDiagramProps {
  name: string
  fingers: Array<[number, number, string?]> // [string, fret, label?]
  barres?: Array<{ fromString: number; toString: number; fret: number }>
  open?: number[]   // open strings (0 = open)
  muted?: number[]  // muted strings (x)
}

export function ChordDiagram({ name, fingers, barres = [], open = [], muted = [] }: ChordDiagramProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''

    const chart = new SVGuitarChord(ref.current)
      .configure({
        title: name,
        strings: 6,
        frets: 5,
        position: 1,
        tuning: ['E', 'A', 'D', 'G', 'B', 'e'],
        style: 'normal',
        titleFontSize: 48,
        fingerSize: 0.65,
        fingerColor: '#1E3A5F',
        strokeColor: '#333',
        fretColor: '#333',
        stringColor: '#333',
        titleColor: '#1E3A5F',
        backgroundColor: 'transparent',
      })
      .chord({
        fingers,
        barres,
      })

    chart.draw()
  }, [name, fingers, barres])

  return <div ref={ref} style={{ width: 120, height: 160 }} />
}
```

### Common Chords Reference

```typescript
// Chord data for the chord_library in Supabase
const CHORDS = {
  C: { fingers: [[1, 2], [2, 4], [3, 5]], open: [1, 3], muted: [6] },
  D: { fingers: [[2, 1], [2, 3], [3, 2]], open: [4], muted: [5, 6] },
  E: { fingers: [[1, 3], [2, 4], [2, 5]], open: [1, 2, 6] },
  G: { fingers: [[2, 5], [3, 6], [3, 1]], open: [2, 3, 4] },
  A: { fingers: [[2, 2], [2, 3], [2, 4]], open: [1, 5], muted: [6] },
  Am: { fingers: [[1, 2], [2, 3], [2, 4]], open: [1, 5], muted: [6] },
  Em: { fingers: [[2, 4], [2, 5]], open: [1, 2, 3, 6] },
  F: { fingers: [[2, 3], [3, 4], [3, 5]], barres: [{ fromString: 1, toString: 6, fret: 1 }] },
}
// fingers format: [fret, string] where string 1 = thinnest (high E)
// SVGuitar uses: [string, fret] — REVERSED vs database storage
```

### Configuration Options
```typescript
// Dark mode variant
.configure({
  backgroundColor: 'transparent',
  strokeColor: '#94a3b8',
  fretColor: '#475569',
  stringColor: '#475569',
  fingerColor: '#FF2D78',  // accent color
  titleColor: '#f1f5f9',
  nutColor: '#e2e8f0',
})
```

### SVG Export (for PDF generation)
```typescript
// Get SVG string for embedding in PDF/HTML
const svgElement = ref.current?.querySelector('svg')
const svgString = svgElement?.outerHTML
// Store in material_blocks.render_data as { svg: svgString }
```

## 2. VexFlow — Staff Notation

### Installation
```bash
npm install vexflow
```

### Basic: Render Notes on Staff
```typescript
import { useEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow'

export function StaffNotation({ notes }: { notes: string[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''

    const renderer = new Renderer(ref.current, Renderer.Backends.SVG)
    renderer.resize(400, 120)
    const context = renderer.getContext()

    // Create stave (treble clef by default)
    const stave = new Stave(10, 0, 380)
    stave.addClef('treble')
    stave.addTimeSignature('4/4')
    stave.setContext(context).draw()

    // Create notes
    // Format: 'note/octave' + duration
    // Durations: 'w'=whole, 'h'=half, 'q'=quarter, '8'=eighth, '16'=sixteenth
    const staveNotes = notes.map(n => {
      const [pitch, duration] = n.split(':')
      return new StaveNote({ keys: [pitch], duration: duration || 'q' })
    })

    const voice = new Voice({ num_beats: 4, beat_value: 4 })
    voice.addTickables(staveNotes)

    new Formatter().joinVoices([voice]).format([voice], 350)
    voice.draw(context, stave)
  }, [notes])

  return <div ref={ref} />
}

// Usage: <StaffNotation notes={['c/4:q', 'd/4:q', 'e/4:q', 'f/4:q']} />
```

### Scale on Staff
```typescript
function renderScale(container: HTMLDivElement, scaleNotes: string[]) {
  const renderer = new Renderer(container, Renderer.Backends.SVG)
  renderer.resize(500, 120)
  const ctx = renderer.getContext()

  const stave = new Stave(10, 0, 480)
  stave.addClef('treble').setContext(ctx).draw()

  const notes = scaleNotes.map(note =>
    new StaveNote({ keys: [`${note}/4`], duration: 'q' })
  )

  const voice = new Voice({ num_beats: scaleNotes.length, beat_value: 4 })
  voice.setStrict(false)
  voice.addTickables(notes)
  new Formatter().joinVoices([voice]).format([voice], 440)
  voice.draw(ctx, stave)
}

// Usage: renderScale(el, ['c', 'd', 'e', 'f', 'g', 'a', 'b', 'c/5'])
```

### Rhythmic Figures (for rhythm exercises)
```typescript
// Whole, half, quarter, eighth notes
const rhythmNotes = [
  new StaveNote({ keys: ['b/4'], duration: 'w' }),   // semibreve (4 beats)
  new StaveNote({ keys: ['b/4'], duration: 'h' }),   // mínima (2 beats)
  new StaveNote({ keys: ['b/4'], duration: 'q' }),   // semínima (1 beat)
  new StaveNote({ keys: ['b/4'], duration: '8' }),   // colcheia (1/2 beat)
  new StaveNote({ keys: ['b/4'], duration: '16' }),  // semicolcheia (1/4 beat)
]
```

### Accidentals and Key Signatures
```typescript
// Sharps and flats
new StaveNote({ keys: ['f#/4'], duration: 'q' }).addModifier(new Accidental('#'))
new StaveNote({ keys: ['bb/4'], duration: 'q' }).addModifier(new Accidental('b'))

// Key signature
stave.addClef('treble').addKeySignature('G')  // 1 sharp (F#)
stave.addClef('treble').addKeySignature('F')  // 1 flat (Bb)
```

## 3. VexTab — Tablature

### Installation
```bash
npm install vextab
```

### Basic Tab Rendering
```typescript
import { useEffect, useRef } from 'react'
import { Artist, VexTab as VexTabParser } from 'vextab'
import { Renderer } from 'vexflow'

export function Tablature({ tab }: { tab: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''

    const renderer = new Renderer(ref.current, Renderer.Backends.SVG)
    const artist = new Artist(10, 10, 600, { scale: 0.8 })
    const vextab = new VexTabParser(artist)

    try {
      vextab.parse(tab)
      artist.render(renderer)
    } catch (e) {
      console.error('VexTab parse error:', e)
    }
  }, [tab])

  return <div ref={ref} />
}
```

### VexTab Notation Syntax
```
// Basic tab notation
tabstave notation=true tablature=true
notes 0/6 2/6 3/6 0/5 2/5 3/5 0/4 | 2/4 0/3 1/3 0/2 1/2 0/1

// Chord (stacked notes)
notes (0/6.0/5.0/4.2/3.3/2.2/1)  // E major chord

// Duration
notes :w 0/6 | :h 2/6 3/6 | :q 0/5 2/5 3/5 0/4 | :8 2/4 0/3 1/3 0/2

// Psicomotor 1234 exercise
tabstave notation=false tablature=true
notes :q 1/1 2/1 3/1 4/1 | 1/2 2/2 3/2 4/2 | 1/3 2/3 3/3 4/3
```

### Duration Codes
| Code | Name (PT) | Beats |
|------|-----------|-------|
| `:w` | Semibreve | 4 |
| `:h` | Mínima | 2 |
| `:q` | Semínima | 1 |
| `:8` | Colcheia | 1/2 |
| `:16` | Semicolcheia | 1/4 |

## Storing in Database

### chord_library
```json
{
  "svg_config": { "frets": 5, "strings": 6, "position": 1 },
  "fingers": { "1": [1, 2], "2": [2, 4], "3": [3, 5] }
}
```

### content_blocks (render_data)
```json
{
  "type": "chord_diagram",
  "render_data": {
    "chord_name": "G",
    "svg": "<svg>...</svg>"
  }
}
```

### material_blocks (render_data)
```json
{
  "type": "notation",
  "render_data": {
    "vexflow_notes": ["c/4:q", "d/4:q", "e/4:q", "f/4:q"],
    "clef": "treble",
    "time_sig": "4/4",
    "key_sig": "C"
  }
}
```

## 4. Chord Auto-Fill — chordAutoFillService.ts

### Fontes de dados (CRÍTICO — memorizar!)

| Fonte | Tipo | Cobertura | Arquivo |
|-------|------|-----------|---------|
| `@tombatossals/chords-db` | Violão | **529 acordes, 2.069 posições** | `guitar.json` |
| `PIANO_INTERVALS` | Piano (teoria musical) | ~30 tipos de acorde | inline no service |
| `chord_library` (Supabase) | Cache persistente | Cresce conforme uso | tabela no banco |

### chords-db — 63 suffixes disponíveis
```
Normais: major, minor, dim, dim7, sus2, sus4, 7sus4, alt, aug, 6, 69, 7, 7b5,
  aug7, 9, 9b5, aug9, 7b9, 7#9, 11, 9#11, 13, maj7, maj7b5, maj7#5, maj9,
  maj11, maj13, m6, m7, m7b5, m9, m69, m11, mmaj7, mmaj7b5, mmaj9, mmaj11,
  add9, madd9, 7sg, 5 (gerado programaticamente)
Slash maiores: /A, /B, /Bb, /C, /C#, /D, /D#, /E, /F, /F#, /G, /G#
Slash menores: m/B, m/C, m/C#, m/D, m/D#, m/E, m/F, m/F#, m/G, m/G#
```

### parseChordName — Mapeamentos pt-BR → chords-db
```typescript
// Atalhos brasileiros
"B4"    → key="B", suffix="sus4"   // "4" mapeia para sus4
"G2"    → key="G", suffix="sus2"   // "2" mapeia para sus2
"C7M"   → key="C", suffix="maj7"
"E/G#"  → key="E", suffix="/G#"   // slash chord com baixo
"Am/C"  → key="A", suffix="m/C"   // slash menor com baixo
"Fm7(11)" → key="F", suffix="m7"  // parênteses removidos
"Dsus4/F#" → key="D", suffix="sus4" // slash com qualificador → ignora baixo
```

### Acesso ao chords-db
```typescript
import guitarDb from '@tombatossals/chords-db/lib/guitar.json'

// keyToJsonKey: C→C, C#→Csharp, F#→Fsharp, etc.
const chordsForKey = guitarDb.chords[keyToJsonKey(parsed.key)]
const match = chordsForKey.find(c => c.suffix === parsed.suffix)
// match.positions[0] → primeira posição (mais fácil)
```

### Fluxo do Auto-Fill
1. `parseChordName("E/G#")` → `{ key: "E", suffix: "/G#" }`
2. `lookupGuitarChord()` → busca no chords-db → retorna posições SVGuitar
3. `generatePianoChord()` → PIANO_INTERVALS + baixo na oitava 3 se slash
4. `createChord()` → salva no `chord_library` (Supabase) com tag "auto-preenchido"

### REGRA: NUNCA declarar acorde como "não encontrado" sem antes verificar o chords-db!

## Common Pitfalls

1. **SVGuitar string numbering** — String 1 = thinnest (high E). Different from some guitar convention.
2. **VexFlow import** — Use `import { X } from 'vexflow'` (v4+), not `Vex.Flow.X`
3. **Container cleanup** — Always `container.innerHTML = ''` before re-rendering
4. **SVG vs Canvas** — Always use `Renderer.Backends.SVG` for PDF export compatibility
5. **VexTab parsing** — Wrap in try/catch, invalid notation crashes the renderer
6. **Dark mode** — Override stroke/fill colors via config, don't use CSS filters
7. **Chord parsing** — "B4" em cifra brasileira = Bsus4, NÃO é "B + 4". "E/G#" é slash chord, NÃO ignorar a barra.
8. **chords-db tem 2.069 posições** — Sempre buscar lá antes de gerar programaticamente ou declarar "não encontrado"
