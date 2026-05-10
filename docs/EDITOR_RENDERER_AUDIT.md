# Auditoria de Paridade Editor <-> Preview

Data: 2026-05-09  
Escopo: editores musicais restantes, sem alterar codigo. A auditoria de notacao principal fica em `docs/ALPHATAB_RENDERING_AUDIT_MAIO_2026.md`.

## Fontes verificadas

- Codigo local:
  - `src/components/music/TablatureEditor.tsx`
  - `src/components/music/TabSvgEditor.tsx`
  - `src/components/music/KeyboardEditor.tsx`
  - `src/components/music/PianoKeyboard.tsx`
  - `src/components/music/ChordEditor.tsx`
  - `src/components/music/ChordDiagram.tsx`
  - `src/components/repertoire/CifraEditor.tsx`
  - `src/components/repertoire/RepertoireSheet.tsx`
  - `src/components/repertoire/PrintableCifra.tsx`
  - `src/components/material/MaterialPreview.tsx`
  - `src/pages/Editor.tsx`
- Banco Supabase correto: projeto `rkfszavfqplhorvfpkcq`.
- Browser atual: `http://localhost:3000/editor/01abd63e-77df-493c-8af1-76a401e84adb`.

## Resumo do template auditado

Material: `01abd63e-77df-493c-8af1-76a401e84adb`.

Contagem real em `material_blocks`:

| Tipo | Quantidade |
| --- | ---: |
| notation | 27 |
| keyboard | 6 |
| chord_grid | 3 |
| exercise | 32 |
| text | 56 |
| title | 12 |
| page_break | 12 |
| tip | 2 |
| cover | 1 |

Nao ha blocos `tablature`, `repertoire` ou `repertoire_sheet` neste template. O DOM atual no browser, por causa da janela de paginas, mostrou 12 blocos montados, 5 blocos `notation`, 669 SVGs e 1 superficie AlphaTab ativa no viewport auditado. Isso confirma que o canvas nao monta o documento inteiro ao mesmo tempo.

## 1. Editor de Tablatura

Arquivos principais:

- `src/components/music/TablatureEditor.tsx`
- `src/components/music/TabSvgEditor.tsx`
- `src/components/music/Tablature.tsx`
- `src/components/music/AlphaTabViewer.tsx`
- `src/components/material/MaterialPreview.tsx`

### Formato de saida

O editor trabalha com `TablatureData` estruturado:

- `instrument`
- `grid`
- `columns`
- `durations`
- `label`
- `timeSignature`
- `ties`
- `dots`
- `pickings`
- `tuplets`
- `chordNames`
- `chordPositionsData`

Tambem gera texto legado com `gridToTabLines()` e AlphaTex com `gridToAlphaTex()`. O `onSave` do editor entrega:

```ts
onSave(lines, label, data)
```

No banco atual nao existe uma tabela `tablature_library`. A tablatura encontrada esta em `exercise_library.blocks` como bloco JSON. Exemplo real:

- `exercise_library.title`: `Exercício Cromático 1-2-3-4`
- bloco: `block_type = "tablature"`
- `render_data.alphaTex`: AlphaTex cru com `\title`, `\instrument guitar` e beats de tablatura.

### Renderer interno durante edicao

O editor usa dois renderers:

- `TabSvgEditor`: SVG proprio para edicao interativa da grade.
- `AlphaTabViewer`: preview AlphaTab debounceado a partir de `gridToAlphaTex()`.

Isso significa que o que o usuario edita nao e o mesmo motor que renderiza o preview musical dentro do proprio modal. O SVG e a fonte da interacao; o AlphaTab e uma visualizacao derivada.

### Renderer usado no preview do canvas

`MaterialPreview` usa `BlockTablature`:

- se `render_data.alphaTex` existir, usa `AlphaTexInlineRenderer`.
- se nao existir, usa `Tablature`, que e um `<pre>` monoespacado simples.

Ou seja, o caminho do canvas pode ser diferente do editor em dois niveis:

- editor visual: `TabSvgEditor`
- editor preview: `AlphaTabViewer`
- canvas: `AlphaTexInlineRenderer` ou `<pre>`

### Conversoes

Conversoes encontradas:

- `parseTabLines()`: texto legado -> grid
- `gridToTabLines()`: grid -> texto legado
- `gridToAlphaTex()`: grid estruturado -> AlphaTex
- registros antigos podem virar `TablatureData` via conversao local no editor

### Settings AlphaTab

No editor, a previsualizacao usa `AlphaTabViewer` com:

- `layout="page"`
- `scale={0.8}`
- `minHeight={100}`
- `showTimeSignature={timeSignature !== 'free'}`
- `staveProfile` padrao do `AlphaTabViewer`: `tab`

No canvas, se houver `alphaTex`, `BlockTablature` usa `AlphaTexInlineRenderer` com:

- `minHeight={120}`
- `scale={0.8}`
- `staveProfile` padrao do componente: `score`

Essa e uma divergencia importante: uma tablatura AlphaTex renderizada no canvas pode cair no perfil `score` por padrao se o componente nao receber `staveProfile="tab"`.

### Snapshot/cache

`MUSIC_RENDERER_BLOCK_TYPES` inclui `tablature`, entao o bloco passa pela mesma pipeline de snapshot/preheater do editor de material. O preheater captura HTML por estabilidade/timeout e exige tamanho minimo maior para `notation`, `rhythm` e `tablature`.

### Casos de teste

| Caso | Editor interno | Canvas preview | Dado bruto | Status |
| --- | --- | --- | --- | --- |
| Template Fundamentos | Nao existe bloco de tablatura no material | Nao ha comparacao direta | N/A | N/A |
| `exercise_library`: Exercício Cromático 1-2-3-4 | `TabSvgEditor` + preview AlphaTab | Se inserido no material, usaria `AlphaTexInlineRenderer` por `render_data.alphaTex` | AlphaTex em `render_data.alphaTex` | divergencia leve/risco ⚠️ |

Diagnostico: a tablatura nao e o problema visual imediato do template atual, mas deve entrar no escopo tecnico do Prompt #12 porque compartilha AlphaTab, snapshot por timeout e diferenca de `staveProfile`.

## 2. Editor de Teclado/Piano

Arquivos principais:

- `src/components/music/KeyboardEditor.tsx`
- `src/components/music/PianoKeyboard.tsx`
- `src/components/material/MaterialPreview.tsx`

### Formato de saida

O editor salva dados no formato `PianoChordData`:

```ts
{
  name,
  instrument: 'piano',
  positions: {
    keys,
    keys_lh,
    root,
    octave,
    fingering_rh,
    fingering_lh,
    type,
    quality,
    octave_start,
    octave_count,
    voicing_position
  },
  difficulty,
  tags
}
```

No material, os blocos `keyboard` usam `render_data` com dois formatos:

- teclado simples: `keys`, `labels`, `highlights`, `root`, `octave`, `fingering_rh`, `fingering_lh`, `hand`.
- grupo de teclados: `render_data.chords[]` com `{ name, keys, fingering_rh, fingering_lh, hand }`.

Exemplos reais do template:

- `Notas Naturais no Teclado`: `keys = ["C4","D4","E4","F4","G4","A4","B4","C5"]`
- `Teclado — Escala Cromática`: 13 teclas de `C4` a `C5`, incluindo sustenidos.
- `Acordes com Tensões — Teclado`: `render_data.chords[]` com 5 acordes, incluindo `C7M(9)`, `Dm7(11)`, `G7(13)`.

Tabela relacionada: `chord_library`, `instrument = 'piano'`. Contagem real: 1091 registros de piano.

### Renderer interno durante edicao

`KeyboardEditor` usa `InteractivePiano`, um teclado HTML/CSS proprio, com clique em teclas, mao direita/esquerda, fundamental e dedilhado.

### Renderer usado no preview do canvas

O canvas usa `PianoKeyboard`, que renderiza SVG via `svg-piano`.

`MaterialPreview` usa:

- `BlockKeyboard` para teclado simples ou lista em `render_data.chords`.
- `BlockKeyboardGrid` para `keyboard_grid`.

### Conversoes

Conversoes principais:

- `editorToData()`: estado do editor -> `positions`
- `dataToEditor()`: `positions` do banco -> estado do editor
- `noteNameToMidi()` e `midiToNoteName()`
- normalizacao de bemois para sustenidos (`FLAT_TO_SHARP`)

Nao ha conversao para AlphaTex. A pipeline e estruturada e nao depende de AlphaTab.

### Settings AlphaTab

Nao aplicavel ao teclado. O renderer e `svg-piano`.

### Snapshot/cache

Apesar de nao usar AlphaTab, `keyboard` e `keyboard_grid` estao em `MUSIC_RENDERER_BLOCK_TYPES`, entao passam pela mesma pipeline de snapshot/preheater do canvas. Para teclado, isso pode causar snapshot stale ou placeholder temporario, mas nao deve causar as quebras especificas de notacao musical do AlphaTab.

### Casos de teste

| Caso do template | Editor interno | Canvas preview | Dado bruto | Status |
| --- | --- | --- | --- | --- |
| Notas Naturais no Teclado | `InteractivePiano` | `PianoKeyboard` SVG | `render_data.keys` | paridade funcional ✅ |
| Teclado — Tons e Semitons | `InteractivePiano` | `PianoKeyboard` SVG | `render_data.keys` + `highlights` | divergencia leve ⚠️ |
| Teclado — Escala Cromática | `InteractivePiano` | `PianoKeyboard` SVG | `render_data.keys` | paridade funcional ✅ |
| Tríades no Teclado | Editor de acorde/teclado por item | `PianoKeyboard` por `render_data.chords[]` | lista estruturada | paridade funcional ✅ |
| Tétrades no Teclado | Editor de acorde/teclado por item | `PianoKeyboard` por `render_data.chords[]` | lista estruturada | paridade funcional ✅ |
| Acordes com Tensões — Teclado | Editor de acorde/teclado por item | `PianoKeyboard` por `render_data.chords[]` | lista estruturada | paridade funcional ✅ |

Observacao: o caso `highlights` aparece no banco em `Teclado — Tons e Semitons`, mas `BlockKeyboard` nao usa explicitamente `render_data.highlights`; ele colore todas as teclas em `keys`. Isso e divergencia leve se o editor pretende distinguir categorias de destaque.

Diagnostico: teclado esta entre os editores em melhor estado. A principal divergencia e a diferenca visual natural entre `InteractivePiano` e `PianoKeyboard`, mais a possibilidade de campos como `highlights` nao serem refletidos no preview.

## 3. Editor de Acorde / Grade de Acordes

Arquivos principais:

- `src/components/music/ChordEditor.tsx`
- `src/components/music/ChordDiagram.tsx`
- `src/components/material/MaterialPreview.tsx`
- `src/services/chordAutoFillService.ts`

### Formato de saida

O editor usa `ChordEditorState`:

```ts
{
  dots: Array<{ s, f, finger }>,
  openMuted: Array<'open' | 'muted' | null>,
  barres: Array<{ fret, from, to, finger }>
}
```

Ele converte para `ChordPositions`:

```ts
{
  fingers: Array<[stringNumber, fret, label?]>,
  barres: Array<{ fromString, toString, fret }>,
  muted: number[]
}
```

No banco relacionado `chord_library`, os dados ficam em `positions jsonb`. Contagem real:

- `guitar`: 8969
- `piano`: 1091
- `ukulele`: 547
- `bass`: 2
- `electric_guitar`: 1

No material atual, `chord_grid` salva `render_data.chords[]`. Em alguns blocos do template os acordes sao strings, nao objetos estruturados. Exemplos:

- `Tríades no Violão`: `["C", ...]`
- `Tétrades no Violão`: `["C7M", ...]`
- `Acordes com Tensões — Violão`: `["C7M(9)", ...]`

### Renderer interno durante edicao

`ChordEditor` usa `canvas` proprio:

- canvas principal para edicao do braço.
- canvas de preview compacto.

Nao usa SVGuitar durante a edicao.

### Renderer usado no preview do canvas

`MaterialPreview` usa `ChordDiagram`, que renderiza via `svguitar`.

Para `chord_grid`, o preview tenta normalizar cada acorde:

- se o item ja e objeto, usa os campos `fingers`, `barres`, `muted`, `position`.
- se o item e string, chama `lookupGuitarChord()` de `chordAutoFillService`.

`lookupGuitarChord()` usa `@tombatossals/chords-db/lib/guitar.json`, nao consulta a tabela `chord_library` real com 8969 acordes de violao.

### Conversoes

Conversoes encontradas:

- `positionsToState()`: `ChordPositions` -> estado do editor.
- `stateToPositions()`: estado do editor -> `ChordPositions`.
- `convertChordsDbToOurFormat()` e `lookupGuitarChord()`: chords-db local -> `ChordPositions`.

### Settings AlphaTab

Nao aplicavel aos acordes/grade de acordes. O canvas usa SVGuitar, nao AlphaTab.

### Snapshot/cache

`chord_grid` e `chord_diagram` estao em `MUSIC_RENDERER_BLOCK_TYPES`; portanto passam por snapshot/preheater. O risco aqui nao e AlphaTab, mas sim snapshot capturado antes do SVGuitar terminar ou snapshot gerado a partir de fallback textual quando o lookup local nao encontra o acorde.

### Casos de teste

| Caso do template | Editor interno | Canvas preview | Dado bruto | Status |
| --- | --- | --- | --- | --- |
| Tríades no Violão | `ChordEditor` canvas se editar item | `ChordDiagram` SVGuitar via lookup local | strings em `render_data.chords` | divergencia leve ⚠️ |
| Tétrades no Violão | `ChordEditor` canvas se editar item | `ChordDiagram` SVGuitar via lookup local | strings em `render_data.chords` | divergencia leve ⚠️ |
| Acordes com Tensões — Violão | `ChordEditor` canvas se editar item | `ChordDiagram` SVGuitar via lookup local | strings em `render_data.chords` | divergencia crítica ❌ |

Motivo da criticidade em tensoes: o template salva acordes complexos como strings, e o canvas depende do lookup local `chords-db`; esse lookup nao representa necessariamente os 8969 acordes reais do `chord_library`. Se `C7M(9)` ou equivalentes nao forem encontrados no lookup local, o canvas cai para chip textual em vez de diagrama. Isso confirma o item ja registrado no backlog sobre `chord_grid` usar biblioteca real.

Diagnostico: o editor de acorde individual tem boa estrutura, mas a grade de acordes no material nao tem paridade garantida enquanto usar lookup local para strings.

## 4. Editor de Cifra / Repertorio

Arquivos principais:

- `src/components/repertoire/CifraEditor.tsx`
- `src/components/modals/RepertoireModal.tsx`
- `src/components/repertoire/RepertoireSheet.tsx`
- `src/components/repertoire/PrintableCifra.tsx`
- `src/services/repertoireService.ts`

### Formato de saida

Tabela principal: `repertoire`.

Campos relevantes:

- `title`
- `artist`
- `chords text[]`
- `key`
- `genre`
- `difficulty`
- `instruments text[]`
- `chord_structure jsonb`
- `cifra_content text`
- `lyrics text`
- `cifra_source text`
- `bpm`
- `capo`
- `time_signature`
- `songsterr_id`
- `sections jsonb`
- `gp_file_url`

Contagem real:

- 2937 registros em `repertoire`
- 2936 com `cifra_content`
- 2 com `gp_file_url`
- 4 com `songsterr_id`

### Renderer interno durante edicao

`CifraEditor` usa:

- textarea monoespacado para edicao.
- `PreviewPane` proprio para preview com syntax highlighting.
- `extractChordsFromCifra()` para detectar acordes.
- busca diagramas em `chord_library` via `getChordsByNames()`.
- `ChordDiagram` para violao.
- `PianoKeyboard` para piano.
- `ChordEditor` e `KeyboardEditor` podem abrir para editar/criar acordes detectados.

### Renderer usado no preview/canvas

Nao ha renderer de cifra/repertorio em `MaterialPreview`. O tipo aparece como conceito do produto e em outras telas, mas o canvas do material nao tem `BlockRepertoire`/`BlockCifra` no mapa de renderers.

O preview do repertorio fora do canvas usa `RepertoireSheet`, com parser proprio `parseCifraBlocks()` e componente `CifraContentView`. O PDF usa `PrintableCifra`, que duplica um parser simplificado.

### Conversoes

Conversoes encontradas:

- texto cru de cifra -> acordes detectados (`extractChordsFromCifra`)
- texto cru -> ChordPro (`plainTextToChordPro`)
- ChordPro -> texto (`chordProToPlainText`)
- transposicao de cifra e acordes (`transposeCifraContent`, `transposeChords`)
- parser inline no `CifraEditor`
- parser duplicado em `PrintableCifra`
- parser em `RepertoireSheet`

### Settings AlphaTab

Nao aplicavel para cifra em si. O repertorio pode ter `gp_file_url` e player AlphaTab em componentes relacionados, mas `CifraEditor` nao usa AlphaTab para renderizar a cifra.

### Snapshot/cache

Nao passa pelo `MusicSnapshotPreheater` porque nao ha bloco de cifra/repertorio renderizado no `MaterialPreview` do Editor de Material.

### Casos de teste

| Caso | Editor interno | Preview | Dado bruto | Status |
| --- | --- | --- | --- | --- |
| Template Fundamentos | Nao existe bloco de cifra/repertorio | Nao ha comparacao no canvas | N/A | N/A |
| Repertorio geral | `CifraEditor` textarea + PreviewPane | `RepertoireSheet` / `PrintableCifra` | `repertoire.cifra_content` | divergencia leve ⚠️ |

Diagnostico: cifra/repertorio nao e causa do bug atual no Editor de Material. Mas ha risco de paridade fora do canvas porque existem parsers duplicados para o mesmo texto musical.

## 5. Pipeline de snapshot/cache do canvas

`src/pages/Editor.tsx` define:

```ts
MUSIC_RENDERER_BLOCK_TYPES = new Set([
  'notation',
  'rhythm',
  'tablature',
  'chord_grid',
  'keyboard',
  'keyboard_grid',
  'chord_diagram'
])
```

Consequencia: o mesmo mecanismo de snapshot/preheater trata blocos AlphaTab e nao-AlphaTab como renderers musicais.

Para cada bloco musical:

- mede altura.
- captura `innerHTML`.
- guarda snapshot por `block.id` + hash de conteudo/render_data.
- reusa HTML estatico.
- hidrata renderer real depois.

Risco por tipo:

| Tipo | Motor real | Risco do snapshot atual |
| --- | --- | --- |
| notation | AlphaTab / NotationPreviewCompat | alto |
| rhythm | AlphaTab | alto |
| tablature | AlphaTab ou `<pre>` | medio/alto |
| chord_grid | SVGuitar ou chip textual | medio |
| chord_diagram | SVGuitar | medio |
| keyboard | svg-piano | baixo/medio |
| keyboard_grid | svg-piano | baixo/medio |

O principal achado: a pipeline mistura dois problemas diferentes. AlphaTab precisa de politica propria de largura, settings e render-finished real; SVGuitar/svg-piano precisam mais de captura apos DOM estavel e dados estruturados corretos.

## 6. Respostas objetivas do Prompt #11

### Os problemas da pipeline de notacao afetam os demais editores?

Sim, mas em graus diferentes.

- `snapshot por timeout`: afeta todos os tipos em `MUSIC_RENDERER_BLOCK_TYPES`.
- `lazy loading / container width / postRenderFinished`: afeta principalmente `notation`, `rhythm` e `tablature`, porque usam AlphaTab.
- `falta de dados estruturados`: afeta fortemente `notation` legado; afeta `chord_grid` quando salva apenas strings; afeta menos teclado, que ja usa arrays de teclas.
- `staveProfile`: afeta `notation`, `rhythm` e `tablature`; nao afeta teclado/acorde.

### A funcao `buildAlphaTabSettings` precisa cobrir quantos casos?

Casos recomendados para o Prompt #12:

1. `editor-notation-score`: editor de notacao em pauta, sem tablatura.
2. `editor-notation-grand-staff`: notacao com grande pauta.
3. `editor-tablature-tab`: preview AlphaTab dentro do editor de tablatura.
4. `canvas-notation-score`: bloco `notation` no material.
5. `canvas-rhythm-score`: bloco `rhythm`.
6. `canvas-tablature-tab`: bloco `tablature` com `render_data.alphaTex`.
7. `snapshot-notation`: captura offscreen de notacao.
8. `snapshot-rhythm`: captura offscreen de ritmo.
9. `snapshot-tablature`: captura offscreen de tablatura.

Nao incluir teclado, chord_grid ou chord_diagram nessa funcao, porque eles nao usam AlphaTab.

### Qual editor esta em melhor estado?

Melhor estado: Teclado/Piano.

Evidencia:

- dados estruturados simples (`keys`, `chords[]`);
- renderer sem AlphaTab;
- `PianoKeyboard` e reutilizado no canvas, repertorio e PDF;
- seis blocos reais no template com dados claros.

Risco remanescente: `highlights` pode nao estar sendo representado no canvas.

### Qual editor esta em pior estado?

Pior estado no material atual: Notacao, conforme auditoria separada.

Entre os editores desta passada: Tablatura e `chord_grid` tem os maiores riscos.

- Tablatura: tres representacoes diferentes (`TabSvgEditor`, `AlphaTabViewer`, `AlphaTexInlineRenderer`/`pre`) e possivel `staveProfile` errado no canvas.
- `chord_grid`: template salva strings e preview usa lookup local `chords-db`, nao a `chord_library` real.

### Ha divergencia critica alem da notacao que deve entrar no Prompt #12?

Sim, duas:

1. `tablature` com `render_data.alphaTex` deve entrar no Prompt #12 para settings AlphaTab e snapshot, mesmo nao aparecendo no template atual.
2. `chord_grid` nao e caso de AlphaTab, mas deve entrar logo depois: o canvas precisa resolver acordes pela `chord_library` real ou salvar objetos estruturados no `render_data.chords[]`.

As correcoes planejadas para notacao nao resolvem automaticamente `chord_grid`. Elas podem resolver parte de `tablature` se `buildAlphaTabSettings` cobrir `staveProfile="tab"` e snapshot offscreen.

## 7. Hipoteses provaveis

Top 3 hipoteses para divergencias:

1. AlphaTab esta sendo renderizado/capturado antes de largura e DOM estarem realmente estaveis no canvas virtualizado.
2. O mesmo snapshot/preheater trata AlphaTab, SVGuitar e svg-piano como se tivessem as mesmas necessidades de montagem.
3. Alguns blocos do material salvam dados fracos ou indiretos, como `chord_grid` com strings, obrigando o preview a fazer lookup local diferente do banco real.

## 8. Baixo risco / alto impacto

- Centralizar settings AlphaTab por contexto, sem mudar dados.
- Forcar `staveProfile="tab"` em caminhos de tablatura AlphaTex.
- Separar criterios de snapshot para AlphaTab vs SVG estatico.
- Documentar que `mode Livre` em notacao nao deve ser convertido para `4/4`.
- Para `chord_grid`, antes de mexer em UI, criar diagnostico que liste quais strings do template nao resolvem na `chord_library`.

## 9. Precisa de mais investigacao antes de tocar

- Como migrar `chord_grid` string-only para dados estruturados sem quebrar materiais existentes.
- Se `highlights` de teclado deve aparecer visualmente no canvas ou e apenas metadado antigo.
- Se `repertoire_sheet` deve virar bloco real do Editor de Material ou continuar como modulo separado.
- Como alinhar `TabSvgEditor` e AlphaTab para casos de ligadura, ponto, tuplet e picking sem perder a simplicidade do editor visual.
