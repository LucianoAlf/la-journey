# Caderno de exercício — montador

Data: 2026-08-14  
Status: aprovado  
Corte: caderno de exercício → rascunho no editor → imprimir / PDF

## Problema

O professor já monta caderno de repertório (playlist de músicas → capa → editor). Exercício avulso já abre rascunho no editor. Não existe caderno de exercício: não dá para guardar “Técnica Grow” ou “Leitura rítmica”, ordenar itens e montar um PDF pedagógico.

O caderno de repertório hoje está no lugar errado: sub-aba dentro de Biblioteca → Exercícios.

## Decisões travadas

| Tema | Escolha |
|---|---|
| Schema | Tabelas dedicadas `exercise_collections` + `exercise_collection_items`. Não unificar com repertório. Não existe essa tabela hoje |
| Conteúdo | Só itens da `exercise_library` (exercise e example). Um exercício em vários cadernos |
| Onde vive | Biblioteca → Exercícios → sub-abas **Exercícios \| Cadernos** |
| Caderno de repertório | Sai de Exercícios. Vai para `/repertorio` como **Músicas \| Cadernos** |
| Capa | Sempre bloco `cover` no topo. Mesmos templates do caderno de repertório. Imagem opcional |
| Receita de impressão | Não. Exercício já traz os blocos. Sem diálogo violão/piano/tab |
| Por exercício no material | Cabeçalho (título, categoria, nível) + blocos da library + `page_break` entre um e outro |
| Como adiciona | Picker dentro do caderno (busca na `exercise_library`). Sem “adicionar ao caderno” no card avulso neste corte |
| Destino | `/editor/:id` com `generated_materials.type = exercise_sheet` |
| Cópia | Snapshot. Editar o exercício depois não muda o rascunho. Montar de novo cria outro material |
| PDF | Download do editor (cano da apostila). **Não** usar `generateRepertoireBookPdf` |

## Fora deste corte (radar)

- Receita / layout diferente por exercício
- Sumário
- Misturar música e exercício no mesmo caderno
- Puxar notação, tablatura ou acorde avulso das outras abas da Biblioteca
- “Adicionar ao caderno” no `ExerciseCard`
- Salvar o rascunho de volta na `exercise_library`
- Vínculo com aluno / portfólio
- Motor novo de PDF só para exercício

## O que não se constrói

- Tabela polimórfica `collections`
- Refatorar o caderno de repertório para um motor genérico
- Diálogo de print recipe
- Import Songsterr / Cifra Club neste fluxo
- PDF direto sem passar pelo editor
- Fluxo no Gerador ou na Base Curada

## Peças reutilizadas

| Peça | Uso |
|---|---|
| `exercise_library` + `getExercises` / `getExerciseById` | Fonte dos itens |
| `adaptExerciseLibraryItem` | Exercício → blocos do editor |
| `createDraftMaterialFromExercise` | Padrão de rascunho avulso (`exercise_sheet`) |
| `createDraftMaterialWithBlocks` | Insert em `generated_materials` + `material_blocks` |
| `COVER_TEMPLATES` / `buildCoverRenderData` / `withCoverTemplateTag` | Capa |
| `page_break` | Um exercício por página de abertura |
| UI de caderno de repertório | Espelhar card, form, detalhe e picker — **copiar o padrão, não unificar tipos** |
| `RepertoireNotebookTab` | Mover inteiro para `/repertorio` |

## Schema

`exercise_collections` espelha `repertoire_collections`, **sem** `genre`:

- `id`, `school_id`, `name`, `description`
- `instrument` (text), `difficulty_level`, `tags` (inclui `cover-template:…`)
- `cover_image_url`, `is_template`, `curation_status`, `sort_order`
- `created_at`, `updated_at`

`exercise_collection_items`:

- `id`, `collection_id` → `exercise_collections`
- `exercise_id` → `exercise_library`
- `sort_order`, `notes`, `created_at`
- Unique `(collection_id, exercise_id)` para não duplicar o mesmo exercício no mesmo caderno

RLS no mesmo espírito das coleções de repertório (por escola).

## Arquitetura

```
Biblioteca → Exercícios → Cadernos
  buscar na exercise_library
  → item em exercise_collection_items
  → Montar
      createDraftMaterialFromExerciseNotebook
        capa
        + (page_break + cabeçalho + adaptExerciseLibraryItem) × N
      → generated_materials type=exercise_sheet
      → /editor/:id
      → Download / Imprimir (cano apostila)

/repertorio → Cadernos
  RepertoireNotebookTab (o que hoje está na aba Exercícios)
```

`generation_config`: `{ source: 'exercise_collection', collection_id }`.

## Montador

`createDraftMaterialFromExerciseNotebook(collection, schoolId, options?)`

- `options.coverTemplate` — default `modern` ou tag do caderno
- `options.coverImageUrl` — default `collection.cover_image_url`
- `type`: `exercise_sheet`
- `title`: `collection.name`
- `instrument` / `level` / `description`: campos do caderno

Ordem dos blocos:

1. `cover` — `buildCoverRenderData` (título do caderno, instrumento, nível, escola, professor, logo, arte)
2. Para cada item em `sort_order`:
   - `page_break`
   - bloco `text` de cabeçalho:
     - `title` = título do exercício
     - corpo: categoria (labels de `ExerciseTab`) · nível · minutos se `estimated_minutes > 0`
   - `adaptExerciseLibraryItem(exercise)` (os blocos já gravados na library)

Exercício sem blocos: entra só o cabeçalho. Não bloqueia.  
Item com `exercise` sumido: pula. Se sobrar zero, aborta. Se sobrar algum, gera e avisa quantos foram pulados.

Não chama `generateRepertoireBookPdf`. Não abre diálogo de receita. Depois do insert, `navigate(/editor/:id)`.

## Interface

**Biblioteca → Exercícios**

- Sub-abas: categorias de exercício (como hoje) + **Cadernos** no lugar da sub-aba `📚 Cadernos de Repertório`.
- Lista avulsa inalterada: preview, abrir no editor, duplicar, apagar.
- Aba Cadernos: lista de `exercise_collections` (card, criar, editar, apagar, abrir, montar).

**Caderno existente**

- Abrir: lista ordenável dos exercícios, busca para adicionar, remover item.
- **Montar e abrir no editor**: capa `modern` (ou tag salva) + `cover_image_url` se houver. Sem picker extra se já existir caderno — caderno novo escolhe capa no form, igual repertório.
- Loading no botão; um generate por vez.

**Caderno novo**

- Form: nome, instrumento, nível, descrição, picker de capa (6 templates + imagem opcional).
- Salvar o caderno. Oferecer montar só se já tiver item; senão o professor adiciona depois.

**Picker de exercício**

- Busca + filtro instrumento/nível/categoria via `getExercises`.
- Adicionar grava `exercise_collection_items`. Não redireciona para outra página.
- Não cria exercício novo neste modal. Exercício novo continua no fluxo avulso que já existe.

**/repertorio**

- Toggle de seção no topo: **Músicas** (lista/cards/dashboard atuais) | **Cadernos**.
- Cadernos renderiza `RepertoireNotebookTab`. Comportamento do caderno de repertório não muda (receita por música, PDF do motor de cifra, etc.).

## Erros

| Caso | Comportamento |
|---|---|
| Caderno sem exercícios | Não cria rascunho. Toast: adicione pelo menos um exercício |
| Escola ausente | Não cria rascunho. Toast igual ao do exercício avulso |
| Item com `exercise` sumido | Pula. Zero restantes → aborta. Algum restante → gera e avisa |
| Exercício sem blocos | Entra o cabeçalho. Não bloqueia |
| Imagem de capa quebrada | Capa renderiza template + título |
| Montar de novo o mesmo caderno | Sempre um rascunho novo. Não sobrescreve |
| Falha no insert | Toast. Não navega |

## O que o Editor faz neste fluxo

Abre o rascunho `exercise_sheet`. O professor ajusta capa, espaçamento, um bloco, e usa Download / Imprimir.

Não é o lugar de montar a playlist. `looksLikeSongbook` não se aplica: não há cifra de repertório neste material. PDF segue o cano de apostila.

## Testes

Unitário (montador, no mesmo estilo de `notebookMaterialAssembler.test.ts`):

- Caderno vazio → zero blocos, não monta
- Um exercício com blocos → cover + page_break + header + blocos
- Dois exercícios → cada um depois de `page_break`, header com título certo
- Exercício sem blocos → header, sem crash
- Item null → skipped, o outro entra
- Capa usa template e `cover_image_url`

Manual:

1. Criar “Técnica Grow”, adicionar Cromático + Progressão I–IV–V, montar: editor com capa + 2 seções, cada uma em página nova, cabeçalho visível.
2. Caderno vazio: Montar não navega.
3. Buscar exercício que já está na library: entra no caderno.
4. Biblioteca → Exercícios não mostra mais cadernos de repertório.
5. `/repertorio` → Cadernos mostra os cadernos de música e ainda gera PDF com receita.
6. Montar duas vezes o mesmo caderno de exercício: dois rascunhos `exercise_sheet`.

## Sucesso

O professor monta “Caderno de Técnica Grow” na aba Exercícios, escolhe capa, abre no editor, imprime. O caderno de repertório vive em Repertório. Um exercício continua existindo na library e pode entrar em vários cadernos.
