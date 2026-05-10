# Auditoria AlphaTab e Renderizacao Musical - Maio 2026

Data: 2026-05-09
Projeto: LA Journey
Escopo: Editor de Material, editores musicais e renderizacao no canvas A4

## Resumo executivo

O AlphaTab nao deve ser descartado. A investigacao aponta que o problema atual nao e o motor em si, mas a forma como o LA Journey esta alimentando, montando, virtualizando e cacheando a renderizacao dele no canvas.

O editor interno de notacao mostra uma representacao consistente porque trabalha com `beats` estruturados e renderiza tambem um preview controlado. Ao fechar o modal, o canvas usa outro caminho: muitos blocos antigos dependem apenas de `render_data.alphaTex`, passam por `MaterialPreview`, entram em uma camada de snapshot/preheat/virtualizacao, e podem ser exibidos a partir de HTML capturado por timeout.

Esse caminho permite dois tipos de quebra:

1. Snapshot parcial: staff lines ou SVG incompleto entram no cache como se fossem renderizacao valida.
2. Semantica perdida: blocos em modo Livre estao salvos como AlphaTex solto, muitas vezes com `|`, sem `notation_data` e sem metadados explicitos de intencao pedagogica.

Regra de produto confirmada: modo Livre nao deve virar 4/4. Exemplos teoricos podem mostrar intervalos, notas soltas ou escalas sem formula de compasso. Qualquer solucao precisa preservar isso.

## Evidencias locais

### Browser

Logs atuais do editor mostram uso intenso de snapshots musicais:

- `musicSnapshot action=preheat` para dezenas de blocos `notation`.
- `musicSnapshot action=use` usando HTML cacheado.
- `alphaTabHydration action=release` ocorre depois, com `alphaTabSurfaces: 0` em varios momentos.

Isso indica que o usuario muitas vezes esta vendo snapshots estaticos, nao necessariamente o AlphaTab vivo e completo.

### Codigo

Arquivos principais:

- `src/components/music/NotationEditorV2.tsx`
- `src/components/music/NotationSvgEditor.tsx`
- `src/components/music/AlphaTabViewer.tsx`
- `src/components/music/AlphaTexInlineRenderer.tsx`
- `src/components/music/NotationPreviewCompat.tsx`
- `src/components/material/MaterialPreview.tsx`
- `src/lib/beatsToAlphaTex.ts`
- `src/lib/notationCompat.ts`
- `src/pages/Editor.tsx`
- `src/lib/editorMusicHydrationQueue.ts`

Pontos criticos encontrados:

- `CanvasMaterialPreview` captura snapshot por `setTimeout(..., 420)` e tambem no unmount via `useLayoutEffect`.
- `MusicSnapshotPreheater` usa polling por HTML estavel, tamanho minimo e timeout, nao um evento confiavel do AlphaTab.
- `isUsableMusicSnapshotHtml` aceita `svg` + tamanho/assinatura de classe. Isso nao garante que notas, claves e glyphs estejam completos.
- O preheater monta fora do viewport com `opacity: 0`, `zIndex: -1` e `overflow: hidden`. Ele tem largura, mas ainda depende da renderizacao/lazy loading do AlphaTab e da estabilidade visual do DOM.
- A fila de hidratacao limita AlphaTab por pagina, mas o snapshot pode ser usado antes do renderer real completar.

### Banco de dados

Consulta no projeto Supabase `rkfszavfqplhorvfpkcq`, material `01abd63e-77df-493c-8af1-76a401e84adb`:

- Blocos iniciais de notacao como `Notas nas Linhas`, `Notas nos Espacos` e `Escala de Do` tem `render_data.alphaTex`.
- Muitos nao tem `render_data.notation_data` nem `content.notation_data`.
- Exemplos de alphaTex livre:
  - `\title "Notas nas Linhas - Clave de Sol" \tempo 80 . :1 e4 | g4 | b4 | d5 | f5`
  - `\title "Escala de Do - Clave de Sol" \tempo 80 . :4 c4 d4 e4 f4 | g4 a4 b4 c5 | c5 b4 a4 g4 | f4 e4 d4 c4`

Esses blocos nao declaram `\ts`, entao nao sao 4/4 por intencao do produto. Mas eles usam barras `|`, e o AlphaTab pode interpretar a estrutura como compassos dentro do modelo padrao. A solucao correta nao e adicionar `\ts 4 4`, e sim padronizar a semantica de "livre" e a visualizacao esperada.

## Evidencias da documentacao oficial AlphaTab

Fontes primarias consultadas:

- API `AlphaTabApi`: https://alphatab.net/docs/reference/api/
- `renderFinished`: https://alphatab.net/docs/reference/api/renderfinished
- `postRenderFinished`: https://alphatab.net/docs/reference/api/postrenderfinished
- `resize`: https://alphatab.net/docs/reference/api/resize
- Low Level APIs: https://alphatab.net/docs/guides/lowlevel-apis
- Node/SVG rendering guide: https://alphatab.net/docs/guides/nodejs
- AlphaTex bar metadata: https://alphatab.net/docs/alphatex/bar-metadata/
- Web/React installation: https://alphatab.net/docs/getting-started/installation-web
- Official samples: https://github.com/CoderLine/alphaTabSamplesWeb
- React/Vite sample: https://github.com/CoderLine/alphaTabSamplesWeb/tree/main/src/vite-react

Achados relevantes:

- AlphaTab renderiza em partes/chunks. A propria doc diz que o renderer separa layout e renderizacao.
- `renderFinished` informa que o motor terminou, mas ainda pode haver tarefas de exibicao no componente visual.
- `postRenderFinished` ocorre depois dos handlers de `renderFinished`; mesmo assim, se lazy loading estiver ativo, nem todas as imagens parciais podem estar no DOM.
- A doc de low-level APIs diz que `partialLayoutFinished` e `partialRenderFinished` sao o caminho fino para saber o que realmente foi renderizado.
- A configuracao `core.enableLazyLoading` pode impedir que todos os chunks sejam anexados ao DOM imediatamente. A doc recomenda desabilitar em cenarios onde todos os itens renderizados precisam estar disponiveis.
- A doc oficial afirma que React nao tem componente pronto: o desenvolvedor deve montar via ref, cuidar dos bindings e respeitar o ciclo do `AlphaTabApi`.
- O sample React/Vite oficial monta `new AlphaTabApi(elementRef.current, settings)` uma vez no `useEffect` e chama `api.destroy()` no cleanup.

## Hipoteses de causa raiz

### H1 - Snapshot parcial entra no cache

Probabilidade: alta.

O canvas aceita HTML com `<svg>` e tamanho suficiente. Staff-only tambem e SVG. Como a captura e por timeout/polling, ela pode salvar um estado intermediario. Isso explica:

- bloco vazio ou so com linhas na primeira chegada;
- depois de abrir/fechar o editor, aparece algo diferente;
- renderizacao "volta", mas ainda quebrada ou incompleta.

### H2 - AlphaTab e virtualizacao competem

Probabilidade: alta.

O canvas ativa/desativa paginas, desmonta renderers e usa snapshots. AlphaTab tambem tem lazy rendering por chunks. Estamos empilhando duas camadas de lazy rendering. Essa combinacao precisa de contrato explicito: quando montar, quando considerar pronto, quando capturar, quando destruir.

### H3 - Pipeline interno e externo nao usam a mesma fonte de verdade

Probabilidade: alta.

Dentro do modal, a fonte de verdade e `beats`. No canvas, muitos blocos antigos usam apenas `render_data.alphaTex`. Ao salvar, o bloco pode ganhar `notation_data`, mas os blocos antigos continuam dependentes do legado.

### H4 - Modo Livre esta semanticamente subdefinido

Probabilidade: media-alta.

Livre nao significa 4/4. Mas para AlphaTab, barras e duracoes ainda criam uma estrutura musical. Precisamos decidir uma representacao canonica para:

- notas soltas em pauta;
- intervalos;
- escalas sem formula;
- exercicios com barras pedagogicas;
- exemplos ritmicos com formula real.

### H5 - Cleanup visual agressivo mascara bugs

Probabilidade: media.

`AlphaTabViewer` e `AlphaTexInlineRenderer` escondem elementos via DOM/SVG depois da renderizacao. Isso pode ser aceitavel como acabamento visual, mas nao pode ser o mecanismo central para converter um render metrico em render livre. A semantica deve vir antes do cleanup.

## Decisao tecnica recomendada

Nao continuar adicionando patches visuais no canvas antes de criar uma pipeline unica e testavel para musica.

### Direcao

1. Manter AlphaTab.
2. Manter modo Livre sem virar 4/4.
3. Definir `notation_data` como fonte de verdade para blocos editaveis.
4. Gerar AlphaTex somente a partir de `notation_data`, com regras claras.
5. Para blocos legados que so possuem `alphaTex`, criar conversao/migracao controlada ou render path separado.
6. Trocar snapshots por contrato orientado a eventos do AlphaTab.

## Plano cirurgico

### Fase 0 - Congelar mudancas de UX/performance musical

Enquanto a renderizacao musical estiver instavel:

- nao expandir Canvas-First;
- nao alterar mais toolbar/editor inline musical;
- nao mexer em paginacao musical sem teste visual.

### Fase 1 - Golden fixtures

Criar fixtures locais representando:

1. Livre: cinco notas nas linhas, sem formula.
2. Livre: notas nos espacos, sem formula.
3. Livre: escala de Do sem formula.
4. Metrico: 4/4 com semibreve/minima.
5. Metrico: 2/4, 3/4, 4/4.
6. Intervalos harmonicos.
7. Tríades.
8. Grande pauta/piano.
9. Tablatura/violao.
10. Teclado.

Cada fixture deve validar:

- AlphaTex gerado;
- preview interno;
- canvas A4;
- snapshot cache;
- reload direto da pagina.

### Fase 2 - Instrumentar AlphaTabViewer corretamente

Adicionar callbacks dev-only:

- `scoreLoaded`
- `renderStarted`
- `renderFinished`
- `postRenderFinished`
- `renderer.partialRenderFinished`
- `error`
- dimensoes do container no momento da chamada
- quantidade de SVGs e glyphs apos `postRenderFinished`

O objetivo e provar quando o DOM esta completo.

### Fase 3 - Desabilitar lazy loading para snapshots

Para snapshots e preheater:

- usar `settings.core.enableLazyLoading = false`;
- capturar somente depois de `postRenderFinished` + um frame (`requestAnimationFrame`);
- validar que o snapshot contem conteudo musical esperado, nao apenas linhas.

### Fase 4 - Remover captura por timeout

Substituir:

- `setTimeout(captureMusicSnapshot, 420)`
- polling por `html.length`

Por:

- evento `onStableRenderFinished` vindo do renderer;
- estado explicito `idle | rendering | ready | error`;
- cache apenas quando `ready`.

### Fase 5 - Padronizar livre vs metrico

Criar uma especificacao:

- `timeSignature: null` ou `'free'` = livre real;
- `\ts` so aparece quando o usuario escolheu compasso;
- barras `|` em livre devem ser tratadas como quebras/separadores pedagogicos, nao como prova de 4/4;
- se AlphaTab precisar de `\ft`, usar de modo consistente e esconder apenas o texto/marcador visual quando o produto pedir visual limpo.

### Fase 6 - Unificar editor e canvas

Canvas deve usar o mesmo componente/base de configuracao do preview interno:

- mesmas opcoes de `staveProfile`;
- mesmo `layout`;
- mesma regra `showTimeSignature`;
- mesma fonte de dados;
- mesma conversao `beatsToAlphaTex`.

## Criterios de aceite

1. Recarregar direto em uma pagina com notacao mostra notas completas, sem abrir o editor.
2. Abrir/fechar o editor nao muda a aparencia do bloco no canvas, salvo alteracao real feita pelo usuario.
3. Modo Livre nao mostra 4/4 inventado.
4. Bloco livre com notas nas linhas renderiza as notas no canvas e no modal de forma equivalente.
5. Snapshot cache nunca salva staff-only.
6. `npm run lint` e `npm run build` passam.
7. O teste visual cobre pelo menos os 10 fixtures acima.

## Conclusao

O bug e arquitetural no nivel da pipeline musical, mas nao exige jogar fora o Editor nem o AlphaTab. A correcao deve ser pequena e profunda: alinhar fonte de dados, eventos de renderizacao e semantica de modo Livre. Depois disso, a performance pode voltar a ser otimizada com seguranca.

