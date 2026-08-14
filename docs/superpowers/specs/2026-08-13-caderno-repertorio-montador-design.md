# Caderno de repertório — montador

Data: 2026-08-13  
Status: aguardando revisão  
Primeiro corte: caderno de repertório → rascunho no editor → imprimir / PDF

## Problema

O professor quer mandar ao aluno um PDF curto (capa + músicas), não uma apostila de jornada. O caderno hoje é só playlist. “Adicionar música” busca só o que já está na tabela `repertoire`. “Usar no Material” / “Gerar PDF” não existiam no caderno. O editor nunca lia `location.state`.

O aluno mais usa repertório, exercício e pack de exercícios. Isso não é o Gerador nem a Base Curada.

## Decisões travadas

| Tema | Escolha |
|---|---|
| Conteúdo da música | Grade de acordes sempre; cifra quando `cifra_content` existir |
| Fluxo | Caderno existente ganha Gerar PDF; caderno novo oferece gerar no último passo |
| Destino | Abre `/editor/:id` já montado |
| Capa | Sempre um bloco `cover` no topo; imagem opcional |
| Template de capa | Layouts que o editor já tem (`modern`, `elegant`, `colorful`, `bold`, `classic`, `minimal`) + arte da biblioteca no mesmo bloco |
| Quando escolhe capa | Caderno existente: padrão `modern` + título. Caderno novo: picker no último passo |
| Nome na capa | Título do caderno. Vínculo com aluno fica no radar |
| Paginação | Capa numa folha; cada música começa na folha seguinte. Motor `paginateSongbookBlocks`: título + grade + início da cifra na mesma página (não o paginador de apostila) |
| Arquitetura | Montador (compilação). Não clonar apostila. Não PDF direto sem editor |
| Onde monta | Biblioteca / caderno. Editor é última milha (ajustar capa e imprimir) |

## Fora deste corte (radar)

- Folha isolada mais redonda (exercício já abre rascunho; falta cara de “PDF do aluno”)
- Pack de exercícios (playlist de escalas / canto / sequências)
- Vínculo com aluno e portfólio (“tudo que o Chiquinho aprendeu”)
- Selo na lista do Editor: `exercise_sheet` vs `repertoire_sheet` vs `full_module` (o enum já existe; a tabela não mostra)
- Gerador e Base Curada: outro cano (jornada → apostila). Não entram no montador
- Não criar “dois lados” no Editor
- Salvar de volta o rascunho na `exercise_library` / no caderno

## O que não se constrói

- Motor novo de busca, cifra, acorde ou capa
- Fluxo no Gerador (jornada / stage / estação / IA)
- Tópicos da Base Curada como fonte do caderno
- Amarrar `student_id` agora
- Download de PDF sem passar pelo editor

## Peças reutilizadas

| Peça | Uso |
|---|---|
| Página Repertório + `UnifiedImportModal` + `RepertoireModal` | Buscar e, se não existir, importar (Cifra Club / Songsterr / ChordPro / criar do zero) |
| `repertoire` | Uma música, uma linha. Fonte de cifra e lista de acordes |
| `repertoire_collections` + `repertoire_collection_items` | Playlist do caderno |
| `adaptRepertoireItem(..., { includeChordGrid: true })` | Música → bloco texto (cifra se houver) + `chord_grid` |
| `resolveGuitarChordFromLibrary` / `MaterialPreview` | Diagrama na hora de renderizar |
| Bloco `cover` + templates do editor | Primeira folha |
| `page_break` | Uma música por página |
| `createDraftMaterialWithBlocks` | Insert em `generated_materials` + `material_blocks` (mesmo padrão do exercício) |

`AddSongModal` atual (select raso em `repertoire`) é substituído pelo motor do Repertório, não ganhamos um terceiro buscador.

## Arquitetura

```
Biblioteca → Cadernos
  buscar / importar (motor do Repertório)
  → item em repertoire_collection_items
  → Gerar PDF
      createDraftMaterialFromNotebook
        capa + (page_break + adaptRepertoireItem) × N
      → generated_materials type=repertoire_sheet
      → /editor/:id
      → Imprimir / PDF
```

Cópia de saída: o rascunho não fica ligado ao vivo com o caderno. Gerar de novo cria outro material. `generation_config` guarda `source` e `collection_id` só para rastreio.

## Função do montador

`createDraftMaterialFromNotebook(collection, schoolId, options?)`

- `options.coverTemplate` — default `modern`
- `options.coverImageUrl` — default `collection.cover_image_url`
- `type`: `repertoire_sheet`
- `title`: `collection.name`
- `instrument` / `level` / `description`: campos do caderno
- `generation_config`: `{ source: 'repertoire_collection', collection_id }`

Ordem dos blocos:

1. `cover` — `render_data.template`, título = nome do caderno, `cover_image_url` se houver
2. Para cada item em `sort_order`:
   - `page_break`
   - blocos de `adaptRepertoireItem(song, { includeChordGrid: true })`

Música sem cifra e sem acordes: entra só o bloco de texto com título / artista / tom. Sem `chord_grid` vazio. Não bloqueia o generate.

## Interface

**Caderno existente**

- Botão **Gerar PDF** no `NotebookDetailModal` (primário). No card, se o hover já tiver ações.
- Sem picker. Capa `modern` + título. Se `cover_image_url` do caderno existir, usa.
- Loading no botão; um generate por vez.

**Caderno novo**

- `NotebookFormDialog` no último passo: salvar o caderno, depois oferecer gerar.
- Picker: os 6 templates de capa + imagem opcional da biblioteca de imagens.
- Confirmar chama a mesma `createDraftMaterialFromNotebook`.
- Pular o generate é válido: o caderno fica salvo, generate depois no detalhe.

**Adicionar música**

- Primeiro busca no catálogo local (`repertoire`) — a busca que a página Repertório já faz, não um terceiro buscador.
- Se não estiver no catálogo: `UnifiedImportModal` (Cifra Club / Songsterr / ChordPro). Criar do zero usa o `RepertoireModal` que o import já abre via `onOpenEditor`.
- Import ou criação com sucesso: a música entra em `repertoire` e em seguida em `repertoire_collection_items`.
- Não redirecionar o professor para `/repertorio`.

## Erros

| Caso | Comportamento |
|---|---|
| Caderno sem músicas | Não cria rascunho. Toast: adicione pelo menos uma música |
| Escola ausente | Não cria rascunho. Toast igual ao do exercício |
| Item com `repertoire` sumido | Pula o item. Se sobrar zero músicas, aborta. Se sobrar alguma, gera e avisa quantas foram puladas |
| Acorde sem diagrama na library | Gera mesmo assim. A grade guarda o nome; o preview resolve o que existir. Não bloqueia |
| Import falhou | Toast do próprio modal. A música não entra no caderno. Generate é independente |
| Imagem de capa quebrada | Capa renderiza template + título |
| Gerar de novo no mesmo caderno | Sempre um rascunho novo. Não sobrescreve o anterior |
| Falha no insert do material | Toast com a mensagem. Não navega |

## O que o Editor faz neste fluxo

Abre o rascunho. O professor pode trocar template/arte da capa, mexer num bloco e usar Imprimir / PDF.

Não é o lugar de montar a playlist. Não ganhamos modo “caderno” no Editor neste corte.

A lista `/editor` continua como está. Selo de tipo (`repertoire_sheet` vs `full_module`) é radar.

## Testes manuais

1. Caderno com 3 músicas (uma com cifra+acordes, uma só com acordes, uma só título): Gerar PDF abre o editor com 1 capa + 3 seções, cada música em página nova.
2. Caderno vazio: Gerar PDF não navega.
3. Buscar música que já está no catálogo: entra no caderno sem ir à página Repertório.
4. Buscar música que não está: importar no mesmo fluxo e ela aparece na lista do caderno.
5. Caderno novo: picker de capa → editor com o template escolhido.
6. Imprimir / PDF no editor gera folha com capa e uma música por página.
7. Gerar duas vezes o mesmo caderno: dois rascunhos na lista.

## Sucesso

O professor monta “Caderno do Chiquinho” na Biblioteca, gera, ajusta a capa se quiser, imprime. Sem Gerador, sem Base Curada, sem diagramar música por música no Editor.
