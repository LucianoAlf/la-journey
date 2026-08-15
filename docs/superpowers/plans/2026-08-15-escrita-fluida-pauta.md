# Escrita fluida na pauta A4 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Escrever notação in-place na folha A4 com a fluidez de MuseScore/Sibelius: teclado completo, feedback triplo (destaque + nota-fantasma + som), fileira redesenhada, gravura didática e render sem travar.

**Architecture:** O estado continua no `useNotationInlineSession` (beats → AlphaTex → AlphaTab). Três frentes: (1) teclado vira lib pura (`notationInlineKeyboard`) que devolve ações; (2) o `AlphaTabViewer` ganha re-render silencioso com fila de coalescing (`TexRenderQueue`); (3) o `NotationAlphaTabSurface` ganha overlays HTML (destaque da seleção via `boundsLookup`, nota-fantasma via `staffYFromPitch` inverso). O patch de `render_data` no Editor passa a ser debounced com flush no save.

**Tech Stack:** React 18, TypeScript, @coderline/alphatab, Tone.js, Tailwind. Testes: arquivos auto-executáveis rodados com `npx tsx`.

**Working directory:** `D:\la-journey\.worktrees\notacao-alphatab-folha` (branch `feat/notacao-caderninho`). Todos os paths abaixo são relativos a essa raiz. Spec: `D:\la-journey\docs\superpowers\specs\2026-08-15-escrita-fluida-pauta-design.md`.

---

### Task 1: TexRenderQueue — fila de coalescing pura

Rajada de teclas não pode empilhar renders do AlphaTab. Fila de 1 posição: se um render está em andamento, guarda só o último tex e manda quando o atual terminar.

**Files:**
- Create: `src/lib/texRenderQueue.ts`
- Test: `src/lib/__tests__/texRenderQueue.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/texRenderQueue.test.ts
import { TexRenderQueue } from '../texRenderQueue.ts'

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

test('first request sends immediately', () => {
  const sent: string[] = []
  const queue = new TexRenderQueue(tex => sent.push(tex))
  queue.request('a')
  assert(sent.length === 1 && sent[0] === 'a', 'sends first tex')
  assert(queue.isBusy, 'busy while rendering')
})

test('requests during render coalesce to the last one', () => {
  const sent: string[] = []
  const queue = new TexRenderQueue(tex => sent.push(tex))
  queue.request('a')
  queue.request('b')
  queue.request('c')
  queue.request('d')
  assert(sent.length === 1, 'intermediate texts are not sent')
  queue.finished()
  assert(sent.length === 2 && sent[1] === 'd', 'only the final state renders')
  assert(queue.isBusy, 'busy again for the pending render')
  queue.finished()
  assert(!queue.isBusy, 'idle after the pending render finishes')
})

test('finished with no pending goes idle', () => {
  const sent: string[] = []
  const queue = new TexRenderQueue(tex => sent.push(tex))
  queue.request('a')
  queue.finished()
  assert(!queue.isBusy, 'idle')
  queue.request('b')
  assert(sent.length === 2 && sent[1] === 'b', 'next request sends directly')
})

test('failed clears busy and pending', () => {
  const sent: string[] = []
  const queue = new TexRenderQueue(tex => sent.push(tex))
  queue.request('a')
  queue.request('b')
  queue.failed()
  assert(!queue.isBusy, 'idle after failure')
  queue.request('c')
  assert(sent[sent.length - 1] === 'c', 'pending was discarded, new request sends')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/lib/__tests__/texRenderQueue.test.ts`
Expected: FAIL — `Cannot find module '../texRenderQueue.ts'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/texRenderQueue.ts
export class TexRenderQueue {
  private busy = false
  private pending: string | null = null

  constructor(private readonly send: (tex: string) => void) {}

  request(tex: string) {
    if (this.busy) {
      this.pending = tex
      return
    }
    this.busy = true
    this.send(tex)
  }

  finished() {
    this.busy = false
    const pending = this.pending
    this.pending = null
    if (pending !== null) {
      this.busy = true
      this.send(pending)
    }
  }

  failed() {
    this.busy = false
    this.pending = null
  }

  get isBusy() {
    return this.busy
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/lib/__tests__/texRenderQueue.test.ts`
Expected: 4x `ok - ...`

- [ ] **Step 5: Commit**

```bash
git add src/lib/texRenderQueue.ts src/lib/__tests__/texRenderQueue.test.ts
git commit -m "feat: TexRenderQueue para coalescing de renders do AlphaTab"
```

---

### Task 2: AlphaTabViewer — re-render silencioso + coalescing

Hoje cada mudança de tex liga `setLoading(true)` → spinner com `bg-card/80` cobre a pauta a cada tecla. Mudança: spinner só no primeiro render de cada montagem; updates mantêm o frame anterior visível; renders em rajada passam pela `TexRenderQueue`.

**Files:**
- Modify: `src/components/music/AlphaTabViewer.tsx`

- [ ] **Step 1: Add refs and queue wiring**

No topo do componente (junto aos outros refs, após `renderTexRef`):

```ts
    const hasRenderedOnceRef = useRef(false)
    const texQueueRef = useRef<TexRenderQueue | null>(null)
```

Import no topo do arquivo:

```ts
import { TexRenderQueue } from '@/lib/texRenderQueue'
```

- [ ] **Step 2: Create the queue in the mount effect**

No `useEffect` principal (o que depende de `[configKey]`), logo depois de `apiRef.current = api`:

```ts
      hasRenderedOnceRef.current = false
      const texQueue = new TexRenderQueue(nextTex => api.tex(nextTex))
      texQueueRef.current = texQueue
```

- [ ] **Step 3: Route all api.tex calls through the queue**

Substituir as três chamadas diretas dentro do mount effect:

1. No `resizeObserver` (onde hoje é `if (nextTex) api.tex(nextTex)`):

```ts
            const nextTex = renderTexRef.current
            if (nextTex) texQueue.request(nextTex)
```

2. No render inicial (onde hoje é `api.tex(renderTex)` dentro do `if (renderTex)`):

```ts
        texQueue.request(renderTex)
```

3. No `postRenderFinished` — dentro do `requestAnimationFrame`, depois de `setPhase('ready')`, acrescentar:

```ts
          hasRenderedOnceRef.current = true
          texQueue.finished()
```

4. No handler `api.error.on`, acrescentar antes do `setPhase('error')`:

```ts
        texQueue.failed()
```

- [ ] **Step 4: Make tex updates silent after the first render**

Substituir o segundo `useEffect` (o que depende de `[renderTex]`) por:

```ts
    useEffect(() => {
      if (configKeyRef.current !== configKey) return
      const api = apiRef.current
      const texQueue = texQueueRef.current
      if (!api || !texQueue || !renderTex) return

      setError(null)
      if (!hasRenderedOnceRef.current) {
        setLoading(true)
        setPhase('loading')
      } else {
        setPhase('rendering')
      }
      texQueue.request(renderTex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [renderTex])
```

- [ ] **Step 5: Verify nothing else calls api.tex directly**

Run: `rg -n "api.tex\(" src/components/music/AlphaTabViewer.tsx`
Expected: só a arrow function dentro do construtor da `TexRenderQueue`.

- [ ] **Step 6: Lint/type check and commit**

Run: `npx tsc --noEmit -p tsconfig.json` (aceitar apenas erros pré-existentes fora dos arquivos tocados; os arquivos tocados não podem ter erro novo)

```bash
git add src/components/music/AlphaTabViewer.tsx
git commit -m "feat: re-render silencioso e coalescing no AlphaTabViewer"
```

---

### Task 3: Lib pura do teclado — notationInlineKeyboard

Mapa completo da spec numa função pura: evento → ação. O hook só executa a ação.

**Files:**
- Create: `src/lib/notationInlineKeyboard.ts`
- Test: `src/lib/__tests__/notationInlineKeyboard.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/notationInlineKeyboard.test.ts
import { resolveNotationKeyAction } from '../notationInlineKeyboard.ts'

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

const noSelection = { hasSelection: false }
const withSelection = { hasSelection: true }

test('letters insert notes', () => {
  const action = resolveNotationKeyAction({ key: 'c' }, noSelection)
  assert(action?.type === 'insert-note' && action.note === 'C', 'c inserts C')
})

test('shift+letter adds to chord only with selection', () => {
  const chord = resolveNotationKeyAction({ key: 'B', shiftKey: true }, withSelection)
  assert(chord?.type === 'add-chord-note' && chord.note === 'B', 'Shift+B builds chord')
  assert(resolveNotationKeyAction({ key: 'B', shiftKey: true }, noSelection) === null, 'no-op without selection')
})

test('digits 1-7 set duration (numpad sends the same key)', () => {
  const quarter = resolveNotationKeyAction({ key: '5' }, noSelection)
  assert(quarter?.type === 'set-duration' && quarter.duration === 'q', '5 = seminima')
  const whole = resolveNotationKeyAction({ key: '7' }, noSelection)
  assert(whole?.type === 'set-duration' && whole.duration === 'w', '7 = semibreve')
})

test('dot toggles with . and , (numpad ABNT)', () => {
  assert(resolveNotationKeyAction({ key: '.' }, noSelection)?.type === 'toggle-dot', 'period')
  assert(resolveNotationKeyAction({ key: ',' }, noSelection)?.type === 'toggle-dot', 'comma')
})

test('0 inserts rest, space toggles play', () => {
  assert(resolveNotationKeyAction({ key: '0' }, noSelection)?.type === 'insert-rest', 'rest')
  assert(resolveNotationKeyAction({ key: ' ' }, noSelection)?.type === 'toggle-play', 'play')
})

test('accidentals: # sharp, - flat, = natural', () => {
  const sharp = resolveNotationKeyAction({ key: '#' }, noSelection)
  assert(sharp?.type === 'set-accidental' && sharp.accidental === '#', 'sharp')
  const flat = resolveNotationKeyAction({ key: '-' }, noSelection)
  assert(flat?.type === 'set-accidental' && flat.accidental === 'b', 'flat')
  const natural = resolveNotationKeyAction({ key: '=' }, noSelection)
  assert(natural?.type === 'set-accidental' && natural.accidental === 'n', 'natural')
})

test('arrows navigate and transpose', () => {
  const left = resolveNotationKeyAction({ key: 'ArrowLeft' }, withSelection)
  assert(left?.type === 'navigate' && left.delta === -1, 'left')
  const right = resolveNotationKeyAction({ key: 'ArrowRight' }, withSelection)
  assert(right?.type === 'navigate' && right.delta === 1, 'right')
  const up = resolveNotationKeyAction({ key: 'ArrowUp' }, withSelection)
  assert(up?.type === 'transpose' && up.direction === 1 && up.octave === false, 'up = diatonic')
  const octaveDown = resolveNotationKeyAction({ key: 'ArrowDown', ctrlKey: true }, withSelection)
  assert(octaveDown?.type === 'transpose' && octaveDown.direction === -1 && octaveDown.octave === true, 'ctrl+down = octave')
})

test('r repeats last note', () => {
  assert(resolveNotationKeyAction({ key: 'r' }, noSelection)?.type === 'repeat-last-note', 'repeat')
})

test('delete and backspace', () => {
  const del = resolveNotationKeyAction({ key: 'Delete' }, withSelection)
  assert(del?.type === 'delete-beat' && del.backspace === false, 'delete')
  const back = resolveNotationKeyAction({ key: 'Backspace' }, withSelection)
  assert(back?.type === 'delete-beat' && back.backspace === true, 'backspace')
})

test('undo/redo with ctrl or meta', () => {
  assert(resolveNotationKeyAction({ key: 'z', ctrlKey: true }, noSelection)?.type === 'undo', 'ctrl+z')
  assert(resolveNotationKeyAction({ key: 'y', metaKey: true }, noSelection)?.type === 'redo', 'meta+y')
})

test('escape releases selection, bubbles when nothing selected', () => {
  assert(resolveNotationKeyAction({ key: 'Escape' }, withSelection)?.type === 'release-selection', 'esc releases')
  assert(resolveNotationKeyAction({ key: 'Escape' }, noSelection) === null, 'esc bubbles')
})

test('unhandled keys return null', () => {
  assert(resolveNotationKeyAction({ key: 'x' }, noSelection) === null, 'x')
  assert(resolveNotationKeyAction({ key: 'F1' }, noSelection) === null, 'F1')
  assert(resolveNotationKeyAction({ key: 'c', ctrlKey: true }, noSelection) === null, 'ctrl+c stays free')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/lib/__tests__/notationInlineKeyboard.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/notationInlineKeyboard.ts
export type NotationNoteName = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type NotationKeyDuration = '64' | '32' | '16' | '8' | 'q' | 'h' | 'w'

export interface NotationKeyEvent {
  key: string
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}

export interface NotationKeyContext {
  hasSelection: boolean
}

export type NotationKeyAction =
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'set-duration'; duration: NotationKeyDuration }
  | { type: 'toggle-dot' }
  | { type: 'insert-rest' }
  | { type: 'toggle-play' }
  | { type: 'insert-note'; note: NotationNoteName }
  | { type: 'add-chord-note'; note: NotationNoteName }
  | { type: 'navigate'; delta: -1 | 1 }
  | { type: 'transpose'; direction: -1 | 1; octave: boolean }
  | { type: 'repeat-last-note' }
  | { type: 'delete-beat'; backspace: boolean }
  | { type: 'set-accidental'; accidental: '#' | 'b' | 'n' }
  | { type: 'release-selection' }

const NOTE_LETTERS: readonly string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const DURATIONS: NotationKeyDuration[] = ['64', '32', '16', '8', 'q', 'h', 'w']

export function resolveNotationKeyAction(
  event: NotationKeyEvent,
  context: NotationKeyContext,
): NotationKeyAction | null {
  const { key } = event
  const ctrl = Boolean(event.ctrlKey || event.metaKey)

  if (ctrl && (key === 'z' || key === 'Z')) return { type: 'undo' }
  if (ctrl && (key === 'y' || key === 'Y')) return { type: 'redo' }

  if (key === 'ArrowLeft') return { type: 'navigate', delta: -1 }
  if (key === 'ArrowRight') return { type: 'navigate', delta: 1 }
  if (key === 'ArrowUp') return { type: 'transpose', direction: 1, octave: ctrl }
  if (key === 'ArrowDown') return { type: 'transpose', direction: -1, octave: ctrl }

  if (ctrl || event.altKey) return null

  const durationIdx = '1234567'.indexOf(key)
  if (durationIdx >= 0) return { type: 'set-duration', duration: DURATIONS[durationIdx] }

  if (key === '.' || key === ',') return { type: 'toggle-dot' }
  if (key === '0') return { type: 'insert-rest' }
  if (key === ' ') return { type: 'toggle-play' }
  if (key === '#') return { type: 'set-accidental', accidental: '#' }
  if (key === '-') return { type: 'set-accidental', accidental: 'b' }
  if (key === '=') return { type: 'set-accidental', accidental: 'n' }
  if (key === 'r' || key === 'R') return { type: 'repeat-last-note' }
  if (key === 'Delete') return { type: 'delete-beat', backspace: false }
  if (key === 'Backspace') return { type: 'delete-beat', backspace: true }
  if (key === 'Escape') return context.hasSelection ? { type: 'release-selection' } : null

  const letter = key.length === 1 ? key.toUpperCase() : ''
  if (NOTE_LETTERS.includes(letter)) {
    const note = letter as NotationNoteName
    if (event.shiftKey) return context.hasSelection ? { type: 'add-chord-note', note } : null
    return { type: 'insert-note', note }
  }

  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/lib/__tests__/notationInlineKeyboard.test.ts`
Expected: 12x `ok - ...`

- [ ] **Step 5: Commit**

```bash
git add src/lib/notationInlineKeyboard.ts src/lib/__tests__/notationInlineKeyboard.test.ts
git commit -m "feat: mapa de teclado completo da pauta em lib pura"
```

---

### Task 4: notationStaffPitch — inverso do pitch e linhas suplementares

A nota-fantasma precisa converter pitch → posição Y (inverso de `pitchFromStaffY`) e saber onde desenhar linhas suplementares.

**Files:**
- Modify: `src/lib/notationStaffPitch.ts`
- Test: `src/lib/__tests__/notationStaffPitch.test.ts` (acrescentar casos)

- [ ] **Step 1: Add failing tests**

Acrescentar ao final de `src/lib/__tests__/notationStaffPitch.test.ts`:

```ts
import { ledgerLineYs, staffYFromPitch } from '../notationStaffPitch.ts'

test('staffYFromPitch is the inverse of pitchFromStaffY', () => {
  const half = (BOTTOM - TOP) / 8
  for (let step = -4; step <= 12; step += 1) {
    const y = TOP + step * half
    const pitch = pitchFromStaffY(y, TOP, BOTTOM, 'treble')
    assert(staffYFromPitch(pitch, TOP, BOTTOM, 'treble') === y, `roundtrip step ${step}`)
  }
})

test('staffYFromPitch ignores accidentals', () => {
  const natural = staffYFromPitch('C/4', TOP, BOTTOM, 'treble')
  assert(staffYFromPitch('C#/4', TOP, BOTTOM, 'treble') === natural, 'sharp same line')
})

test('no ledger lines inside the staff', () => {
  assert(ledgerLineYs(TOP + 4, TOP, BOTTOM).length === 0, 'inside staff')
})

test('C4 below treble staff gets one ledger line at its own Y', () => {
  const half = (BOTTOM - TOP) / 8
  const c4 = staffYFromPitch('C/4', TOP, BOTTOM, 'treble')
  const lines = ledgerLineYs(c4, TOP, BOTTOM)
  assert(lines.length === 1, 'one line')
  assert(lines[0] === BOTTOM + 2 * half, 'at C4 line')
})

test('high note above staff gets stacked ledger lines', () => {
  const half = (BOTTOM - TOP) / 8
  const c6 = staffYFromPitch('C/6', TOP, BOTTOM, 'treble')
  const lines = ledgerLineYs(c6, TOP, BOTTOM)
  assert(lines.length === 2, 'A5 and C6 lines')
  assert(lines.includes(TOP - 2 * half) && lines.includes(TOP - 4 * half), 'positions')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/lib/__tests__/notationStaffPitch.test.ts`
Expected: FAIL — `staffYFromPitch` não exportado

- [ ] **Step 3: Implement in notationStaffPitch.ts**

Acrescentar ao final de `src/lib/notationStaffPitch.ts`:

```ts
export function staffYFromPitch(
  pitch: string,
  staffTop: number,
  staffBottom: number,
  clef: 'treble' | 'bass',
): number {
  const match = pitch.match(/^([A-G])[#bn]?\/(\d+)$/)
  if (!match) return staffTop
  const span = staffBottom - staffTop
  const half = span === 0 ? 1 : span / 8
  const top = CLEF_TOP[clef]
  const nameIdx = NOTE_NAMES.indexOf(match[1] as (typeof NOTE_NAMES)[number])
  const octave = Number(match[2])
  const steps = (top.octave - octave) * 7 + (top.nameIdx - nameIdx)
  return staffTop + steps * half
}

export function ledgerLineYs(noteY: number, staffTop: number, staffBottom: number): number[] {
  const span = staffBottom - staffTop
  const lineGap = span === 0 ? 2 : span / 4
  const ys: number[] = []
  for (let y = staffTop - lineGap; y >= noteY - lineGap / 4; y -= lineGap) ys.push(y)
  for (let y = staffBottom + lineGap; y <= noteY + lineGap / 4; y += lineGap) ys.push(y)
  return ys
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/lib/__tests__/notationStaffPitch.test.ts`
Expected: todos `ok - ...` (antigos + 5 novos)

- [ ] **Step 5: Commit**

```bash
git add src/lib/notationStaffPitch.ts src/lib/__tests__/notationStaffPitch.test.ts
git commit -m "feat: staffYFromPitch e ledgerLineYs para a nota-fantasma"
```

---

### Task 5: Som de escrita — notationInlineAudio

Nota curta no keydown, antes do render. Synth único, lazy, volume baixo. Sem teste automatizado (WebAudio; validação manual na Task 11).

**Files:**
- Create: `src/lib/notationInlineAudio.ts`

- [ ] **Step 1: Write the module**

```ts
// src/lib/notationInlineAudio.ts
import * as Tone from 'tone'

let synth: Tone.PolySynth | null = null

/** Nota curta de confirmação ao escrever/selecionar. Fire-and-forget. */
export async function playNotePreview(pitches: string[]) {
  if (pitches.length === 0) return
  try {
    await Tone.start()
    if (!synth) {
      synth = new Tone.PolySynth(Tone.Synth, { volume: -10 }).toDestination()
    }
    synth.triggerAttackRelease(pitches.map(pitch => pitch.replace('/', '')), 0.18, Tone.immediate())
  } catch {
    // Sem áudio disponível — a escrita continua muda, nunca quebra.
  }
}
```

(`Tone.immediate()` é obrigatório: sem ele o lookAhead padrão de 0.1 s do Tone agenda a nota ~100 ms depois do keydown, estourando o critério de ≤20 ms da spec.)

- [ ] **Step 2: Type check and commit**

Run: `npx tsc --noEmit -p tsconfig.json` (sem erro novo nos arquivos tocados)

```bash
git add src/lib/notationInlineAudio.ts
git commit -m "feat: som de confirmacao ao escrever na pauta"
```

---

### Task 6: useNotationInlineSession — ações novas, foco garantido, som e indicador

O hook passa a executar as ações da lib de teclado, ganha navegação/transposição/acorde/repetição, foca o input na hidratação e monta o indicador vivo da fileira.

**Files:**
- Modify: `src/components/music/useNotationInlineSession.ts`
- Modify: `src/components/music/NotationDurationStrip.tsx` (só a interface de props; o visual é a Task 7)

- [ ] **Step 1: Add imports**

Junto aos imports existentes:

```ts
import { DURATION_OPTIONS } from '@/lib/notationEditorChrome'
import { resolveNotationKeyAction } from '@/lib/notationInlineKeyboard'
import { playNotePreview } from '@/lib/notationInlineAudio'
```

- [ ] **Step 2: Add helper functions (module level, junto a getSmartOctave)**

```ts
function durationLabel(duration: InlineBeat['duration']): string {
  return DURATION_OPTIONS.find(option => option.value === duration)?.label ?? ''
}

function formatPitchLabel(pitches: InlineBeat['pitches']): string {
  return pitches.map(({ pitch, accidental }) => {
    const [note, octave] = pitch.split('/')
    const symbol = accidental === '#' ? '♯' : accidental === 'b' ? '♭' : accidental === 'n' ? '♮' : ''
    return `${note}${symbol}${octave}`
  }).join(' ')
}
```

- [ ] **Step 3: Focus input when the session hydrates**

Depois do `useEffect` de hidratação (o que depende de `[block?.id, enabled]`):

```ts
  useEffect(() => {
    if (!hydratedBlockId) return
    focusInput()
  }, [focusInput, hydratedBlockId])
```

- [ ] **Step 4: Play sound on select/insert/replace**

Em `onSelectBeat`, dentro do `if (beat && !beat.isRest && beat.pitches[0])`, acrescentar:

```ts
    if (beat && !beat.isRest && beat.pitches[0]) {
      lastPitchRef.current = beat.pitches[0].pitch
      void playNotePreview(beat.pitches.map(({ pitch }) => pitch))
    }
```

Em `onInsertNote`, após `lastPitchRef.current = pitch`:

```ts
    void playNotePreview([pitch])
```

Em `onReplaceNote`, após `lastPitchRef.current = pitch`:

```ts
    void playNotePreview([pitch])
```

- [ ] **Step 5: Add the new session actions (depois de `updateBeat`)**

```ts
  const navigateSelection = useCallback((delta: -1 | 1) => {
    if (beats.length === 0) return
    const next = selectedBeatIdx < 0
      ? (delta > 0 ? 0 : beats.length - 1)
      : Math.min(beats.length - 1, Math.max(0, selectedBeatIdx + delta))
    setSelectedBeatIdx(next)
    const beat = beats[next]
    if (beat?.staff) setActiveStaff(beat.staff)
    if (beat && !beat.isRest && beat.pitches[0]) {
      lastPitchRef.current = beat.pitches[0].pitch
      void playNotePreview(beat.pitches.map(({ pitch }) => pitch))
    }
    focusInput()
  }, [beats, focusInput, selectedBeatIdx])

  const transposeSelected = useCallback((direction: -1 | 1, octave: boolean) => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    const beat = beats[selectedBeatIdx]
    if (beat.isRest || beat.pitches.length === 0) return
    const nextPitches = beat.pitches.map(pitchData => {
      const [notePart, octaveText] = pitchData.pitch.split('/')
      let octaveValue = parseInt(octaveText, 10)
      let noteIdx = NOTE_NAMES.indexOf(notePart.charAt(0).toUpperCase())
      if (octave) {
        octaveValue += direction
      } else {
        noteIdx += direction
        if (noteIdx > 6) { noteIdx = 0; octaveValue += 1 }
        if (noteIdx < 0) { noteIdx = 6; octaveValue -= 1 }
      }
      return { ...pitchData, pitch: `${NOTE_NAMES[noteIdx]}/${octaveValue}` }
    })
    updateBeat(selectedBeatIdx, { pitches: nextPitches })
    lastPitchRef.current = nextPitches[0].pitch
    void playNotePreview(nextPitches.map(({ pitch }) => pitch))
  }, [beats, selectedBeatIdx, updateBeat])

  const addChordNote = useCallback((note: string) => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    const beat = beats[selectedBeatIdx]
    if (beat.isRest) return
    const inputClef = grandStaff && activeStaff === 'bass' ? 'bass' : clef
    const pitch = `${note}/${getSmartOctave(note, lastPitchRef.current, inputClef)}`
    const nextPitches = [...beat.pitches, { pitch, accidental: currentAccidental || undefined }]
    updateBeat(selectedBeatIdx, { pitches: nextPitches })
    lastPitchRef.current = pitch
    void playNotePreview(nextPitches.map(({ pitch: chordPitch }) => chordPitch))
  }, [activeStaff, beats, clef, currentAccidental, grandStaff, selectedBeatIdx, updateBeat])

  const insertNoteByName = useCallback((note: string) => {
    const inputClef = grandStaff && activeStaff === 'bass' ? 'bass' : clef
    const pitch = `${note}/${getSmartOctave(note, lastPitchRef.current, inputClef)}`
    onInsertNote(pitch, selectedBeatIdx >= 0 ? selectedBeatIdx : beats.length - 1)
  }, [activeStaff, beats.length, clef, grandStaff, onInsertNote, selectedBeatIdx])

  const repeatLastNote = useCallback(() => {
    const pitch = lastPitchRef.current
    if (!pitch) return
    onInsertNote(pitch, selectedBeatIdx >= 0 ? selectedBeatIdx : beats.length - 1)
  }, [beats.length, onInsertNote, selectedBeatIdx])
```

- [ ] **Step 6: Replace handleKeyDown entirely**

Substituir o `handleKeyDown` atual (o bloco `useCallback` inteiro que trata `ctrl+z`, `1234567`, `.`, `0`, espaço, notas, Delete, `#`, `=`, `Shift+b`) por:

```ts
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    const action = resolveNotationKeyAction(event, { hasSelection: selectedBeatIdx >= 0 })
    if (!action) return
    consumeNotationKey(event)
    switch (action.type) {
      case 'undo': undo(); break
      case 'redo': redo(); break
      case 'set-duration':
        setCurrentDuration(action.duration)
        if (selectedBeatIdx >= 0) updateBeat(selectedBeatIdx, { duration: action.duration })
        break
      case 'toggle-dot': toggleDot(); break
      case 'insert-rest': onInsertRest(); break
      case 'toggle-play':
        if (isPlaying) stopPlayback()
        else void startPlayback()
        break
      case 'insert-note': insertNoteByName(action.note); break
      case 'add-chord-note': addChordNote(action.note); break
      case 'navigate': navigateSelection(action.delta); break
      case 'transpose': transposeSelected(action.direction, action.octave); break
      case 'repeat-last-note': repeatLastNote(); break
      case 'delete-beat':
        if (selectedBeatIdx >= 0) onDeleteBeat(selectedBeatIdx)
        break
      case 'set-accidental':
        setCurrentAccidental(value => value === action.accidental ? null : action.accidental)
        break
      case 'release-selection': setSelectedBeatIdx(-1); break
    }
  }, [addChordNote, insertNoteByName, isPlaying, navigateSelection, onDeleteBeat, onInsertRest, redo, repeatLastNote, selectedBeatIdx, startPlayback, stopPlayback, toggleDot, transposeSelected, undo, updateBeat])
```

- [ ] **Step 7: Extend the strip props interface (type only)**

Em `src/components/music/NotationDurationStrip.tsx`, acrescentar ao final de `NotationDurationStripProps` (a Task 7 reescreve o componente e já inclui isto — se a Task 7 já rodou, pular):

```ts
  /** Indicador vivo: nota/pausa selecionada e posição. null = nada selecionado. */
  selectedInfo?: { label: string; position: string } | null
  onNavigate?: (delta: -1 | 1) => void
```

- [ ] **Step 8: Extend the durationStrip object**

Substituir a construção de `durationStrip` por:

```ts
  const selectedBeat = selectedBeatIdx >= 0 && selectedBeatIdx < beats.length ? beats[selectedBeatIdx] : null
  const durationStrip: NotationDurationStripProps = {
    currentDuration, currentAccidental, dotted, doubleDotted,
    selectedInfo: selectedBeat
      ? {
          label: selectedBeat.isRest
            ? `Pausa · ${durationLabel(selectedBeat.duration)}`
            : `${formatPitchLabel(selectedBeat.pitches)} · ${durationLabel(selectedBeat.duration)}`,
          position: `${selectedBeatIdx + 1}/${beats.length}`,
        }
      : null,
    onNavigate: navigateSelection,
    onDuration: duration => { setCurrentDuration(duration); focusInput() },
    onAccidental: accidental => { setCurrentAccidental(accidental); focusInput() },
    onToggleDot: toggleDot,
    onInsertRest,
  }
```

- [ ] **Step 9: Remove the old transposePitch helper if now unused**

Run: `rg -n "transposePitch" src/components/music/useNotationInlineSession.ts`
Se só a definição sobrar, apagar a função.

- [ ] **Step 10: Type check and commit**

Run: `npx tsc --noEmit -p tsconfig.json` (sem erro novo nos arquivos tocados)

```bash
git add src/components/music/useNotationInlineSession.ts src/components/music/NotationDurationStrip.tsx
git commit -m "feat: teclado completo, foco garantido e som na sessao in-place"
```

---

### Task 7: NotationDurationStrip — fileira em três grupos + indicador vivo

A fileira vira uma barra de largura total: durações | pausa/ponto/acidentes | indicador vivo com navegação. O V2 usa a mesma fileira e continua funcionando (props novos são opcionais).

**Files:**
- Modify: `src/components/music/NotationDurationStrip.tsx` (reescrita)
- Modify: `src/components/material/MaterialPreview.tsx` (wrapper da fileira)

- [ ] **Step 1: Rewrite the strip**

Substituir o conteúdo inteiro de `src/components/music/NotationDurationStrip.tsx`:

```tsx
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import type { BeatDuration } from './NotationSvgEditor'
import { DURATION_OPTIONS } from '@/lib/notationEditorChrome'

export interface NotationDurationStripProps {
  currentDuration: BeatDuration
  currentAccidental: string | null
  dotted: boolean
  doubleDotted: boolean
  onDuration: (d: BeatDuration) => void
  onAccidental: (a: string | null) => void
  onToggleDot: () => void
  onInsertRest: () => void
  /** Indicador vivo: nota/pausa selecionada e posição. null = nada selecionado. */
  selectedInfo?: { label: string; position: string } | null
  onNavigate?: (delta: -1 | 1) => void
}

const BASE_BUTTON = 'inline-flex items-center justify-center h-9 w-9 rounded-md border text-[17px] transition-colors'
const IDLE_BUTTON = 'border-border text-text3 hover:border-accent/50 hover:text-accent'
const ACTIVE_BUTTON = 'border-accent bg-accent text-white'

export function NotationDurationStrip({
  currentDuration,
  currentAccidental,
  dotted,
  doubleDotted,
  onDuration,
  onAccidental,
  onToggleDot,
  onInsertRest,
  selectedInfo,
  onNavigate,
}: NotationDurationStripProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2 py-1.5">
      <div className="flex items-center gap-1">
        {DURATION_OPTIONS.map(d => (
          <button
            key={d.value}
            onClick={() => onDuration(d.value)}
            title={`${d.label} (${d.key})`}
            className={`${BASE_BUTTON} ${currentDuration === d.value ? ACTIVE_BUTTON : IDLE_BUTTON}`}
          >
            {d.symbol}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onInsertRest}
          title="Pausa (0)"
          className={`${BASE_BUTTON} border-orange-500/30 text-orange-500 hover:bg-orange-500/10`}
        >
          𝄽
        </button>
        <button
          onClick={onToggleDot}
          title="Ponto de aumento (.)"
          className={`${BASE_BUTTON} font-bold ${dotted || doubleDotted ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          •{doubleDotted && '•'}
        </button>
        <div className="mx-0.5 h-5 w-px bg-border" />
        <button
          onClick={() => onAccidental('#')}
          title="Sustenido (#)"
          className={`${BASE_BUTTON} ${currentAccidental === '#' ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          ♯
        </button>
        <button
          onClick={() => onAccidental('b')}
          title="Bemol (-)"
          className={`${BASE_BUTTON} ${currentAccidental === 'b' ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          ♭
        </button>
        <button
          onClick={() => onAccidental('n')}
          title="Bequadro (=)"
          className={`${BASE_BUTTON} ${currentAccidental === 'n' ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          ♮
        </button>
      </div>

      <div className="flex items-center justify-end gap-1">
        {onNavigate && (
          <button
            onClick={() => onNavigate(-1)}
            title="Nota anterior (←)"
            className={`${BASE_BUTTON} h-7 w-7 ${IDLE_BUTTON}`}
          >
            <CaretLeft size={13} weight="bold" />
          </button>
        )}
        <span className="whitespace-nowrap rounded-md bg-azul-soft px-2.5 py-1 text-[11px] font-semibold text-master">
          {selectedInfo ? `${selectedInfo.label} · ${selectedInfo.position}` : 'Clique na pauta ou tecle A–G'}
        </span>
        {onNavigate && (
          <button
            onClick={() => onNavigate(1)}
            title="Próxima nota (→)"
            className={`${BASE_BUTTON} h-7 w-7 ${IDLE_BUTTON}`}
          >
            <CaretRight size={13} weight="bold" />
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Simplify the wrapper in MaterialPreview**

Em `src/components/material/MaterialPreview.tsx`, função `BlockNotation`, trocar:

```tsx
          <div className="mb-2 flex flex-wrap items-center gap-1">
            <NotationDurationStrip {...notationInteractive.durationStrip} />
          </div>
```

por:

```tsx
          <div className="mb-2">
            <NotationDurationStrip {...notationInteractive.durationStrip} />
          </div>
```

- [ ] **Step 3: Type check and commit**

Run: `npx tsc --noEmit -p tsconfig.json` (o V2 não passa os props novos — devem ser opcionais, sem erro)

```bash
git add src/components/music/NotationDurationStrip.tsx src/components/material/MaterialPreview.tsx
git commit -m "feat: fileira de duracao em tres grupos com indicador vivo"
```

---

### Task 8: NotationAlphaTabSurface — destaque da seleção + nota-fantasma

Overlays HTML por cima do AlphaTab: retângulo accent no beat selecionado (via `boundsLookup`) e cabeça de nota cinza com badge do pitch seguindo o mouse.

**Files:**
- Modify: `src/components/music/NotationAlphaTabSurface.tsx` (reescrita)

- [ ] **Step 1: Rewrite the component**

Substituir o conteúdo inteiro de `src/components/music/NotationAlphaTabSurface.tsx`:

```tsx
import { useCallback, useMemo, useRef, useState } from 'react'
import { AlphaTabViewer, type AlphaTabViewerHandle } from './AlphaTabViewer'
import { A4_CANVAS_NOTATION_WIDTH } from '@/lib/notationPreviewWidth'
import { emptyStaffAlphaTex, ledgerLineYs, pitchFromStaffY, staffYFromPitch } from '@/lib/notationStaffPitch'
import { resolveInsertAfterIndex, resolveModelBeatIndex } from '@/lib/notationBeatHit'

export interface NotationAlphaTabSurfaceProps {
  tex: string
  variant?: 'modal' | 'canvas'
  indexMap: number[]
  selectedBeatIdx: number
  clef: string
  keySignature: string
  timeSignature: string | null
  grandStaffMode?: boolean
  onSelectBeat: (idx: number) => void
  onInsertNote: (pitch: string, afterIdx: number) => void
  onReplaceNote: (pitch: string, atIdx: number) => void
  inputRef?: React.Ref<HTMLInputElement>
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onHoverPitch?: (pitch: string | null) => void
}

interface BeatRect { x: number; y: number; w: number; h: number }
interface GhostNote { x: number; y: number; label: string; ledger: number[] }

function staffClef(clef: string): 'treble' | 'bass' {
  return clef === 'bass' ? 'bass' : 'treble'
}

function collectBeatRects(api: { boundsLookup?: any } | null): BeatRect[] {
  const rects: BeatRect[] = []
  const systems = api?.boundsLookup?.staffSystems ?? []
  for (const system of systems) {
    for (const masterBar of system.bars ?? []) {
      for (const bar of masterBar.bars ?? []) {
        for (const beat of bar.beats ?? []) {
          const bounds = beat.visualBounds ?? beat.realBounds
          if (bounds) rects.push({ x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h })
        }
      }
    }
  }
  return rects
}

export function NotationAlphaTabSurface({
  tex,
  variant = 'modal',
  indexMap,
  selectedBeatIdx,
  clef,
  keySignature,
  timeSignature,
  grandStaffMode = false,
  onSelectBeat,
  onInsertNote,
  onReplaceNote,
  inputRef,
  onKeyDown,
  onHoverPitch,
}: NotationAlphaTabSurfaceProps) {
  const viewerRef = useRef<AlphaTabViewerHandle>(null)
  const [staffBox, setStaffBox] = useState<{ top: number; bottom: number } | null>(null)
  const [beatRects, setBeatRects] = useState<BeatRect[]>([])
  const [ghost, setGhost] = useState<GhostNote | null>(null)

  const displayTex = tex || emptyStaffAlphaTex({ clef, keySignature, timeSignature })

  const readStaffBox = useCallback(() => {
    const api = viewerRef.current?.api as { boundsLookup?: any } | null
    const lookup = api?.boundsLookup
    const first = lookup?.staffSystems?.[0]?.bars?.[0]
    const bounds = first?.visualBounds ?? first?.realBounds
    if (!bounds) return null
    return { top: bounds.y, bottom: bounds.y + bounds.h }
  }, [])

  const handleRenderFinished = useCallback(() => {
    setStaffBox(readStaffBox())
    setBeatRects(collectBeatRects(viewerRef.current?.api as { boundsLookup?: any } | null))
  }, [readStaffBox])

  const selectedRect = useMemo(() => {
    if (selectedBeatIdx < 0) return null
    const alphaIdx = indexMap.indexOf(selectedBeatIdx)
    if (alphaIdx < 0 || alphaIdx >= beatRects.length) return null
    return beatRects[alphaIdx]
  }, [beatRects, indexMap, selectedBeatIdx])

  const handleBeatMouseDown = useCallback((beat: { index?: number; voice?: { beats?: unknown[] } }) => {
    const alphaIdx = typeof beat.index === 'number' ? beat.index : -1
    const modelIdx = resolveModelBeatIndex(alphaIdx, indexMap)
    if (modelIdx >= 0) onSelectBeat(modelIdx)
  }, [indexMap, onSelectBeat])

  const handlePointer = useCallback((event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const api = viewerRef.current?.api as { boundsLookup?: any } | null
    const container = viewerRef.current?.container
    if (!api || !container) return
    const rect = container.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const box = staffBox ?? readStaffBox()
    if (!box) return
    const pitch = pitchFromStaffY(y, box.top, box.bottom, staffClef(clef))
    onHoverPitch?.(pitch)
    if (!commit) {
      const snappedY = staffYFromPitch(pitch, box.top, box.bottom, staffClef(clef))
      setGhost({
        x,
        y: snappedY,
        label: pitch.replace('/', ''),
        ledger: ledgerLineYs(snappedY, box.top, box.bottom),
      })
      return
    }

    const lookup = api.boundsLookup
    const hit = lookup?.getBeatAtPos?.(x, y) ?? null
    if (hit && tex) {
      const voiceBeats = hit.voice?.beats ?? []
      const alphaIdx = voiceBeats.indexOf(hit)
      const modelIdx = resolveModelBeatIndex(alphaIdx >= 0 ? alphaIdx : hit.index, indexMap)
      if (modelIdx >= 0) {
        if (event.altKey) {
          onReplaceNote(pitch, modelIdx)
        } else {
          onSelectBeat(modelIdx)
        }
        return
      }
    }
    const after = resolveInsertAfterIndex(selectedBeatIdx, false)
    onInsertNote(pitch, after)
  }, [clef, indexMap, onHoverPitch, onInsertNote, onReplaceNote, onSelectBeat, readStaffBox, selectedBeatIdx, staffBox, tex])

  return (
    <div
      className={variant === 'canvas'
        ? 'relative w-full min-w-0'
        : 'relative mx-auto overflow-hidden rounded-xl border border-border bg-white'}
      style={variant === 'modal' ? { width: A4_CANVAS_NOTATION_WIDTH } : undefined}
      onPointerMove={(event) => handlePointer(event, false)}
      onPointerLeave={() => { onHoverPitch?.(null); setGhost(null) }}
      onPointerDown={(event) => {
        if (variant === 'canvas') event.stopPropagation()
        handlePointer(event, true)
        if (inputRef && 'current' in inputRef) inputRef.current?.focus()
      }}
    >
      <AlphaTabViewer
        ref={viewerRef}
        tex={displayTex}
        purpose={variant === 'canvas' || !grandStaffMode ? 'canvas-notation-score' : 'editor-notation-grand-staff'}
        staveProfile="score"
        layout={grandStaffMode ? 'horizontal' : 'page'}
        scale={1}
        showTimeSignature={timeSignature != null}
        includeNoteBounds
        minHeight={160}
        grandStaffMode={grandStaffMode}
        onBeatMouseDown={handleBeatMouseDown}
        onRenderFinished={handleRenderFinished}
      />

      {selectedRect && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-accent/15 ring-2 ring-accent"
          style={{
            left: selectedRect.x - 5,
            top: selectedRect.y - 5,
            width: selectedRect.w + 10,
            height: selectedRect.h + 10,
          }}
        />
      )}

      {ghost && (
        <div className="pointer-events-none absolute inset-0 z-10">
          {ghost.ledger.map(lineY => (
            <div
              key={lineY}
              className="absolute h-[1.5px] w-[22px] bg-text3/50"
              style={{ left: ghost.x - 11, top: lineY }}
            />
          ))}
          <svg className="absolute" width="16" height="12" style={{ left: ghost.x - 8, top: ghost.y - 6 }}>
            <ellipse cx="8" cy="6" rx="7" ry="5" className="fill-text3/45" />
          </svg>
          <span
            className="absolute rounded bg-master px-1.5 py-0.5 text-[10px] font-bold text-white"
            style={{ left: ghost.x + 12, top: ghost.y - 24 }}
          >
            {ghost.label}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        className="sr-only"
        onKeyDown={onKeyDown}
        aria-label="Atalhos da pauta"
      />
    </div>
  )
}
```

- [ ] **Step 2: Type check and commit**

Run: `npx tsc --noEmit -p tsconfig.json` (sem erro novo nos arquivos tocados)

```bash
git add src/components/music/NotationAlphaTabSurface.tsx
git commit -m "feat: destaque da selecao e nota-fantasma na pauta"
```

---

### Task 9: Gravura didática — escala ~1.35

Uma constante compartilhada para o tamanho da notação em canvas, modal e preview. Ritmo e tablatura não mudam.

**Files:**
- Modify: `src/lib/alphaTabSettings.ts`
- Modify: `src/components/music/NotationAlphaTabSurface.tsx`
- Modify: `src/components/material/MaterialPreview.tsx`
- Modify: `src/components/music/NotationPreviewCompat.tsx`

- [ ] **Step 1: Add the constant**

Em `src/lib/alphaTabSettings.ts`, após os types:

```ts
/** Escala da gravura de notação para material didático (canvas, modal e preview). */
export const NOTATION_DIDACTIC_SCALE = 1.35
```

- [ ] **Step 2: Apply in the surface**

Em `src/components/music/NotationAlphaTabSurface.tsx`:

```ts
import { NOTATION_DIDACTIC_SCALE } from '@/lib/alphaTabSettings'
```

E no `<AlphaTabViewer>`: `scale={1}` → `scale={NOTATION_DIDACTIC_SCALE}` e `minHeight={160}` → `minHeight={200}`.

- [ ] **Step 3: Apply in MaterialPreview (bloco legado de alphaTex)**

Em `src/components/material/MaterialPreview.tsx`, no `BlockNotation`, o `<AlphaTabViewer ... scale={1} ...>` (purpose `canvas-notation-score`) passa a `scale={NOTATION_DIDACTIC_SCALE}`. Import junto dos existentes:

```ts
import { NOTATION_DIDACTIC_SCALE } from '@/lib/alphaTabSettings'
```

- [ ] **Step 4: Apply in NotationPreviewCompat**

Em `src/components/music/NotationPreviewCompat.tsx`, trocar o default `scale = 0.9` por `scale = NOTATION_DIDACTIC_SCALE` (com o import). Antes, conferir callers que passam `scale` explícito e não mexer neles:

Run: `rg -n "NotationPreviewCompat" src --glob "*.tsx"`

- [ ] **Step 5: Type check and commit**

Run: `npx tsc --noEmit -p tsconfig.json`

```bash
git add src/lib/alphaTabSettings.ts src/components/music/NotationAlphaTabSurface.tsx src/components/material/MaterialPreview.tsx src/components/music/NotationPreviewCompat.tsx
git commit -m "feat: gravura didatica maior para blocos de notacao"
```

(O valor 1.35 é validado visualmente na Task 11 — se ficar grande/pequeno demais, ajustar a constante e re-conferir.)

---

### Task 10: Editor — patch de render_data com debounce e flush

Hoje cada tecla repagina o material inteiro. O patch passa a esperar ~400 ms de pausa na digitação, com flush imediato no save e na troca de bloco. A pauta interativa não depende disso (desenha do estado da sessão).

**Files:**
- Modify: `src/pages/Editor.tsx`

- [ ] **Step 1: Add the pending ref and flush callback**

Logo acima do `useEffect` do patch (o que começa com `const patch = inlineNotationSession.patchRenderData`, ~linha 2026):

```ts
  const pendingInlinePatchRef = useRef<{ blockId: string; patch: Record<string, any> } | null>(null)
  const inlinePatchTimerRef = useRef<number | null>(null)

  const flushInlineNotationPatch = useCallback(() => {
    if (inlinePatchTimerRef.current !== null) {
      window.clearTimeout(inlinePatchTimerRef.current)
      inlinePatchTimerRef.current = null
    }
    const pending = pendingInlinePatchRef.current
    if (!pending) return
    pendingInlinePatchRef.current = null
    setBlocksWithHistory(previous => previous.map(block => (
      block.id === pending.blockId ? { ...block, render_data: pending.patch } : block
    )))
    queueBlockAutosave(pending.blockId)
  }, [queueBlockAutosave, setBlocksWithHistory])
```

- [ ] **Step 2: Replace the patch effect**

Substituir o `useEffect` do patch inteiro (linhas ~2026-2039) por:

```ts
  useEffect(() => {
    const patch = inlineNotationSession.patchRenderData
    if (!notationInlineEnabled || !inlineNotationBlock || !inlineNotationSession.isHydrated || !patch) return
    const current = blocksRef.current.find(block => block.id === inlineNotationBlock.id)
    if (!current) return
    const currentNotation = JSON.stringify((current.render_data ?? {}).notation_data ?? null)
    const nextNotation = JSON.stringify(patch.notation_data ?? null)
    if (currentNotation === nextNotation) {
      pendingInlinePatchRef.current = null
      return
    }

    pendingInlinePatchRef.current = { blockId: inlineNotationBlock.id, patch }
    if (inlinePatchTimerRef.current !== null) window.clearTimeout(inlinePatchTimerRef.current)
    inlinePatchTimerRef.current = window.setTimeout(flushInlineNotationPatch, 400)
  }, [flushInlineNotationPatch, inlineNotationBlock?.id, inlineNotationSession.isHydrated, inlineNotationSession.patchRenderData, notationInlineEnabled])
```

- [ ] **Step 3: Flush when the block changes or the editor unmounts**

Logo abaixo do effect do Step 2:

```ts
  useEffect(() => () => { flushInlineNotationPatch() }, [flushInlineNotationPatch, inlineNotationBlock?.id])
```

- [ ] **Step 4: Flush before manual save**

Em `handleSaveBlock` (~linha 3147), a primeira linha do corpo do `useCallback` passa a ser:

```ts
    flushInlineNotationPatch()
```

E acrescentar `flushInlineNotationPatch` ao array de dependências do `handleSaveBlock`.

- [ ] **Step 5: Type check and commit**

Run: `npx tsc --noEmit -p tsconfig.json`

```bash
git add src/pages/Editor.tsx
git commit -m "perf: patch de notacao in-place com debounce e flush no save"
```

---

### Task 11: Conferência no browser — critérios da spec + mapa

Validar cada critério de aceite da spec no browser, validar a escala com screenshot, atualizar o mapa de desenvolvimento.

**Files:**
- Modify: `.agent/development-map.md` (no worktree)

- [ ] **Step 1: Run all the new/changed tests once more**

```bash
npx tsx src/lib/__tests__/texRenderQueue.test.ts
npx tsx src/lib/__tests__/notationInlineKeyboard.test.ts
npx tsx src/lib/__tests__/notationStaffPitch.test.ts
```

Expected: todos `ok - ...`

- [ ] **Step 2: Start the dev server (if not running)**

Verificar terminais existentes primeiro. Se preciso: `npm run dev -- --port=3002` no worktree (background).

- [ ] **Step 3: Browser checklist (material com bloco de notação, ex. "Intervalos a partir de Dó")**

1. Selecionar o bloco de notação pela lista lateral → digitar `E` imediatamente → a nota entra (foco garantido, sem clique prévio).
2. Digitar rajada `C D E F G A B C` o mais rápido possível → nenhum spinner aparece, nenhuma tecla se perde, o estado final é o correto.
3. Som audível a cada nota inserida e a cada seleção.
4. `←`/`→` movem o destaque rosa entre as notas; o indicador da fileira atualiza (`C4 · Semínima · 3/14`); a página **não** troca de bloco nem rola.
5. `↑`/`↓` transpõem a nota selecionada (diatônico); `Ctrl+↑` sobe oitava.
6. `Shift+E` adiciona Mi ao acorde do beat selecionado.
7. `5`/`6`/`4` mudam a duração do beat selecionado; `.` alterna ponto; `0` insere pausa; `-` arma bemol (a fileira acende ♭); `R` repete a última nota.
8. Nota-fantasma cinza com badge (`C4`) segue o mouse; linhas suplementares aparecem acima/abaixo da pauta.
9. Digitar e esperar ~1 s → material repagina uma única vez (não a cada tecla). Salvar, recarregar → as notas persistem.
10. `Esc` solta a nota (destaque some); segundo `Esc` solta o bloco.
11. `?notationInline=off` → gesto antigo (modal) continua funcionando.
12. Screenshot da folha com a gravura nova → apresentar ao usuário para validar o 1.35 (ajustar `NOTATION_DIDACTIC_SCALE` se ele pedir).

- [ ] **Step 4: Update the development map**

Em `.agent/development-map.md` (worktree): mover "Escrita fluida na pauta" para **Feito** com data e resumo (teclado completo, feedback triplo, fileira nova, gravura 1.35, render sem spinner com coalescing, patch debounced); definir **Próximo corte** = "Mapas de acorde e cifra na pauta (lead sheet)".

- [ ] **Step 5: Commit**

```bash
git add .agent/development-map.md
git commit -m "docs: mapa - escrita fluida na pauta concluida"
```
