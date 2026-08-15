# Notação — a folha é o AlphaTab

Data: 2026-08-15  
Status: aprovado  
Corte: modal **Editar notação** usa a mesma gravura do material

## Problema

O professor edita a pauta num desenho e vê o material em outro.

- **Fora** (canvas A4, biblioteca, snapshot): AlphaTab via `AlphaTexInlineRenderer` / `AlphaTabViewer`, purpose `canvas-notation-score`, layout `page`.
- **Dentro** (modal `NotationEditorV2`): `NotationSvgEditor` (pauta SVG nossa) + um segundo AlphaTab rotulado “Preview (AlphaTab)” com purpose `editor-notation-score`.

As notas podem bater. A apresentação não: espaçamento, sistemas, escala, gravura. Sibelius, Finale, MuseScore e o Flat.io atual não fazem isso — um motor de gravura, edição em cima da folha. AlphaTab se declara SDK de gravura + hit-test, não editor pronto. A UX (toolbar, teclado) já é nossa.

## Decisões travadas

| Tema | Escolha |
|---|---|
| Verdade visual | AlphaTab. O SVG do modal deixa de ser a folha |
| O que se edita | Continua o modelo `beats` + `beatsToAlphaTex`. Não migrar o estado para o data model interno do AlphaTab neste corte |
| Superfície | Overlay HTML sobre o AlphaTab (`boundsLookup`, `includeNoteBounds`). Spike `src/lib/SPIKE_ALPHATAB_INTERACAO.md` |
| Settings do modal | **Os mesmos do canvas**: purpose `canvas-notation-score`, layout `page`, scale `1`, `showTimeSignature` pela mesma regra de `hasExplicitAlphaTexTimeSignature` |
| Onde | `NotationEditorV2` — o mesmo modal do editor de material e da Biblioteca → Notação |
| Rollback | Flag `notationSurface`: `alphatab` (novo) ou `svg` (atual). SVG e o preview duplicado não são apagados neste corte |
| Tablatura | Fora. Mesmo padrão depois, spec própria |
| Editar na A4 | Fora. Modal continua. In-place na folha é corte seguinte |
| PDF / GP / snapshot | Não mexer no cano. O canvas já é AlphaTab |

## Fora deste corte

- `TablatureEditor` / `TabSvgEditor`
- Toolbar flutuando no bloco da folha A4 (MuseScore-on-the-page)
- Reescrever `NotationEditorV2` (toolbar, undo, playback, save)
- Trocar `beats` por Score nativo do AlphaTab
- Unificar purpose `editor-*` vs `canvas-*` em todos os callers (só o modal de pauta)
- Apostila / Download, tom/capo, salvar exercício de volta na biblioteca

## O que não se constrói

- Segundo motor “mais parecido” com o SVG
- Jogar `NotationSvgEditor` no canvas
- Editor novo do zero
- WebGL / motor próprio de gravura

## Peças reutilizadas

| Peça | Uso |
|---|---|
| `NotationEditorV2` | Modal, toolbar, teclado, history, playback, save. Só troca a superfície |
| `beats` / `handleInsertNote` / `handleReplaceNote` / `handleDeleteBeat` | Contrato de input. Overlay chama as mesmas funções |
| `beatsToAlphaTex` / `beatsToAlphaTexWithMap` | Fonte do tex que o AlphaTab desenha |
| `AlphaTabViewer` | Mesmo componente do canvas, purpose de canvas |
| `buildAlphaTabSettings` | Já tem `includeNoteBounds` e purposes. Modal passa `includeNoteBounds: true` |
| `alphaTabIndexMap` | Já existe no V2 para alinhar beat do modelo ↔ beat do AlphaTab |
| `NotationSvgEditor` | Rollback. Não deletar |

## Arquitetura

```
[toolbar / teclado / undo]     inalterado
        │
        ▼
   beats (modelo)              inalterado
        │
        ├─ beatsToAlphaTex ──► AlphaTab (folha)     purpose = canvas-notation-score
        │                         ▲
        │                         │ boundsLookup + overlay
        └─ insert/replace/delete ◄┘
```

Três unidades:

1. **`notationSurface` flag** — módulo pequeno (`src/lib/notationSurface.ts`). Lê constante + query `?notationSurface=svg` para voltar o modal antigo sem redeploy. Default do corte: `alphatab`.
2. **`NotationAlphaTabSurface`** — AlphaTab + overlay. Responsável por: render com settings de canvas, hit-test (selecionar beat, mapear Y da pauta → pitch no mesmo espírito do SVG), ghost da duração atual, highlight do beat selecionado / playback. Não conhece save nem toolbar.
3. **`NotationEditorV2`** — se a flag é `alphatab`, monta a surface no lugar de `NotationSvgEditor` e **não** monta o bloco “Preview (AlphaTab)”. Se é `svg`, comportamento atual.

Pitch no clique: o overlay usa a linha/espaço da pauta do AlphaTab (staff Y do `boundsLookup`), não o Y do SVG antigo. O resultado continua no formato `C/4` que `handleInsertNote` já espera.

## Fluxo

1. Canvas: bloco de notação (AlphaTab, como hoje).
2. **Editar notação** abre o modal.
3. A área central é a mesma gravura do bloco (sistemas, espaço, clave).
4. Clique / teclado altera `beats` → tex novo → AlphaTab redesenha.
5. **Atualizar** grava no bloco como hoje (`notation_data` + alphaTex).
6. Fecha o modal: o canvas já era AlphaTab; a apresentação não “muda de língua”.

## Rollback

- Query `?notationSurface=svg` ou constante no módulo.
- `NotationSvgEditor` e o preview duplicado permanecem no repo.
- Sem migration. Sem mudança de schema.

## Critério de pronto (browser, produção ou local)

Não basta build.

1. Abrir material com **Intervalos Melódicos — Série 1** (ou bloco “Intervalos a partir de Dó”).
2. Foto do bloco no canvas.
3. Clicar **Editar notação**.
4. A pauta do modal tem que ser a **mesma gravura**: layout em página, sistemas empilhados, mesmo espaçamento. Não uma pauta horizontal SVG com outro AlphaTab embaixo.
5. Inserir uma nota, atualizar, fechar: o canvas mostra a nota nova na mesma linguagem.
6. Ligar `notationSurface=svg`: o modal antigo volta.

## Testes

- Unidade: mapeamento beat do modelo ↔ índice AlphaTab (`alphaTabIndexMap`); pitch a partir de Y da pauta (funções puras do overlay).
- Unidade: flag (default alphatab, query svg).
- Browser: o critério de pronto acima. Sem isso o corte não fecha.

## Risco

O AlphaTab não é editor. Overlay + `boundsLookup` é o caminho que o próprio SDK documenta. Se o hit-test de “clique no vazio da pauta → pitch” ficar pobre no primeiro passe, seleção + teclado + toolbar ainda editam — o ganho visual (folha única) já vale o corte. Afinar o ghost/clique é iteração, não motivo para voltar ao SVG como folha.
