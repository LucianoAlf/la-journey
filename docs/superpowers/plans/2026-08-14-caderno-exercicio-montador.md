# Caderno de exercício — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O professor cria cadernos de exercício na Biblioteca, monta capa + exercícios e abre um rascunho `exercise_sheet` no editor; o caderno de repertório passa a viver em `/repertorio`.

**Architecture:** Tabelas dedicadas `exercise_collections` + `exercise_collection_items`. Montador puro (`buildExerciseNotebookBlocks`) concatena capa, cabeçalho e `adaptExerciseLibraryItem`. Snapshot no insert via `createDraftMaterialWithBlocks`. Sem print recipe. Sem `generateRepertoireBookPdf`.

**Tech Stack:** Vite/React, Supabase (Postgres + RLS), `npx tsx --test` para unitários, padrão de UI do caderno de repertório.

**Spec:** `docs/superpowers/specs/2026-08-14-caderno-exercicio-montador-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/exerciseNotebookAssembler.ts` | Capa + cabeçalho + blocos do exercício. Sem I/O. |
| `src/lib/__tests__/exerciseNotebookAssembler.test.ts` | Contratos do montador. |
| `supabase/migrations/20260814200000_exercise_collections.sql` | Schema + RLS. |
| `src/services/exerciseCollectionService.ts` | CRUD caderno/itens + `createDraftMaterialFromExerciseNotebook`. |
| `src/hooks/useExerciseCollections.ts` | Lista/criar/editar/apagar cadernos da escola. |
| `src/components/content/AddExerciseModal.tsx` | Picker da `exercise_library`. |
| `src/components/content/ExerciseNotebookCard.tsx` | Card da lista. |
| `src/components/content/ExerciseNotebookFormDialog.tsx` | Criar/editar + picker de capa. |
| `src/components/content/ExerciseNotebookDetailModal.tsx` | Itens, adicionar, remover, montar. |
| `src/components/content/ExerciseNotebookTab.tsx` | Lista e orquestra o fluxo. |
| `src/components/content/ExerciseTab.tsx` | Sub-aba Cadernos aponta para exercícios, não repertório. |
| `src/pages/Repertorio.tsx` | Seção Músicas \| Cadernos. |

Não generalizar `NotebookCard` / `RepertoireCollection`. Copiar o padrão, tipos próprios.

Não misturar image-gen / Iconify / Recraft neste corte.

---

### Task 1: Montador de blocos (TDD)

**Files:**
- Create: `src/lib/exerciseNotebookAssembler.ts`
- Test: `src/lib/__tests__/exerciseNotebookAssembler.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/exerciseNotebookAssembler.test.ts`:

```ts
import assert from 'node:assert/strict'
import { buildExerciseNotebookBlocks } from '../exerciseNotebookAssembler.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('empty exercises returns zero included and no blocks', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'Técnica Grow',
    exercises: [],
  })
  assert.equal(result.includedExercises, 0)
  assert.equal(result.skippedMissingExercises, 0)
  assert.equal(result.blocks.length, 0)
})

test('skips missing exercises and still builds the rest', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'Técnica',
    exercises: [
      null,
      {
        title: 'Cromático 1-2-3-4',
        category: 'technique',
        difficulty_level: 'grow',
        blocks: [{ block_type: 'text', title: 'Instruções', content: { html: '<p>Palheta</p>' } }],
      },
    ],
  })
  assert.equal(result.skippedMissingExercises, 1)
  assert.equal(result.includedExercises, 1)
  assert.equal(result.blocks[0].blockType, 'cover')
  assert.equal(result.blocks[1].blockType, 'page_break')
  assert.equal(result.blocks[2].blockType, 'text')
  assert.equal(result.blocks[2].title, 'Cromático 1-2-3-4')
  assert.equal(result.blocks[3].blockType, 'text')
  assert.equal(result.blocks[3].title, 'Instruções')
})

test('cover uses title, template and optional image', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'Leitura',
    coverTemplate: 'bold',
    coverImageUrl: 'https://cdn.example/capa.jpg',
    exercises: [{ title: 'Semínimas', category: 'rhythm', blocks: [] }],
  })
  const cover = result.blocks[0]
  assert.equal(cover.blockType, 'cover')
  assert.equal(cover.renderData?.template, 'bold')
  assert.equal(cover.renderData?.titulo, 'Leitura')
  assert.equal(cover.renderData?.cover_image_url, 'https://cdn.example/capa.jpg')
})

test('exercise without blocks still gets a header', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'X',
    exercises: [{ title: 'Rascunho', category: 'other' }],
  })
  const types = result.blocks.map((block) => block.blockType)
  assert.deepEqual(types, ['cover', 'page_break', 'text'])
  assert.equal(result.blocks[2].title, 'Rascunho')
})

test('header shows category, level and minutes', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'X',
    exercises: [{
      title: 'Cromático',
      category: 'technique',
      difficulty_level: 'grow',
      estimated_minutes: 10,
      blocks: [],
    }],
  })
  const header = result.blocks[2]
  assert.match(String(header.content?.text ?? ''), /Técnica/)
  assert.match(String(header.content?.text ?? ''), /Grow/)
  assert.match(String(header.content?.text ?? ''), /10 min/)
})

test('two exercises each start after a page_break', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'Pack',
    exercises: [
      { title: 'A', category: 'rhythm', blocks: [{ block_type: 'text', title: 'Um', content: { html: '<p>1</p>' } }] },
      { title: 'B', category: 'harmony', blocks: [{ block_type: 'text', title: 'Dois', content: { html: '<p>2</p>' } }] },
    ],
  })
  const types = result.blocks.map((block) => block.blockType)
  assert.deepEqual(types, [
    'cover',
    'page_break',
    'text',
    'text',
    'page_break',
    'text',
    'text',
  ])
  assert.equal(result.blocks[2].title, 'A')
  assert.equal(result.blocks[5].title, 'B')
})

test('cover includes school and professor when provided', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'Técnica Grow',
    instrument: 'Violão',
    level: 'grow',
    schoolName: 'LA Music',
    professorName: 'Alf',
    exercises: [{ title: 'Cromático', blocks: [] }],
  })
  const cover = result.blocks[0]
  assert.equal(cover.renderData?.professor, 'Alf')
  assert.equal(cover.renderData?.escola, 'LA Music')
  assert.equal(cover.renderData?.nivel, 'Grow')
  assert.equal(cover.renderData?.instrumento, 'Violão')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/exerciseNotebookAssembler.test.ts`

Expected: `ERR_MODULE_NOT_FOUND` for `exerciseNotebookAssembler.ts`

- [ ] **Step 3: Write the assembler**

Create `src/lib/exerciseNotebookAssembler.ts`:

```ts
import { adaptExerciseLibraryItem, type PreparedMaterialBlock } from './contentBrowserAdapters'
import { EXERCISE_CATEGORIES, getExerciseOptionLabel } from './exerciseLibraryOptions'
import {
  buildCoverRenderData,
  notebookLevelLabel,
  type CoverTemplate,
} from './notebookMaterialAssembler'

export interface ExerciseNotebookItemInput {
  title?: string | null
  category?: string | null
  difficulty_level?: string | null
  estimated_minutes?: number | null
  blocks?: Array<{
    block_type?: unknown
    title?: string | null
    content?: unknown
    render_data?: unknown
  }> | null
}

export interface BuildExerciseNotebookBlocksInput {
  title: string
  exercises: Array<ExerciseNotebookItemInput | null | undefined>
  coverTemplate?: CoverTemplate
  coverImageUrl?: string | null
  instrument?: string | null
  level?: string | null
  schoolName?: string | null
  professorName?: string | null
  logoUrl?: string | null
}

export interface BuildExerciseNotebookBlocksResult {
  blocks: PreparedMaterialBlock[]
  skippedMissingExercises: number
  includedExercises: number
}

function isPresentExercise(
  exercise: ExerciseNotebookItemInput | null | undefined,
): exercise is ExerciseNotebookItemInput {
  if (!exercise) return false
  return Boolean(
    exercise.title?.trim()
    || (exercise.blocks?.length ?? 0) > 0,
  )
}

export function buildExerciseHeaderBlock(exercise: ExerciseNotebookItemInput): PreparedMaterialBlock {
  const title = exercise.title?.trim() || 'Exercício'
  const category = getExerciseOptionLabel(EXERCISE_CATEGORIES, exercise.category)
  const level = notebookLevelLabel(exercise.difficulty_level)
  const minutes = typeof exercise.estimated_minutes === 'number' && exercise.estimated_minutes > 0
    ? `${exercise.estimated_minutes} min`
    : ''
  const meta = [category, level, minutes].filter(Boolean).join(' · ')

  return {
    blockType: 'text',
    title,
    content: {
      html: `<p>${meta || title}</p>`,
      text: meta || title,
    },
    renderData: {
      pagination: {
        behavior: 'breakable',
        keepWithNext: true,
        allowSplit: false,
      },
    },
  }
}

export function buildExerciseNotebookBlocks(
  input: BuildExerciseNotebookBlocksInput,
): BuildExerciseNotebookBlocksResult {
  const exercises = input.exercises.filter(isPresentExercise)
  const skippedMissingExercises = input.exercises.length - exercises.length

  if (exercises.length === 0) {
    return { blocks: [], skippedMissingExercises, includedExercises: 0 }
  }

  const blocks: PreparedMaterialBlock[] = [{
    blockType: 'cover',
    title: input.title,
    content: { text: input.title },
    renderData: buildCoverRenderData({
      title: input.title,
      coverTemplate: input.coverTemplate,
      coverImageUrl: input.coverImageUrl,
      instrument: input.instrument,
      level: input.level,
      schoolName: input.schoolName,
      professorName: input.professorName,
      logoUrl: input.logoUrl,
    }),
  }]

  for (const exercise of exercises) {
    blocks.push({
      blockType: 'page_break',
      title: null,
      content: null,
      renderData: null,
    })
    blocks.push(buildExerciseHeaderBlock(exercise))
    blocks.push(...adaptExerciseLibraryItem(exercise))
  }

  return {
    blocks,
    skippedMissingExercises,
    includedExercises: exercises.length,
  }
}
```

Do not escape HTML in the header meta: labels come from `EXERCISE_CATEGORIES` / `NOTEBOOK_LEVEL_LABELS`, not from free text. Title in `content.html` is only used when meta is empty; then it is the exercise title from the library. If a title could contain `<`, escape it:

```ts
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

html: `<p>${escapeHtml(meta || title)}</p>`
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/lib/__tests__/exerciseNotebookAssembler.test.ts`

Expected: all `ok -` lines, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/exerciseNotebookAssembler.ts src/lib/__tests__/exerciseNotebookAssembler.test.ts
git commit -m "feat(exercise-notebook): add assembler for cover, headers and exercise blocks"
```

---

### Task 2: Migration `exercise_collections`

**Files:**
- Create: `supabase/migrations/20260814200000_exercise_collections.sql`

- [ ] **Step 1: Write the migration**

```sql
create table if not exists public.exercise_collections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  name text not null,
  description text,
  instrument text not null default 'universal',
  difficulty_level public.difficulty_level not null default 'foundation',
  tags text[] not null default '{}',
  cover_image_url text,
  is_template boolean not null default false,
  curation_status public.curation_status not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercise_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.exercise_collections(id) on delete cascade,
  exercise_id uuid not null references public.exercise_library(id) on delete cascade,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (collection_id, exercise_id)
);

create index if not exists exercise_collections_school_idx
  on public.exercise_collections (school_id, sort_order);

create index if not exists exercise_collection_items_collection_idx
  on public.exercise_collection_items (collection_id, sort_order);

comment on table public.exercise_collections is
  'Cadernos temáticos de exercício. Agrupa itens da exercise_library por instrumento, nível ou propósito pedagógico.';
comment on table public.exercise_collection_items is
  'Exercícios vinculados a um caderno. Um exercício pode estar em múltiplos cadernos.';

alter table public.exercise_collections enable row level security;
alter table public.exercise_collection_items enable row level security;

create policy exercise_collections_select on public.exercise_collections
  for select using (
    school_id is null
    or school_id in (select users.school_id from public.users where users.id = auth.uid())
  );

create policy exercise_collections_insert on public.exercise_collections
  for insert with check (
    school_id in (select users.school_id from public.users where users.id = auth.uid())
  );

create policy exercise_collections_update on public.exercise_collections
  for update using (
    school_id in (select users.school_id from public.users where users.id = auth.uid())
  );

create policy exercise_collections_delete on public.exercise_collections
  for delete using (
    school_id in (select users.school_id from public.users where users.id = auth.uid())
  );

create policy exercise_collection_items_select on public.exercise_collection_items
  for select using (
    collection_id in (select exercise_collections.id from public.exercise_collections)
  );

create policy exercise_collection_items_insert on public.exercise_collection_items
  for insert with check (
    collection_id in (
      select exercise_collections.id from public.exercise_collections
      where exercise_collections.school_id in (
        select users.school_id from public.users where users.id = auth.uid()
      )
    )
  );

create policy exercise_collection_items_update on public.exercise_collection_items
  for update using (
    collection_id in (
      select exercise_collections.id from public.exercise_collections
      where exercise_collections.school_id in (
        select users.school_id from public.users where users.id = auth.uid()
      )
    )
  );

create policy exercise_collection_items_delete on public.exercise_collection_items
  for delete using (
    collection_id in (
      select exercise_collections.id from public.exercise_collections
      where exercise_collections.school_id in (
        select users.school_id from public.users where users.id = auth.uid()
      )
    )
  );

create policy exercise_collections_dev_admin on public.exercise_collections
  using (is_dev_admin()) with check (is_dev_admin());

create policy exercise_collection_items_dev_admin on public.exercise_collection_items
  using (is_dev_admin()) with check (is_dev_admin());
```

If `create policy ... using (is_dev_admin())` without `for all` fails, use `for all` like other tables, or copy the exact `dev_admin_all` definition from `repertoire_collections` via SQL and paste it.

- [ ] **Step 2: Apply remotely**

Use Supabase MCP `apply_migration` with `project_id` `rkfszavfqplhorvfpkcq` and the SQL above (name: `exercise_collections`).

Also keep the file in `supabase/migrations/` so git tracks it.

Verify:

```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('exercise_collections', 'exercise_collection_items');
```

Expected: two rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260814200000_exercise_collections.sql
git commit -m "feat(db): add exercise_collections and items with RLS"
```

---

### Task 3: Service de coleção + montar rascunho

**Files:**
- Create: `src/services/exerciseCollectionService.ts`

- [ ] **Step 1: Implement the service**

Mirror `src/services/repertoireCollectionService.ts`, with these types and the mount function. Use `const db = supabase as any` (same as repertoire collections; types are not in `database.types.ts` yet).

```ts
import {
  coverTemplateFromTags,
  withCoverTemplateTag,
  type CoverTemplate,
} from '@/lib/notebookMaterialAssembler'
import { buildExerciseNotebookBlocks } from '@/lib/exerciseNotebookAssembler'
import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import { createDraftMaterialWithBlocks } from './materialService'
import type { ExerciseLibraryItem } from './exerciseLibraryService'

const db = supabase as any

export interface ExerciseCollection {
  id: string
  school_id: string | null
  name: string
  description: string | null
  instrument: string
  difficulty_level: string
  tags: string[]
  cover_image_url: string | null
  is_template: boolean
  curation_status: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ExerciseCollectionItem {
  id: string
  collection_id: string
  exercise_id: string
  sort_order: number
  notes: string | null
  created_at: string
}

export async function getExerciseCollections(
  filters: { instrument?: string; search?: string } = {},
): Promise<ExerciseCollection[]> {
  let query = db
    .from('exercise_collections')
    .select('*')
    .order('sort_order', { ascending: true })

  if (filters.instrument) query = query.eq('instrument', filters.instrument)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)

  const { data, error } = await query
  if (error) handleError(error)
  return data ?? []
}

export async function createExerciseCollection(
  collection: Omit<ExerciseCollection, 'id' | 'created_at' | 'updated_at'>,
): Promise<ExerciseCollection> {
  const { data, error } = await db
    .from('exercise_collections')
    .insert(collection)
    .select()
    .single()
  if (error) handleError(error)
  return data
}

export async function updateExerciseCollection(
  id: string,
  updates: Partial<ExerciseCollection>,
): Promise<ExerciseCollection> {
  const { data, error } = await db
    .from('exercise_collections')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) handleError(error)
  return data
}

export async function deleteExerciseCollection(id: string): Promise<void> {
  const { error } = await db.from('exercise_collections').delete().eq('id', id)
  if (error) handleError(error)
}

export async function getExerciseCollectionItems(
  collectionId: string,
): Promise<(ExerciseCollectionItem & { exercise: ExerciseLibraryItem | null })[]> {
  const { data, error } = await db
    .from('exercise_collection_items')
    .select('*, exercise:exercise_library(*)')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true })
  if (error) handleError(error)
  return data ?? []
}

export async function addExerciseToCollection(
  collectionId: string,
  exerciseId: string,
  notes?: string,
): Promise<ExerciseCollectionItem> {
  const { data: existing } = await db
    .from('exercise_collection_items')
    .select('sort_order')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order || 0) + 1
  const { data, error } = await db
    .from('exercise_collection_items')
    .insert({
      collection_id: collectionId,
      exercise_id: exerciseId,
      sort_order: nextOrder,
      notes,
    })
    .select()
    .single()
  if (error) handleError(error)
  return data
}

export async function removeExerciseFromCollection(itemId: string): Promise<void> {
  const { error } = await db
    .from('exercise_collection_items')
    .delete()
    .eq('id', itemId)
  if (error) handleError(error)
}

export async function createDraftMaterialFromExerciseNotebook(
  collection: ExerciseCollection,
  schoolId: string,
  options?: {
    coverTemplate?: CoverTemplate
    coverImageUrl?: string | null
    schoolName?: string | null
    professorName?: string | null
    logoUrl?: string | null
  },
): Promise<{ materialId: string; skippedMissingExercises: number }> {
  const items = await getExerciseCollectionItems(collection.id)
  const coverTemplate = options?.coverTemplate ?? coverTemplateFromTags(collection.tags) ?? 'modern'

  if (options?.coverTemplate) {
    try {
      await updateExerciseCollection(collection.id, {
        tags: withCoverTemplateTag(collection.tags, options.coverTemplate),
        cover_image_url: options.coverImageUrl ?? collection.cover_image_url,
      })
    } catch {
      // capa ainda entra no rascunho se o tag falhar
    }
  }

  const assembled = buildExerciseNotebookBlocks({
    title: collection.name,
    coverTemplate,
    coverImageUrl: options?.coverImageUrl ?? collection.cover_image_url,
    instrument: collection.instrument,
    level: collection.difficulty_level,
    schoolName: options?.schoolName,
    professorName: options?.professorName,
    logoUrl: options?.logoUrl,
    exercises: items.map((item) => item.exercise ?? null),
  })

  if (assembled.includedExercises === 0) {
    throw new Error('Adicione pelo menos um exercício.')
  }

  const materialId = await createDraftMaterialWithBlocks({
    schoolId,
    title: collection.name,
    type: 'exercise_sheet',
    blocks: assembled.blocks,
    instrument: collection.instrument,
    level: collection.difficulty_level,
    description: collection.description,
    generationConfig: {
      source: 'exercise_collection',
      collection_id: collection.id,
    },
  })

  return {
    materialId,
    skippedMissingExercises: assembled.skippedMissingExercises,
  }
}
```

The embed `exercise:exercise_library(*)` must match PostgREST. If the FK name is ambiguous, use:

```ts
.select('*, exercise_library(*)')
```

and map `item.exercise_library` to `exercise` in JS.

Do **not** call `generateRepertoireBookPdf`.

Also export `getExerciseCollectionById` if the form needs a refetch; otherwise skip.

- [ ] **Step 2: Commit**

```bash
git add src/services/exerciseCollectionService.ts
git commit -m "feat(exercise-notebook): add collection CRUD and draft assembler service"
```

---

### Task 4: Hook `useExerciseCollections`

**Files:**
- Create: `src/hooks/useExerciseCollections.ts`

- [ ] **Step 1: Implement**

Copy the structure of `src/hooks/useRepertoireCollections.ts` with these substitutions:

- Import `createExerciseCollection`, `deleteExerciseCollection`, `getExerciseCollections`, `updateExerciseCollection`, `ExerciseCollection` from `@/services/exerciseCollectionService`
- Filters: `{ instrument?: string | null; search?: string | null }` — no `genre`
- `getExerciseCollections(normalizedFilters)`
- Toasts: "Caderno criado!" / "Caderno atualizado!" / "Caderno removido!"
- Return `{ collections, loading, error, school, refetch, create, update, remove }`

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useExerciseCollections.ts
git commit -m "feat(exercise-notebook): add collections hook"
```

---

### Task 5: Picker `AddExerciseModal`

**Files:**
- Create: `src/components/content/AddExerciseModal.tsx`

- [ ] **Step 1: Implement the picker**

Follow the layout of `src/components/content/AddSongModal.tsx` (search, checkbox table, footer Adicionar). Differences:

- Data: `getExercises({ search }, 0, 50)` from `@/services/exerciseLibraryService`
- Columns: título, categoria (`getExerciseOptionLabel(EXERCISE_CATEGORIES, …)`), instrumento, nível
- Props:

```ts
interface AddExerciseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingExerciseIds: string[]
  onAddExercises: (exerciseIds: string[]) => Promise<void>
}
```

- Disable rows already in `existingExerciseIds`
- No “importar de fora” button (spec: não cria exercício novo neste modal)
- Debounce search 250ms like `AddSongModal`

- [ ] **Step 2: Commit**

```bash
git add src/components/content/AddExerciseModal.tsx
git commit -m "feat(exercise-notebook): add library picker modal"
```

---

### Task 6: UI do caderno (card, form, detalhe, tab)

**Files:**
- Create: `src/components/content/ExerciseNotebookCard.tsx`
- Create: `src/components/content/ExerciseNotebookFormDialog.tsx`
- Create: `src/components/content/ExerciseNotebookDetailModal.tsx`
- Create: `src/components/content/ExerciseNotebookTab.tsx`

- [ ] **Step 1: Card**

Copy `src/components/content/NotebookCard.tsx`. Change:

- Type `ExerciseCollection & { exerciseCount: number }`
- Badge shows `exerciseCount` + “exercício(s)” instead of músicas
- No genre badge
- `onGenerate` label on the button: **Montar** (not Gerar PDF)

- [ ] **Step 2: Form dialog**

Copy `src/components/content/NotebookFormDialog.tsx`. Change:

- Types use `ExerciseCollection`
- Form values: `name`, `description`, `instrument`, `difficulty_level` — **no genre field**
- Instrument options from `EXERCISE_INSTRUMENTS` in `src/lib/exerciseLibraryOptions.ts`
- Cover step stays (`CoverTemplatePicker`)
- `onGenerateAfterCreate` still exists but the parent will only montar if the caderno already has items (usually none on create) — after create, persist cover and close; professor adds exercises in the detail modal. If `onGenerateAfterCreate` is omitted, just save cover tags via `onPersistCover`.

Parent persist cover:

```ts
await update(notebook.id, {
  cover_image_url: cover.coverImageUrl,
  tags: withCoverTemplateTag(notebook.tags, cover.coverTemplate),
})
```

- [ ] **Step 3: Detail modal**

Copy the shell of `src/components/content/NotebookDetailModal.tsx` without `UnifiedImportModal`, `RepertoireSheet`, `RepertoireModal`, `CurationStamp`, `AddSongModal`.

- Load via `getExerciseCollectionItems`
- List: título, categoria, instrumento
- Add opens `AddExerciseModal`
- `onAddExercises`: `Promise.all(ids.map((id) => addExerciseToCollection(notebook.id, id)))` then reload
- Remove via `removeExerciseFromCollection`
- Primary button: **Montar e abrir no editor** → `onGenerate(notebook)`
- Empty state: “Adicione pelo menos um exercício”

- [ ] **Step 4: Tab**

Copy the orchestration of `src/components/content/RepertoireNotebookTab.tsx` with these rules:

- Hook: `useExerciseCollections`
- Counts: `getExerciseCollectionItems` → `exerciseCount`
- `openNotebookAsDraft`:
  - Resolve professor name via `getUserById` (same as repertório)
  - Call `createDraftMaterialFromExerciseNotebook(notebook, school.id, { coverTemplate, coverImageUrl, schoolName, professorName, logoUrl })`
  - Toast if `skippedMissingExercises > 0`
  - **Do not** generate PDF
  - `navigate(\`/editor/${result.materialId}\`)`
- No `NotebookPrintRecipeDialog`
- Existing caderno **Montar**: uses saved cover tag + `cover_image_url`, no extra dialog
- New caderno: form → cover picker → persist → open detail (do not montar empty)

- [ ] **Step 5: Commit**

```bash
git add src/components/content/ExerciseNotebookCard.tsx src/components/content/ExerciseNotebookFormDialog.tsx src/components/content/ExerciseNotebookDetailModal.tsx src/components/content/ExerciseNotebookTab.tsx
git commit -m "feat(exercise-notebook): add notebook list, form, detail and mount flow"
```

---

### Task 7: Biblioteca → Exercícios usa cadernos de exercício

**Files:**
- Modify: `src/components/content/ExerciseTab.tsx`

- [ ] **Step 1: Swap the notebooks sub-tab**

In `SUB_TABS`, change the last item from:

```ts
{ id: 'notebooks', label: '📚 Cadernos de Repertório', filter: {} },
```

to:

```ts
{ id: 'notebooks', label: 'Cadernos', filter: {} },
```

Replace import `RepertoireNotebookTab` with `ExerciseNotebookTab`.

Where `isNotebookTab` renders `<RepertoireNotebookTab />`, render `<ExerciseNotebookTab />`.

Keep all category sub-tabs and the avulso grid as they are. Do not add “adicionar ao caderno” on `ExerciseCard`.

- [ ] **Step 2: Commit**

```bash
git add src/components/content/ExerciseTab.tsx
git commit -m "feat(exercise-notebook): show exercise notebooks in Biblioteca Exercicios"
```

---

### Task 8: Mover caderno de repertório para `/repertorio`

**Files:**
- Modify: `src/pages/Repertorio.tsx`
- Verify: `src/components/content/ExerciseTab.tsx` no longer imports `RepertoireNotebookTab`

- [ ] **Step 1: Add section toggle**

In `src/pages/Repertorio.tsx`:

- Import `RepertoireNotebookTab` from `@/components/content/RepertoireNotebookTab`
- Import `Books` from phosphor if needed
- URL param `section`: default músicas. `cadernos` shows notebooks.

```ts
const section = searchParams.get('section') === 'cadernos' ? 'cadernos' : 'musicas'
```

In the header, next to Dashboard / Tabela / Cards, add:

```tsx
<div className="flex rounded-lg border border-border overflow-hidden">
  <button
    type="button"
    onClick={() => setParam('section', 'musicas')}
    className={`px-2.5 py-1.5 text-xs ${section === 'musicas' ? 'bg-[var(--azul-escuro)] text-white' : 'text-text3 hover:text-text2'}`}
  >
    Músicas
  </button>
  <button
    type="button"
    onClick={() => setParam('section', 'cadernos')}
    className={`px-2.5 py-1.5 text-xs ${section === 'cadernos' ? 'bg-[var(--azul-escuro)] text-white' : 'text-text3 hover:text-text2'}`}
  >
    Cadernos
  </button>
</div>
```

When `section === 'cadernos'`:

- Hide Dashboard toggle, table/cards toggle, Adicionar Música, KPIs, table, cards, pagination
- Render `<RepertoireNotebookTab />`
- Subtitle can stay “Curadoria de músicas…” or switch to “Cadernos de repertório”

When `section === 'musicas'`, current page unchanged (including `dash=1`).

In `setParam`, treat `section=musicas` as delete (default), same pattern as `view=table`.

- [ ] **Step 2: Sanity grep**

`RepertoireNotebookTab` should be imported from `Repertorio.tsx` only (plus its own file). Not from `ExerciseTab.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Repertorio.tsx src/components/content/ExerciseTab.tsx
git commit -m "feat(repertoire): move notebooks tab to /repertorio"
```

---

### Task 9: Testes, mapa, fechar o corte

**Files:**
- Modify: `.agent/development-map.md`

- [ ] **Step 1: Run unit tests**

```bash
npx tsx --test
```

Expected: previous 51 plus the new assembler file, all pass.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: exit 0. Fix any TS errors in the new files (unused imports, `ExerciseLibraryItem` embed typing).

- [ ] **Step 3: Manual smoke**

1. Biblioteca → Exercícios → Cadernos: criar “Técnica Grow”, adicionar Cromático + uma progressão, Montar → editor com capa + 2 seções.
2. Caderno vazio: Montar mostra toast, não navega.
3. Exercícios avulsos continuam abrindo rascunho um a um.
4. `/repertorio` → Cadernos mostra os cadernos de música e ainda gera PDF com receita.
5. Aba Exercícios não lista cadernos de repertório.

- [ ] **Step 4: Update the development map**

In `.agent/development-map.md`:

- **Próximo corte:** Apostila / Download do editor quando não é songbook
- **Agora:** caderno de exercício no ar (tabelas, montador, UI, repertório movido)
- Move “Cadernos de exercício” from Radar into Feito
- Spec line: mark the exercise spec as implemented
- Date 2026-08-14 (or today)

- [ ] **Step 5: Commit**

```bash
git add .agent/development-map.md
git commit -m "docs: mark exercise notebooks cut done"
```

Do not push image-gen / Recraft / Iconify files in these commits.

---

## Self-review vs spec

| Spec | Task |
|---|---|
| Tabelas dedicadas + RLS | 2 |
| Só `exercise_library` | 3, 5 |
| Exercícios \| Cadernos na Biblioteca | 7 |
| Caderno de repertório em `/repertorio` | 8 |
| Capa, sem receita | 1, 6 |
| Cabeçalho + blocos + page_break | 1 |
| Picker dentro do caderno | 5, 6 |
| Snapshot `exercise_sheet` | 3 |
| Sem `generateRepertoireBookPdf` | 3, 6 |
| Fora: sumário, mix música, add no card | nenhum task |

No TBD. Names: `buildExerciseNotebookBlocks`, `createDraftMaterialFromExerciseNotebook`, `ExerciseCollection` — used consistently.
