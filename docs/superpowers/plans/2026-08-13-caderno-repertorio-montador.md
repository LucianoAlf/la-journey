# Caderno de repertório — montador Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O professor monta um caderno na Biblioteca, gera um rascunho `repertoire_sheet` (capa + uma música por página) e imprime no Editor.

**Architecture:** Função pura monta os blocos. `createDraftMaterialFromNotebook` carrega a playlist, chama o montador e reutiliza `createDraftMaterialWithBlocks`. A UI do caderno (detalhe, card, caderno novo) só dispara isso. Busca local continua no `AddSongModal`; import usa `UnifiedImportModal` e devolve IDs para entrar na playlist. Gerador e Base Curada não entram.

**Tech Stack:** React, TypeScript, Supabase, `adaptRepertoireItem`, bloco `cover` / `page_break`, `sonner`, testes com `npx tsx` + `node:assert/strict` (mesmo padrão de `src/lib/__tests__/chordLibraryResolver.test.ts`).

**Spec:** `docs/superpowers/specs/2026-08-13-caderno-repertorio-montador-design.md`

---

## File map

| File | Responsibility |
|---|---|
| Create `src/lib/notebookMaterialAssembler.ts` | Monta capa + quebras + músicas. Sem I/O. |
| Create `src/lib/__tests__/notebookMaterialAssembler.test.ts` | Testes do montador. |
| Modify `src/services/repertoireCollectionService.ts` | `createDraftMaterialFromNotebook`. |
| Modify `src/components/modals/UnifiedImportModal.tsx` | `onSuccess` passa `repertoireIds`. |
| Modify `src/pages/Repertorio.tsx` | Continua compilando: `onSuccess` ganha arg opcional. |
| Modify `src/components/content/AddSongModal.tsx` | CTA “Não está no catálogo? Importar”. |
| Modify `src/components/content/NotebookDetailModal.tsx` | Gerar PDF + import → add na playlist. |
| Modify `src/components/content/NotebookCard.tsx` | Botão Gerar PDF no hover. |
| Create `src/components/content/CoverTemplatePicker.tsx` | 6 layouts + grade curta da `image_library`. |
| Modify `src/components/content/NotebookFormDialog.tsx` | Caderno novo: passo capa depois de salvar. |
| Modify `src/components/content/RepertoireNotebookTab.tsx` | Handler compartilhado de generate; create devolve o caderno. |

Não mexer em `Gerador.tsx`, `Conteudo.tsx`, nem no canvas gordo do Editor além de abrir `/editor/:id`.

---

### Task 1: Montador puro + testes

**Files:**
- Create: `src/lib/notebookMaterialAssembler.ts`
- Test: `src/lib/__tests__/notebookMaterialAssembler.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/notebookMaterialAssembler.test.ts`:

```ts
import assert from 'node:assert/strict'
import { buildNotebookMaterialBlocks } from '../notebookMaterialAssembler'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('empty songs returns zero included and no blocks', () => {
  const result = buildNotebookMaterialBlocks({
    title: 'Caderno do Chiquinho',
    songs: [],
  })
  assert.equal(result.includedSongs, 0)
  assert.equal(result.skippedMissingSongs, 0)
  assert.equal(result.blocks.length, 0)
})

test('skips missing songs and still builds the rest', () => {
  const result = buildNotebookMaterialBlocks({
    title: 'Pop',
    songs: [null, { title: 'Yesterday', artist: 'Beatles', chords: ['F', 'Em7', 'A7', 'Dm'] }],
  })
  assert.equal(result.skippedMissingSongs, 1)
  assert.equal(result.includedSongs, 1)
  assert.equal(result.blocks[0].blockType, 'cover')
  assert.equal(result.blocks[1].blockType, 'page_break')
  assert.equal(result.blocks[2].blockType, 'text')
  assert.equal(result.blocks[3].blockType, 'chord_grid')
})

test('cover uses title, template and optional image', () => {
  const result = buildNotebookMaterialBlocks({
    title: 'Caderno do Chiquinho',
    coverTemplate: 'bold',
    coverImageUrl: 'https://cdn.example/capa.jpg',
    songs: [{ title: 'Hey Jude', chords: ['F'] }],
  })
  const cover = result.blocks[0]
  assert.equal(cover.blockType, 'cover')
  assert.equal(cover.title, 'Caderno do Chiquinho')
  assert.equal(cover.renderData?.template, 'bold')
  assert.equal(cover.renderData?.cover_image_url, 'https://cdn.example/capa.jpg')
})

test('song without chords and without cifra has no chord_grid', () => {
  const result = buildNotebookMaterialBlocks({
    title: 'X',
    songs: [{ title: 'Rascunho', artist: 'Zé' }],
  })
  const types = result.blocks.map((block) => block.blockType)
  assert.deepEqual(types, ['cover', 'page_break', 'text'])
})

test('two songs each start after a page_break', () => {
  const result = buildNotebookMaterialBlocks({
    title: 'Clássicos',
    songs: [
      { title: 'Yesterday', cifra_content: '[F]Yesterday', chords: ['F'] },
      { title: 'Let It Be', chords: ['C', 'G'] },
    ],
  })
  const types = result.blocks.map((block) => block.blockType)
  assert.deepEqual(types, [
    'cover',
    'page_break',
    'text',
    'chord_grid',
    'page_break',
    'text',
    'chord_grid',
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/lib/__tests__/notebookMaterialAssembler.test.ts`

Expected: FAIL — `Cannot find module '../notebookMaterialAssembler'`

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/notebookMaterialAssembler.ts`:

```ts
import { adaptRepertoireItem, type PreparedMaterialBlock } from './contentBrowserAdapters'

export const COVER_TEMPLATES = [
  'modern',
  'elegant',
  'colorful',
  'bold',
  'classic',
  'minimal',
] as const

export type CoverTemplate = (typeof COVER_TEMPLATES)[number]

export interface NotebookSongInput {
  title?: string | null
  artist?: string | null
  key?: string | null
  chords?: string[] | null
  cifra_content?: string | null
}

export interface BuildNotebookMaterialBlocksInput {
  title: string
  songs: Array<NotebookSongInput | null | undefined>
  coverTemplate?: CoverTemplate
  coverImageUrl?: string | null
}

export interface BuildNotebookMaterialBlocksResult {
  blocks: PreparedMaterialBlock[]
  skippedMissingSongs: number
  includedSongs: number
}

function isPresentSong(song: NotebookSongInput | null | undefined): song is NotebookSongInput {
  if (!song) return false
  return Boolean(song.title?.trim() || song.artist?.trim() || song.cifra_content?.trim() || (song.chords?.length ?? 0) > 0)
}

export function buildNotebookMaterialBlocks(
  input: BuildNotebookMaterialBlocksInput
): BuildNotebookMaterialBlocksResult {
  const songs = input.songs.filter(isPresentSong)
  const skippedMissingSongs = input.songs.length - songs.length

  if (songs.length === 0) {
    return { blocks: [], skippedMissingSongs, includedSongs: 0 }
  }

  const template = input.coverTemplate ?? 'modern'
  const coverImageUrl = input.coverImageUrl?.trim() || null

  const blocks: PreparedMaterialBlock[] = [{
    blockType: 'cover',
    title: input.title,
    content: { text: input.title },
    renderData: {
      template,
      ...(coverImageUrl ? { cover_image_url: coverImageUrl } : {}),
    },
  }]

  for (const song of songs) {
    blocks.push({
      blockType: 'page_break',
      title: null,
      content: null,
      renderData: null,
    })
    blocks.push(...adaptRepertoireItem(song, { includeChordGrid: true }))
  }

  return {
    blocks,
    skippedMissingSongs,
    includedSongs: songs.length,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/lib/__tests__/notebookMaterialAssembler.test.ts`

Expected: five lines `ok - ...` and exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notebookMaterialAssembler.ts src/lib/__tests__/notebookMaterialAssembler.test.ts
git commit -m "feat: assemble repertoire notebook blocks for print drafts"
```

---

### Task 2: Service que cria o rascunho

**Files:**
- Modify: `src/services/repertoireCollectionService.ts`

- [ ] **Step 1: Add `createDraftMaterialFromNotebook` after `getCollectionItems`**

```ts
import { buildNotebookMaterialBlocks, type CoverTemplate } from '@/lib/notebookMaterialAssembler'
import { createDraftMaterialWithBlocks } from './materialService'

export async function createDraftMaterialFromNotebook(
  collection: RepertoireCollection,
  schoolId: string,
  options?: {
    coverTemplate?: CoverTemplate
    coverImageUrl?: string | null
  }
): Promise<{ materialId: string; skippedMissingSongs: number }> {
  const items = await getCollectionItems(collection.id)
  const assembled = buildNotebookMaterialBlocks({
    title: collection.name,
    coverTemplate: options?.coverTemplate,
    coverImageUrl: options?.coverImageUrl ?? collection.cover_image_url,
    songs: items.map((item) => item.repertoire ?? null),
  })

  if (assembled.includedSongs === 0) {
    throw new Error('Adicione pelo menos uma música.')
  }

  const materialId = await createDraftMaterialWithBlocks({
    schoolId,
    title: collection.name,
    type: 'repertoire_sheet',
    blocks: assembled.blocks,
    instrument: collection.instrument,
    level: collection.difficulty_level,
    description: collection.description,
    generationConfig: {
      source: 'repertoire_collection',
      collection_id: collection.id,
    },
  })

  return {
    materialId,
    skippedMissingSongs: assembled.skippedMissingSongs,
  }
}
```

Place the import of `createDraftMaterialWithBlocks` at the top of the file, next to the existing supabase imports. Do not import `adaptRepertoireItem` here.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: exit 0. If `generationConfig` type complains, the object is valid `Json` (same shape already used in `createDraftMaterialFromExercise`).

- [ ] **Step 3: Commit**

```bash
git add src/services/repertoireCollectionService.ts
git commit -m "feat: create repertoire_sheet draft from a notebook playlist"
```

---

### Task 3: Gerar PDF no detalhe e no card

**Files:**
- Modify: `src/components/content/RepertoireNotebookTab.tsx`
- Modify: `src/components/content/NotebookDetailModal.tsx`
- Modify: `src/components/content/NotebookCard.tsx`

- [ ] **Step 1: Shared handler on the tab**

In `RepertoireNotebookTab.tsx`:

```ts
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useSchool } from '@/hooks/useSchool'
import { createDraftMaterialFromNotebook } from '@/services/repertoireCollectionService'
import type { CoverTemplate } from '@/lib/notebookMaterialAssembler'

const { data: school } = useSchool()
const navigate = useNavigate()
const [generatingId, setGeneratingId] = useState<string | null>(null)

const openNotebookAsDraft = async (
  notebook: RepertoireCollection,
  options?: { coverTemplate?: CoverTemplate; coverImageUrl?: string | null }
) => {
  if (generatingId) return
  if (!school?.id) {
    toast.error('Não foi possível identificar a escola para criar o rascunho.')
    return
  }

  setGeneratingId(notebook.id)
  try {
    const result = await createDraftMaterialFromNotebook(notebook, school.id, options)
    if (result.skippedMissingSongs > 0) {
      toast.warning(`${result.skippedMissingSongs} música(s) sem dados foram puladas.`)
    }
    toast.success('Rascunho criado. Ajuste se quiser e use Imprimir / PDF.')
    navigate(`/editor/${result.materialId}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível gerar o caderno.')
  } finally {
    setGeneratingId(null)
  }
}
```

Pass `onGenerate={openNotebookAsDraft}` and `generating={generatingId === notebook.id}` into `NotebookCard` and `NotebookDetailModal`.

- [ ] **Step 2: Button on `NotebookDetailModal`**

Add props:

```ts
onGenerate: (notebook: RepertoireCollection) => void
generating?: boolean
```

Primary button on the footer right, replacing nothing essential — keep Fechar, add Gerar PDF:

```tsx
<Button
  size="sm"
  disabled={generating || !notebook}
  onClick={() => notebook && onGenerate(notebook)}
>
  {generating ? 'Gerando...' : 'Gerar PDF'}
</Button>
```

Empty caderno: the service throws `Adicione pelo menos uma música.` — toast already handled by the tab. Do not navigate.

- [ ] **Step 3: Hover button on `NotebookCard`**

Add props `onGenerate` and `generating`. First hover action:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="h-7 px-2 text-[11px] gap-1"
  disabled={generating}
  onClick={(e) => {
    e.stopPropagation()
    onGenerate(notebook)
  }}
>
  {generating ? 'Gerando...' : 'Gerar PDF'}
</Button>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/content/RepertoireNotebookTab.tsx src/components/content/NotebookDetailModal.tsx src/components/content/NotebookCard.tsx
git commit -m "feat: generate printable draft from existing repertoire notebooks"
```

---

### Task 4: Importar música sem sair do caderno

**Files:**
- Modify: `src/components/modals/UnifiedImportModal.tsx`
- Modify: `src/pages/Repertorio.tsx` (only if the new `onSuccess` signature breaks it — it should not)
- Modify: `src/components/content/AddSongModal.tsx`
- Modify: `src/components/content/NotebookDetailModal.tsx`

- [ ] **Step 1: `onSuccess` devolve IDs**

In `UnifiedImportModal.tsx` change the prop to:

```ts
onSuccess: (result?: { repertoireIds: string[] }) => void
```

Every save path already inserts and can read `.id`. Capture it:

```ts
const saved = await saveCifraToRepertoire(cifraPreview, ['Violão'])
onSuccess({ repertoireIds: saved?.id ? [saved.id] : [] })
```

Do the same for `saveSongsterrToRepertoire`, `createSong` (GP), `saveChordProToRepertoire`, and batch ChordPro (collect ids from each successful insert). `Repertorio.tsx` keeps `onSuccess={refetch}` — extra arg is ignored.

- [ ] **Step 2: CTA no `AddSongModal`**

Keep the local `repertoire` search. Below the table, add:

```tsx
<Button variant="outline" size="sm" onClick={() => onImportRequest()}>
  Não está no catálogo? Importar
</Button>
```

New prop: `onImportRequest: () => void`.

- [ ] **Step 3: Wire import on the detail modal**

State: `importOpen`. When `onImportRequest`, close add-song and open `UnifiedImportModal`. Also keep `RepertoireModal` for `onOpenEditor` (criar do zero), same as `/repertorio`.

```tsx
<UnifiedImportModal
  open={importOpen}
  onClose={() => setImportOpen(false)}
  onSuccess={async (result) => {
    const ids = result?.repertoireIds ?? []
    if (ids.length) await handleAddSongs(ids)
  }}
  onOpenEditor={() => {
    setImportOpen(false)
    setCreateSongOpen(true)
  }}
/>
<RepertoireModal
  open={createSongOpen}
  onClose={() => setCreateSongOpen(false)}
  onSuccess={async () => {
    setCreateSongOpen(false)
    toast.message('Música criada. Busque pelo título e adicione ao caderno.')
  }}
/>
```

`RepertoireModal.onSuccess` today is `() => void` and does not return the new id. Do not rewrite that modal in this cut. After “criar do zero”, the professor uses the local search (the song is now in `repertoire`). Import paths that return ids are added automatically.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/modals/UnifiedImportModal.tsx src/components/content/AddSongModal.tsx src/components/content/NotebookDetailModal.tsx src/pages/Repertorio.tsx
git commit -m "feat: import repertoire songs into a notebook without leaving the library"
```

---

### Task 5: Caderno novo — picker de capa e gerar

**Files:**
- Create: `src/components/content/CoverTemplatePicker.tsx`
- Modify: `src/components/content/NotebookFormDialog.tsx`
- Modify: `src/components/content/RepertoireNotebookTab.tsx`

- [ ] **Step 1: `CoverTemplatePicker`**

```tsx
import { COVER_TEMPLATES, type CoverTemplate } from '@/lib/notebookMaterialAssembler'
import { supabase } from '@/lib/supabase'

const LABELS: Record<CoverTemplate, string> = {
  modern: 'Modern',
  elegant: 'Elegant',
  colorful: 'Colorful',
  bold: 'Bold',
  classic: 'Classic',
  minimal: 'Minimal',
}

export function CoverTemplatePicker({
  schoolId,
  template,
  imageUrl,
  onTemplateChange,
  onImageUrlChange,
}: {
  schoolId?: string
  template: CoverTemplate
  imageUrl: string | null
  onTemplateChange: (template: CoverTemplate) => void
  onImageUrlChange: (url: string | null) => void
}) {
  // on mount, if schoolId: select id, image_url, label from image_library
  // where school_id = schoolId, order created_at desc, limit 12
  // render 6 template chips + optional image grid; click image toggles cover_image_url
}
```

Do not open `ImageGallery`. Query is enough.

- [ ] **Step 2: Two-step create on `NotebookFormDialog`**

Change `onSave` to return the created/updated row:

```ts
onSave: (values: NotebookFormValues) => Promise<RepertoireCollection | void>
```

Internal state `step: 'form' | 'cover'` starts at `form`. Edit mode never leaves `form`.

After create `onSave` returns a collection:

```ts
setCreated(collection)
setStep('cover')
```

Cover step UI: `CoverTemplatePicker` + buttons **Agora não** (close) and **Gerar PDF** (call new prop):

```ts
onGenerateAfterCreate?: (
  notebook: RepertoireCollection,
  cover: { coverTemplate: CoverTemplate; coverImageUrl: string | null }
) => Promise<void>
```

Reset `step` to `form` when `open` becomes false.

- [ ] **Step 3: `handleCreate` returns the row**

`useRepertoireCollections().create` already returns `RepertoireCollection`. Change `handleCreate` to `return create({...})`.

`handleUpdate` can return `update(...)`.

Wire:

```ts
onGenerateAfterCreate={(notebook, cover) => openNotebookAsDraft(notebook, cover)}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/content/CoverTemplatePicker.tsx src/components/content/NotebookFormDialog.tsx src/components/content/RepertoireNotebookTab.tsx
git commit -m "feat: offer cover template and generate after creating a notebook"
```

---

### Task 6: Verificação

- [ ] **Step 1: Automated**

Run:

```
npx tsx src/lib/__tests__/notebookMaterialAssembler.test.ts
npx tsc --noEmit
```

Expected: tests ok, tsc exit 0.

- [ ] **Step 2: Manual (Biblioteca → Cadernos)**

1. Caderno com 3 músicas (cifra+acordes / só acordes / só título): Gerar PDF abre o editor com capa + 3 seções, cada música em página nova.
2. Caderno vazio: toast “Adicione pelo menos uma música.” Não navega.
3. Adicionar música que já está no catálogo: entra sem ir a `/repertorio`.
4. “Não está no catálogo? Importar”: importar e a música aparece na lista do caderno.
5. Novo caderno: salvar → picker → Gerar PDF abre com o template escolhido. “Agora não” só fecha; generate depois no detalhe.
6. Imprimir / PDF no editor.
7. Gerar o mesmo caderno duas vezes: dois rascunhos `repertoire_sheet` na lista do Editor.

- [ ] **Step 3: Commit leftover only if something was fixed in verification**

Do not commit generated drafts, `.env`, or `node_modules`.

---

## Spec coverage

| Spec | Task |
|---|---|
| Grade sempre; cifra se existir | Task 1 (`adaptRepertoireItem` + `includeChordGrid: true`) |
| Gerar PDF no caderno existente | Task 3 |
| Picker no caderno novo | Task 5 |
| Abre `/editor/:id` | Task 3 / 5 |
| Capa + templates + arte | Task 1 + 5 |
| Título do caderno na capa | Task 1 |
| Uma música por página | Task 1 (`page_break`) |
| Montador, não apostila, não PDF direto | Task 2 |
| Motor de repertório no caderno | Task 4 |
| Caderno vazio / escola / item fantasma | Task 1 + 2 + 3 |
| Gerar de novo = rascunho novo | Task 2 (sempre insert) |
| Radar (aluno, pack, selo, Gerador) | Fora do plano |

## Fora de escopo (não implementar)

Selo na lista do Editor, vínculo com aluno, pack de exercícios, save-back na library, mudanças no Gerador ou na Base Curada, modo especial no canvas do Editor.
