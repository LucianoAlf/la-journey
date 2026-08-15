# Notação — a folha é o AlphaTab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O modal Editar notação desenha a pauta com o mesmo AlphaTab do canvas; o SVG e o preview duplicado só voltam com `?notationSurface=svg`.

**Architecture:** O modelo continua `beats` → `beatsToAlphaTex`. Uma flag escolhe a superfície. `NotationAlphaTabSurface` monta `AlphaTabViewer` com purpose `canvas-notation-score` e um overlay que traduz clique/`boundsLookup` nas funções que o V2 já tem (`onSelectBeat`, `onInsertNote`, `onReplaceNote`). `NotationSvgEditor` não é apagado.

**Tech Stack:** React, AlphaTab (`@coderline/alphatab`), `npx tsx --test`, browser agent em `https://la-journey.vercel.app` ou local.

**Spec:** `docs/superpowers/specs/2026-08-15-notacao-alphatab-folha-design.md`

**Worktree:** Branch nova a partir de `main` (ex. `feat/notacao-alphatab-folha`). Não usar o checkout sujo do parent (`image-gen` / Iconify / Recraft). Não misturar com `.worktrees/caderno-exercicio`. PowerShell: `;` no lugar de `&&`.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/notationSurface.ts` | Flag `alphatab` \| `svg`. Query `notationSurface` ganha da constante. |
| `src/lib/__tests__/notationSurface.test.ts` | Default, query svg, query inválida. |
| `src/lib/notationStaffPitch.ts` | Y da pauta AlphaTab → `C/4`. Tex mínimo de pauta vazia. |
| `src/lib/__tests__/notationStaffPitch.test.ts` | Linha de cima/baixo, espaço, clave de Fá, tex vazio. |
| `src/lib/notationBeatHit.ts` | `indexMap` (alphaTab → modelo) + “clicou no beat vs no vazio”. |
| `src/lib/__tests__/notationBeatHit.test.ts` | Grace notes, fora do mapa, insert after. |
| `src/components/music/NotationAlphaTabSurface.tsx` | AlphaTab + overlay. Sem save, sem toolbar. |
| `src/components/music/NotationEditorV2.tsx` | Troca a superfície; some o preview duplicado quando flag = alphatab. |
| `src/components/music/NotationSvgEditor.tsx` | Não mexer. Rollback. |
| `.agent/development-map.md` | Só no fim do corte, depois do browser. |

Não tocar `TablatureEditor`, PDF, snapshot, `Editor.tsx` além do modal que já usa `NotationEditorV2` / adapter.

---

### Task 1: Flag `notationSurface`

**Files:**
- Create: `src/lib/notationSurface.ts`
- Test: `src/lib/__tests__/notationSurface.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/notationSurface.test.ts`:

```ts
import { resolveNotationSurface } from '../notationSurface.ts'

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

test('default is alphatab', () => {
  assert(resolveNotationSurface('') === 'alphatab', 'empty search defaults to alphatab')
  assert(resolveNotationSurface('?foo=1') === 'alphatab', 'unrelated query defaults to alphatab')
})

test('query notationSurface=svg wins', () => {
  assert(resolveNotationSurface('?notationSurface=svg') === 'svg', 'bare query')
  assert(resolveNotationSurface('notationSurface=svg') === 'svg', 'without question mark')
})

test('query notationSurface=alphatab is explicit', () => {
  assert(resolveNotationSurface('?notationSurface=alphatab') === 'alphatab', 'explicit alphatab')
})

test('invalid query falls back', () => {
  assert(resolveNotationSurface('?notationSurface=vexflow') === 'alphatab', 'unknown value uses default')
  assert(resolveNotationSurface('?notationSurface=vexflow', 'svg') === 'svg', 'unknown value uses fallback arg')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/notationSurface.test.ts`

Expected: FAIL — `Cannot find module` / `notationSurface` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/notationSurface.ts`:

```ts
export type NotationSurface = 'alphatab' | 'svg'

export const NOTATION_SURFACE_DEFAULT: NotationSurface = 'alphatab'

export function resolveNotationSurface(
  search: string,
  fallback: NotationSurface = NOTATION_SURFACE_DEFAULT,
): NotationSurface {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const value = new URLSearchParams(raw).get('notationSurface')
  if (value === 'svg' || value === 'alphatab') return value
  return fallback
}

export function readNotationSurface(): NotationSurface {
  if (typeof window === 'undefined') return NOTATION_SURFACE_DEFAULT
  return resolveNotationSurface(window.location.search)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/__tests__/notationSurface.test.ts`

Expected: 4 `ok` lines, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notationSurface.ts src/lib/__tests__/notationSurface.test.ts
git commit -m "feat(notation): add notationSurface flag for AlphaTab vs SVG rollback"
```

---

### Task 2: Pitch a partir do Y da pauta AlphaTab

**Files:**
- Create: `src/lib/notationStaffPitch.ts`
- Test: `src/lib/__tests__/notationStaffPitch.test.ts`

A pauta AlphaTab tem 5 linhas. `staffTop` = linha de cima, `staffBottom` = linha de baixo. 8 meios-passos diatônicos entre elas.

- Clave de Sol: linha de cima = F/5, linha de baixo = E/4, espaço abaixo da pauta = D/4, primeira suplementar = C/4.
- Clave de Fá: linha de cima = A/3, linha de baixo = G/2.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/notationStaffPitch.test.ts`:

```ts
import { emptyStaffAlphaTex, pitchFromStaffY } from '../notationStaffPitch.ts'

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

const TOP = 40
const BOTTOM = 80

test('treble top line is F5', () => {
  assert(pitchFromStaffY(TOP, TOP, BOTTOM, 'treble') === 'F/5', 'top line')
})

test('treble bottom line is E4', () => {
  assert(pitchFromStaffY(BOTTOM, TOP, BOTTOM, 'treble') === 'E/4', 'bottom line')
})

test('treble space below staff is D4', () => {
  const half = (BOTTOM - TOP) / 8
  assert(pitchFromStaffY(BOTTOM + half, TOP, BOTTOM, 'treble') === 'D/4', 'space below')
})

test('treble first ledger below is C4', () => {
  const half = (BOTTOM - TOP) / 8
  assert(pitchFromStaffY(BOTTOM + 2 * half, TOP, BOTTOM, 'treble') === 'C/4', 'ledger C4')
})

test('bass top line is A3', () => {
  assert(pitchFromStaffY(TOP, TOP, BOTTOM, 'bass') === 'A/3', 'bass top')
})

test('empty staff tex has clef and a rest so AlphaTab draws a staff', () => {
  const tex = emptyStaffAlphaTex({ clef: 'treble', keySignature: 'C', timeSignature: null })
  assert(tex.includes('\\clef'), 'clef')
  assert(tex.includes('r'), 'rest so the staff exists')
  assert(!/\\ts\s+\d/.test(tex), 'free time must not emit \\ts')
})

test('metered empty staff emits time signature', () => {
  const tex = emptyStaffAlphaTex({ clef: 'treble', keySignature: 'C', timeSignature: '4/4' })
  assert(/\\ts\s+4\s+4/.test(tex), '4/4')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/notationStaffPitch.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/notationStaffPitch.ts`:

```ts
const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const

const CLEF_TOP: Record<'treble' | 'bass', { nameIdx: number; octave: number }> = {
  treble: { nameIdx: 3, octave: 5 }, // F5
  bass: { nameIdx: 5, octave: 3 },   // A3
}

const CLEF_TEX: Record<string, string> = {
  treble: 'G2',
  bass: 'F4',
  alto: 'C3',
  percussion: 'N',
}

export function pitchFromStaffY(
  y: number,
  staffTop: number,
  staffBottom: number,
  clef: 'treble' | 'bass',
): string {
  const span = staffBottom - staffTop
  const half = span === 0 ? 1 : span / 8
  const stepsFromTop = Math.round((y - staffTop) / half)
  const top = CLEF_TOP[clef]
  let nameIdx = top.nameIdx - stepsFromTop
  let octave = top.octave
  while (nameIdx < 0) {
    nameIdx += 7
    octave -= 1
  }
  while (nameIdx > 6) {
    nameIdx -= 7
    octave += 1
  }
  return `${NOTE_NAMES[nameIdx]}/${octave}`
}

export function emptyStaffAlphaTex(options: {
  clef: string
  keySignature: string
  timeSignature: string | null
}): string {
  const clefTex = CLEF_TEX[options.clef] ?? 'G2'
  const lines = [
    '\\track',
    '\\staff {score}',
    `\\clef ${clefTex}`,
  ]
  if (options.timeSignature) {
    const [beats, beatType] = options.timeSignature.split('/')
    if (beats && beatType) lines.push(`\\ts ${beats} ${beatType}`)
  }
  lines.push('.')
  lines.push('r.4')
  return lines.join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/__tests__/notationStaffPitch.test.ts`

Expected: 7 `ok` lines, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notationStaffPitch.ts src/lib/__tests__/notationStaffPitch.test.ts
git commit -m "feat(notation): map AlphaTab staff Y to pitch and seed empty staff"
```

---

### Task 3: Hit-test beat do AlphaTab → beat do modelo

**Files:**
- Create: `src/lib/notationBeatHit.ts`
- Test: `src/lib/__tests__/notationBeatHit.test.ts`

`beatsToAlphaTexWithMap` já devolve `indexMap`: `alphaTabBeatIndex → ourBeatIndex`. Grace notes geram beats extras no AlphaTab que apontam para o mesmo índice do modelo.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/notationBeatHit.test.ts`:

```ts
import { resolveInsertAfterIndex, resolveModelBeatIndex } from '../notationBeatHit.ts'

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

test('maps alphaTab index through indexMap', () => {
  const indexMap = [0, 0, 1, 2]
  assert(resolveModelBeatIndex(0, indexMap) === 0, 'grace shares 0')
  assert(resolveModelBeatIndex(1, indexMap) === 0, 'grace extra')
  assert(resolveModelBeatIndex(2, indexMap) === 1, 'second model beat')
})

test('out of range returns -1', () => {
  assert(resolveModelBeatIndex(-1, [0]) === -1, 'negative')
  assert(resolveModelBeatIndex(4, [0, 1]) === -1, 'past end')
})

test('click on existing beat selects that model index', () => {
  assert(resolveInsertAfterIndex(2, true) === 2, 'on beat → that index for select/replace')
})

test('click on empty staff after a beat inserts after it', () => {
  assert(resolveInsertAfterIndex(2, false) === 2, 'empty after beat 2 → insert after 2')
})

test('click with no beat uses -1 so insert goes to the end', () => {
  assert(resolveInsertAfterIndex(-1, false) === -1, 'no hit')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/notationBeatHit.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/notationBeatHit.ts`:

```ts
export function resolveModelBeatIndex(alphaTabBeatIdx: number, indexMap: number[]): number {
  if (alphaTabBeatIdx < 0 || alphaTabBeatIdx >= indexMap.length) return -1
  return indexMap[alphaTabBeatIdx]
}

export function resolveInsertAfterIndex(modelBeatIdx: number, _clickedExistingBeat: boolean): number {
  return modelBeatIdx
}
```

`handleInsertNote(pitch, afterIdx)` no V2 já trata `afterIdx === -1` / último. Overlay chama `onSelectBeat(modelIdx)` quando `_clickedExistingBeat` é true, e `onInsertNote(pitch, afterIdx)` quando é false.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/__tests__/notationBeatHit.test.ts`

Expected: 5 `ok` lines, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notationBeatHit.ts src/lib/__tests__/notationBeatHit.test.ts
git commit -m "feat(notation): map AlphaTab beat hits back to model beats"
```

---

### Task 4: `NotationAlphaTabSurface`

**Files:**
- Create: `src/components/music/NotationAlphaTabSurface.tsx`
- Modify: none yet

Componente burro: desenha, traduz ponteiro, chama callbacks. Sem save.

`AlphaTabViewer` já existe em `src/components/music/AlphaTabViewer.tsx` com `purpose`, `includeNoteBounds`, `onBeatMouseDown`, `onRenderFinished`, ref `{ api, container }`.

Settings **iguais ao canvas** (`src/components/material/MaterialPreview.tsx` ~811–821):

- `purpose="canvas-notation-score"` (grande pauta: `editor-notation-grand-staff` só se `grandStaffMode`, porque o canvas de piano já usa esse purpose)
- `layout="page"` (grande pauta: `horizontal`, igual ao V2 atual)
- `scale={1}`
- `staveProfile="score"`
- `showTimeSignature={timeSignature != null}`
- `includeNoteBounds={true}`

Se `tex` estiver vazio, usar `emptyStaffAlphaTex`.

- [ ] **Step 1: Create the surface**

Create `src/components/music/NotationAlphaTabSurface.tsx`:

```tsx
import { useCallback, useRef, useState } from 'react'
import { AlphaTabViewer, type AlphaTabViewerHandle } from './AlphaTabViewer'
import { emptyStaffAlphaTex, pitchFromStaffY } from '@/lib/notationStaffPitch'
import { resolveInsertAfterIndex, resolveModelBeatIndex } from '@/lib/notationBeatHit'

export interface NotationAlphaTabSurfaceProps {
  tex: string
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

function staffClef(clef: string): 'treble' | 'bass' {
  return clef === 'bass' ? 'bass' : 'treble'
}

export function NotationAlphaTabSurface({
  tex,
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

  const displayTex = tex || emptyStaffAlphaTex({ clef, keySignature, timeSignature })

  const readStaffBox = useCallback(() => {
    const api = viewerRef.current?.api
    const lookup = api?.boundsLookup
    const first = lookup?.staffSystems?.[0]?.bars?.[0]
    const bounds = first?.visualBounds ?? first?.realBounds
    if (!bounds) return null
    return { top: bounds.y, bottom: bounds.y + bounds.h }
  }, [])

  const handleRenderFinished = useCallback(() => {
    setStaffBox(readStaffBox())
  }, [readStaffBox])

  const handleBeatMouseDown = useCallback((beat: { index?: number; voice?: { beats?: unknown[] } }) => {
    const alphaIdx = typeof beat.index === 'number' ? beat.index : -1
    const modelIdx = resolveModelBeatIndex(alphaIdx, indexMap)
    if (modelIdx >= 0) onSelectBeat(modelIdx)
  }, [indexMap, onSelectBeat])

  const handlePointer = useCallback((event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const api = viewerRef.current?.api
    const container = viewerRef.current?.container
    if (!api || !container) return
    const rect = container.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const box = staffBox ?? readStaffBox()
    if (!box) return
    const pitch = pitchFromStaffY(y, box.top, box.bottom, staffClef(clef))
    onHoverPitch?.(pitch)
    if (!commit) return

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
      className="relative rounded-xl border border-border overflow-hidden bg-white"
      onPointerMove={(event) => handlePointer(event, false)}
      onPointerLeave={() => onHoverPitch?.(null)}
      onPointerDown={(event) => {
        handlePointer(event, true)
        if (inputRef && 'current' in inputRef) inputRef.current?.focus()
      }}
    >
      <AlphaTabViewer
        ref={viewerRef}
        tex={displayTex}
        purpose={grandStaffMode ? 'editor-notation-grand-staff' : 'canvas-notation-score'}
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

Se `getBeatAtPos` / `beat.index` no runtime do AlphaTab for diferente, ajustar no browser (Task 6) — os testes da Task 3 cobrem o mapeamento.

- [ ] **Step 2: Typecheck the new file**

Run: `npx tsc --noEmit --pretty false 2>&1 | Select-String NotationAlphaTabSurface`

Expected: sem erro nesse arquivo. Se `boundsLookup` não estiver tipado no `AlphaTabApi`, usar `(api as { boundsLookup?: any })`.

- [ ] **Step 3: Commit**

```bash
git add src/components/music/NotationAlphaTabSurface.tsx
git commit -m "feat(notation): add AlphaTab staff surface with click overlay"
```

---

### Task 5: Ligar no `NotationEditorV2`

**Files:**
- Modify: `src/components/music/NotationEditorV2.tsx`

Imports atuais (~linha 5 e o bloco 1584–1627): `NotationSvgEditor` + `AlphaTabViewer` de preview.

- [ ] **Step 1: Import flag + surface**

No topo de `NotationEditorV2.tsx`, ao lado dos imports de `NotationSvgEditor` e `AlphaTabViewer`:

```ts
import { NotationAlphaTabSurface } from './NotationAlphaTabSurface'
import { readNotationSurface } from '@/lib/notationSurface'
```

Dentro do componente, depois dos refs:

```ts
const notationSurface = readNotationSurface()
```

- [ ] **Step 2: Trocar o bloco da coluna esquerda**

Substituir o bloco que começa em `{/* Editor SVG */}` e inclui o `{/* Preview AlphaTab */}` por:

```tsx
          <div className="flex-1 space-y-3">
            {notationSurface === 'alphatab' ? (
              <NotationAlphaTabSurface
                tex={alphaTex}
                indexMap={alphaTabIndexMap}
                selectedBeatIdx={isPlaying ? playingBeatIdx : selectedBeatIdx}
                clef={clef}
                keySignature={keySignature}
                timeSignature={timeSignature !== 'free' ? timeSignature : null}
                grandStaffMode={grandStaffMode}
                onSelectBeat={handleSelectBeat}
                onInsertNote={handleInsertNote}
                onReplaceNote={handleReplaceNote}
                inputRef={hiddenInputRef}
                onKeyDown={handleKeyDown}
                onHoverPitch={(pitch) => setHoveredSvgPos(pitch ? { beatIdx: selectedBeatIdx, pitch } : null)}
              />
            ) : (
              <>
                <NotationSvgEditor
                  beats={beats}
                  selectedBeatIdx={isPlaying ? playingBeatIdx : selectedBeatIdx}
                  onSelectBeat={handleSelectBeat}
                  onInsertNote={handleInsertNote}
                  onReplaceNote={handleReplaceNote}
                  onDeleteBeat={handleDeleteBeat}
                  onUpdateBeat={handleUpdateBeat}
                  clef={clef}
                  keySignature={keySignature}
                  timeSignature={timeSignature !== 'free' ? timeSignature : null}
                  currentDuration={currentDuration}
                  isInputMode={isInputMode}
                  grandStaffMode={grandStaffMode}
                  activeStaff={activeStaff}
                  barlines={barlines}
                  inputRef={hiddenInputRef}
                  onKeyDown={handleKeyDown}
                  onHoverPosition={setHoveredSvgPos}
                />
                {alphaTex && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="px-3 py-1.5 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-text3">
                      Preview (AlphaTab)
                    </div>
                    <AlphaTabViewer
                      tex={alphaTex}
                      staveProfile="score"
                      purpose={grandStaffMode ? 'editor-notation-grand-staff' : 'editor-notation-score'}
                      grandStaffMode={grandStaffMode}
                      layout={grandStaffMode ? 'horizontal' : 'page'}
                      scale={1.0}
                      showTimeSignature={timeSignature !== 'free'}
                      minHeight={120}
                    />
                  </div>
                )}
              </>
            )}
          </div>
```

Não apagar `NotationSvgEditor.tsx`. Não mudar toolbar, save, undo, playback.

- [ ] **Step 3: Run unit tests of this cut**

Run:

```
npx tsx --test src/lib/__tests__/notationSurface.test.ts src/lib/__tests__/notationStaffPitch.test.ts src/lib/__tests__/notationBeatHit.test.ts
```

Expected: todos `ok`, exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/music/NotationEditorV2.tsx
git commit -m "feat(notation): use AlphaTab as the Edit notation staff by default"
```

---

### Task 6: Browser end-to-end (obrigatório)

Sem isso o corte não fecha. Usar o agent browser. Não chutar.

Material de referência: exercício **Intervalos Melódicos — Série 1**, bloco **Intervalos a partir de Dó**. Produção: `https://la-journey.vercel.app` depois do deploy; até lá, o Vite local da worktree.

- [ ] **Step 1: Abrir o material no canvas**

1. Biblioteca → Exercícios → Intervalos Melódicos — Série 1 → Editar (abre `/editor/:id`, não a lista).
2. Ir à página do bloco de partitura.
3. Screenshot do bloco no canvas.

- [ ] **Step 2: Abrir Editar notação**

Clicar **Editar notação**. Screenshot do modal.

Passa só se:
- A pauta é gravura AlphaTab em layout página (sistemas empilhados), não a pauta SVG horizontal.
- Não existe o rótulo **Preview (AlphaTab)** duplicado embaixo.

- [ ] **Step 3: Inserir uma nota, atualizar, fechar**

Clicar na pauta (ou tecla A–G). **Atualizar**. Fechar. O canvas mostra a nota na mesma linguagem.

- [ ] **Step 4: Rollback**

Abrir a mesma URL do editor com `?notationSurface=svg`. O modal antigo (SVG + preview) volta.

Se o clique no vazio não inserir nota, mas seleção + teclado + toolbar funcionarem e a gravura for a mesma, o corte visual passa (spec: “Afinar o ghost/clique é iteração”). Registrar no PR o que faltou no hit-test.

- [ ] **Step 5: Commit só se o Step 2–3 tiver correção de código**

Se o browser revelar bug de purpose/scale/overlay, corrigir e commitar:

```bash
git commit -m "fix(notation): match Edit notation AlphaTab settings to the canvas"
```

---

### Task 7: Mapa de desenvolvimento

**Files:**
- Modify: `.agent/development-map.md`

Só depois do Task 6 passar.

- [ ] **Step 1: Atualizar o mapa**

- Data de hoje.
- **Próximo corte:** o que o radar já tinha depois disto (Apostila / Download, ou tablatura na mesma folha — não inventar ordem nova sem o Luciano).
- Em **Feito**: uma entrada curta “Modal Editar notação usa AlphaTab do canvas; rollback `?notationSurface=svg`”.
- Não copiar a spec.

- [ ] **Step 2: Commit**

```bash
git add .agent/development-map.md docs/superpowers/specs/2026-08-15-notacao-alphatab-folha-design.md docs/superpowers/plans/2026-08-15-notacao-alphatab-folha.md
git commit -m "docs: mark notation AlphaTab sheet cut and keep the spec"
```

---

## Self-review

| Spec | Task |
|---|---|
| AlphaTab é a folha; SVG não é apagado | 4, 5 |
| Modelo continua `beats` | 5 (callbacks iguais) |
| Overlay + boundsLookup | 3, 4 |
| Settings = canvas | 4 (`canvas-notation-score`, page, scale 1) |
| Flag + query rollback | 1, 5, 6.4 |
| Só modal de pauta | file map |
| Testes unidade pitch + map + flag | 1–3 |
| Browser obrigatório | 6 |
| Tablatura / A4 in-place / PDF | fora, nenhum task |

Sem TBD. Assinaturas: `resolveNotationSurface`, `pitchFromStaffY`, `emptyStaffAlphaTex`, `resolveModelBeatIndex`, `resolveInsertAfterIndex`, `NotationAlphaTabSurface`.
