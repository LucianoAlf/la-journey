# Notação in-place na A4 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicar na pauta do material escreve na A4 (gesto MuseScore/Finale/Sibelius): duração perto da pauta, resto das ferramentas atuais na lateral direita, sem modal no caminho principal.

**Architecture:** O modelo continua `beats` → `beatsToAlphaTex`. Uma sessão in-place hidrata o bloco, o overlay do AlphaTab **do bloco selecionado** insere/substitui, e cada alteração vai para `render_data` local. **Salvar** do material persiste. Biblioteca → Notação continua no modal `NotationEditorV2`. Rollback: `?notationInline=off`.

**Tech Stack:** React, AlphaTab (`@coderline/alphatab`), `npx tsx --test`, Simple Browser em `http://localhost:3002`. PowerShell: `;` no lugar de `&&`.

**Spec:** `docs/superpowers/specs/2026-08-15-notacao-inplace-a4-design.md`

**Worktree:** `D:\la-journey\.worktrees\notacao-alphatab-folha`, branch `feat/notacao-caderninho`. Não usar o checkout sujo `D:\la-journey` (image-gen / Iconify / Recraft).

---

## Gesto travado (primeiro clique)

1. Clique num bloco de notação **não selecionado** → seleciona, hidrata a sessão, mostra fileira + lateral. **Não insere. Não abre modal.**
2. Clique na pauta **já selecionada** → overlay (mesmo hit-test do modal): insert / Alt+clique replace.
3. Teclado A–G funciona depois de selecionado (input escondido focado).

O critério de pronto “inserir uma nota” é o passo 2 (bloco já focado), não o primeiro clique de seleção.

## File map

| File | Responsibility |
|---|---|
| `src/lib/notationInline.ts` | Flag `on` \| `off`. Query `notationInline` ganha da constante. Default `on`. |
| `src/lib/__tests__/notationInline.test.ts` | Default on, query off, inválida. |
| `src/lib/notationInlineHydrate.ts` | Bloco → `{ beats, clef, keySignature, timeSignature, bpm, grandStaff }`. Partitura **inteira** quando `staveIndex` é `null`. |
| `src/lib/__tests__/notationInlineHydrate.test.ts` | Vários staves legado → todos os beats; `notation_data` ganha; stave apontado isola. |
| `src/lib/notationInlineOps.ts` | insert / replace / delete / rest / tex / patch de `render_data`. Sem React. |
| `src/lib/__tests__/notationInlineOps.test.ts` | insert/delete atualiza beats e tex; patch não chama RPC. |
| `src/lib/notationEditorChrome.ts` | `DURATION_OPTIONS`, `CLEF_OPTIONS`, `KEY_SIGNATURE_OPTIONS`, `TIME_SIGNATURE_OPTIONS`, `TUPLET_OPTIONS` (saem do V2). |
| `src/components/music/NotationDurationStrip.tsx` | Duração, pausa, ponto, acidente. Sem save, sem AlphaTab. |
| `src/components/music/NotationToolsSidebar.tsx` | Modo, clave, armadura, fórmula, quiáltera, transpor, undo/redo, play, BPM. Sem AlphaTab. |
| `src/components/music/useNotationInlineSession.ts` | Estado React da sessão + teclado A–G + play Tone. Usa ops + hydrate. |
| `src/components/music/NotationAlphaTabSurface.tsx` | Prop `variant: 'modal' \| 'canvas'`. Canvas sem borda de Dialog. |
| `src/components/music/NotationEditorV2.tsx` | Passa a usar Strip + Sidebar. Continua Dialog. Não reescrever handlers neste corte. |
| `src/components/material/MaterialPreview.tsx` | Bloco selecionado + inline on → Surface + Strip. Outros blocos continuam preview. |
| `src/pages/Editor.tsx` | Clique não abre modal; lateral troca; `render_data` local; rollback. |
| `src/lib/editorCanvasInteraction.ts` | Sem ação `edit-notation` quando inline on. |
| `.agent/development-map.md` | Só no fim, depois do browser. |

Não tocar: `TablatureEditor`, PDF, snapshot, `Biblioteca.tsx` (o modal já abre por lá).

Não implementar: ligadura, cifra-mapa, folha deitada, playhead, tom/capo.

---

### Task 0: Commit do caderninho visual (pré-requisito)

Já implementado e testado neste worktree. Sem isso a folha in-place herda pauta flush e modal de 2 notas.

**Files:**
- `src/lib/extendAlphaTabStaffLines.ts`
- `src/lib/__tests__/extendAlphaTabStaffLines.test.ts`
- `src/components/music/AlphaTabViewer.tsx`
- `src/components/music/NotationAlphaTabSurface.tsx`
- `src/lib/alphaTabSettings.ts`
- `src/pages/Editor.tsx` (staveIndex `null` = partitura inteira)
- `vite.config.ts` (worker no worktree)
- `vercel.json` (`no-cache` em `/` e `/editor`)

- [ ] **Step 1: Rodar o teste que já existe**

Run: `npx tsx --test src/lib/__tests__/extendAlphaTabStaffLines.test.ts`

Expected: `ok` em todos, exit 0.

- [ ] **Step 2: Commit**

```powershell
git add src/lib/extendAlphaTabStaffLines.ts src/lib/__tests__/extendAlphaTabStaffLines.test.ts src/components/music/AlphaTabViewer.tsx src/components/music/NotationAlphaTabSurface.tsx src/lib/alphaTabSettings.ts src/pages/Editor.tsx vite.config.ts vercel.json
git commit -m "fix(notation): keep equal staff insets and load the full score in the modal"
```

Não incluir image-gen / Iconify / Recraft. Não incluir a spec (já commitada).

---

### Task 1: Flag `notationInline`

**Files:**
- Create: `src/lib/notationInline.ts`
- Test: `src/lib/__tests__/notationInline.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/notationInline.test.ts`:

```ts
import { resolveNotationInline } from '../notationInline.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('default is on', () => {
  assert(resolveNotationInline('') === 'on', 'empty search defaults to on')
  assert(resolveNotationInline('?foo=1') === 'on', 'unrelated query defaults to on')
})

test('query notationInline=off wins', () => {
  assert(resolveNotationInline('?notationInline=off') === 'off', 'bare query')
  assert(resolveNotationInline('notationInline=off') === 'off', 'without question mark')
})

test('query notationInline=on is explicit', () => {
  assert(resolveNotationInline('?notationInline=on') === 'on', 'explicit on')
})

test('invalid query falls back', () => {
  assert(resolveNotationInline('?notationInline=maybe') === 'on', 'unknown value uses default')
  assert(resolveNotationInline('?notationInline=maybe', 'off') === 'off', 'unknown value uses fallback arg')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/notationInline.test.ts`

Expected: FAIL — `Cannot find module` / `notationInline` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/notationInline.ts`:

```ts
export type NotationInline = 'on' | 'off'

export const NOTATION_INLINE_DEFAULT: NotationInline = 'on'

export function resolveNotationInline(
  search: string,
  fallback: NotationInline = NOTATION_INLINE_DEFAULT,
): NotationInline {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const value = new URLSearchParams(raw).get('notationInline')
  if (value === 'on' || value === 'off') return value
  return fallback
}

export function readNotationInline(): NotationInline {
  if (typeof window === 'undefined') return NOTATION_INLINE_DEFAULT
  return resolveNotationInline(window.location.search)
}

export function isNotationInlineEnabled(search?: string): boolean {
  if (typeof search === 'string') return resolveNotationInline(search) === 'on'
  return readNotationInline() === 'on'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/__tests__/notationInline.test.ts`

Expected: 4 `ok` lines, exit 0.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/notationInline.ts src/lib/__tests__/notationInline.test.ts
git commit -m "feat(notation): add notationInline rollback flag defaulting to on"
```

---

### Task 2: Hidratar a partitura inteira

`blockToNotationRow` em `Editor.tsx` (~5776) mistura React, stave apontado e fallbacks. Extrair para lib. Quando `staveIndex` é `null`, juntar **todos** os staves legado (já existe `legacyNotesToBeats` em `src/lib/notationCompat.ts`).

**Files:**
- Create: `src/lib/notationInlineHydrate.ts`
- Test: `src/lib/__tests__/notationInlineHydrate.test.ts`
- Modify later: `src/pages/Editor.tsx` (Task 8 usa esta função; o modal já carrega partitura inteira depois do Task 0)

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/notationInlineHydrate.test.ts`:

```ts
import assert from 'node:assert/strict'
import { hydrateNotationFromBlock } from '../notationInlineHydrate.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

const twoStaves = {
  notation: {
    type: 'staff',
    staves: [
      { clef: 'treble', key_signature: 'C', notes: ['C/4:q', 'D/4:q'], accidentals: [null, null] },
      { clef: 'treble', key_signature: 'C', notes: ['E/4:q', 'F/4:q', 'G/4:q'], accidentals: [null, null, null] },
    ],
  },
}

test('full score hydrates every legacy stave, not index 0', () => {
  const session = hydrateNotationFromBlock({ render_data: twoStaves, content: {}, staveIndex: null })
  assert.equal(session.beats.length, 5)
  assert.equal(session.beats[1].barAfter, true)
  assert.equal(session.clef, 'treble')
})

test('pointed stave hydrates only that stave', () => {
  const session = hydrateNotationFromBlock({ render_data: twoStaves, content: {}, staveIndex: 1 })
  assert.equal(session.beats.length, 3)
  assert.equal(session.beats[0].pitches[0].pitch, 'E/4')
})

test('notation_data beats win over legacy staves', () => {
  const session = hydrateNotationFromBlock({
    render_data: {
      ...twoStaves,
      notation_data: {
        beats: [{ pitches: [{ pitch: 'A/4' }], duration: 'q', isRest: false }],
        clef: 'bass',
        keySignature: 'G',
        timeSignature: '3/4',
        bpm: 90,
        grandStaff: false,
      },
    },
    content: {},
    staveIndex: null,
  })
  assert.equal(session.beats.length, 1)
  assert.equal(session.beats[0].pitches[0].pitch, 'A/4')
  assert.equal(session.clef, 'bass')
  assert.equal(session.keySignature, 'G')
  assert.equal(session.timeSignature, '3/4')
  assert.equal(session.bpm, 90)
})

test('content.notation_data is used when render_data has none', () => {
  const session = hydrateNotationFromBlock({
    render_data: {},
    content: {
      notation_data: {
        beats: [{ pitches: [{ pitch: 'C/5' }], duration: 'h', isRest: false }],
        clef: 'treble',
      },
    },
    staveIndex: null,
  })
  assert.equal(session.beats[0].pitches[0].pitch, 'C/5')
  assert.equal(session.beats[0].duration, 'h')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/notationInlineHydrate.test.ts`

Expected: FAIL — módulo ausente.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/notationInlineHydrate.ts`. Reusar `legacyNotesToBeats` de `notationCompat.ts`. Normalizar duração com `editorDurationFromRaw`. `notation_data` só é ignorado quando `staveIndex !== null` **e** há mais de um stave legado (mesmo contrato do `blockToNotationRow` atual).

```ts
import { editorDurationFromRaw, type EditorBeatDuration } from './notationBeatNormalize.ts'
import { legacyNotesToBeats } from './notationCompat.ts'
import { getEditorTimeSignature } from './timeSignature.ts'

export interface InlinePitch {
  pitch: string
  accidental?: string | null
}

export interface InlineBeat {
  pitches: InlinePitch[]
  duration: EditorBeatDuration
  isRest: boolean
  dotted?: boolean
  doubleDotted?: boolean
  barAfter?: boolean
  staff?: 'treble' | 'bass'
  timeSlot?: number
  tuplet?: { numNotes: number; notesOccupied: number; groupId: string }
  tieToNext?: boolean
  articulations?: string[]
}

export interface HydratedNotationSession {
  beats: InlineBeat[]
  clef: string
  keySignature: string
  timeSignature: string
  bpm: number
  grandStaff: boolean
}

function normalizeBeats(rawBeats: any[]): InlineBeat[] {
  return rawBeats.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const pitches = Array.isArray(raw.pitches)
      ? raw.pitches
          .map((p: any) => ({ pitch: String(p?.pitch ?? ''), accidental: p?.accidental ?? undefined }))
          .filter((p: InlinePitch) => p.pitch.includes('/'))
      : []
    const duration = editorDurationFromRaw(String(raw.duration ?? 'q'))
    return [{
      pitches,
      duration,
      isRest: Boolean(raw.isRest) || pitches.length === 0,
      dotted: Boolean(raw.dotted),
      doubleDotted: Boolean(raw.doubleDotted),
      barAfter: Boolean(raw.barAfter),
      staff: raw.staff === 'bass' ? 'bass' : raw.staff === 'treble' ? 'treble' : undefined,
      timeSlot: Number.isFinite(raw.timeSlot) ? raw.timeSlot : undefined,
      tuplet: raw.tuplet,
      tieToNext: Boolean(raw.tieToNext ?? raw.tie),
      articulations: Array.isArray(raw.articulations) ? raw.articulations : undefined,
    }]
  })
}

function beatsFromLegacyStaves(staves: any[], staveIndex: number | null): InlineBeat[] {
  const selected = staveIndex !== null && Array.isArray(staves)
    ? [staves[staveIndex]].filter(Boolean)
    : (staves ?? [])
  return selected.flatMap((stave, index) => {
    const beats = legacyNotesToBeats(stave?.notes, stave?.accidentals).map((beat) => ({
      pitches: beat.pitches.map((p) => ({ pitch: p.pitch, accidental: p.accidental })),
      duration: editorDurationFromRaw(String(beat.duration)),
      isRest: beat.isRest,
      dotted: beat.dotted,
      doubleDotted: beat.doubleDotted,
      barAfter: Boolean(beat.barAfter),
    }))
    if (!beats.length) return []
    if (index < selected.length - 1) {
      beats[beats.length - 1] = { ...beats[beats.length - 1], barAfter: true }
    }
    return beats
  })
}

export function hydrateNotationFromBlock(input: {
  render_data?: any
  content?: any
  staveIndex?: number | null
}): HydratedNotationSession {
  const rd = input.render_data ?? {}
  const content = input.content ?? {}
  const staves = Array.isArray(rd.notation?.staves) ? rd.notation.staves : []
  const staveIndex = input.staveIndex ?? null
  const pointed = staveIndex !== null ? staves[staveIndex] : staves[0]
  const useLegacySlice = staveIndex !== null && staves.length > 1
  const rawData = useLegacySlice
    ? null
    : (content.notation_data ?? rd.notation_data ?? null)
  const beats = rawData?.beats && Array.isArray(rawData.beats)
    ? normalizeBeats(rawData.beats)
    : beatsFromLegacyStaves(staves, staveIndex)

  return {
    beats,
    clef: String(rawData?.clef || pointed?.clef || rd.clef || 'treble'),
    keySignature: String(rawData?.keySignature || pointed?.key_signature || rd.key_signature || 'C'),
    timeSignature: getEditorTimeSignature(rawData?.timeSignature, pointed?.time_signature, rd.time_signature),
    bpm: Number(rawData?.bpm || 120),
    grandStaff: Boolean(rawData?.grandStaff),
  }
}
```

`editorDurationFromRaw` cobre `q`/`h`. O teste de `content.notation_data` espera `duration: 'h'` já no JSON — não reconverter.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/__tests__/notationInlineHydrate.test.ts`

Expected: 4 `ok`, exit 0.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/notationInlineHydrate.ts src/lib/__tests__/notationInlineHydrate.test.ts
git commit -m "feat(notation): hydrate the full score for in-place editing"
```

---

### Task 3: Ops da sessão (insert / delete / tex)

Sem React. O V2 **não** passa a usar isto neste corte (risco no modal da Biblioteca). O Editor usa.

**Files:**
- Create: `src/lib/notationInlineOps.ts`
- Test: `src/lib/__tests__/notationInlineOps.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import {
  deleteBeat,
  insertNote,
  insertRest,
  replaceNote,
  sessionToAlphaTex,
} from '../notationInlineOps.ts'
import type { InlineBeat } from '../notationInlineHydrate.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

const c4: InlineBeat = { pitches: [{ pitch: 'C/4' }], duration: 'q', isRest: false }

test('insertNote appends after index and selects the new beat', () => {
  const next = insertNote({
    beats: [c4],
    selectedBeatIdx: 0,
    pitch: 'E/4',
    afterIdx: 0,
    duration: 'q',
    accidental: null,
    dotted: false,
    doubleDotted: false,
  })
  assert.equal(next.beats.length, 2)
  assert.equal(next.beats[1].pitches[0].pitch, 'E/4')
  assert.equal(next.selectedBeatIdx, 1)
})

test('replaceNote changes pitch in place', () => {
  const next = replaceNote({ beats: [c4], atIdx: 0, pitch: 'G/4', accidental: '#' })
  assert.equal(next.beats[0].pitches[0].pitch, 'G/4')
  assert.equal(next.beats[0].pitches[0].accidental, '#')
  assert.equal(next.beats[0].isRest, false)
})

test('deleteBeat removes and clamps selection', () => {
  const next = deleteBeat({
    beats: [c4, { pitches: [{ pitch: 'D/4' }], duration: 'q', isRest: false }],
    selectedBeatIdx: 1,
    idx: 1,
  })
  assert.equal(next.beats.length, 1)
  assert.equal(next.selectedBeatIdx, 0)
})

test('insertRest uses current duration', () => {
  const next = insertRest({
    beats: [c4],
    selectedBeatIdx: 0,
    duration: 'h',
    dotted: false,
    doubleDotted: false,
  })
  assert.equal(next.beats[1].isRest, true)
  assert.equal(next.beats[1].duration, 'h')
})

test('sessionToAlphaTex emits the new pitch', () => {
  const { tex, indexMap } = sessionToAlphaTex({
    beats: [
      c4,
      { pitches: [{ pitch: 'E/4' }], duration: 'q', isRest: false },
    ],
    clef: 'treble',
    keySignature: 'C',
    timeSignature: 'free',
    bpm: 120,
    grandStaff: false,
  })
  assert.match(tex, /e4/i)
  assert.ok(indexMap.length >= 2)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/notationInlineOps.test.ts`

Expected: FAIL — módulo ausente.

- [ ] **Step 3: Write minimal implementation**

`insertNote` no caminho simples (sem grande pauta): `splice(afterIdx + 1, 0, newBeat)`. Grande pauta: copiar o corpo de `handleInsertNote` em `NotationEditorV2.tsx` linhas 485–588 para `insertNote` quando `grandStaff` for true — mesmos `timeSlot` / `staff`. Não simplificar o caso piano; o modal já faz isso.

`sessionToAlphaTex`: copiar o `useEffect` de `NotationEditorV2.tsx` linhas 386–428 — mapear `InlineBeat` → `AlphaTexBeat` e chamar `beatsToAlphaTexWithMap`. `timeSignature === 'free'` passa `null` para o conversor.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/__tests__/notationInlineOps.test.ts`

Expected: 5 `ok`, exit 0.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/notationInlineOps.ts src/lib/__tests__/notationInlineOps.test.ts
git commit -m "feat(notation): extract insert/delete/tex ops for the in-place session"
```

---

### Task 4: Patch local de `render_data` (sem RPC)

Spec: alteração vai para o bloco na hora; **Salvar** do material persiste; sem Atualizar / sem `updateMaterialBlockRpc` no caminho in-place.

**Files:**
- Modify: `src/lib/notationInlineOps.ts`
- Test: `src/lib/__tests__/notationInlineOps.test.ts`

- [ ] **Step 1: Add failing tests** to the same file:

```ts
import { applySessionToRenderData } from '../notationInlineOps.ts'

test('applySessionToRenderData writes notation_data and alphaTex without dropping other keys', () => {
  const rd = applySessionToRenderData(
    { foo: 1, notation: { type: 'staff', staves: [] } },
    {
      beats: [{ pitches: [{ pitch: 'C/4' }], duration: 'q', isRest: false }],
      clef: 'treble',
      keySignature: 'C',
      timeSignature: 'free',
      bpm: 120,
      grandStaff: false,
      title: 'Intervalos',
    },
  )
  assert.equal(rd.foo, 1)
  assert.equal(rd.clef, 'treble')
  assert.ok(Array.isArray(rd.notation_data.beats))
  assert.equal(typeof rd.alphaTex, 'string')
  assert.match(rd.alphaTex, /c4/i)
  assert.equal(rd.notation.staves.length >= 1, true)
})
```

Reconstruir `notation.staves` como `handleNotationEditorSave` (`Editor.tsx` ~5836–5887): grupos por `barAfter`, `v2BeatToLegacyNote` se já existir exportado; senão um helper local `beatToLegacyNote` no mesmo arquivo das ops (não importar `Editor.tsx`).

Não chamar `updateMaterialBlockRpc`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/notationInlineOps.test.ts`

Expected: FAIL — `applySessionToRenderData` ausente.

- [ ] **Step 3: Implement `applySessionToRenderData`**

Retorno: `{ ...render_data, notation, notation_data, alphaTex, clef, key_signature, time_signature }`.

`notation_data` shape igual ao `handleSave` do V2:

```ts
{
  beats,
  clef,
  keySignature,
  timeSignature: timeSignature === 'free' ? null : timeSignature,
  bpm,
  grandStaff,
}
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/lib/__tests__/notationInlineOps.test.ts`

Expected: todos `ok`.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/notationInlineOps.ts src/lib/__tests__/notationInlineOps.test.ts
git commit -m "feat(notation): write in-place edits into local render_data"
```

---

### Task 5: Fileira de duração + constantes compartilhadas

**Files:**
- Create: `src/lib/notationEditorChrome.ts`
- Create: `src/components/music/NotationDurationStrip.tsx`
- Modify: `src/components/music/NotationEditorV2.tsx` (importar constantes + Strip no lugar da fileira duplicada)

- [ ] **Step 1: Move the option arrays**

De `NotationEditorV2.tsx` linhas 32–106 para `src/lib/notationEditorChrome.ts`, exportados:

- `DURATION_OPTIONS`
- `CLEF_OPTIONS`
- `KEY_SIGNATURE_OPTIONS`
- `TIME_SIGNATURE_OPTIONS`
- `TUPLET_OPTIONS`

V2 importa de lá. Sem mudança visual no modal.

- [ ] **Step 2: Create `NotationDurationStrip`**

Props (todas obrigatórias, sem default mágico de produto):

```ts
export interface NotationDurationStripProps {
  currentDuration: BeatDuration
  currentAccidental: string | null
  dotted: boolean
  doubleDotted: boolean
  onDuration: (d: BeatDuration) => void
  onAccidental: (a: string | null) => void
  onToggleDot: () => void
  onInsertRest: () => void
}
```

JSX: os botões de duração / pausa / ponto / ♯ ♭ copiados de `NotationEditorV2.tsx` 1375–1478. Clique em ♯/♭ já ativo desliga (`null`) — mesmo gesto de “tecla toggle”; se o V2 hoje não desliga, **não** inventar: copiar o onClick atual.

Classes iguais (`h-7 w-7`, `border-accent`). A fileira **não** inclui quiáltera, transpor, undo, play (vão para a lateral).

- [ ] **Step 3: V2 usa a Strip**

Substituir o bloco Durações+Pausa+Ponto+Acidentes no V2 por:

```tsx
<NotationDurationStrip
  currentDuration={currentDuration}
  currentAccidental={currentAccidental}
  dotted={dotted}
  doubleDotted={doubleDotted}
  onDuration={(d) => { setCurrentDuration(d); focusInput() }}
  onAccidental={(a) => { setCurrentAccidental(a); focusInput() }}
  onToggleDot={() => { /* mesmo ciclo dotted → double → off do V2 */ focusInput() }}
  onInsertRest={() => { /* mesmo splice de pausa do V2 */ }}
/>
```

Quiáltera / transpor / undo / play **ficam** no V2 nesta task (Task 6 extrai a lateral). Biblioteca não pode regressar.

- [ ] **Step 4: Conferir o modal ainda monta**

Run: `npx tsc --noEmit`

Expected: exit 0 (ou só erros pré-existentes não introduzidos aqui). Se o V2 quebrar tipo `BeatDuration`, importar de `NotationSvgEditor` como o V2 já faz.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/notationEditorChrome.ts src/components/music/NotationDurationStrip.tsx src/components/music/NotationEditorV2.tsx
git commit -m "feat(notation): share duration strip between modal and in-place"
```

---

### Task 6: Lateral de ferramentas

**Files:**
- Create: `src/components/music/NotationToolsSidebar.tsx`
- Modify: `src/components/music/NotationEditorV2.tsx`

A lateral **não** conhece AlphaTab. Não inclui Categoria / Label (isso é Biblioteca). No Editor, o título do bloco continua no painel de propriedades mínimo (tipo do bloco).

- [ ] **Step 1: Create `NotationToolsSidebar`**

Props:

```ts
export interface NotationToolsSidebarProps {
  timeSignature: string
  clef: string
  keySignature: string
  currentTuplet: string
  bpm: number
  grandStaffMode: boolean
  activeStaff: 'treble' | 'bass'
  canUndo: boolean
  canRedo: boolean
  isPlaying: boolean
  onTimeSignature: (value: string) => void
  onClef: (value: string) => void
  onKeySignature: (value: string) => void
  onTuplet: (value: string) => void
  onBpm: (value: number) => void
  onGrandStaff: () => void
  onFocusStaff: (staff: 'treble' | 'bass') => void
  onTransposeUp: () => void
  onTransposeDown: () => void
  onUndo: () => void
  onRedo: () => void
  onTogglePlay: () => void
}
```

JSX: modo Livre/Compasso, Select de fórmula (só se não `free`), clave, armadura, grande pauta + MD/ME, quiáltera, transpor, undo/redo, play, slider BPM — copiados do V2 (linhas 1246–1553, sem Categoria/Label). Layout **vertical** (`space-y-3`), porque no Editor vive na coluna direita estreita. No V2, envolver num `div` com `flex flex-wrap` se o modal ficar estranho: preferir **dois className** via prop `layout: 'row' | 'column'`. Default `'column'`. V2 passa `layout="row"` para não redesenhar o Dialog.

- [ ] **Step 2: V2 usa a Sidebar no lugar da linha 1 + trecho da toolbar**

O Dialog continua. Só o chrome de ferramentas deixa de estar duplicado.

- [ ] **Step 3: `npx tsc --noEmit`**

Expected: exit 0.

- [ ] **Step 4: Commit**

```powershell
git add src/components/music/NotationToolsSidebar.tsx src/components/music/NotationEditorV2.tsx
git commit -m "feat(notation): extract notation tools sidebar from the modal chrome"
```

---

### Task 7: Overlay só no bloco selecionado

**Files:**
- Modify: `src/components/music/NotationAlphaTabSurface.tsx`
- Modify: `src/components/material/MaterialPreview.tsx`

- [ ] **Step 1: `variant` na Surface**

```ts
variant?: 'modal' | 'canvas'
```

`modal` (default): wrapper atual (`rounded-xl border … bg-white`, width `A4_CANVAS_NOTATION_WIDTH`).

`canvas`: sem borda de Dialog; `className="relative w-full min-w-0"`; `onPointerDown` chama `event.stopPropagation()` para o clique na pauta não re-disparar seleção/hidratação. Continua `includeNoteBounds`. Continua `purpose="canvas-notation-score"` (não criar purpose novo).

- [ ] **Step 2: `MaterialPreview` aceita sessão interativa**

Acrescentar em `MaterialPreviewProps`:

```ts
notationInteractive?: {
  blockId: string
  tex: string
  indexMap: number[]
  selectedBeatIdx: number
  clef: string
  keySignature: string
  timeSignature: string | null
  grandStaffMode: boolean
  onSelectBeat: (idx: number) => void
  onInsertNote: (pitch: string, afterIdx: number) => void
  onReplaceNote: (pitch: string, atIdx: number) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  inputRef?: React.Ref<HTMLInputElement>
} | null
```

Em `BlockNotation`: se `notationInteractive?.blockId === block.id`, renderizar:

1. `NotationDurationStrip` **acima** da pauta (perto da folha, não na coluna direita).
2. `NotationAlphaTabSurface variant="canvas"` com o tex da sessão (não o preview morto).

Senão, preview atual (`AlphaTabViewer` / `NotationPreviewCompat`). Blocos não selecionados **não** passam `includeNoteBounds`.

`BlockNotation` precisa receber a strip callbacks. Para não explodir props, passar o objeto `notationInteractive` inteiro e deixar a Strip no **Editor** (portal/toolbar) **ou** incluir strip props no mesmo objeto:

```ts
durationStrip: NotationDurationStripProps
```

Escolha travada: **Strip dentro de `BlockNotation`**, porque a spec diz “perto da pauta”. O Editor monta `durationStrip` na sessão e manda no `notationInteractive`.

Passar `notationInteractive` de `MaterialPreview` → `BlockNotation`. `CanvasMaterialPreview` em `Editor.tsx` é por bloco: só o bloco cujo `block.id === selectedBlockId` recebe o objeto; os outros recebem `null`.

- [ ] **Step 3: Commit**

```powershell
git add src/components/music/NotationAlphaTabSurface.tsx src/components/material/MaterialPreview.tsx
git commit -m "feat(notation): enable AlphaTab overlay only on the selected A4 block"
```

Ainda não liga o Editor — a Surface no canvas só aparece na Task 8.

---

### Task 8: Ligar o Editor (clique, sessão, save local, lateral, rollback)

**Files:**
- Create: `src/components/music/useNotationInlineSession.ts`
- Modify: `src/pages/Editor.tsx`
- Modify: `src/lib/editorCanvasInteraction.ts`
- Test: `src/lib/__tests__/editorCanvasInteraction.test.ts`

- [ ] **Step 1: Toolbar sem “Editar notação” quando inline on**

Em `getCanvasToolbarActions`:

```ts
export function getCanvasToolbarActions(
  blockType: string,
  options: { notationInline?: boolean } = {},
): CanvasToolbarAction[] {
  const actions: CanvasToolbarAction[] = ['move-up', 'move-down', 'duplicate', 'delete']
  if (canEnterInlineEdit(blockType)) {
    actions.push('edit-inline', 'ai-rewrite')
  } else if ((blockType === 'notation' || blockType === 'rhythm') && options.notationInline !== true) {
    actions.push('edit-notation')
  } else if (blockType === 'tablature') {
    actions.push('edit-tablature')
  }
  // ... resto igual
  return actions
}
```

Teste novo em `editorCanvasInteraction.test.ts`:

```ts
test('notation toolbar hides edit-notation when inline is on', () => {
  assert.ok(!getCanvasToolbarActions('notation', { notationInline: true }).includes('edit-notation'))
  assert.ok(getCanvasToolbarActions('notation', { notationInline: false }).includes('edit-notation'))
})
```

Run: `npx tsx --test src/lib/__tests__/editorCanvasInteraction.test.ts`

Expected: testes antigos + o novo, exit 0.

`ContextualToolbar.tsx` linha 107 hoje faz `getCanvasToolbarActions(blockType)`. Acrescentar prop `notationInline?: boolean` e chamar `getCanvasToolbarActions(blockType, { notationInline })`. O Editor passa `notationInline={isNotationInlineEnabled()}`.

- [ ] **Step 2: Hook da sessão**

`useNotationInlineSession({ block, enabled })`:

- Se `!enabled || !block` → estado vazio, no-ops.
- Quando `block.id` muda: `hydrateNotationFromBlock({ render_data, content, staveIndex: null })`.
- Mantém `beats`, history (50), `selectedBeatIdx`, duration/accidental/dot/tuplet/clef/key/time/bpm/grandStaff.
- `commit(nextBeats)` → `setBeats` + `pushHistory` + devolve `applySessionToRenderData` para o caller escrever no bloco.
- Expõe `handleKeyDown` copiado do V2 (A–G, 1–7, 0, ponto, Ctrl+Z/Y, espaço play). Copiar, não “inspirar”.
- Play: copiar `startPlayback` / `stopPlayback` do V2 (Tone). Sem export MIDI.

O hook **não** chama RPC. Retorna `patchRenderData: Record<string, any> | null` atualizado a cada commit (useMemo de `applySessionToRenderData`).

- [ ] **Step 3: Editor — não abrir modal no caminho principal**

Em `openPrimaryCanvasActionForBlock` (`Editor.tsx` ~6113):

```ts
else if (block.block_type === 'notation' || blockHasNotation(block)) {
  if (isNotationInlineEnabled()) {
    setSelectedBlockId(block.id)
    return
  }
  openNotationEditorForBlock(block.id)
}
```

Botões “Editar Notação” da coluna direita (~8194 e ~8486): renderizar **só** se `!isNotationInlineEnabled()`.

`onEditNotation` da ContextualToolbar: só existe no rollback.

- [ ] **Step 4: Editor — escrever `render_data` local**

```ts
useEffect(() => {
  if (!isNotationInlineEnabled()) return
  if (!selectedBlock || selectedBlock.block_type !== 'notation') return
  const patch = inlineSession.patchRenderData
  if (!patch) return
  setBlocksWithHistory((prev) => prev.map((b) => (
    b.id === selectedBlock.id ? { ...b, render_data: patch } : b
  )))
}, [inlineSession.patchRenderData, selectedBlock?.id])
```

Cuidado com loop: `applySessionToRenderData` precisa ser estável (mesma serialização se beats não mudaram). Se o effect disparar à toa, comparar `JSON.stringify(patch.notation_data)` com o atual antes de `setBlocksWithHistory`.

**Não** chamar `updateMaterialBlockRpc` aqui. O Salvar do material já persiste os blocos.

- [ ] **Step 5: Editor — lateral**

Quando `isNotationInlineEnabled() && selectedBlock?.block_type === 'notation'`, o conteúdo de `PropertiesSidebar` (o ramo `selectedBlock` ~8170) **começa** com `NotationToolsSidebar` ligado à sessão. Abaixo: tipo do bloco (somente leitura). **Não** mostrar configuração de página nesse ramo — ela já é o ramo `!selectedBlock` (~8100). Ao deselecionar, a página volta.

- [ ] **Step 6: Editor — passar `notationInteractive` no `CanvasMaterialPreview`**

Só quando inline on e `block.id === selectedBlockId` e `block_type === 'notation'`. Tex / indexMap da sessão, não do preview antigo.

- [ ] **Step 7: Commit**

```powershell
git add src/components/music/useNotationInlineSession.ts src/pages/Editor.tsx src/lib/editorCanvasInteraction.ts src/lib/__tests__/editorCanvasInteraction.test.ts src/components/editor/ContextualToolbar.tsx src/components/material/MaterialPreview.tsx
git commit -m "feat(notation): write on the A4 staff instead of opening the modal"
```

---

### Task 9: Conferência no browser + mapa

Não basta build.

- [ ] **Step 1: Dev server**

Worktree: `http://localhost:3002` (já é o Simple Browser do Luciano). Se a porta mudou, usar a que o Vite imprimir. Não testar produção Vercel neste corte.

- [ ] **Step 2: Critério de pronto (spec)**

1. Abrir Intervalos Melódicos — Série 1. Clicar na pauta: **não** abre “Editar Notação”.
2. A partitura na A4 tem **todos** os sistemas, não duas notas.
3. Lateral direita: clave / modo / play. Fileira de duração **acima da pauta**.
4. Com o bloco já selecionado, inserir uma nota (clique na pauta ou A–G). A A4 mostra a nota sem fechar nada.
5. Salvar no topo, recarregar: a nota continua.
6. Biblioteca → Notação: o modal `NotationEditorV2` abre igual.
7. `http://localhost:3002/editor/<id>?notationInline=off`: clique na pauta **não** entra em escrita in-place; “Editar notação” volta.

Se o passo 5 falhar porque Salvar não manda `render_data` de bloco dirty: seguir o mesmo caminho que o texto inline já usa (o bloco já está em `blocks` com `render_data` novo). Não inventar RPC paralelo.

- [ ] **Step 3: Atualizar o mapa**

Em `.agent/development-map.md`:

- Mover o corte in-place para **Feito** (data 15/08 ou o dia do browser).
- **Próximo corte:** item 1 do Radar (mapas de acorde e cifra na pauta) — não inventar outro.
- Agora: Simple Browser 3002; Biblioteca modal continua; rollback `?notationInline=off`.
- Link do plano: `docs/superpowers/plans/2026-08-15-notacao-inplace-a4.md`

- [ ] **Step 4: Commit do mapa**

```powershell
git add .agent/development-map.md
git commit -m "docs: mark in-place A4 notation as done after browser check"
```

Só este commit **depois** do browser. Se o browser falhar, não marcar Feito.

---

## Self-review (spec → task)

| Spec | Task |
|---|---|
| Clique na A4 escreve; sem modal no caminho principal | 8 |
| Biblioteca modal continua | 8 (não mexer Biblioteca) + 9.6 |
| AlphaTab, modelo `beats` | 3, 7 |
| Overlay no AlphaTab **do bloco**; sem segundo AlphaTab na lateral | 6, 7 |
| Duração/acidente perto da pauta | 5, 7 |
| Resto na lateral direita | 6, 8 |
| Só ferramentas do modal | 5–8; MIDI/categoria fora |
| Save = `render_data` local + Salvar material | 4, 8 |
| Partitura inteira | 0, 2 |
| Tablatura / PDF fora | file map |
| Rollback `?notationInline=off` | 1, 8, 9.7 |
| Hit-test só no selecionado | 7 |
| Caderninho visual no mesmo PR | 0 |
| Gesto do primeiro clique | seção no topo + Task 8 passo 3 |

Radar (cifra-mapa, apostila, ligadura, folha deitada, playhead, tom/capo): nenhuma task.
