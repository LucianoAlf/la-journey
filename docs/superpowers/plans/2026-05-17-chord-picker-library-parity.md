# Chord Picker Library Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the editor chord picker behave like the Biblioteca Musical chord area: musically aware search, exact quality matching, CAGED mode, and reusable chord cards that do not show unrelated qualities as primary results.

**Architecture:** Extract the chord search intent and shared display helpers out of the current page-specific code, then make the editor picker use those helpers instead of its simplified parallel search. Keep the editor block model unchanged: selected chord and chord grids still persist through the existing `render_data`, autosave, undo/redo, and pagination paths.

**Tech Stack:** React, TypeScript, Supabase `chord_library`, existing `ChordDiagram`, existing `getChordsPaginated`, editor autosave/history.

---

## Audit Findings

- `src/pages/Biblioteca.tsx` already has the richer chord UX: search, root filter, difficulty filter, advanced filters, CAGED toggle, and CAGED swimlanes grouped by `caged_shape`.
- `src/components/music/ChordLibraryPicker.tsx` is a parallel simplified picker. It only searches by text and renders a generic grid, so `C maj` does not become "C major triad shapes"; it behaves like text search.
- `src/services/contentBrowserService.ts` currently owns `searchChordsForEditor`, but this is not the right long-term home for musical intent parsing.
- Initial live data audit against `chord_library` found C major guitar shapes with diagrams and CAGED labels. This points to query/modeling mismatch in the editor picker more than missing C major data.
- `src/pages/Biblioteca.tsx` uses helper logic that should not stay page-local forever: `getChordPosition`, `chordFooterText`, CAGED shape labels/descriptions, and family labels.

---

### Task 1: Add Musical Search Intent Parser

**Files:**
- Create: `src/lib/chordSearchIntent.ts`
- Test: `src/lib/__tests__/chordSearchIntent.test.ts`

- [ ] **Step 1: Write the failing parser tests**

```ts
import assert from 'node:assert/strict'
import { parseChordSearchIntent } from '../chordSearchIntent'

function run() {
  assert.deepEqual(parseChordSearchIntent('C maj'), {
    raw: 'C maj',
    rootNote: 'C',
    quality: 'major',
    family: 'triad',
    exactQuality: true,
    displayName: 'C maior',
    normalizedName: 'C',
  })

  assert.deepEqual(parseChordSearchIntent('Dó maior'), {
    raw: 'Dó maior',
    rootNote: 'C',
    quality: 'major',
    family: 'triad',
    exactQuality: true,
    displayName: 'C maior',
    normalizedName: 'C',
  })

  assert.deepEqual(parseChordSearchIntent('Cm'), {
    raw: 'Cm',
    rootNote: 'C',
    quality: 'minor',
    family: 'triad',
    exactQuality: true,
    displayName: 'C menor',
    normalizedName: 'Cm',
  })

  assert.deepEqual(parseChordSearchIntent('C aumentado'), {
    raw: 'C aumentado',
    rootNote: 'C',
    quality: 'aug',
    family: 'triad',
    exactQuality: true,
    displayName: 'C aumentado',
    normalizedName: 'Caug',
  })

  assert.deepEqual(parseChordSearchIntent('C7M'), {
    raw: 'C7M',
    rootNote: 'C',
    quality: 'maj7',
    family: 'tetrad',
    exactQuality: true,
    displayName: 'C 7M',
    normalizedName: 'Cmaj7',
  })

  const rootOnly = parseChordSearchIntent('C')
  assert.equal(rootOnly.rootNote, 'C')
  assert.equal(rootOnly.exactQuality, false)
}

run()
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npx tsx src\lib\__tests__\chordSearchIntent.test.ts
```

Expected: fail because `src/lib/chordSearchIntent.ts` does not exist.

- [ ] **Step 3: Implement the minimal parser**

Create `src/lib/chordSearchIntent.ts`:

```ts
export interface ChordSearchIntent {
  raw: string
  rootNote?: string
  quality?: string
  family?: string
  exactQuality: boolean
  displayName: string
  normalizedName: string
}

const ROOT_ALIASES: Record<string, string> = {
  c: 'C', do: 'C', 'dó': 'C',
  'c#': 'C#', db: 'C#', 'reb': 'C#',
  d: 'D', re: 'D', 'ré': 'D',
  'd#': 'D#', eb: 'D#', 'mib': 'D#',
  e: 'E', mi: 'E',
  f: 'F', fa: 'F', 'fá': 'F',
  'f#': 'F#', gb: 'F#', 'solb': 'F#',
  g: 'G', sol: 'G',
  'g#': 'G#', ab: 'G#', 'lab': 'G#',
  a: 'A', la: 'A', 'lá': 'A',
  'a#': 'A#', bb: 'A#', 'sib': 'A#',
  b: 'B', si: 'B',
}

const QUALITY_ALIASES: Array<{ match: RegExp; quality: string; family: string; suffix: string; label: string }> = [
  { match: /^(maj7|maior7|maior 7|7m|7M)$/i, quality: 'maj7', family: 'tetrad', suffix: 'maj7', label: '7M' },
  { match: /^(m7|min7|menor7|menor 7)$/i, quality: 'm7', family: 'tetrad', suffix: 'm7', label: 'menor 7' },
  { match: /^(7|dom7|dominante)$/i, quality: '7', family: 'tetrad', suffix: '7', label: '7' },
  { match: /^(m|minor|min|menor)$/i, quality: 'minor', family: 'triad', suffix: 'm', label: 'menor' },
  { match: /^(aug|aumentado|aumentada)$/i, quality: 'aug', family: 'triad', suffix: 'aug', label: 'aumentado' },
  { match: /^(dim|diminuto|diminuta)$/i, quality: 'dim', family: 'triad', suffix: 'dim', label: 'diminuto' },
  { match: /^(sus2)$/i, quality: 'sus2', family: 'suspended', suffix: 'sus2', label: 'sus2' },
  { match: /^(sus4)$/i, quality: 'sus4', family: 'suspended', suffix: 'sus4', label: 'sus4' },
  { match: /^(add9)$/i, quality: 'add9', family: 'triad', suffix: 'add9', label: 'add9' },
  { match: /^(maj|major|maior)$/i, quality: 'major', family: 'triad', suffix: '', label: 'maior' },
]

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

export function parseChordSearchIntent(search: string): ChordSearchIntent {
  const raw = search.trim()
  const normalized = normalizeText(raw).replace(/\s+/g, ' ')
  const compact = normalized.replace(/\s+/g, '')
  const rootMatch = compact.match(/^([A-Ga-g](?:#|b)?|do|re|mi|fa|sol|la|si)(.*)$/i)
  if (!rootMatch) {
    return { raw, exactQuality: false, displayName: raw, normalizedName: normalized }
  }

  const rootToken = rootMatch[1].toLowerCase()
  const rootNote = ROOT_ALIASES[rootToken] ?? rootToken.toUpperCase()
  const qualityToken = (rootMatch[2] || '').trim()

  if (!qualityToken) {
    return { raw, rootNote, exactQuality: false, displayName: rootNote, normalizedName: rootNote }
  }

  const quality = QUALITY_ALIASES.find(item => item.match.test(qualityToken))
  if (!quality) {
    return { raw, rootNote, exactQuality: false, displayName: rootNote, normalizedName: `${rootNote}${qualityToken}` }
  }

  return {
    raw,
    rootNote,
    quality: quality.quality,
    family: quality.family,
    exactQuality: true,
    displayName: `${rootNote} ${quality.label}`,
    normalizedName: `${rootNote}${quality.suffix}`,
  }
}
```

- [ ] **Step 4: Run the parser test and verify it passes**

Run:

```bash
npx tsx src\lib\__tests__\chordSearchIntent.test.ts
```

Expected: pass.

---

### Task 2: Extract Shared Chord Display Helpers

**Files:**
- Create: `src/lib/chordLibraryDisplay.ts`
- Modify: `src/pages/Biblioteca.tsx`
- Test: `src/lib/__tests__/chordLibraryDisplay.test.ts`

- [ ] **Step 1: Write helper tests**

```ts
import assert from 'node:assert/strict'
import { chordFooterText, getChordPosition, groupChordsByCagedShape } from '../chordLibraryDisplay'

function run() {
  assert.equal(chordFooterText({ family: 'triad', difficulty: 2 }), 'tríade · nível 2')
  assert.equal(getChordPosition({ fingers: [[1, 3]], barres: [] }), 3)
  assert.deepEqual(
    groupChordsByCagedShape([
      { id: '1', caged_shape: 'C' },
      { id: '2', caged_shape: 'A' },
      { id: '3', caged_shape: null },
    ] as any).map(group => [group.shape, group.chords.length]),
    [['C', 1], ['A', 1], ['G', 0], ['E', 0], ['D', 0], ['?', 1]],
  )
}

run()
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
npx tsx src\lib\__tests__\chordLibraryDisplay.test.ts
```

Expected: fail because helper does not exist.

- [ ] **Step 3: Move page-local logic into helper**

Create `src/lib/chordLibraryDisplay.ts`:

```ts
export const CHORD_FAMILY_LABELS: Record<string, string> = {
  triad: 'tríade',
  tetrad: 'tétrade',
  suspended: 'suspensa',
  tension: 'tensão',
  power: 'power chord',
  other: 'outro',
}

export const CAGED_SHAPES = ['C', 'A', 'G', 'E', 'D'] as const
export type CagedShape = typeof CAGED_SHAPES[number]

export const CAGED_SHAPE_LABELS: Record<CagedShape, string> = {
  C: 'Formato C',
  A: 'Formato A',
  G: 'Formato G',
  E: 'Formato E',
  D: 'Formato D',
}

export const CAGED_SHAPE_DESCRIPTIONS: Record<CagedShape, string> = {
  C: 'Baixo na 5ª corda — escadinha descendente',
  A: 'Baixo na 5ª corda — mão compacta subindo',
  G: 'Baixo na 6ª corda — aranha (grande extensão)',
  E: 'Baixo na 6ª corda — com pestana',
  D: 'Baixo na 4ª corda — cordas agudas',
}

export function chordFooterText(chord: { family?: string | null; difficulty?: number | null }) {
  const family = CHORD_FAMILY_LABELS[(chord.family ?? '')] ?? ''
  const level = chord.difficulty ? `nível ${chord.difficulty}` : ''
  return [family, level].filter(Boolean).join(' · ')
}

export function getChordPosition(positions: any): number {
  if (positions?.position) return positions.position
  const frets: number[] = [
    ...(positions?.fingers ?? []).map((f: any) => f[1]).filter((f: number) => typeof f === 'number' && f > 0),
    ...(positions?.barres ?? []).map((b: any) => b.fret).filter((f: number) => typeof f === 'number' && f > 0),
  ]
  if (frets.length === 0) return 1
  const minFret = Math.min(...frets)
  return minFret > 0 ? minFret : 1
}

export function isRenderableChordPositions(positions: any) {
  return Boolean(
    (Array.isArray(positions?.fingers) && positions.fingers.length > 0) ||
    (Array.isArray(positions?.barres) && positions.barres.length > 0) ||
    (Array.isArray(positions?.muted) && positions.muted.length > 0)
  )
}

export function groupChordsByCagedShape<TChord extends { caged_shape?: string | null }>(chords: TChord[]) {
  const groups = CAGED_SHAPES.map(shape => ({
    shape,
    label: CAGED_SHAPE_LABELS[shape],
    description: CAGED_SHAPE_DESCRIPTIONS[shape],
    chords: chords.filter(chord => chord.caged_shape === shape),
  }))
  const unclassified = chords.filter(chord => !chord.caged_shape)
  if (unclassified.length > 0) {
    groups.push({ shape: '?' as any, label: 'Sem classificação CAGED', description: '', chords: unclassified })
  }
  return groups
}
```

- [ ] **Step 4: Replace duplicated helper code in `src/pages/Biblioteca.tsx`**

Import from the helper:

```ts
import { chordFooterText, getChordPosition, groupChordsByCagedShape } from '@/lib/chordLibraryDisplay'
```

Then remove the local `FAMILY_LABELS`, local `chordFooterText`, and local `getChordPosition`.

- [ ] **Step 5: Run tests**

Run:

```bash
npx tsx src\lib\__tests__\chordLibraryDisplay.test.ts
npm run lint
```

Expected: both pass.

---

### Task 3: Replace Editor Chord Search With Intent-Aware Query

**Files:**
- Modify: `src/services/contentBrowserService.ts`
- Test: `src/lib/__tests__/contentBrowserService.test.ts`

- [ ] **Step 1: Extend existing tests for ranking and exact quality**

Add to `src/lib/__tests__/contentBrowserService.test.ts`:

```ts
import { filterChordsByIntent } from '../chordSearchSort'
import { parseChordSearchIntent } from '../chordSearchIntent'

const chords = [
  { id: 'c1', name: 'C', root_note: 'C', family: 'triad', quality: 'major', caged_shape: 'C' },
  { id: 'c2', name: 'C', root_note: 'C', family: 'triad', quality: 'major', caged_shape: 'A' },
  { id: 'cm', name: 'Cm', root_note: 'C', family: 'triad', quality: 'minor', caged_shape: 'C' },
  { id: 'caug', name: 'Caug', root_note: 'C', family: 'triad', quality: 'aug', caged_shape: 'C' },
] as any

assert.deepEqual(
  filterChordsByIntent(chords, parseChordSearchIntent('C maj')).map(chord => chord.name),
  ['C', 'C'],
)

assert.deepEqual(
  filterChordsByIntent(chords, parseChordSearchIntent('C aumentado')).map(chord => chord.name),
  ['Caug'],
)
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
npx tsx src\lib\__tests__\contentBrowserService.test.ts
```

Expected: fail because `filterChordsByIntent` does not exist.

- [ ] **Step 3: Implement filter/ranking helper**

Add to `src/lib/chordSearchSort.ts`:

```ts
import type { ChordSearchIntent } from './chordSearchIntent'

export function filterChordsByIntent<TChord extends SearchableChord & {
  root_note?: string | null
  family?: string | null
  quality?: string | null
}>(chords: TChord[], intent: ChordSearchIntent): TChord[] {
  let results = chords
  if (intent.rootNote) results = results.filter(chord => chord.root_note === intent.rootNote)
  if (intent.exactQuality && intent.quality) {
    results = results.filter(chord => chord.quality === intent.quality)
  }
  if (intent.exactQuality && intent.family) {
    results = results.filter(chord => chord.family === intent.family)
  }
  return sortChordsForEditorSearch(intent.normalizedName, results)
}
```

- [ ] **Step 4: Update service to use parsed intent**

In `src/services/contentBrowserService.ts`, use:

```ts
const intent = parseChordSearchIntent(search)
```

For exact quality searches:

```ts
let request = supabase
  .from('chord_library')
  .select('*')
  .eq('instrument', 'guitar')
  .order('sort_order', { ascending: true, nullsFirst: false })
  .order('name', { ascending: true })
  .limit(60)

if (intent.rootNote) request = request.eq('root_note', intent.rootNote)
if (intent.exactQuality && intent.quality) request = request.eq('quality', intent.quality)
if (intent.exactQuality && intent.family) request = request.eq('family', intent.family)
```

For root-only searches, query `root_note` first and sort, instead of treating `C` as `%C%`.

- [ ] **Step 5: Run tests**

Run:

```bash
npx tsx src\lib\__tests__\contentBrowserService.test.ts
npm run lint
```

Expected: pass.

---

### Task 4: Add CAGED Mode and Suggestions to Editor Picker

**Files:**
- Modify: `src/components/music/ChordLibraryPicker.tsx`
- Create: `src/components/music/ChordPickerResultCard.tsx`
- Create: `src/components/music/ChordPickerCagedResults.tsx`

- [ ] **Step 1: Create reusable card component**

Create `src/components/music/ChordPickerResultCard.tsx`:

```tsx
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChordDiagram } from '@/components/music/ChordDiagram'
import { chordFooterText, getChordPosition } from '@/lib/chordLibraryDisplay'
import type { Chord } from '@/services/contentBrowserService'

export function ChordPickerResultCard({
  chord,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  busy,
}: {
  chord: Chord
  primaryLabel: string
  secondaryLabel?: string
  onPrimary: () => void
  onSecondary?: () => void
  busy?: boolean
}) {
  const positions = (chord.positions ?? {}) as any
  return (
    <article className="flex min-h-[270px] flex-col rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold text-text">{chord.name}</h3>
          <p className="text-[11px] text-text3">{chordFooterText(chord)}</p>
        </div>
        {chord.caged_shape && <Badge variant="secondary" className="text-[10px]">CAGED {chord.caged_shape}</Badge>}
      </div>
      <div className="mt-3 flex flex-1 items-center justify-center rounded-lg bg-surface/60 py-3">
        <ChordDiagram
          name={chord.name}
          positions={positions}
          position={getChordPosition(positions)}
          size="compact"
          strings={6}
        />
      </div>
      <div className={secondaryLabel ? 'mt-3 grid grid-cols-2 gap-2' : 'mt-3 grid grid-cols-1'}>
        <Button size="sm" variant={secondaryLabel ? 'outline' : 'default'} className="h-8 text-[11px]" disabled={busy} onClick={onPrimary}>
          {primaryLabel}
        </Button>
        {secondaryLabel && onSecondary && (
          <Button size="sm" className="h-8 text-[11px]" disabled={busy} onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Add CAGED grouped view**

Create `src/components/music/ChordPickerCagedResults.tsx` using `groupChordsByCagedShape`, rendering the same five swimlanes as Biblioteca Musical but inside a modal-friendly two-column card grid.

- [ ] **Step 3: Update picker state**

In `src/components/music/ChordLibraryPicker.tsx`, add:

```ts
const [cagedMode, setCagedMode] = useState(false)
const intent = useMemo(() => parseChordSearchIntent(search), [search])
```

Add a toggle below the search:

```tsx
<button type="button" onClick={() => setCagedMode(prev => !prev)}>
  Modo CAGED
</button>
```

Show suggestion chips when `intent.rootNote` exists:

```tsx
{['maior', 'menor', 'aumentado', 'diminuto', '7', '7M'].map(label => (
  <button type="button" onClick={() => setSearch(`${intent.rootNote} ${label}`)}>{label}</button>
))}
```

- [ ] **Step 4: Replace card rendering**

Use `ChordPickerResultCard` for normal mode and `ChordPickerCagedResults` for CAGED mode.

- [ ] **Step 5: Browser validation**

Open:

```text
http://localhost:3000/editor/01abd63e-77df-493c-8af1-76a401e84adb
```

Validate:

- Type `C maj`: only C major triad shapes appear as primary results.
- Type `C aumentado`: only Caug appears.
- Type `Dó maior`: same as C major.
- Toggle `Modo CAGED`: C major shapes group under C, A, G, E, D lanes.
- Buttons stay below diagrams and do not overlap.
- `Trocar` and `Adicionar ao lado` still work.

---

### Task 5: Data Quality Guardrail

**Files:**
- Modify: `src/services/contentBrowserService.ts`
- Test: `src/lib/__tests__/chordLibraryDisplay.test.ts`

- [ ] **Step 1: Extend display test**

Add:

```ts
import { isRenderableChordPositions } from '../chordLibraryDisplay'

assert.equal(isRenderableChordPositions({ fingers: [[1, 3]], barres: [], muted: [] }), true)
assert.equal(isRenderableChordPositions({ fingers: [], barres: [], muted: [] }), false)
assert.equal(isRenderableChordPositions(null), false)
```

- [ ] **Step 2: Filter non-renderable results in the editor picker service**

In `searchChordsForEditor`, after fetching rows:

```ts
const renderable = rows.filter(chord => isRenderableChordPositions(chord.positions))
```

If filtered results remove anything, log in dev only:

```ts
if (import.meta.env.DEV && renderable.length !== rows.length) {
  console.warn('[ChordPicker] filtered non-renderable chords', rows.length - renderable.length)
}
```

- [ ] **Step 3: Add optional audit script**

Create `scripts/audit-chord-library.mjs` later only if we decide to run a deeper data cleanup pass. It should count missing `positions`, missing `caged_shape`, and duplicate `name + instrument + caged_shape + voicing_position`.

---

### Task 6: Final Verification

**Files:**
- No code changes beyond previous tasks.

- [ ] **Step 1: Run targeted tests**

```bash
npx tsx src\lib\__tests__\chordSearchIntent.test.ts
npx tsx src\lib\__tests__\chordLibraryDisplay.test.ts
npx tsx src\lib\__tests__\contentBrowserService.test.ts
npx tsx src\lib\__tests__\editorChordSelection.test.ts
```

- [ ] **Step 2: Run full checks**

```bash
npm run lint
npm run build
```

- [ ] **Step 3: Browser validation**

Use the in-app browser and validate both pages:

```text
http://localhost:3000/biblioteca
http://localhost:3000/editor/01abd63e-77df-493c-8af1-76a401e84adb
```

Expected:

- Biblioteca Musical behavior remains unchanged.
- Editor picker search now matches Biblioteca Musical intent.
- No infinite loading after typing.
- No unrelated qualities in exact searches.
- CAGED mode appears in the editor picker and groups results correctly.
- Chord insert/replace actions still preserve undo/redo and autosave behavior.

---

## Implementation Recommendation

Implement Tasks 1-3 first as the correctness slice. Then do Task 4 as the UX slice. Task 5 should be done before declaring this final, because it prevents visually blank or malformed chord rows from leaking into the editor even if future library data is imperfect.
