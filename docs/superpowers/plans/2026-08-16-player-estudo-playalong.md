# Player de estudo C1 — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o professor abre `/estudo`, escolhe um material com pauta e dá play num MP3 real; o cursor do AlphaTab anda no **compasso** (2/4 e 7x inclusos).

**Architecture:** `page_config.playalong` guarda URL + sync points. Um propósito novo `study-playalong` liga o player **só** nessa sala. `hydrateNotationFromBlock` + `sessionToAlphaTex` geram o tex. `score.backingTrack.rawAudioFile` + `api.updateSyncPoints()` sincronizam. Editor continua `enablePlayer: false`.

**Tech Stack:** React + TypeScript + Vite, `@coderline/alphatab` 1.8.1, Supabase Storage (`content-images` prefixo `playalong/`), testes `npx tsx src/lib/__tests__/<arquivo>.test.ts`.

**Spec:** `docs/superpowers/specs/2026-08-16-player-estudo-playalong-design.md`

**Branch:** `feat/estudo-playalong` (worktree `.worktrees/estudo-playalong`), a partir do `main` que já tem a spec (`7fbf320` ou mais novo). **Não** ramificar de `feat/audio-didatico`. **Não** ligar o player no editor.

**Comandos:**
- Teste: `npx tsx src/lib/__tests__/playalong.test.ts` (e os outros citados na tarefa)
- Tipos: `npm run lint` (`tsc --noEmit`; não “corrigir” erros pré-existentes fora deste corte)
- Dev: `npx vite --port 5202 --strictPort --host`

Não calcular playhead por BPM. Não tocar `repertoirePdfEngine`. Não gerar Suno neste PR.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `src/lib/playalong.ts` | Tipo, parse, serialize de `page_config.playalong` | Criar |
| `src/lib/__tests__/playalong.test.ts` | Parse/default/roundtrip | Criar |
| `src/lib/studyNotationTex.ts` | Bloco de notação → AlphaTex + barsPerSystem | Criar |
| `src/lib/__tests__/studyNotationTex.test.ts` | Tex a partir de beats hidratados | Criar |
| `src/lib/alphaTabSettings.ts` | Propósito `study-playalong` | Modificar |
| `src/lib/__tests__/alphaTabSettings.test.ts` | Player só no propósito de estudo | Criar |
| `src/components/music/StudyPlayalongSurface.tsx` | AlphaTab + backing track + Play | Criar |
| `src/pages/Estudo.tsx` | Lista + sala `/estudo/:id` | Criar |
| `src/App.tsx` | Rotas | Modificar |
| `src/components/Sidebar.tsx` | Item Operacional | Modificar |
| `src/pages/Editor.tsx` | `migratePageConfig` preserva `playalong` | Modificar |
| `src/services/playalongUpload.ts` | Upload MP3 → URL pública | Criar |
| `.agent/development-map.md` | Fechar o corte no fim | Modificar no fechamento |

---

### Task 1: modelo `playalong`

**Files:**
- Create: `src/lib/playalong.ts`
- Test: `src/lib/__tests__/playalong.test.ts`

- [ ] **Step 1: escrever os testes que falham**

```ts
import assert from 'node:assert/strict'
import { parsePlayalong, playalongToJson } from '../playalong'

function test(name: string, fn: () => void) {
  try { fn(); console.log(`ok - ${name}`) }
  catch (e) { console.error(`not ok - ${name}`); throw e }
}

test('absent playalong is null', () => {
  assert.equal(parsePlayalong(undefined), null)
  assert.equal(parsePlayalong(null), null)
  assert.equal(parsePlayalong({}), null)
})

test('requires audioUrl string', () => {
  assert.equal(parsePlayalong({ audioUrl: 1 }), null)
  const p = parsePlayalong({ audioUrl: 'https://x/a.mp3' })
  assert.equal(p?.audioUrl, 'https://x/a.mp3')
  assert.equal(p?.countInMs, 0)
  assert.deepEqual(p?.syncPoints, [])
})

test('keeps sync points with bar index and syncTime', () => {
  const p = parsePlayalong({
    audioUrl: '/playalong/ovelha.mp3',
    countInMs: 2220,
    syncPoints: [
      { masterBarIndex: 0, masterBarOccurence: 0, syncTime: 2220 },
      { masterBarIndex: 5, masterBarOccurence: 0, syncTime: 13320 },
    ],
  })
  assert.equal(p?.countInMs, 2220)
  assert.equal(p?.syncPoints[1].masterBarIndex, 5)
  assert.deepEqual(playalongToJson(p!), p)
})

test('drops invalid sync points, keeps valid ones', () => {
  const p = parsePlayalong({
    audioUrl: '/a.mp3',
    syncPoints: [{ masterBarIndex: 'x' }, { masterBarIndex: 1, masterBarOccurence: 0, syncTime: 1000 }],
  })
  assert.equal(p?.syncPoints.length, 1)
  assert.equal(p?.syncPoints[0].masterBarIndex, 1)
})
```

- [ ] **Step 2: rodar e confirmar que falha**

Run: `npx tsx src/lib/__tests__/playalong.test.ts`  
Esperado: `Cannot find module '../playalong'`

- [ ] **Step 3: implementar**

```ts
export interface PlayalongSyncPoint {
  masterBarIndex: number
  masterBarOccurence: number
  syncTime: number
}

export interface PlayalongConfig {
  audioUrl: string
  countInMs: number
  syncPoints: PlayalongSyncPoint[]
}

function asFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export function parsePlayalong(raw: unknown): PlayalongConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  if (typeof rec.audioUrl !== 'string' || rec.audioUrl.trim() === '') return null
  const countIn = asFiniteNumber(rec.countInMs)
  const points = Array.isArray(rec.syncPoints) ? rec.syncPoints : []
  return {
    audioUrl: rec.audioUrl.trim(),
    countInMs: countIn && countIn > 0 ? countIn : 0,
    syncPoints: points.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const p = item as Record<string, unknown>
      const masterBarIndex = asFiniteNumber(p.masterBarIndex)
      const masterBarOccurence = asFiniteNumber(p.masterBarOccurence) ?? 0
      const syncTime = asFiniteNumber(p.syncTime)
      if (masterBarIndex === null || syncTime === null) return []
      return [{ masterBarIndex, masterBarOccurence, syncTime }]
    }),
  }
}

export function playalongToJson(config: PlayalongConfig): PlayalongConfig {
  return {
    audioUrl: config.audioUrl,
    countInMs: config.countInMs,
    syncPoints: config.syncPoints.map((p) => ({ ...p })),
  }
}
```

- [ ] **Step 4: rodar os testes**

Run: `npx tsx src/lib/__tests__/playalong.test.ts`  
Esperado: todos `ok`

- [ ] **Step 5: commit**

```bash
git add src/lib/playalong.ts src/lib/__tests__/playalong.test.ts
git commit -m "feat: parse page_config.playalong without a new column"
```

---

### Task 2: propósito `study-playalong`

**Files:**
- Modify: `src/lib/alphaTabSettings.ts`
- Test: `src/lib/__tests__/alphaTabSettings.test.ts`

- [ ] **Step 1: testes que falham**

```ts
import assert from 'node:assert/strict'
import * as alphaTabModule from '@coderline/alphatab'
import { buildAlphaTabSettings } from '../alphaTabSettings'

const editorPurposes = [
  'editor-notation-score',
  'canvas-notation-score',
  'snapshot-notation',
] as const

for (const purpose of editorPurposes) {
  const s = buildAlphaTabSettings({ purpose })
  assert.equal(s.player.enablePlayer, false, purpose)
  assert.equal(s.player.playerMode, alphaTabModule.PlayerMode.Disabled, purpose)
}

const study = buildAlphaTabSettings({ purpose: 'study-playalong', barsPerRow: 4 })
assert.equal(study.player.enablePlayer, true)
assert.equal(study.player.enableCursor, true)
assert.equal(study.player.enableAnimatedBeatCursor, false)
assert.equal(study.player.playerMode, alphaTabModule.PlayerMode.EnabledBackingTrack)
assert.equal(study.display.barsPerRow, 4)
```

- [ ] **Step 2: rodar**

Run: `npx tsx src/lib/__tests__/alphaTabSettings.test.ts`  
Esperado: falha em `'study-playalong'` (union) ou playerMode Disabled.

- [ ] **Step 3: implementação**

Em `AlphaTabPurpose` acrescente `'study-playalong'`.

No fim de `buildAlphaTabSettings`, **substitua** o bloco que zera o player por:

```ts
  const isStudy = purpose === 'study-playalong'
  settings.player.enablePlayer = isStudy
  settings.player.enableCursor = isStudy
  settings.player.enableAnimatedBeatCursor = false
  settings.player.playerMode = isStudy
    ? alphaTabModule.PlayerMode.EnabledBackingTrack
    : alphaTabModule.PlayerMode.Disabled
```

`enableAnimatedBeatCursor: false` deixa o retângulo do **compasso** (alvo do vídeo), não a linha que desliza no beat.

Não setar `soundFont` neste propósito — o áudio é o MP3. Soundfont no estudo puxaria synth e viola a spec.

- [ ] **Step 4: testes passam**

Run: `npx tsx src/lib/__tests__/alphaTabSettings.test.ts`

- [ ] **Step 5: commit**

```bash
git add src/lib/alphaTabSettings.ts src/lib/__tests__/alphaTabSettings.test.ts
git commit -m "feat: enable AlphaTab player only for study-playalong"
```

---

### Task 3: tex da sala a partir do bloco

**Files:**
- Create: `src/lib/studyNotationTex.ts`
- Test: `src/lib/__tests__/studyNotationTex.test.ts`

- [ ] **Step 1: teste**

Use um bloco mínimo com um beat slashed (o gerador já existe):

```ts
import assert from 'node:assert/strict'
import { studyTexFromBlock } from '../studyNotationTex'

const block = {
  content: {
    notation_data: {
      clef: 'treble',
      keySignature: 'D',
      timeSignature: '4/4',
      bpm: 108,
      barsPerSystem: 4,
      beats: [
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, cifra: 'D', barAfter: false },
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, barAfter: false },
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, barAfter: false },
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, barAfter: true },
      ],
    },
  },
}

const result = studyTexFromBlock(block)
assert.ok(result)
assert.equal(result.barsPerSystem, 4)
assert.match(result.tex, /slashed/)
assert.match(result.tex, /ch "D"/)
```

Bloco sem `notation_data` / sem beats → `null`.

- [ ] **Step 2: rodar — falha de módulo**

- [ ] **Step 3: implementar**

```ts
import { hydrateNotationFromBlock } from './notationInlineHydrate'
import { sessionToAlphaTex } from './notationInlineOps'

export function studyTexFromBlock(block: {
  content?: unknown
  render_data?: unknown
}): { tex: string; barsPerSystem: number } | null {
  const session = hydrateNotationFromBlock({
    content: block.content,
    render_data: block.render_data,
  })
  if (!session.beats.length) return null
  const { tex } = sessionToAlphaTex({
    beats: session.beats,
    clef: session.clef,
    keySignature: session.keySignature,
    timeSignature: session.timeSignature,
    bpm: session.bpm,
    grandStaff: session.grandStaff,
  })
  if (!tex.trim()) return null
  return { tex, barsPerSystem: session.barsPerSystem }
}
```

- [ ] **Step 4: testes passam**

- [ ] **Step 5: commit**

```bash
git add src/lib/studyNotationTex.ts src/lib/__tests__/studyNotationTex.test.ts
git commit -m "feat: build study AlphaTex from an existing notation block"
```

---

### Task 4: superfície com backing track

**Files:**
- Create: `src/components/music/StudyPlayalongSurface.tsx`

Não reusar `NotationAlphaTabSurface` (é editor: clique, cifra, seleção vermelha).

- [ ] **Step 1: componente**

A superfície:
1. Cria `AlphaTabApi` com `buildAlphaTabSettings({ purpose: 'study-playalong', layout: 'page', scale: NOTATION_DIDACTIC_SCALE, showTimeSignature: true, barsPerRow })`.
2. `settings.player.scrollElement = wrapper` (o div da pauta, não `html,body`).
3. `api.tex(tex)`.
4. No `playerReady` (ou `scoreLoaded` se o ready vier antes do score): `fetch(audioUrl)` → `arrayBuffer` → `score.backingTrack = new model.BackingTrack(); backingTrack.rawAudioFile = new Uint8Array(buf)`.
5. Para cada `syncPoints[i]`, preencha um `BackingTrackSyncPoint` (`masterBarIndex`, `masterBarOccurence`, `syncTime`; `synthBpm` / `synthTime` / `synthTick` o AlphaTab recalcula em `updateSyncPoints` se os pontos estiverem no masterBar — se a API exigir pontos no score, use `api.updateSyncPoints()` depois de anexar os pontos em `score.masterBars[i]` conforme o `.d.ts` instalado).
6. Play/pause chamam `api.play()` / `api.pause()`. Sem áudio ou fetch falhou: botão inerte, toast.
7. Esconda o cursor de beat por CSS no wrapper (`.at-cursor-beat { display: none }`) se o retângulo do compasso (`.at-cursor-bar`) já cobrir o alvo do vídeo.

Hooks públicos:

```ts
export interface StudyPlayalongSurfaceProps {
  tex: string
  barsPerRow: number
  audioUrl: string | null
  syncPoints: PlayalongSyncPoint[]
  marking: boolean
  onMarkBar?: (point: PlayalongSyncPoint) => void
}

export interface StudyPlayalongSurfaceHandle {
  play: () => void
  pause: () => void
  api: alphaTabModule.AlphaTabApi | null
}
```

No modo `marking`, um listener de teclado (espaço) ou clique no wrapper grava `{ masterBarIndex: api.tickPosition... }` — se o tick map ainda não expuser o índice com facilidade, use `api.uiTickPosition` / evento `playedBeatChanged` para ler `beat.voice.bar.masterBar.index` e `currentTime` do output do backing track (`api.timePosition` em ms → `syncTime`). Não invente `currentTime / (60/bpm*4)`.

- [ ] **Step 2: conferir no browser que a pauta desenha sem MP3** (Play inerte).

- [ ] **Step 3: commit**

```bash
git add src/components/music/StudyPlayalongSurface.tsx
git commit -m "feat: study surface plays a backing-track MP3 with bar cursor"
```

---

### Task 5: página, rota, sidebar

**Files:**
- Create: `src/pages/Estudo.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: rotas**

Em `App.tsx`, importe `Estudo` e acrescente junto das rotas de Operacional:

```tsx
<Route path="estudo" element={<Estudo />} />
<Route path="estudo/:id" element={<Estudo />} />
```

- [ ] **Step 2: sidebar**

Em `navItems`, depois de Visão Professor:

```ts
{ id: "estudo", label: "Estudo", icon: MusicNotes },
```

`MusicNotes` já está importado. Path vira `/estudo` pelo `id`.

- [ ] **Step 3: página**

`Estudo.tsx`:
- Sem `:id`: `useMaterials(schoolId)` (mesmo hook do editor). Lista título; clique → `navigate(/estudo/${id})`.
- Com `:id`: `useMaterialWithBlocks(id)`. Primeiro bloco `block_type === 'notation'` (campo `block_type` nas rows). `studyTexFromBlock({ content: row.block_content, render_data: row.block_render_data })`. `parsePlayalong(rows[0].page_config?.playalong)`.
- Sem bloco de notação: estado vazio (“este material não tem pauta”).
- Header: título do material + botão Play/Pause (ref da superfície).
- Input file “Carregar playalong” (Task 6).
- Não renderize A4, régua, blocos de texto, capa.

`useSchool` como no Editor para `schoolId` se `listMaterials` precisar.

- [ ] **Step 4: smoke visual** — item Estudo na sidebar, lista abre, material com pauta mostra a grade.

- [ ] **Step 5: commit**

```bash
git add src/pages/Estudo.tsx src/App.tsx src/components/Sidebar.tsx
git commit -m "feat: add Estudo page under Operacional"
```

---

### Task 6: persistir MP3 + `playalong` no `page_config`

**Files:**
- Create: `src/services/playalongUpload.ts`
- Modify: `src/pages/Editor.tsx` (`migratePageConfig` ~linha 261)
- Modify: `src/pages/Estudo.tsx`

- [ ] **Step 1: migrate não apaga**

Em `migratePageConfig`, depois de `orientation: parsePageOrientation(raw.orientation),` acrescente:

```ts
playalong: parsePlayalong(raw.playalong) ?? undefined,
```

Importe `parsePlayalong` de `@/lib/playalong`. O `...pc` já copiaria o campo cru; o parse garante URL inválida → omitido, não quebra o editor.

`PageConfig` ganha `playalong?: PlayalongConfig`.

- [ ] **Step 2: upload**

Espelhe `handleFloatingImageUpload` (`Editor.tsx` ~4666), bucket `content-images`, path `playalong/${materialId}/${crypto.randomUUID()}.mp3`. Aceitar `audio/mpeg` e `audio/ogg`. Máximo 20MB.

```ts
export async function uploadPlayalongFile(materialId: string, file: File): Promise<string> {
  const typeOk = file.type === 'audio/mpeg' || file.type === 'audio/ogg' || file.type === 'audio/mp4'
  if (!typeOk) throw new Error('Use MP3 ou OGG')
  if (file.size > 20 * 1024 * 1024) throw new Error('Áudio no máximo 20MB')
  const ext = file.name.split('.').pop()?.toLowerCase() === 'ogg' ? 'ogg' : 'mp3'
  const filePath = `playalong/${materialId}/${crypto.randomUUID()}.${ext}`
  const { data, error } = await supabase.storage.from('content-images').upload(filePath, file, {
    contentType: file.type || 'audio/mpeg',
    upsert: true,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('content-images').getPublicUrl(data.path).data.publicUrl
}
```

Se o bucket recusar MIME, o toast mostra a mensagem do Storage — não criar migration neste corte a menos que o upload falhe no smoke; aí bucket `playalong-audio` vira hotfix da mesma task.

Depois do upload, `updateMaterial(id, { page_config: { ...existing, playalong: playalongToJson({ audioUrl, countInMs: 0, syncPoints: existing?.syncPoints ?? [] }) } })`.

- [ ] **Step 3: smoke** — carregar um MP3 curto, recarregar `/estudo/:id`, Play não some.

- [ ] **Step 4: commit**

```bash
git add src/services/playalongUpload.ts src/pages/Editor.tsx src/pages/Estudo.tsx
git commit -m "feat: store study playalong URL on page_config"
```

---

### Task 7: modo marcar compassos

**Files:**
- Modify: `src/components/music/StudyPlayalongSurface.tsx`
- Modify: `src/pages/Estudo.tsx`

- [ ] **Step 1:** botão “Marcar compassos” na sala. Enquanto ativo e o MP3 toca, Espaço (e clique na pauta) anexa um ponto com o `syncTime` = `api.timePosition` e `masterBarIndex` do master bar tocado. Dedup pelo par `(masterBarIndex, masterBarOccurence)`.

- [ ] **Step 2:** ao sair do modo ou pausar, `updateMaterial` com `syncPoints` novos.

- [ ] **Step 3:** prova: 2/4 no meio — o ponto desse compasso tem `syncTime` menor que o de um 4/4 “chutável”; o cursor não atrasa depois dele.

- [ ] **Step 4: commit**

```bash
git add src/components/music/StudyPlayalongSurface.tsx src/pages/Estudo.tsx
git commit -m "feat: tap-sync playalong bars instead of BPM math"
```

---

### Task 8: prova Ovelha + mapa

**Files:**
- Modify: `.agent/development-map.md`

- [ ] **Step 1:** no `/estudo`, abrir o material da Ovelha (o mesmo da A4). Carregar o playalong (gravação ou faixa pronta). Marcar compassos no count-in + tempo 1 de cada barra da primeira tela. Play: retângulo no compasso 1; o 2/4 não descola; Solo 7x conta volta (`masterBarOccurence`).

- [ ] **Step 2:** conferir `/editor/:id` da Ovelha: **não** há cursor, **não** há som de player (os nove propósitos continuam desligados).

- [ ] **Step 3:** testes

```bash
npx tsx src/lib/__tests__/playalong.test.ts
npx tsx src/lib/__tests__/alphaTabSettings.test.ts
npx tsx src/lib/__tests__/studyNotationTex.test.ts
```

Todos `ok`.

- [ ] **Step 4:** mapa — mover C1 de “spec/plano” para Feito; **Próximo corte** = aluno na sala Estudo **ou** o item 1 do radar (PDF deitado) se ainda não conferido. Não apagar o norte do subproduto (loops, rudimento, GarageBand).

- [ ] **Step 5: commit**

```bash
git add .agent/development-map.md
git commit -m "docs: mark study-player C1 after Ovelha playalong smoke"
```

---

## Fora deste plano

Aluno, filtro de tipo, loops, 40 rudimentos, Smart, mixer, soundfont Vera, Suno, stretch/pitch, Soundslice, PDF, player no editor.
