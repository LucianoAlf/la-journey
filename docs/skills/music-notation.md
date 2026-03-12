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

## Common Pitfalls

1. **SVGuitar string numbering** — String 1 = thinnest (high E). Different from some guitar convention.
2. **VexFlow import** — Use `import { X } from 'vexflow'` (v4+), not `Vex.Flow.X`
3. **Container cleanup** — Always `container.innerHTML = ''` before re-rendering
4. **SVG vs Canvas** — Always use `Renderer.Backends.SVG` for PDF export compatibility
5. **VexTab parsing** — Wrap in try/catch, invalid notation crashes the renderer
6. **Dark mode** — Override stroke/fill colors via config, don't use CSS filters