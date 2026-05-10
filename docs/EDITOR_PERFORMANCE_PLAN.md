# Plano de Performance do Editor de Material

Atualizado em: 2026-05-09

## Diagnostico inicial

Material auditado: `01abd63e-77df-493c-8af1-76a401e84adb`

### Evidencias do navegador

- Clique em bloco de notacao no inicio do material: cerca de 1,7s.
- Clique em `chord_grid`/teclado perto do fim do material: cerca de 2,3s.
- Sem erros novos de console durante a medicao.
- DOM atual do editor:
  - 50 paginas `.a4-page`.
  - 139 blocos `.canvas-block` renderizados no canvas.
  - 151 itens `.block-item` na sidebar.
  - 139 blocos duplicados no container oculto de medicao.
  - 54 superficies AlphaTab.
  - 801 SVGs.

### Evidencias do banco

- Consulta equivalente do material com blocos no Postgres: cerca de 3,5ms para 151 linhas.
- Payload JSON dos blocos: cerca de 64 kB.
- Indices relevantes existem:
  - `material_blocks(id)`.
  - `material_blocks(material_id)`.
  - `material_blocks(material_id, sort_order)`.
  - `generated_materials(id)`.
  - `generated_materials(school_id)`.

Conclusao: o gargalo principal neste momento esta no front-end/renderizacao do editor, nao no banco.

## Hipoteses principais

1. O editor renderiza o material inteiro mesmo quando o usuario so interage com um bloco.
2. A autopaginacao duplica o custo, renderizando todos os blocos de novo em um container oculto para medir altura.
3. AlphaTab, diagramas de acorde e teclados geram muitos SVGs e sao montados tanto no canvas quanto no medidor.
4. Mudancas pequenas em `selectedBlockId`, zoom, sidebars ou propriedades provocam render/reflow de regioes grandes.
5. O arquivo `Editor.tsx` esta grande demais para isolar atualizacoes: estado, canvas, sidebar, painel de propriedades, exportacao, IA e editores visuais vivem no mesmo componente.

## Plano de execucao

### Fase 0 - Harness de performance

Objetivo: criar um jeito repetivel de medir antes/depois.

- Criar uma pequena instrumentacao dev-only para medir:
  - tempo de selecao de bloco;
  - quantidade de paginas renderizadas;
  - quantidade de blocos renderizados no canvas;
  - quantidade de AlphaTab/SVGs ativos;
  - tempo de autosave.
- Registrar baseline antes de cada fase.
- Criterio de aceite: clicar em 4 blocos representativos e obter metricas comparaveis.

### Fase 1 - Separar arquitetura do editor

Objetivo: reduzir re-render global.

- Extrair de `src/pages/Editor.tsx`:
  - `EditorHeader`;
  - `BlockListSidebar`;
  - `EditorCanvas`;
  - `PropertiesSidebar`;
  - `useEditorBlocks`;
  - `useEditorAutosave`;
  - `useEditorPagination`.
- Manter comportamento igual nesta fase.
- Aplicar `React.memo` nos componentes pesados.
- Criterio de aceite: clique de selecao nao deve re-renderizar sidebars e canvas inteiro sem necessidade.

Status inicial aplicado em 2026-05-09:

- `useEditorBlocks` concentra estado dos blocos, selecao, refs, undo/redo e setter com historico.
- `useEditorAutosave` concentra autosave com debounce e instrumentacao `[EditorPerf] autosave`.
- `useEditorPagination` foi criado com a logica de cache/estimativa/paginas para permitir o proximo corte fisico da paginação sem reescrever comportamento.
- `SortableBlockItem` virou `React.memo` e deixou de receber callbacks inline por item; os handlers agora recebem `block.id`.
- O preview pesado do canvas foi isolado em `CanvasMaterialPreview` memoizado, evitando recriar `MaterialPreview` para cada bloco quando a mudanca nao altera o bloco em si.

Medicao pos-Fase 1 em 2026-05-09:

- DOM inicial: `a4Pages: 45`, `activePages: 3`, `placeholderPages: 42`, `canvasBlocks: 8`, `alphaTabSurfaces: 0`.
- Selecao no browser:
  - Capa: 447ms.
  - Notacao inicial `Notas nas Linhas`: 328ms.
  - `chord_grid` final `Acordes com Tensoes`: 337ms.
  - Teclado final `Acordes com Tensoes`: 460ms.
- Interacao de texto validada: selecionar bloco, abrir editor inline com duplo clique e sair com Escape.
- Pendencia tecnica: `EditorHeader`, `BlockListSidebar`, `EditorCanvas` e `PropertiesSidebar` ainda precisam virar arquivos/componentes fisicos menores; este corte reduziu re-render de itens/previews pesados sem separar todo o JSX gigante em uma unica mudanca.

### Fase 2 - Virtualizar sidebar esquerda

Objetivo: a lista de 151 blocos nao deve custar como 151 componentes interativos o tempo todo.

- Virtualizar ou renderizar janela da lista de blocos.
- Manter drag-and-drop em uma etapa separada, se a virtualizacao conflitar com `@dnd-kit`.
- Alternativa inicial segura: modo compacto sem DnD ativo ate o usuario entrar em "Reordenar".
- Criterio de aceite: lista continua navegavel e selecao de bloco melhora sem quebrar reordenacao.

### Fase 3 - Renderizacao sob demanda do canvas

Objetivo: nao manter 50 paginas completas sempre renderizadas.

- Renderizar somente paginas proximas do viewport.
- Manter placeholders com altura fixa para preservar scroll.
- Pre-renderizar a pagina selecionada e vizinhas.
- Criterio de aceite: canvas continua com scroll correto, mas DOM cai de 50 paginas completas para uma janela pequena.

Status aplicado em 2026-05-09:

- O canvas mantem todas as folhas A4 como estrutura de scroll, mas so monta conteudo real para a janela ativa.
- A janela ativa usa `IntersectionObserver` para rastrear a pagina corrente e renderiza `currentPage +/- 2`; se o bloco selecionado estiver fora dessa janela, a pagina dele tambem fica ativa.
- Paginas fora da janela viram placeholders brancos com a mesma folha A4 e sem `.canvas-block`.
- Exportacao HTML, download PDF e impressao ativam temporariamente todas as paginas antes de serializar/imprimir.

Medicao pos-Fase 3 em 2026-05-09:

- DOM inicial: `a4Pages: 45`, `activePages: 3`, `placeholderPages: 42`, `canvasBlocks: 7`, `alphaTabSurfaces: 0`.
- Durante selecao dos blocos de baseline: `activePages: 3-4`, `canvasBlocks: 7-11`, `alphaTabSurfaces: 0-2`.
- Interacao de texto testada no browser: selecionar bloco de texto, abrir editor inline via duplo clique e sair com Escape.

### Fase 4 - Substituir medicao oculta completa

Objetivo: remover o segundo render completo dos 139 blocos.

Por que o medidor oculto existia: a autopaginacao A4 precisa de uma altura aproximada de cada bloco antes de decidir quantos blocos cabem em cada pagina. A implementacao anterior resolvia isso renderizando uma copia invisivel de todos os blocos, medindo `offsetHeight` e depois redistribuindo as paginas. O problema e que essa copia tambem montava renderers caros como AlphaTab, SVGuitar e teclados.

- Trocar o medidor oculto por uma estrategia incremental:
  - cache de altura por `block.id` + hash simples de `content/render_data/style`;
  - medir apenas bloco alterado;
  - usar alturas estimadas por tipo ate a medida real estar pronta;
  - nunca instanciar AlphaTab no medidor oculto.
- Criterio de aceite: autopaginacao continua coerente e o contador de blocos no medidor oculto deixa de duplicar o canvas.

Status inicial aplicado em 2026-05-09:

- Removido o container oculto que renderizava todos os blocos.
- Adicionado cache de altura por `block.id` + hash simples de `block_type/title/content/render_data`.
- Adicionadas estimativas por tipo de bloco, incluindo `notation: 200px`, `keyboard: 160px` e texto por quantidade de caracteres.
- A primeira renderizacao usa estimativas; depois o proprio canvas mede as alturas reais e atualiza o cache.

Medicao pos-Fase 4 em 2026-05-09:

- DOM: `canvasBlocks: 139`, `measurementBlocks: 0`, `alphaTabSurfaces: 27`, `svgCount: 726`, `a4Pages: 49`.
- Selecao de bloco no browser:
  - Capa: 270ms.
  - Notacao inicial `Notas nas Linhas`: 1114ms.
  - `chord_grid` final `Acordes com Tensoes`: 1077ms.
  - Teclado final `Acordes com Tensoes`: 1580ms.
- Comparacao com baseline: o medidor saiu de 139 blocos duplicados para 0; AlphaTab caiu de 54 para 27 superficies. Os blocos finais que estavam em torno de 2300ms cairam para 1077-1580ms, mas ainda ha lentidao perceptivel porque o canvas continua renderizando 49 paginas/139 blocos completos.

### Fase 5 - Renderers musicais leves

Objetivo: reduzir custo de AlphaTab/SVGuitar/svg-piano.

- Criar cache por `alphaTex` normalizado para previews estaticos.
- Adiar render AlphaTab para quando a pagina estiver visivel.
- Considerar fallback visual leve para paginas fora do viewport.
- Separar `MaterialPreview` em renderers memoizados por bloco.
- Criterio de aceite: quantidade de AlphaTab ativo cai fortemente fora da pagina visivel.

Status inicial aplicado em 2026-05-09:

- Renderers musicais deixam de montar quando a pagina sai da janela ativa, porque a pagina passa a ser placeholder.
- Adicionado cache em memoria por bloco musical com `block.id`, hash do conteudo/render_data e snapshot HTML sanitizado.
- Quando uma pagina inativa tem snapshot de bloco musical ja renderizado e o hash ainda bate, o placeholder pode exibir esse snapshot sem remontar o renderer.
- Medicao pos-Fase 5: AlphaTab caiu de 27 superficies pos-Fase 4 para `0-2` superficies durante os cliques medidos.

### Fase 6 - Autosave, undo e edicao fina

Objetivo: evitar custo em cada tecla/clique.

- Autosave deve observar somente o bloco alterado, nao o array inteiro de blocos.
- Undo/redo deve salvar snapshots por bloco ou patches, nao clones completos de 151 blocos.
- Inputs do painel direito devem atualizar estado local e commitar em debounce.
- Criterio de aceite: editar titulo/conteudo nao trava o canvas.

### Fase 7 - Banco e RPCs

Objetivo: manter banco saudavel, mas sem tratar como gargalo principal.

- Confirmar RPC real autenticada no navegador com timing de rede.
- Manter indices atuais.
- Se necessario, criar RPC leve para metadados/lista e outra para blocos, mas isso so vira prioridade se o Network mostrar latencia real.
- Criterio de aceite: carregamento inicial segue previsivel e autosave responde sem fila.

## Ordem sugerida

1. Fase 0: medir baseline dentro do codigo.
2. Fase 4: remover/diminuir o medidor oculto, maior ganho provavel.
3. Fase 3: renderizar canvas por janela de paginas.
4. Fase 5: lazy/cache dos renderers musicais.
5. Fase 1: extrair arquitetura em componentes menores enquanto os gargalos ja estao controlados.
6. Fase 2: virtualizar sidebar.
7. Fase 6: autosave/undo fino.
8. Fase 7: ajustes de banco se as metricas ainda apontarem necessidade.

## Meta de experiencia

- Selecao de bloco abaixo de 200ms.
- Scroll do canvas fluido.
- Edicao de texto sem travamento perceptivel.
- Sidebar esquerda e direita respondendo imediatamente.
- Nenhuma regressao na renderizacao de AlphaTex, teclados e `chord_grid`.
