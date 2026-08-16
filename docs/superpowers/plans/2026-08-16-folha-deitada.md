# Folha deitada — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o professor gira um material entre A4 retrato (794×1123) e deitada (1123×794); editor, PrintView e download saem no mesmo papel.

**Architecture:** `page_config.orientation` alimenta `pageSize()` em `a4Preview.ts`. CSS, paginação, pauta e jsPDF leem esse tamanho. Sem coluna nova. Sem player C. Sem PDF de repertório.

**Tech Stack:** React + TypeScript + Vite, jsPDF + html2canvas, testes `npx tsx src/lib/__tests__/<arquivo>.test.ts`.

**Spec:** `docs/superpowers/specs/2026-08-16-folha-deitada-design.md`

**Branch:** `feat/folha-deitada` (worktree `.worktrees/folha-deitada`), a partir de `origin/main` (já inclui o slash do PR 21).

**Comandos:**
- Teste: `npx tsx src/lib/__tests__/a4Preview.test.ts`
- Tipos: `npm run lint` (é `tsc --noEmit`; há erros pré-existentes — não “corrigir” os 4 conhecidos)
- Dev: `npx vite --port 5201 --strictPort`

Não misturar `layout: 'horizontal'` do AlphaTab com papel deitado. Não tocar `src/services/repertoirePdfEngine.ts`.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `src/lib/a4Preview.ts` | Orientação, tamanho, escala, formato jsPDF | Modificar |
| `src/lib/__tests__/a4Preview.test.ts` | Testes de tamanho | Modificar |
| `src/lib/notationPreviewWidth.ts` | Largura da pauta a partir da largura do papel | Modificar |
| `src/lib/__tests__/notationPreviewWidth.test.ts` | Testes de largura | Modificar |
| `src/lib/sharedPagination.ts` | Altura útil da página | Modificar |
| `src/lib/__tests__/sharedPagination.test.ts` | Paginação deitada | Modificar |
| `src/lib/printPagination.ts` | PrintView usa a altura da orientação | Modificar |
| `src/lib/floatingElements.ts` | % do texto flutuante vs tamanho do papel | Modificar |
| `src/index.css` | `.a4-page--landscape` + letterbox da capa | Modificar |
| `src/pages/Editor.tsx` | `PageConfig`, toggle, classe da página, HTML export | Modificar |
| `src/pages/PrintView.tsx` | Classe landscape na impressão | Modificar |
| `src/services/pdfExportService.ts` | jsPDF no mesmo papel da tela | Modificar |
| `.agent/development-map.md` | Estado do corte | Modificar no fechamento |

---

### Task 1: tamanho do papel

**Files:**
- Modify: `src/lib/a4Preview.ts`
- Test: `src/lib/__tests__/a4Preview.test.ts`

- [ ] **Step 1: escrever os testes que falham**

No fim de `src/lib/__tests__/a4Preview.test.ts`, importe `parsePageOrientation`, `pageSize`, `a4ContentHeight`, `jsPdfA4Orientation` (ainda não existem) e adicione:

```ts
test('parsePageOrientation defaults to portrait', () => {
  assert.equal(parsePageOrientation(undefined), 'portrait')
  assert.equal(parsePageOrientation(null), 'portrait')
  assert.equal(parsePageOrientation('sideways'), 'portrait')
  assert.equal(parsePageOrientation('landscape'), 'landscape')
  assert.equal(parsePageOrientation('portrait'), 'portrait')
})

test('landscape swaps the portrait pixel size', () => {
  assert.deepEqual(pageSize('portrait'), { width: 794, height: 1123 })
  assert.deepEqual(pageSize('landscape'), { width: 1123, height: 794 })
})

test('preview scale uses the oriented page', () => {
  const scale = getA4PreviewScale(900, 800, 140, 'landscape')
  assert.ok(scale < 1)
  assert.ok(scale * 1123 <= 900 - 48)
  assert.ok(scale * 794 <= 800 - 140)
})

test('jsPDF orientation follows the page', () => {
  assert.equal(jsPdfA4Orientation('portrait'), 'portrait')
  assert.equal(jsPdfA4Orientation('landscape'), 'landscape')
})
```

O teste existente `getA4PreviewScale(1400, 1400)` continua válido — o 4º argumento default é retrato.

- [ ] **Step 2: rodar e confirmar que falha**

Run: `npx tsx src/lib/__tests__/a4Preview.test.ts`

Esperado: falha ao importar `parsePageOrientation`.

- [ ] **Step 3: implementação mínima**

Em `src/lib/a4Preview.ts`, mantenha `A4_PAGE_WIDTH_PX = 794` e `A4_PAGE_HEIGHT_PX = 1123` (retrato). Acrescente:

```ts
export type PageOrientation = 'portrait' | 'landscape'

export function parsePageOrientation(value: unknown): PageOrientation {
  return value === 'landscape' ? 'landscape' : 'portrait'
}

export function pageSize(orientation: PageOrientation = 'portrait'): { width: number; height: number } {
  if (orientation === 'landscape') {
    return { width: A4_PAGE_HEIGHT_PX, height: A4_PAGE_WIDTH_PX }
  }
  return { width: A4_PAGE_WIDTH_PX, height: A4_PAGE_HEIGHT_PX }
}

export function jsPdfA4Orientation(orientation: PageOrientation): 'portrait' | 'landscape' {
  return orientation
}
```

`a4ContentHeight` pode ficar na Task 3 (paginação). Se o teste da Task 1 importar `a4ContentHeight`, ou tire esse teste da Task 1 ou exporte um stub. **Não importe `a4ContentHeight` na Task 1** — o bloco de teste acima já não usa.

Altere `getA4PreviewScale` para:

```ts
export function getA4PreviewScale(
  viewportWidth: number,
  viewportHeight: number,
  chromeHeight = 140,
  orientation: PageOrientation = 'portrait',
): number {
  const { width, height } = pageSize(orientation)
  const availableW = Math.max(320, viewportWidth - 48)
  const availableH = Math.max(400, viewportHeight - chromeHeight)
  return Math.min(1, availableW / width, availableH / height)
}
```

- [ ] **Step 4: testes passam**

Run: `npx tsx src/lib/__tests__/a4Preview.test.ts`

Esperado: todos `ok`.

- [ ] **Step 5: commit**

```bash
git add src/lib/a4Preview.ts src/lib/__tests__/a4Preview.test.ts
git commit -m "feat: derive A4 pixel size from page orientation"
```

---

### Task 2: largura da pauta

**Files:**
- Modify: `src/lib/notationPreviewWidth.ts`
- Test: `src/lib/__tests__/notationPreviewWidth.test.ts`

O canvas do editor é `w-full` — a pauta já estica com a página. As constantes retrato (794−80 e 638) **continuam** para o modal e para `resolveNotationPreviewWidth` sem `width` gravado. Acrescente funções que recebem a largura do papel.

- [ ] **Step 1: teste que falha**

No fim de `notationPreviewWidth.test.ts`:

```ts
test('canvas notation width grows with landscape paper', () => {
  assert.equal(canvasNotationWidth(1123), 1123 - 120 - 32 - 4)
  assert.equal(canvasNotationWidth(), A4_CANVAS_NOTATION_WIDTH)
})
```

- [ ] **Step 2: rodar e confirmar que falha**

Run: `npx tsx src/lib/__tests__/notationPreviewWidth.test.ts`

Esperado: `canvasNotationWidth is not defined`.

- [ ] **Step 3: implementação**

```ts
import { A4_PAGE_WIDTH_PX } from './a4Preview'

export function canvasNotationWidth(pageWidthPx: number = A4_PAGE_WIDTH_PX): number {
  return pageWidthPx - 120 - 32 - 4
}

export const A4_NOTATION_CONTENT_WIDTH = A4_PAGE_WIDTH_PX - 80
export const A4_CANVAS_NOTATION_WIDTH = canvasNotationWidth()
```

Não mude `resolveNotationPreviewWidth`. Não passe `barsPerRow` automático.

- [ ] **Step 4: testes passam**

Run: `npx tsx src/lib/__tests__/notationPreviewWidth.test.ts`

- [ ] **Step 5: commit**

```bash
git add src/lib/notationPreviewWidth.ts src/lib/__tests__/notationPreviewWidth.test.ts
git commit -m "feat: compute staff width from the current page width"
```

---

### Task 3: altura útil na paginação

**Files:**
- Modify: `src/lib/sharedPagination.ts`
- Test: `src/lib/__tests__/sharedPagination.test.ts`

`A4_CONTENT_HEIGHT` e `A4_TOTAL_HEIGHT` **continuam retrato**. Caderno de música (`songbookPagination.ts`) não muda. `paginateBlocks` ganha um 3º argumento opcional.

- [ ] **Step 1: teste que falha**

No fim de `sharedPagination.test.ts`:

```ts
test('paginateBlocks uses a shorter content height on landscape', () => {
  const block: SharedPaginationBlock = {
    id: 'n1',
    block_type: 'notation',
    content: { text: 'pauta' },
  }
  const portrait = paginateBlocks([block, { ...block, id: 'n2' }, { ...block, id: 'n3' }])
  const landscape = paginateBlocks(
    [block, { ...block, id: 'n2' }, { ...block, id: 'n3' }],
    undefined,
    566,
  )
  assert.ok(landscape.pages.length >= portrait.pages.length)
})
```

566 = 794 − 60 − 72 − 40 − 56 (header, footer, padding, print-safe). Se `paginateBlocks` ainda não aceita o 3º argumento, o teste falha na chamada.

- [ ] **Step 2: rodar e confirmar que falha**

Run: `npx tsx src/lib/__tests__/sharedPagination.test.ts`

- [ ] **Step 3: implementação**

Exporte:

```ts
import { pageSize, type PageOrientation } from './a4Preview'

export function a4ContentHeight(orientation: PageOrientation = 'portrait'): number {
  const { height } = pageSize(orientation)
  return height - HEADER_HEIGHT - FOOTER_HEIGHT - CONTENT_VERTICAL_PADDING - PRINT_SAFE_AREA
}
```

Altere a assinatura:

```ts
export function paginateBlocks<TBlock extends SharedPaginationBlock>(
  blocks: TBlock[],
  getHeight: (block: TBlock) => number = block => getEstimatedBlockHeightForPagination(block),
  contentHeight: number = A4_CONTENT_HEIGHT,
): SharedPaginationResult<TBlock> {
```

Dentro de `paginateBlocks`, troque as comparações com `A4_CONTENT_HEIGHT` pelo parâmetro `contentHeight` (keep-together ~linha 389 e overflow ~linha 422).

`A4_CONTENT_HEIGHT` permanece `a4ContentHeight('portrait')` (ou a conta atual com `A4_TOTAL_HEIGHT`) para não quebrar songbook.

- [ ] **Step 4: testes passam**

Run: `npx tsx src/lib/__tests__/sharedPagination.test.ts`

Também: `npx tsx src/lib/__tests__/songbookPagination.test.ts` — tem que continuar verde (retrato).

- [ ] **Step 5: commit**

```bash
git add src/lib/sharedPagination.ts src/lib/__tests__/sharedPagination.test.ts
git commit -m "feat: paginate A4 content against the oriented page height"
```

---

### Task 4: CSS da folha deitada

**Files:**
- Modify: `src/index.css` (bloco `.a4-page` ~313)

Sem teste unitário. A prova é a classe no editor (Task 5).

- [ ] **Step 1: adicionar a classe**

Depois das regras de `.a4-page` (width/height 794×1123), acrescente:

```css
.a4-page--landscape{
  width:1123px;
  height:794px;
}
.a4-page--landscape.a4-page--cover,
.a4-page--landscape .block-cover{
  min-height:794px;
}
.a4-page--landscape.a4-page--cover .block-cover--with-image{
  background-size:contain!important;
  background-repeat:no-repeat;
  background-position:center;
  background-color:#000;
}
```

Não altere o retrato default.

- [ ] **Step 2: commit**

```bash
git add src/index.css
git commit -m "feat: add landscape A4 page class and cover letterbox"
```

---

### Task 5: toggle no editor

**Files:**
- Modify: `src/pages/Editor.tsx`

- [ ] **Step 1: tipo e migrate**

Importe `parsePageOrientation`, `pageSize`, `a4ContentHeight`, `type PageOrientation` de `@/lib/a4Preview`.

Em `PageConfig` (~linha 228):

```ts
orientation?: PageOrientation
```

Em `migratePageConfig`, depois do spread, normalize:

```ts
return {
  ...pc,
  header: ...,
  footer: ...,
  orientation: parsePageOrientation(raw.orientation),
}
```

- [ ] **Step 2: altura de paginação**

Perto dos `useMemo` de `paginateBlocks` (~1056 e qualquer outro `paginateBlocks(blocks`):

```ts
const pageOrientation = parsePageOrientation(pageConfig.orientation)
const contentHeight = a4ContentHeight(pageOrientation)
```

Passe `contentHeight` como 3º argumento de `paginateBlocks`. Troque usos locais de `A4_CONTENT_HEIGHT` no cálculo de espaço livre (~2243, 2346, 2393, 2421, 2424) por `contentHeight`.

- [ ] **Step 3: classe na página**

No `className` da `.a4-page` (~7779):

```tsx
className={`a4-page ${pageOrientation === 'landscape' ? 'a4-page--landscape' : ''} ${isCoverPage ? 'a4-page--cover' : ''}`}
```

- [ ] **Step 4: controle na lateral**

Em **Configuração da Página**, **antes** de “Cabeçalho e Rodapé” (~8246), dois botões no padrão visual que já existe (outline / selected com `border-accent`):

```tsx
<div className="space-y-2 border-t border-border pt-3">
  <Label className="text-[11px] text-text3 uppercase tracking-wider">Orientação</Label>
  <div className="grid grid-cols-2 gap-1.5">
    <button type="button" className={cn('h-8 rounded-md border text-[11px]', pageOrientation === 'portrait' ? 'border-accent ring-1 ring-accent/40' : 'border-border')}
      onClick={() => setPageConfig(prev => ({ ...prev, orientation: 'portrait' }))}>
      Retrato
    </button>
    <button type="button" className={cn('h-8 rounded-md border text-[11px]', pageOrientation === 'landscape' ? 'border-accent ring-1 ring-accent/40' : 'border-border')}
      onClick={() => setPageConfig(prev => ({ ...prev, orientation: 'landscape' }))}>
      Deitada
    </button>
  </div>
</div>
```

O `useEffect` que já grava `page_config` (~2689) persiste o campo. Não crie outro save.

Não mude `barsPerSystem` / Por linha.

- [ ] **Step 5: commit**

```bash
git add src/pages/Editor.tsx
git commit -m "feat: toggle A4 orientation from the page settings drawer"
```

---

### Task 6: PrintView

**Files:**
- Modify: `src/lib/printPagination.ts`
- Modify: `src/pages/PrintView.tsx`
- Modify: `src/lib/__tests__/printPagination.test.ts` (crie se não existir; senão acrescente no arquivo de teste que já cobre `paginatePrintBlocks`)

- [ ] **Step 1: teste**

Se `src/lib/__tests__/printPagination.test.ts` existir, acrescente. Senão crie o arquivo no mesmo estilo dos outros `tsx` tests:

```ts
import assert from 'node:assert/strict'
import { paginatePrintBlocks, type PrintBlock } from '../printPagination'

const notation = (id: string): PrintBlock => ({
  id,
  block_type: 'notation',
  sort_order: 0,
  content: { text: id },
})

test('landscape print pagination can split sooner than portrait', () => {
  const blocks = [notation('a'), notation('b'), notation('c')]
  const portrait = paginatePrintBlocks(blocks, 'exercise_sheet')
  const landscape = paginatePrintBlocks(blocks, 'exercise_sheet', 'landscape')
  assert.ok(landscape.length >= portrait.length)
})
```

Ajuste a assinatura no passo 3 se o 3º argumento for `PageOrientation`.

- [ ] **Step 2: rodar — falha na assinatura**

Run: `npx tsx src/lib/__tests__/printPagination.test.ts` (ou o arquivo que você usou)

- [ ] **Step 3: implementação**

```ts
import { parsePageOrientation, type PageOrientation } from './a4Preview'
import { a4ContentHeight, paginateBlocks } from './sharedPagination'

export function paginatePrintBlocks(
  blocks: PrintBlock[],
  materialType?: string | null,
  orientation: PageOrientation = 'portrait',
) {
  if (isSongbookMaterial(materialType, blocks)) {
    return paginateSongbookBlocks(blocks).pages
  }
  return paginateBlocks(blocks, undefined, a4ContentHeight(orientation)).pages
}
```

Songbook continua retrato (early return).

Em `PrintView.tsx`, `normalizePrintPageConfig` também devolve `orientation: parsePageOrientation(pageConfig.orientation)`.

Na paginação das páginas (onde chama `paginatePrintBlocks`), passe essa orientação.

No `<section className={... a4-page ...}>` (~296):

```tsx
className={`a4-page print-page ${pageConfig.orientation === 'landscape' ? 'a4-page--landscape' : ''} ${isCoverPage ? 'a4-page--cover print-page--cover' : ''}`}
```

- [ ] **Step 4: testes**

Run: o teste da Task 6 + `npx tsx src/lib/__tests__/songbookPagination.test.ts`

- [ ] **Step 5: commit**

```bash
git add src/lib/printPagination.ts src/pages/PrintView.tsx src/lib/__tests__/printPagination.test.ts
git commit -m "feat: print landscape A4 from page_config orientation"
```

---

### Task 7: download jsPDF

**Files:**
- Modify: `src/services/pdfExportService.ts`

Não há teste de DOM. Extraia só a decisão de orientação para `jsPdfA4Orientation` (já na Task 1). O serviço lê a classe da primeira página válida.

- [ ] **Step 1: criar o PDF no papel certo**

Importe `jsPdfA4Orientation` e `parsePageOrientation`.

Depois de filtrar `pages`, **antes** de `new jsPDF`:

```ts
const landscape = pages.some(page => page.classList.contains('a4-page--landscape'))
const pdf = new jsPDF(jsPdfA4Orientation(landscape ? 'landscape' : 'portrait'), 'mm', 'a4')
```

Apague o comentário “área visível fixa: 794×1123”. Continue usando `offsetWidth` / `offsetHeight`.

`pdf.addImage(..., 0, 0, pdfWidth, pdfHeight)` já usa `pageSize` do jsPDF — com landscape, width/height mm invertem sozinhos.

Não mexa em `repertoirePdfEngine.ts` nem `pdfService.ts`.

- [ ] **Step 2: commit**

```bash
git add src/services/pdfExportService.ts
git commit -m "feat: export editor PDF in the on-screen A4 orientation"
```

---

### Task 8: HTML export + float

**Files:**
- Modify: `src/pages/Editor.tsx` (string CSS ~6532)
- Modify: `src/lib/floatingElements.ts`

O HTML standalone do editor (download “página web” / clone) ainda crava `max-width:794px;min-height:1123px`.

- [ ] **Step 1: CSS do clone**

Onde monta o `<style>` (~6532), se `pageOrientation === 'landscape'`:

```css
.a4-page{max-width:1123px;min-height:794px;width:1123px;height:794px;...}
.block-cover{min-height:794px;...}
```

Senão mantenha 794×1123. Inclua `.a4-page--landscape` como no `index.css`.

Capa no clone: `coverStyle` hoje é `min-height:297mm`. Em deitada use `min-height:210mm`.

`@media print` pode acrescentar `size: landscape` quando deitada:

```css
@page { size: A4 landscape; }
```

só nesse ramo.

- [ ] **Step 2: float em % do papel**

`getFloatingTextAutoSize` ganha página opcional, default retrato:

```ts
import { pageSize, type PageOrientation } from './a4Preview'

export function getFloatingTextAutoSize(
  el: Pick<FloatingText, 'content' | 'fontSize' | 'lineHeight' | 'letterSpacing'>,
  orientation: PageOrientation = 'portrait',
): { width: number; height: number } {
  const { width: pageW, height: pageH } = pageSize(orientation)
  // ... mesma conta, dividindo por pageW / pageH em vez das constantes 794/1123
}
```

Apague `FLOATING_TEXT_PAGE_WIDTH_PX` / `HEIGHT` ou faça-as alias de `pageSize('portrait')`. Não recálcule `x/y` de elementos já gravados.

Se o teste `floatingElementsVisualLibrary.test.ts` quebra, atualize só as asserções de % no retrato (devem continuar iguais).

- [ ] **Step 3: testes de float**

Run: `npx tsx src/lib/__tests__/floatingElementsVisualLibrary.test.ts`

- [ ] **Step 4: commit**

```bash
git add src/pages/Editor.tsx src/lib/floatingElements.ts src/lib/__tests__/floatingElementsVisualLibrary.test.ts
git commit -m "feat: keep HTML export and floating text sized to the oriented page"
```

---

### Task 9: fechamento

**Files:**
- Modify: `docs/superpowers/specs/2026-08-16-folha-deitada-design.md` (status)
- Modify: `.agent/development-map.md`

- [ ] **Step 1: prova visual**

`npx vite --port 5201 --strictPort`. Abrir um material com pauta no Editor (login E2E). Lateral → Configuração da Página → **Deitada**. Conferir: folha 1123×794, pauta mais larga, Por linha inalterado. Download PDF — página deitada. Voltar Retrato — material antigo continua em pé.

Não ligar o player. Não abrir repertório Gerar PDF.

- [ ] **Step 2: bateria**

```
npx tsx src/lib/__tests__/a4Preview.test.ts
npx tsx src/lib/__tests__/notationPreviewWidth.test.ts
npx tsx src/lib/__tests__/sharedPagination.test.ts
npx tsx src/lib/__tests__/songbookPagination.test.ts
```

Todos `ok`. `songbookPagination` retrato.

- [ ] **Step 3: docs**

Spec: status `implementada, conferir Download no editor`. Mapa: item 1 do radar (folha deitada) → Feito quando a prova visual passar; **Próximo corte:** player de estudo (C).

- [ ] **Step 4: commit**

```bash
git add docs/superpowers/specs/2026-08-16-folha-deitada-design.md .agent/development-map.md
git commit -m "docs: close landscape A4 cut after editor PDF check"
```

---

## Auto-revisão

**Cobertura da spec:** orientação por material (T5), `page_config` (T5), default retrato (T1 `parsePageOrientation`), 1123×794 (T1+T4), uniforme + letterbox capa (T4), chrome (T5), pauta pela largura (T2 + canvas `w-full`), Por linha intacto (T5), AlphaTab `page` (nada a fazer), float sem migrar x/y (T8), quebra mais baixa (T3), PDF editor (T7), PrintView (T6), repertório intocado (regra do plano).

**Fora, de propósito:** player C, `repertoirePdfEngine`, auto 4 por linha, `LayoutMode.Horizontal`.

**Risco:** `Editor.tsx` usa `A4_CONTENT_HEIGHT` em vários sítios da paginação visual — se algum ficar no retrato enquanto a CSS deita, o bloco estoura a página. Task 5 manda trocar todos esses usos no mesmo commit.
