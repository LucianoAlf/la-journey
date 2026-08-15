# Notação — escrever na A4

Data: 2026-08-15  
Status: aprovado (desenho validado pelo Luciano)  
Corte: clicar na pauta do material = editar na folha (gesto MuseScore/Finale/Sibelius)

Spec anterior (modal = mesma gravura): `docs/superpowers/specs/2026-08-15-notacao-alphatab-folha-design.md`. Este corte **não** apaga aquele. Empilha em cima.

## Problema

A gravura já é AlphaTab dentro e fora. O gesto ainda é o errado: **Editar notação** abre um modal. MuseScore, Finale e Sibelius escrevem **na partitura**. O professor da LA Journey precisa do mesmo: clicar na pauta da A4 e escrever.

## Decisões travadas

| Tema | Escolha |
|---|---|
| Gesto | Clica no bloco de notação da A4 → escreve ali. Sem modal no caminho principal |
| Biblioteca | Modal **Editar notação** em Biblioteca → Notação **continua**. Não unificar as duas telas neste corte |
| Motor | **AlphaTab**. MuseScore 3.x é app Qt/QML ([repo](https://github.com/musescore/MuseScore/tree/3.x), [API de plugin](https://musescore.github.io/MuseScore_PluginAPI_Docs/plugins/html/index.html)). Não é SDK web. Não integrar |
| Modelo | Continua `beats` → `beatsToAlphaTex`. Sem Score nativo do AlphaTab |
| Superfície | O AlphaTab **do próprio bloco** na A4 + overlay (`boundsLookup`). Não montar um segundo AlphaTab na lateral |
| Duração / acidente | Fileira **perto da pauta** (as mesmas teclas do modal: semibreve → semifusa, pausa, ponto, ♯♭) |
| Resto das ferramentas atuais | **Lateral direita** do editor de material, no lugar do painel de bloco / configuração da página, só enquanto a pauta está selecionada |
| O que entra neste corte | Só o que o modal já faz: modo livre/compasso, clave, armadura, fórmula, durações, pausa, ponto, quiáltera, acidente, transpor, undo/redo, play + BPM, teclado A–G |
| Save | Igual texto no canvas: a alteração vai para o `render_data` do bloco na hora. **Salvar** do material persiste. Sem botão Atualizar no caminho in-place |
| Partitura inteira | Abrir o bloco carrega **todos** os sistemas (`notation_data` / `alphaTex`), não só o primeiro stave legado |
| Tablatura | Fora |
| PDF / snapshot | Não mexer no cano |

## Fora deste corte (Radar, já no mapa)

Ordem no `.agent/development-map.md` (15/08):

1. Mapas de acorde e cifra na pauta (lead sheet)
2. Apostila / Download (não songbook)
3. Ligadura, articulação, dinâmica, letra, voz 2, copiar/colar, seleção
4. Folha deitada (horizontal) vs em pé
5. Playhead no compasso (repertório tocando; aluno e professor acompanham)
6. Tom/capo no PDF

Não implementar nenhum desses itens neste corte.

## O que não se constrói

- Embutir MuseScore, OSMD, ou um segundo motor de gravura
- Reescrever `NotationEditorV2` do zero
- Apagar o modal da Biblioteca
- Folha deitada, playhead, cifra-mapa
- Trocar `beats` pelo modelo interno do AlphaTab

## Peças reutilizadas

| Peça | Uso |
|---|---|
| `NotationAlphaTabSurface` / overlay já no modal | Mesmo hit-test e pitch-por-Y, agora **em cima do AlphaTab do bloco** |
| `beats` / `handleInsertNote` / `handleReplaceNote` / `handleDeleteBeat` | Contrato de input. Extraído para poder viver no Editor sem o Dialog |
| `beatsToAlphaTexWithMap` | Tex que o bloco já desenha |
| `buildAlphaTabSettings` + purpose `canvas-notation-score` | Inalterado |
| `blockToNotationRow` | Hidratação do bloco → beats (partitura inteira quando não há stave apontado) |
| `handleNotationEditorSave` | Grava `notation_data` + alphaTex no bloco. In-place chama a mesma escrita, sem Dialog |
| `NotationEditorV2` | Continua sendo o modal da Biblioteca. Toolbar dele vira fonte da fileira + da lateral, não uma cópia divergente |
| Painel direito do `Editor.tsx` | Troca o conteúdo quando `selectedBlock.block_type === 'notation'` |

## Arquitetura

```
clique no bloco notação (A4)
        │
        ▼
  sessão in-place (beats no Editor)
        │
        ├─ overlay no AlphaTab do bloco ──► insert/replace/delete
        ├─ fileira duração/acidente (perto da pauta)
        └─ lateral direita (clave, compasso, play, …)
                │
                ▼
        render_data do bloco (alphaTex + notation_data)
                │
                ▼
        Salvar do material → persistência (como hoje)
```

Três unidades:

1. **`NotationInlineSession`** — estado `beats` + history + os handlers que hoje vivem no V2. Não desenha Dialog. O `Editor` monta isso quando o bloco de notação está selecionado. Testável sem React de página.
2. **`NotationDurationStrip`** — só duração, pausa, ponto, acidente. Render perto do bloco (toolbar contextual do canvas, não a coluna da direita).
3. **`NotationToolsSidebar`** — o restante do que o modal já mostra (modo, clave, armadura, fórmula, quiáltera, transpor, undo/redo, play, BPM). Substitui o painel de propriedades do bloco enquanto a pauta está selecionada. Configuração de página / cabeçalho não some do produto: volta quando o bloco de notação deixa de estar selecionado.

O overlay não conhece save. A sessão escreve no bloco. A lateral não conhece AlphaTab.

## Fluxo

1. Abrir material com bloco de notação (Intervalos Melódicos — Série 1).
2. Clicar na pauta. Não abre modal.
3. Fileira de duração aparece perto da pauta. Lateral direita vira as ferramentas de notação.
4. Clicar na pauta / teclar A–G altera `beats` → o AlphaTab **do bloco** redesenha.
5. Trocar de bloco: a lateral volta ao que era (conteúdo / estilo / configuração da página).
6. **Salvar** no topo do material grava como hoje.
7. Biblioteca → Notação: o modal `NotationEditorV2` abre igual.

## Rollback

- Query `?notationInline=off` (ou constante no mesmo espírito de `notationSurface`): clique na pauta volta a só selecionar o bloco; **Editar notação** abre o modal.
- Não apagar `NotationEditorV2`.
- Sem migration. Sem schema novo.

## Critério de pronto (browser, local `localhost:3002`)

Não basta build.

1. Intervalos Melódicos — Série 1. Clicar na pauta: **não** abre “Editar Notação”.
2. A partitura na A4 tem **todos** os sistemas, não duas notas de um stave.
3. Lateral direita mostra clave / modo / play. Fileira de duração está perto da pauta.
4. Inserir uma nota (clique ou A–G). A folha A4 mostra a nota **sem** fechar nada.
5. Salvar, recarregar: a nota continua.
6. Biblioteca → Notação ainda abre o modal.
7. `?notationInline=off`: o clique na pauta não entra em escrita in-place.

## Testes

- Unidade: hidratar bloco com vários staves legado → beats da partitura **inteira** (não só índice 0).
- Unidade: sessão — insert/delete atualiza beats e o tex gerado.
- Unidade: flag `notationInline` (default on, query off).
- Browser: critério de pronto acima.

## Risco

O AlphaTab do bloco hoje é preview. Ligar overlay + `includeNoteBounds` no canvas pode pesar o A4 (vários blocos). Só o bloco **selecionado** liga hit-test. Os outros continuam preview.

Clique na pauta hoje seleciona o bloco. O in-place **é** essa seleção: primeiro clique foca e habilita ferramentas; o mesmo clique (ou o seguinte) insere se estiver em modo escrita. Se o primeiro clique só focar, o segundo escreve — documentado no plano de implementação, um gesto só no critério de pronto.

## Relação com o caderninho

Respiro igual dos dois lados da pauta, worker Vite no worktree, e modal carregando a partitura inteira são pré-requisito visual. Viajam no mesmo worktree (`feat/notacao-caderninho`) e entram no PR deste produto, não como corte separado de spec.
