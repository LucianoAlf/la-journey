# Estudo corte B — sala independente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a lista `/estudo` vira catálogo só de faixa nascida no Estudo, com rename rápido, apagar, cifra no clique, quatro gravuras, folha da escola e impressão — sem abrir o Editor.

**Architecture:** `page_config.estudo` no `generated_materials` que já existe. Lista consulta essa tabela (não a RPC `list_materials`). Cifra continua em `Beat.cifra`. Gravura só muda o AlphaTex da sala. Chrome da folha lê `schools.logo_url` + `estudo.curatorName`. Print = `window.print()`.

**Tech Stack:** React + TypeScript, Supabase (`generated_materials`, `material_blocks`, `users`, storage `content-images`), AlphaTab já no `StudyPlayalongSurface`, testes `npx tsx src/lib/__tests__/<arquivo>.test.ts`.

**Spec:** `docs/superpowers/specs/2026-08-17-estudo-sala-independente-design.md`

**Branch:** `feat/estudo-playalong` (worktree `.worktrees/estudo-playalong`). **Não** misturar com `feat/audio-didatico`. Dev: `npx vite --port 5202 --strictPort --host`.

**Test helper** (copiar em cada arquivo de teste, igual aos testes C1/C2):

```ts
import assert from 'node:assert/strict'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}
```

---

## Estrutura de arquivos

| Arquivo | Papel | Ação |
|---|---|---|
| `src/lib/estudoConfig.ts` | Parser `estudo`, backfill, merge, título | Criar |
| `src/lib/__tests__/estudoConfig.test.ts` | Spec testes 1, 5, 6 | Criar |
| `src/lib/estudoCifra.ts` | Chips da sala + próximo acorde | Criar |
| `src/lib/__tests__/estudoCifra.test.ts` | Spec teste 4 | Criar |
| `src/lib/studyNotationTex.ts` | Tex por `displayMode` + `indexMap` | Modificar |
| `src/lib/__tests__/studyNotationTex.test.ts` | Spec testes 2–3 | Modificar |
| `src/services/playalongUpload.ts` | Path do storage a partir da URL pública | Modificar |
| `src/lib/__tests__/playalong.test.ts` | Path da URL | Modificar |
| `src/services/estudoCatalogService.ts` | list / backfill / delete / user name | Criar |
| `src/services/studyFromMp3Service.ts` | Grava `estudo` no mesmo update | Modificar |
| `src/hooks/useEstudoMaterials.ts` | Lista da sala | Criar |
| `src/components/estudo/StudyTitleField.tsx` | Rename inline | Criar |
| `src/components/estudo/StudySheetFrame.tsx` | Logo, professor, marca d'água, Alf, alphaTab | Criar |
| `src/components/estudo/StudyCifraOverlay.tsx` | Campo + 6 chips | Criar |
| `src/components/music/StudyPlayalongSurface.tsx` | Esconde crédito; clique no beat; classe de gravura | Modificar |
| `src/pages/Estudo.tsx` | Lista CRUD + sala | Modificar |
| `src/layouts/AppLayout.tsx` | `print:hidden` na sidebar | Modificar |
| `.agent/development-map.md` | Corte B em Feito | Modificar no fim |

Não criar tabela. Não embedar o Editor. Não chamar `generate-pdf`.

---

### Task 1: Parser `page_config.estudo`

**Files:**
- Create: `src/lib/estudoConfig.ts`
- Create: `src/lib/__tests__/estudoConfig.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import {
  needsEstudoBackfill,
  parseEstudo,
  sanitizeEstudoTitle,
  estudoToJson,
} from '../estudoConfig'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('absent estudo is null', () => {
  assert.equal(parseEstudo(undefined), null)
  assert.equal(parseEstudo(null), null)
  assert.equal(parseEstudo('from-mp3'), null)
})

test('defaults displayMode and origin', () => {
  const cfg = parseEstudo({})
  assert.equal(cfg?.origin, 'from-mp3')
  assert.equal(cfg?.displayMode, 'slash-beat')
  assert.equal(cfg?.curatorName, null)
})

test('invalid displayMode falls back to slash-beat', () => {
  const cfg = parseEstudo({ origin: 'from-mp3', displayMode: 'piano', curatorName: '  Luciano  ' })
  assert.equal(cfg?.displayMode, 'slash-beat')
  assert.equal(cfg?.curatorName, 'Luciano')
})

test('keeps a valid displayMode', () => {
  assert.equal(parseEstudo({ displayMode: 'score' })?.displayMode, 'score')
  assert.deepEqual(estudoToJson(parseEstudo({ displayMode: 'chords', curatorName: 'Ana' })!), {
    origin: 'from-mp3',
    displayMode: 'chords',
    curatorName: 'Ana',
  })
})

test('catalog: estudo tagged is in; journey playalong is out', () => {
  assert.equal(needsEstudoBackfill({
    page_config: { playalong: { audioUrl: 'https://x/a.mp3' } },
    journey_id: 'j1',
    station_id: null,
  }), false)
  assert.equal(parseEstudo({ origin: 'from-mp3' }) !== null, true)
})

test('backfill: playalong without estudo and without journey', () => {
  assert.equal(needsEstudoBackfill({
    page_config: { playalong: { audioUrl: 'https://x/a.mp3' } },
    journey_id: null,
    station_id: null,
  }), true)
  assert.equal(needsEstudoBackfill({
    page_config: { playalong: { audioUrl: 'https://x/a.mp3' }, estudo: { origin: 'from-mp3' } },
    journey_id: null,
    station_id: null,
  }), false)
})

test('empty rename is rejected; trim and cap at 120', () => {
  assert.equal(sanitizeEstudoTitle('  ', 'Faixa'), null)
  assert.equal(sanitizeEstudoTitle('   Blues  ', 'Faixa'), 'Blues')
  assert.equal(sanitizeEstudoTitle('A'.repeat(130), 'Faixa')?.length, 120)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/lib/__tests__/estudoConfig.test.ts`

Expected: FAIL — `Cannot find module '../estudoConfig'`

- [ ] **Step 3: Write minimal implementation**

`src/lib/estudoConfig.ts`:

```ts
import { parsePlayalong } from './playalong'

export const ESTUDO_TITLE_MAX = 120

export const ESTUDO_DISPLAY_MODES = ['slash-beat', 'slash-rhythm', 'chords', 'score'] as const
export type EstudoDisplayMode = (typeof ESTUDO_DISPLAY_MODES)[number]

export type EstudoConfig = {
  origin: 'from-mp3'
  displayMode: EstudoDisplayMode
  curatorName: string | null
}

function asDisplayMode(value: unknown): EstudoDisplayMode {
  return ESTUDO_DISPLAY_MODES.includes(value as EstudoDisplayMode)
    ? (value as EstudoDisplayMode)
    : 'slash-beat'
}

export function parseEstudo(raw: unknown): EstudoConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  const name = typeof rec.curatorName === 'string' ? rec.curatorName.trim() : ''
  return {
    origin: 'from-mp3',
    displayMode: asDisplayMode(rec.displayMode),
    curatorName: name || null,
  }
}

export function estudoToJson(config: EstudoConfig): EstudoConfig {
  return {
    origin: 'from-mp3',
    displayMode: config.displayMode,
    curatorName: config.curatorName,
  }
}

export function needsEstudoBackfill(row: {
  page_config?: unknown
  journey_id?: string | null
  station_id?: string | null
}): boolean {
  if (row.journey_id || row.station_id) return false
  const rec = row.page_config && typeof row.page_config === 'object'
    ? row.page_config as Record<string, unknown>
    : null
  if (!rec) return false
  if (parseEstudo(rec.estudo)) return false
  return parsePlayalong(rec.playalong) !== null
}

export function sanitizeEstudoTitle(raw: string, previous: string): string | null {
  const next = raw.replace(/\s+/g, ' ').trim().slice(0, ESTUDO_TITLE_MAX)
  if (!next) return null
  return next === previous ? previous : next
}

export function mergeEstudoPageConfig(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(existing ?? {}), ...patch }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/lib/__tests__/estudoConfig.test.ts`

Expected: todas as linhas `ok -`

- [ ] **Step 5: Commit**

```bash
git add src/lib/estudoConfig.ts src/lib/__tests__/estudoConfig.test.ts
git commit -m "feat: parse Estudo page_config and inline titles"
```

---

### Task 2: Chips de cifra da sala

**Files:**
- Create: `src/lib/estudoCifra.ts`
- Create: `src/lib/__tests__/estudoCifra.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import { applyEstudoCifraChip, ESTUDO_CIFRA_CHIPS, nextCifraBeatIndex } from '../estudoCifra'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('chip order is 7 maj7 m7 m sus triangle', () => {
  assert.deepEqual(ESTUDO_CIFRA_CHIPS.map((chip) => chip.label), ['7', 'maj7', 'm7', 'm', 'sus', '△'])
})

test('sus on Bb becomes Bbsus4; triangle on F becomes Fmaj7', () => {
  assert.equal(applyEstudoCifraChip('Bb', 'sus'), 'Bbsus4')
  assert.equal(applyEstudoCifraChip('F', 'tri'), 'Fmaj7')
  assert.equal(applyEstudoCifraChip('C', '7'), 'C7')
})

test('next cifra beat wraps to the first chord', () => {
  const beats = [{ cifra: 'C' }, {}, { cifra: 'G' }, {}]
  assert.equal(nextCifraBeatIndex(beats, 0), 2)
  assert.equal(nextCifraBeatIndex(beats, 2), 0)
  assert.equal(nextCifraBeatIndex([{ cifra: 'Dm' }], 0), 0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/lib/__tests__/estudoCifra.test.ts`

Expected: FAIL — módulo ausente

- [ ] **Step 3: Write minimal implementation**

```ts
import { applyCifraQuality } from './notationCifra'

export const ESTUDO_CIFRA_CHIPS = [
  { id: '7', label: '7', quality: '7' },
  { id: 'maj7', label: 'maj7', quality: 'maj7' },
  { id: 'm7', label: 'm7', quality: 'm7' },
  { id: 'm', label: 'm', quality: 'm' },
  { id: 'sus', label: 'sus', quality: 'sus4' },
  { id: 'tri', label: '△', quality: 'maj7' },
] as const

export type EstudoCifraChipId = (typeof ESTUDO_CIFRA_CHIPS)[number]['id']

export function applyEstudoCifraChip(current: string, chipId: EstudoCifraChipId): string {
  const chip = ESTUDO_CIFRA_CHIPS.find((item) => item.id === chipId)
  if (!chip) return current
  return applyCifraQuality(current || 'C', chip.quality)
}

export function nextCifraBeatIndex(
  beats: Array<{ cifra?: string | null }>,
  fromIndex: number,
): number {
  const indices = beats
    .map((beat, index) => (beat.cifra && beat.cifra.trim() ? index : -1))
    .filter((index) => index >= 0)
  if (indices.length === 0) return fromIndex
  const pos = indices.findIndex((index) => index > fromIndex)
  return pos >= 0 ? indices[pos] : indices[0]
}
```

- [ ] **Step 4: Run tests**

Run: `npx tsx src/lib/__tests__/estudoCifra.test.ts`

Expected: `ok -` em todos

- [ ] **Step 5: Commit**

```bash
git add src/lib/estudoCifra.ts src/lib/__tests__/estudoCifra.test.ts
git commit -m "feat: add Estudo cifra quality chips"
```

---

### Task 3: Gravura no AlphaTex

**Files:**
- Modify: `src/lib/studyNotationTex.ts`
- Modify: `src/lib/__tests__/studyNotationTex.test.ts`

O gerador já existe. `sessionToAlphaTex` emite `\ks` quando `keySignature !== 'C'` (`beatsToAlphaTex.ts` ~695). `slash-beat` e `chords` forçam `'C'` para **não** emitir armadura. `chords` vira pausa com cifra (sem `{slashed}`). `score` e `slash-rhythm` mantêm a armadura do bloco. A função passa a devolver `indexMap` (já sai de `sessionToAlphaTex`).

- [ ] **Step 1: Extend the failing tests**

Substituir `src/lib/__tests__/studyNotationTex.test.ts` por:

```ts
import assert from 'node:assert/strict'
import { studyTexFromBlock } from '../studyNotationTex'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

const slashBarBlock = {
  content: {
    notation_data: {
      clef: 'treble',
      keySignature: 'F',
      timeSignature: '4/4',
      bpm: 120,
      barsPerSystem: 4,
      beats: [
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, cifra: 'F', barAfter: false },
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, barAfter: false },
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, barAfter: false },
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, barAfter: true },
      ],
    },
  },
}

test('slash-beat omits key signature and keeps slashes', () => {
  const result = studyTexFromBlock(slashBarBlock, 'slash-beat')
  assert.ok(result)
  assert.match(result.tex, /slashed/)
  assert.match(result.tex, /ch "F"/)
  assert.doesNotMatch(result.tex, /\\ks/)
  assert.equal(result.indexMap.length, 4)
})

test('score keeps the F key signature', () => {
  const result = studyTexFromBlock(slashBarBlock, 'score')
  assert.ok(result)
  assert.match(result.tex, /\\ks/)
})

test('chords hide figures and keep cifra', () => {
  const result = studyTexFromBlock(slashBarBlock, 'chords')
  assert.ok(result)
  assert.match(result.tex, /ch "F"/)
  assert.doesNotMatch(result.tex, /slashed/)
  assert.doesNotMatch(result.tex, /\\ks/)
})

test('returns null without notation beats', () => {
  assert.equal(studyTexFromBlock({}), null)
  assert.equal(studyTexFromBlock({ content: { notation_data: { beats: [] } } }), null)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/lib/__tests__/studyNotationTex.test.ts`

Expected: FAIL — `studyTexFromBlock` ainda não aceita `displayMode` / `indexMap` / omissão de `\ks`

- [ ] **Step 3: Implement**

Substituir `src/lib/studyNotationTex.ts`:

```ts
import type { EstudoDisplayMode } from './estudoConfig'
import { hydrateNotationFromBlock, type InlineBeat } from './notationInlineHydrate'
import { sessionToAlphaTex } from './notationInlineOps'

function beatsForDisplay(beats: InlineBeat[], displayMode: EstudoDisplayMode): InlineBeat[] {
  if (displayMode !== 'chords') return beats
  return beats.map((beat) => ({
    ...beat,
    isRest: true,
    slash: false,
    pitches: [],
  }))
}

export function studyTexFromBlock(
  block: { content?: unknown; render_data?: unknown },
  displayMode: EstudoDisplayMode = 'slash-beat',
): { tex: string; barsPerSystem: number; indexMap: number[] } | null {
  const session = hydrateNotationFromBlock({
    content: block.content,
    render_data: block.render_data,
  })
  if (!session.beats.length) return null
  const hideKey = displayMode === 'slash-beat' || displayMode === 'chords'
  const { tex, indexMap } = sessionToAlphaTex({
    beats: beatsForDisplay(session.beats, displayMode),
    clef: session.clef,
    keySignature: hideKey ? 'C' : session.keySignature,
    timeSignature: session.timeSignature,
    bpm: session.bpm,
    grandStaff: session.grandStaff,
  })
  if (!tex.trim()) return null
  return { tex, barsPerSystem: session.barsPerSystem, indexMap }
}
```

Hastes do `slash-beat`: o tex continua com `{slashed}`. Esconder haste é DOM/CSS na Task 7 (`className` `estudo-slash-beat` no surface). Não inventar efeito AlphaTex novo.

- [ ] **Step 4: Run tests**

Run: `npx tsx src/lib/__tests__/studyNotationTex.test.ts`

Expected: `ok -` em todos. Se `\ks` ainda aparecer em `slash-beat`, conferir `beatsToAlphaTex.ts`: só emite `\ks` quando `options.keySignature && options.keySignature !== 'C'`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/studyNotationTex.ts src/lib/__tests__/studyNotationTex.test.ts
git commit -m "feat: render Estudo gravura modes from the same beats"
```

---

### Task 4: Path do áudio + Do MP3 grava `estudo`

**Files:**
- Modify: `src/services/playalongUpload.ts`
- Modify: `src/lib/__tests__/playalong.test.ts`
- Modify: `src/services/studyFromMp3Service.ts`
- Create: `src/services/estudoCatalogService.ts` (só `fetchCurrentUserName` neste passo; list/delete na Task 5)

A URL pública do C2 parece `…/storage/v1/object/public/content-images/playalong/inbox/{uuid}.mp3`. `removePlayalongObject` precisa do path relativo ao bucket.

- [ ] **Step 1: Add URL → path tests in `playalong.test.ts`**

Acrescentar no fim de `src/lib/__tests__/playalong.test.ts` (importar `playalongPathFromPublicUrl` de `../../services/playalongUpload` **quebra** o teste node sem Vite alias). Colocar o helper puro em `src/lib/playalong.ts` para o teste continuar sem rede:

Em `playalong.test.ts`:

```ts
import { parsePlayalong, playalongPathFromPublicUrl, playalongToJson } from '../playalong'
```

Novos testes:

```ts
test('playalongPathFromPublicUrl reads inbox path', () => {
  const url = 'https://rkfszavfqplhorvfpkcq.supabase.co/storage/v1/object/public/content-images/playalong/inbox/abc.mp3'
  assert.equal(playalongPathFromPublicUrl(url), 'playalong/inbox/abc.mp3')
})

test('playalongPathFromPublicUrl rejects other buckets', () => {
  assert.equal(playalongPathFromPublicUrl('https://x/storage/v1/object/public/other/a.mp3'), null)
  assert.equal(playalongPathFromPublicUrl('/local.mp3'), null)
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx tsx src/lib/__tests__/playalong.test.ts`

Expected: FAIL — `playalongPathFromPublicUrl` não exportado

- [ ] **Step 3: Implement helper + Do MP3 tag**

Em `src/lib/playalong.ts` (junto dos parsers):

```ts
export function playalongPathFromPublicUrl(url: string): string | null {
  const marker = '/object/public/content-images/'
  const index = url.indexOf(marker)
  if (index < 0) return null
  const path = decodeURIComponent(url.slice(index + marker.length).split('?')[0] ?? '')
  if (!path.startsWith('playalong/')) return null
  return path
}
```

Em `src/services/estudoCatalogService.ts` (criar só isto por agora):

```ts
import { supabase } from '@/lib/supabase'

export async function fetchCurrentUserName(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getUser()
  const user = sessionData.user
  if (!user) return null
  const { data } = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
  const name = typeof data?.name === 'string' ? data.name.trim() : ''
  return name || user.email || null
}
```

Em `src/services/studyFromMp3Service.ts`, o `updateMaterial` depois do insert vira:

```ts
import { estudoToJson } from '@/lib/estudoConfig'
import { fetchCurrentUserName } from './estudoCatalogService'

// dentro de createStudyMaterialFromMp3, depois de created = true:
const curatorName = await fetchCurrentUserName()
await updateMaterial(materialId, {
  page_config: {
    playalong: playalongToJson(study.playalong),
    estudo: estudoToJson({
      origin: 'from-mp3',
      displayMode: 'slash-beat',
      curatorName,
    }),
  } as unknown as GeneratedMaterial['page_config'],
})
```

Não apagar outras chaves: neste momento o draft nasce sem `page_config`, então o objeto acima é o documento inteiro.

- [ ] **Step 4: Run playalong tests**

Run: `npx tsx src/lib/__tests__/playalong.test.ts`

Expected: `ok -` em todos, inclusive os dois novos

- [ ] **Step 5: Commit**

```bash
git add src/lib/playalong.ts src/lib/__tests__/playalong.test.ts src/services/estudoCatalogService.ts src/services/studyFromMp3Service.ts
git commit -m "feat: tag Do MP3 materials as Estudo tracks"
```

---

### Task 5: Catálogo — list, backfill, delete

**Files:**
- Modify: `src/services/estudoCatalogService.ts`
- Create: `src/hooks/useEstudoMaterials.ts`

Não há teste de rede. O predicado de backfill já está coberto na Task 1.

- [ ] **Step 1: Implement catalog service**

Completar `src/services/estudoCatalogService.ts`:

```ts
import { estudoToJson, needsEstudoBackfill, parseEstudo } from '@/lib/estudoConfig'
import { parsePlayalong, playalongPathFromPublicUrl } from '@/lib/playalong'
import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import { removePlayalongObject } from './playalongUpload'
import { updateMaterial } from './materialService'

export type EstudoListItem = {
  id: string
  title: string
  created_at: string | null
  updated_at: string | null
  curatorName: string | null
  displayMode: 'slash-beat' | 'slash-rhythm' | 'chords' | 'score'
}

type CatalogRow = {
  id: string
  title: string
  page_config: Record<string, unknown> | null
  journey_id: string | null
  station_id: string | null
  created_at: string | null
  updated_at: string | null
}

export async function fetchCurrentUserName(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getUser()
  const user = sessionData.user
  if (!user) return null
  const { data } = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
  const name = typeof data?.name === 'string' ? data.name.trim() : ''
  return name || user.email || null
}

function toListItem(row: CatalogRow): EstudoListItem | null {
  const estudo = parseEstudo(row.page_config?.estudo)
  if (!estudo) return null
  return {
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    updated_at: row.updated_at,
    curatorName: estudo.curatorName,
    displayMode: estudo.displayMode,
  }
}

async function loadCatalogRows(schoolId: string): Promise<CatalogRow[]> {
  const { data, error } = await supabase
    .from('generated_materials')
    .select('id, title, page_config, journey_id, station_id, created_at, updated_at')
    .eq('school_id', schoolId)
    .is('journey_id', null)
    .is('station_id', null)
    .order('updated_at', { ascending: false })
  if (error) handleError(error)
  return (data ?? []) as CatalogRow[]
}

async function backfillRow(row: CatalogRow): Promise<CatalogRow> {
  const existing = (row.page_config ?? {}) as Record<string, unknown>
  const next = {
    ...existing,
    estudo: estudoToJson({
      origin: 'from-mp3',
      displayMode: 'slash-beat',
      curatorName: null,
    }),
  }
  await updateMaterial(row.id, { page_config: next as never })
  return { ...row, page_config: next }
}

export async function listEstudoMaterials(schoolId: string): Promise<EstudoListItem[]> {
  const rows = await loadCatalogRows(schoolId)
  const items: EstudoListItem[] = []
  for (const row of rows) {
    let current = row
    if (needsEstudoBackfill(row)) {
      current = await backfillRow(row)
    }
    const item = toListItem(current)
    if (item) items.push(item)
  }
  return items
}

export async function deleteEstudoMaterial(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('generated_materials')
    .select('id, page_config')
    .eq('id', id)
    .single()
  if (error) handleError(error)
  const pageConfig = (data?.page_config ?? {}) as Record<string, unknown>
  if (!parseEstudo(pageConfig.estudo)) {
    throw new Error('Esta faixa não é da sala de Estudo')
  }
  const playalong = parsePlayalong(pageConfig.playalong)
  const path = playalong ? playalongPathFromPublicUrl(playalong.audioUrl) : null
  if (path) {
    try {
      await removePlayalongObject(path)
    } catch (err) {
      console.warn('playalong storage remove failed', err)
    }
  }
  const { error: blockError } = await supabase.from('material_blocks').delete().eq('material_id', id)
  if (blockError) handleError(blockError)
  const { error: materialError } = await supabase.from('generated_materials').delete().eq('id', id)
  if (materialError) handleError(materialError)
}
```

`src/hooks/useEstudoMaterials.ts`:

```ts
import { useAsync } from './useAsync'
import { listEstudoMaterials, type EstudoListItem } from '@/services/estudoCatalogService'

export function useEstudoMaterials(schoolId?: string) {
  return useAsync<EstudoListItem[]>(() => {
    if (!schoolId) return Promise.resolve([])
    return listEstudoMaterials(schoolId)
  }, [schoolId])
}
```

A lista **não** chama `listMaterials` / `useMaterials`.

- [ ] **Step 2: Typecheck the new files**

Run: `npx tsc --noEmit --pretty false`

Expected: sem erro nos arquivos novos. Se `page_config` Json reclamar, manter o `as never` / `as Record<string, unknown>` já usado em `Estudo.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/services/estudoCatalogService.ts src/hooks/useEstudoMaterials.ts
git commit -m "feat: list and delete Estudo-only materials"
```

---

### Task 6: Lista `/estudo` — empty, rename, delete

**Files:**
- Create: `src/components/estudo/StudyTitleField.tsx`
- Modify: `src/pages/Estudo.tsx` (`EstudoList` só)

- [ ] **Step 1: Title field**

`src/components/estudo/StudyTitleField.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { sanitizeEstudoTitle } from '@/lib/estudoConfig'

export function StudyTitleField({
  value,
  onCommit,
  className,
}: {
  value: string
  onCommit: (next: string) => void
  className?: string
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = () => {
    const next = sanitizeEstudoTitle(draft, value)
    if (!next) {
      setDraft(value)
      return
    }
    if (next !== value) onCommit(next)
    else setDraft(next)
  }

  return (
    <input
      value={draft}
      aria-label="Nome da faixa"
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          setDraft(value)
          event.currentTarget.blur()
        }
      }}
      className={className ?? 'w-full bg-transparent font-semibold text-text outline-none'}
    />
  )
}
```

- [ ] **Step 2: Replace `EstudoList` in `src/pages/Estudo.tsx`**

Trocar `useMaterials` por `useEstudoMaterials`. Estado local `rows` copiado de `data` para rename/delete sem refetch. Empty: `Nenhuma música ainda.` Sem colunas Jornada/Estação.

```tsx
function EstudoList() {
  const navigate = useNavigate()
  const { data: school } = useSchool()
  const { data: materials, loading, error, refetch } = useEstudoMaterials(school?.id)
  const [rows, setRows] = useState<EstudoListItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (materials) setRows(materials)
  }, [materials])

  const rename = async (id: string, title: string) => {
    const previous = rows
    setRows((current) => current.map((row) => (row.id === id ? { ...row, title } : row)))
    try {
      await updateMaterial(id, { title })
    } catch (err) {
      setRows(previous)
      toast.error(err instanceof Error ? err.message : 'Não deu para renomear')
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Apagar esta faixa?')) return
    const previous = rows
    setRows((current) => current.filter((row) => row.id !== id))
    try {
      await deleteEstudoMaterial(id)
    } catch (err) {
      setRows(previous)
      toast.error(err instanceof Error ? err.message : 'Não deu para apagar')
    }
  }

  // onPickMp3: igual ao atual; no sucesso navigate(`/estudo/${id}`)
  // tabela: Título (StudyTitleField) + data curta + botão lixeira (stopPropagation)
  // empty: Nenhuma música ainda. Use Do MP3 para criar a primeira.
}
```

Clique na `<tr>` navega; clique no input e na lixeira `stopPropagation`.

Imports novos: `useEstudoMaterials`, `deleteEstudoMaterial`, `EstudoListItem`, `StudyTitleField`, `Trash` do Phosphor.

- [ ] **Step 3: Smoke list in the browser**

Run: `npx vite --port 5202 --strictPort --host`

Abrir `http://localhost:5202/estudo`

Expected: Intervalos Melódicos **não** está na tabela. “Faixa reconhecida (F)” (ou o Do MP3) está. Empty copy se não houver nenhuma.

- [ ] **Step 4: Commit**

```bash
git add src/components/estudo/StudyTitleField.tsx src/pages/Estudo.tsx
git commit -m "feat: show Estudo catalog with inline rename and delete"
```

---

### Task 7: Sala — gravura, gate, chrome, print, crédito

**Files:**
- Create: `src/components/estudo/StudySheetFrame.tsx`
- Modify: `src/components/music/StudyPlayalongSurface.tsx`
- Modify: `src/pages/Estudo.tsx` (`EstudoRoom`)
- Modify: `src/layouts/AppLayout.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Hide alphaTab credit on render**

Em `StudyPlayalongSurface.tsx`, copiar o loop do `AlphaTabViewer` (não extrair util ainda):

```ts
function hideAlphaTabCredit(container: HTMLElement | null) {
  if (!container) return
  const surface = container.querySelector('.at-surface')
  if (!surface) return
  for (const child of Array.from(surface.children) as HTMLElement[]) {
    if (child.textContent?.includes('rendered by alphaTab')) child.style.display = 'none'
  }
}
```

Chamar `hideAlphaTabCredit(hostRef.current)` em `api.renderFinished`. Acrescentar no CSS do surface:

```css
.at-study-playalong .at-surface > div:last-child { display: none !important; }
```

Nova prop opcional `displayMode?: EstudoDisplayMode`. No wrapper do scroll: `cn('at-study-playalong …', displayMode === 'slash-beat' && 'estudo-slash-beat', displayMode === 'chords' && 'estudo-chords')`.

Hastes (`slash-beat`) e figuras (`chords`): no mesmo `renderFinished`, se o modo for um dos dois, percorrer `svg line, svg rect` e esconder o que for haste vertical (`getBBox().height > getBBox().width * 2 && width < 4`). Não esconder texto (`text`). Bequadro já some no tex (sem `\ks`).

Nova prop opcional `onSelectBeat?: (ourBeatIndex: number) => void`. Em `api.beatMouseDown`, se `!markingRef.current` e `onSelectBeat`:

```ts
function flattenVoiceBeats(score: alphaTabModule.model.Score | null) {
  const beats: alphaTabModule.model.Beat[] = []
  const bars = score?.tracks?.[0]?.staves?.[0]?.bars ?? []
  for (const bar of bars) {
    for (const beat of bar.voices?.[0]?.beats ?? []) beats.push(beat)
  }
  return beats
}
```

`const ordinal = flattenVoiceBeats(api.score).indexOf(beat)`  
`onSelectBeat(indexMap[ordinal] ?? ordinal)`

Nova prop `indexMap: number[]` (default `[]`).

- [ ] **Step 2: Sheet frame**

`src/components/estudo/StudySheetFrame.tsx`:

```tsx
export function StudySheetFrame({
  schoolName,
  logoUrl,
  title,
  curatorName,
  onTitleCommit,
  children,
}: {
  schoolName: string
  logoUrl: string | null
  title: string
  curatorName: string | null
  onTitleCommit: (next: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="estudo-sheet relative rounded-[var(--radius)] border border-border bg-surface p-4">
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          className="pointer-events-none absolute inset-0 m-auto h-[55%] w-auto opacity-10 print:opacity-[0.06]"
        />
      )}
      <div className="relative mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={schoolName} className="h-10 w-auto object-contain" />
          ) : (
            <div className="text-[12px] font-semibold text-text2">{schoolName}</div>
          )}
        </div>
        <StudyTitleField
          value={title}
          onCommit={onTitleCommit}
          className="min-w-[12rem] flex-1 bg-transparent text-center font-serif text-[22px] text-text outline-none"
        />
        <div className="text-right text-[12px] text-text2">{curatorName ?? ''}</div>
      </div>
      <div className="relative">{children}</div>
      <div className="relative mt-4 flex items-center justify-between text-[11px] text-text3">
        <span className="font-serif text-[16px] text-accent">Alf</span>
        <a href="https://alphatab.net/" rel="noopener noreferrer" target="_blank">
          Pauta: alphaTab
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Room gate + gravura + print**

Em `EstudoRoom`:

- `useSchool()` para `logo_url` / `name`.
- `parseEstudo(material.page_config?.estudo)`. Se material carregou e **não** tem estudo: card “Esta faixa não é da sala de Estudo” + botão voltar. **Não** montar o player.
- `studyTexFromBlock(..., estudo.displayMode)`.
- Select/segmento de 4 modos. On change: `updateMaterial` merge `page_config` com `estudoToJson({ ...estudo, displayMode })` + playalong intacto (`mergeEstudoPageConfig`). Estado local do modo para redesenhar na hora.
- Rename do h1: `StudyTitleField` no frame; `updateMaterial({ title })`.
- Se `estudo.curatorName` for null: `fetchCurrentUserName()` e persistir no próximo `persistPlayalong` / gravura (não bloquear a tela).
- Tirar o parágrafo “corrija no Editor”.
- Botão **Imprimir** (`estudo-no-print`) chama `window.print()`.
- Envolver a pauta com `StudySheetFrame`.
- Controles (voltar, Colar faixa, Marcar, Play, gravura, Imprimir) com classe `estudo-no-print`.

Em `src/components/Sidebar.tsx`, no `cn` do `<nav>` (linha ~59), acrescentar `print:hidden`.

Em `AppLayout.tsx`: `<main>` ganha `print:ml-0`; o wrapper `p-7` ganha `print:p-0`.

Tailwind `print:` cobre o resto. Classe extra no `Estudo.tsx` wrapper:

`className="estudo-room print:bg-white"`

e nos botões `print:hidden` / `estudo-no-print print:hidden`.

Manter **Colar faixa** e **Marcar compassos** (C1). Play não pausa ao trocar gravura.

- [ ] **Step 4: Smoke**

`http://localhost:5202/estudo/<id-da-faixa>`

Expected: sem “rendered by alphaTab” no meio; rodapé Alf + Pauta: alphaTab; logo da escola se houver; slash-beat sem bequadro; URL de Intervalos mostra o gate; preview de impressão (Ctrl+P) sem sidebar/botões.

- [ ] **Step 5: Commit**

```bash
git add src/components/estudo/StudySheetFrame.tsx src/components/music/StudyPlayalongSurface.tsx src/pages/Estudo.tsx src/layouts/AppLayout.tsx src/components/Sidebar.tsx
git commit -m "feat: add Estudo sheet chrome, gravura and print"
```

---

### Task 8: Cifra clicável na sala

**Files:**
- Create: `src/components/estudo/StudyCifraOverlay.tsx`
- Modify: `src/pages/Estudo.tsx`

Não reusar `NotationCifraOverlay` (chips de raiz/acidente do Editor). Overlay da sala tem só os 6 chips da spec.

- [ ] **Step 1: Overlay component**

```tsx
import { useEffect, useRef, useState } from 'react'
import { CIFRA_MAX_LENGTH } from '@/lib/notationCifra'
import { applyEstudoCifraChip, ESTUDO_CIFRA_CHIPS, type EstudoCifraChipId } from '@/lib/estudoCifra'

export function StudyCifraOverlay({
  value,
  onCommit,
  onCancel,
  onNext,
}: {
  value: string
  onCommit: (next: string) => void
  onCancel: () => void
  onNext: (current: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value)
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [value])

  return (
    <div
      className="estudo-no-print absolute z-30 rounded-lg border border-border bg-surface p-2 shadow"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={draft}
        maxLength={CIFRA_MAX_LENGTH}
        aria-label="Cifra"
        className="mb-2 h-8 w-full rounded border border-accent px-2 font-serif text-[14px] font-bold italic outline-none"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter') {
            event.preventDefault()
            onCommit(draft)
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          }
          if (event.key === ' ' || event.code === 'Space') {
            event.preventDefault()
            onNext(draft)
          }
        }}
      />
      <div className="flex flex-wrap gap-1">
        {ESTUDO_CIFRA_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="h-6 rounded border border-border px-1.5 text-[11px] font-semibold hover:border-accent"
            onClick={() => onCommit(applyEstudoCifraChip(draft || value || 'C', chip.id as EstudoCifraChipId))}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

Posição: `absolute` no wrapper relativo da pauta (`StudySheetFrame` already `relative`). Overlay no topo da pauta (centro) neste corte — não precisa `boundsLookup`. Gesto = clique no beat (AlphaTab) abre o editor daquele índice.

- [ ] **Step 2: Wire persist in `EstudoRoom`**

Estado `editingBeat: number | null`.

`onSelectBeat` do surface: se `marking`, ignorar (já tratado no surface). Senão `setEditingBeat(index)`.

Beats vivos: copiar `notation.block_content.notation_data.beats` para estado local quando o material carrega, para o tex e o overlay não dependerem de refetch.

`commitCifra(index, raw)`:

```ts
const cifra = normalizeCifraSymbol(raw)
const nextBeats = beats.map((beat, i) => i === index ? { ...beat, cifra } : beat)
setBeats(nextBeats)
setEditingBeat(null)
await updateMaterialBlockRpc({
  blockId: notation.block_id,
  content: {
    ...notation.block_content,
    notation_data: {
      ...(notation.block_content as any).notation_data,
      beats: nextBeats,
    },
  },
})
```

`onNext(current)`: `commitCifra` no índice atual (sem fechar se quiser — spec: grava e foca o próximo). Fluxo: persistir, `setEditingBeat(nextCifraBeatIndex(nextBeats, index))`.

Esc: `setEditingBeat(null)` sem gravar.

Play **não** chama pause.

`studyTexFromBlock` usa os beats locais: montar um block `{ content: { notation_data: { ...original, beats } } }` para o tex acompanhar o patch na hora.

- [ ] **Step 3: Smoke cifra**

Expected: Play andando, clicar cifra, chip maj7, Enter, F5 mantém. Espaço vai ao próximo acorde. Esc descarta.

- [ ] **Step 4: Commit**

```bash
git add src/components/estudo/StudyCifraOverlay.tsx src/pages/Estudo.tsx
git commit -m "feat: edit Estudo chords from the player"
```

---

### Task 9: Mapa + spec + verificação

**Files:**
- Modify: `.agent/development-map.md`
- Modify: `docs/superpowers/specs/2026-08-17-estudo-sala-independente-design.md` (status)

- [ ] **Step 1: Run the lib tests together**

```
npx tsx src/lib/__tests__/estudoConfig.test.ts
npx tsx src/lib/__tests__/estudoCifra.test.ts
npx tsx src/lib/__tests__/studyNotationTex.test.ts
npx tsx src/lib/__tests__/playalong.test.ts
npx tsx src/lib/__tests__/fromMp3ToStudy.test.ts
```

Expected: todos `ok -`

- [ ] **Step 2: Spec smoke checklist**

1. `/estudo` sem caderno/Intervalos.
2. Rename na lista e na sala, F5 mantém.
3. Cifra no clique + chip; Play continua.
4. slash-beat sem bequadro; score mostra armadura; voltar não perde MP3.
5. Print: logo (se houver), professor, Alf, Pauta: alphaTab; sem crédito no meio; sem Play.
6. Apagar com confirma some da lista; URL antiga cai no gate.

- [ ] **Step 3: Update map**

`Atualizado: 2026-08-17 — Estudo corte B na branch`  
**Próximo corte:** smoke Chrome da sala independente + decidir PR 22. Não misturar Suno.

Mover o bloco do corte B para **Feito**. Spec status: `implementada na branch feat/estudo-playalong`.

- [ ] **Step 4: Commit**

```bash
git add .agent/development-map.md docs/superpowers/specs/2026-08-17-estudo-sala-independente-design.md
git commit -m "docs: mark Estudo independent room as implemented"
```

---

## Fora deste plano

MuseScore na sala; `estudo_tracks`; PDF Browserless; upload de logo; duplicar faixa; aluno deslogado; Suno/Lyria; tirar o crédito do AlphaTab sem a linha do rodapé.
