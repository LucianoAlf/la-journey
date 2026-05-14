# Relatorio Executivo - Correcao AlphaTab no Canvas

Data: 14/05/2026
Projeto: LA Journey
Material de validacao: Fundamentos da Teoria Musical - Meu Material
Material ID: 01abd63e-77df-493c-8af1-76a401e84adb

## Resumo executivo

A sessao corrigiu uma regressao critica no canvas do editor: varios blocos AlphaTab passaram a aparecer apenas com linhas de pauta, hastes, barras ou marcas parciais, sem cabecas de nota completas. O problema prejudicava a leitura musical no editor e criava risco de o professor acreditar que o conteudo musical havia sido perdido.

O problema foi validado visualmente no browser local em paginas com exemplos de notacao, incluindo compassos, exercicios e blocos de pauta. A correcao final foi aprovada pelo usuario apos hard refresh e navegacao no editor.

## Sintoma observado

Os blocos musicais renderizados por AlphaTab apareciam no canvas com:

- pautas visiveis;
- hastes e barras de compasso visiveis;
- algumas marcas de articulacao ou numeracao;
- ausencia de cabecas de nota, claves e glyphs musicais completos em diversos casos.

Em alguns momentos, clicar no bloco ou navegar pela pagina fazia o conteudo aparecer corretamente, o que indicava um problema de renderizacao/ciclo de hidratacao, e nao perda real dos dados musicais.

## Diagnostico

Durante a investigacao, foram analisados os arquivos centrais do pipeline AlphaTab:

- `src/components/music/AlphaTabViewer.tsx`
- `src/lib/musicSnapshotValidation.ts`
- `src/lib/alphaTabSettings.ts`
- `src/pages/Editor.tsx`

O diff contra o commit `ee6ee18` mostrou alteracoes suspeitas em loading, validacao de snapshot e tema. Essas mudancas foram revertidas cirurgicamente nos arquivos AlphaTab.

Mesmo assim, o problema persistiu. Isso mostrou que a causa restante estava no fluxo do canvas em `Editor.tsx`: o editor ainda permitia snapshot/cache para blocos AlphaTab. Quando um snapshot parcial era capturado, o canvas passava a exibir esse HTML congelado em vez de deixar o AlphaTab real renderizar novamente.

## Causa raiz

A causa raiz foi a combinacao de virtualizacao do canvas com cache de snapshot para blocos AlphaTab.

O sistema de snapshot e util para renderizadores estaticos, mas para AlphaTab ele ficou sensivel demais: se o HTML era capturado antes de a partitura estabilizar totalmente, o canvas podia reaproveitar uma versao parcial da notacao. Essa versao parcial continha pautas e hastes, mas nao os glyphs musicais completos.

## Correcao aplicada

A correcao final foi remover blocos AlphaTab do sistema de snapshot/cache do canvas.

Na pratica:

- blocos `notation`, `rhythm`, `tablature` e blocos com notacao embutida deixam de usar snapshot/cache no canvas;
- esses blocos voltam a renderizar pelo AlphaTab real;
- snapshots continuam disponiveis para renderizadores nao AlphaTab, como teclado e acordes;
- o pipeline de PDF nao foi alterado;
- a sidebar e demais ajustes de interface nao foram revertidos.

Tambem foram restaurados os pontos sensiveis do pipeline AlphaTab:

- `setLoading(false)` voltou ao `renderFinished`;
- o container AlphaTab voltou a usar apenas `style={{ minHeight }}`;
- a validacao `hasAlphaTabNotehead` voltou ao comportamento anterior;
- `forcePaperTheme` foi removido de `alphaTabSettings`.

## Resultado

Apos a correcao:

- as pautas voltaram a mostrar as notas completas no canvas;
- o estado quebrado deixou de ficar congelado por snapshot;
- o usuario validou visualmente o editor local;
- o comportamento foi considerado resolvido.

## Validacao tecnica

Comandos executados:

```bash
npm run lint
npm run build
```

Resultado:

- `npm run lint` passou;
- `npm run build` passou.

## Observacao para regressao futura

Se o problema voltar, verificar primeiro se algum ajuste reativou snapshot/cache para blocos que usam AlphaTab. O ponto seguro atual e: AlphaTab nao deve depender de snapshot HTML no canvas enquanto nao houver uma validacao visual robusta do SVG final.

