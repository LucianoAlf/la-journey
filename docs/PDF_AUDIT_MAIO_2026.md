# Auditoria PDF - LA Journey - Maio 2026

## Escopo

Material auditado: **Fundamentos da Teoria Musical - Meu Material**  
ID: `01abd63e-77df-493c-8af1-76a401e84adb`  
Arquivo auditado: `C:/Users/Texeira/Downloads/PDF La Journey.pdf`  
Objetivo: validar o PDF profissional gerado via Vercel + Supabase Edge Function + Browserless antes de avancar para a Fase 3 de edicao fluida.

## Como a auditoria foi feita

- O PDF anexado foi renderizado pagina por pagina com PyMuPDF para inspecao visual.
- Foram geradas folhas de contato em `docs/audit-assets/pdf-audit-maio-2026/`.
- O arquivo tem **38 paginas**, tamanho **2.427.524 bytes** e metadata de geracao por **HeadlessChrome/147** via Skia/PDF.
- O Browser in-app do Codex foi testado, mas nao ha ponte liberada para Chrome externo nesta sessao. A tentativa de abrir `file://` e a URL publica do PDF no Browser foi bloqueada pela politica do Browser Use. Portanto, a validacao visual foi feita sobre o PDF real rasterizado localmente, nao sobre uma aproximacao do editor.

Evidencias principais:

- `docs/audit-assets/pdf-audit-maio-2026/contact-1.png`
- `docs/audit-assets/pdf-audit-maio-2026/contact-2.png`
- `docs/audit-assets/pdf-audit-maio-2026/contact-3.png`
- `docs/audit-assets/pdf-audit-maio-2026/contact-4.png`
- paginas criticas em alta resolucao: `page-08-hi.png`, `page-29-hi.png`, `page-30-hi.png`, `page-33-hi.png`, `page-34-hi.png`.

## Estado atual do pipeline

O pipeline atual e:

1. Frontend chama `supabase.functions.invoke('generate-pdf')`.
2. Edge Function `generate-pdf` cria token temporario em `pdf_tokens`.
3. Browserless abre `https://la-journey.vercel.app/print/:materialId?token=...`.
4. `PrintView` chama a Edge Function `get-print-material`.
5. `get-print-material` valida o token e retorna material + blocos sem depender da sessao do usuario.
6. Browserless gera PDF A4 com Chromium headless.
7. PDF e salvo no bucket `materials/pdfs/...` e a URL e aberta no frontend.

Resultado: o PDF nao e mais pagina de erro, nao e mais loading, nao depende de `html2canvas`, e contem material real em 38 paginas.

## Resultado executivo

Nota atual estimada: **7/10**.

O PDF ja prova que a arquitetura Browserless/Vercel funciona. A qualidade visual dos renderers musicais melhorou bastante, principalmente notacao, teclado e tablatura. O problema principal agora nao e mais "gerar PDF"; e **paridade de paginacao entre editor e rota `/print`**.

| Area | Status | Observacao |
|---|---:|---|
| Geracao server-side | OK | PDF real gerado por HeadlessChrome/Browserless. |
| Autenticacao de print | OK | Token temporario remove dependencia de sessao do usuario. |
| Capa | Parcial | Imagem renderiza em alta qualidade, mas a pagina auditada nao mostra titulo/subtitulo/logotipo sobre a capa. Confirmar se era esperado no template atual. |
| Texto e tabelas | Parcial | Texto legivel; algumas tabelas chegam perto demais do rodape e ha risco de corte. |
| Notacao musical | Parcial | Notas renderizam completas em muitos casos, mas ha contorno visivel em volta de blocos e algumas paginas entram no rodape. |
| Tablatura | OK visual geral | Aparece no PDF; precisa validacao mais especifica em material com mais exemplos. |
| Teclado/Piano | Bom | Visual legivel e muito melhor; alguns blocos sao cortados quando ficam baixos na pagina. |
| Chord_grid violao | Problema medio/critico | Diagramas aparecem, mas nomes estao claros demais e a pagina 33 corta os diagramas. |
| Rodape | Problema medio | `LA Music School33 de 38` aparece colado/sem separacao e muito grande. |
| Paginacao | Critico | Ha blocos entrando no rodape ou sendo cortados. |

## Problemas criticos encontrados

### 1. Blocos entram no rodape ou sao cortados

Evidencias:

- Pagina 8: o teclado "Teclado - Tons e Semitons" e cortado no fim da pagina.
- Pagina 30: o bloco "Tetrades na Pauta" comeca no final e e cortado.
- Pagina 33: os diagramas de violao em "Acordes com Tensoes - Violao" sao cortados.
- Pagina 34: exercicios no final da pagina ficam parcialmente cortados.

Impacto: alto. O PDF final nao pode cortar conteudo musical ou exercicios.

Hipotese tecnica: `PrintView` usa `paginatePrintBlocks()` com estimativas fixas em `src/lib/printPagination.ts`. Essa paginacao nao mede o layout real final do DOM/Chromium e nao reserva area suficiente para rodape. Assim, blocos grandes sao aceitos numa pagina mesmo quando o render real ultrapassa o espaco util.

### 2. Paginacao do PDF diverge da paginacao do editor

O editor ja tem motor de paginacao com politicas, calibracao e mapa. A rota `/print` tem um motor separado em `printPagination.ts`.

Impacto: alto. O usuario organiza no editor, mas o PDF pode sair diferente.

Acao recomendada: transformar a paginacao em contrato compartilhado entre editor e `/print`, ou fazer a rota `/print` usar a mesma lista de paginas calculada pelo motor do editor/servidor.

### 3. Chord_grid de violao cortado e com baixa legibilidade

Evidencia: pagina 33.

Problemas:

- Diagramas sao cortados no fim da pagina.
- Nomes de acordes/titulos aparecem em cinza muito claro.
- Marcadores abertos/mudos tambem ficam claros demais.

Impacto: medio/alto. O conteudo existe, mas nao esta com qualidade de material profissional.

### 4. Cabecalho/rodape ainda nao tem acabamento de PDF

Evidencia: varias paginas mostram `LA Music School33 de 38` colado, grande e perto demais do conteudo.

Impacto: medio. Nao quebra o conteudo principal, mas passa sensacao de PDF nao finalizado.

Acao recomendada: rodape com tres regioes fixas ou flex confiavel:

- esquerda: escola
- centro: vazio ou titulo curto
- direita: `33 de 38`

Tambem reduzir fonte e reservar area fixa no calculo de paginacao.

## Problemas medios

### 1. Contorno em volta da notacao musical

Evidencias: paginas 5, 6, 8, 29, 30.

No CSS existe:

```css
.notation-container { background:white !important; border:1px solid #e2e8f0 !important; }
```

Isso explica o "contornozinho" que aparece no PDF. No editor pode ser util como superficie de trabalho, mas no PDF final nao deveria aparecer, ou deveria seguir uma decisao visual explicita do template.

### 2. Titulos orfaos no fim da pagina

Evidencia: pagina 29 mostra "Triades no Violao" no fim da pagina, sem os diagramas junto.

Impacto: medio. Isso quebra a leitura. E caso classico de `keep-with-next`: titulo + primeiro bloco visual precisam ficar juntos.

### 3. Espacos brancos continuam, mas nem todos sao bug

Algumas paginas tem espaco branco por decisao pedagogica/manual, especialmente inicio de modulo. Outras tem espaco branco causado por estimativa ou bloco indivisivel grande. O PDF precisa diferenciar esses dois casos.

## Causa raiz consolidada

O problema atual nao e mais Browserless, Supabase ou Vercel. Esses componentes estao funcionando.

A causa raiz e:

1. A rota `/print` usa uma paginacao propria, baseada em estimativas.
2. O editor usa outra paginacao, com medicao/cache/politicas.
3. O PDF renderiza com CSS e fontes reais em Chromium, entao a altura final de cada bloco pode ser maior que a estimativa.
4. O rodape existe visualmente, mas o motor de paginacao nao parece reservar uma "safe area" real para ele.
5. Blocos musicais e grids sao tratados como `break-inside: avoid`, mas isso nao resolve quando as paginas ja sao secoes A4 fixas; o bloco precisa ser colocado na pagina correta antes do render.

## Plano para chegar em 9.5/10

### Fase A - CSS de print de baixo risco

Objetivo: corrigir problemas visuais sem mexer no motor.

- Remover borda da `.notation-container` apenas em `.print-view`.
- Corrigir rodape: tamanho, alinhamento e separacao entre escola e pagina.
- Aumentar contraste dos nomes e simbolos em `chord_grid` no print.
- Garantir `print-color-adjust: exact` nos diagramas de acorde.

Risco: baixo.  
Ganho: medio.  
Valida nas paginas: 5, 6, 29, 33.

### Fase B - Safe area e alturas reais por tipo no `/print`

Objetivo: parar cortes no rodape.

- Reduzir `A4_CONTENT_HEIGHT` do `printPagination.ts` para reservar cabecalho e rodape reais.
- Calibrar alturas de `keyboard`, `keyboard_grid`, `chord_grid`, `notation`, `exercise` com base no PDF real.
- Para blocos musicais/grids, se nao couberem no espaco restante, mover para a proxima pagina.

Risco: medio.  
Ganho: alto.  
Valida nas paginas: 8, 30, 33, 34.

### Fase C - Unificar paginacao editor e print

Objetivo: PDF refletir o que o professor ve no editor.

- Extrair um motor comum de paginacao usado por Editor e PrintView.
- Manter as mesmas politicas: `unbreakable`, `breakable`, `keep-with-next`, `start-on-new-page`, `allowSplit`, `spacingBefore`, `spacingAfter`.
- O mapa de paginacao deve poder comparar "editor" vs "print".

Risco: medio/alto.  
Ganho: muito alto.  
Esta e a fase que resolve a diferenca estrutural entre editor e PDF.

### Fase D - Quebra real de blocos longos

Objetivo: lidar com exercicios/textos longos sem cortar e sem gerar buracos gigantes.

- Texto longo pode continuar na pagina seguinte.
- Exercicio longo pode ser dividido respeitando titulo/enunciado/subitens.
- Musica, teclado, acorde, imagem e capa continuam sempre inteiros.

Risco: alto.  
Ganho: alto.  
Fazer apenas depois de estabilizar A/B/C.

### Fase E - Auditoria automatizada de PDF

Objetivo: evitar regressao.

- Script para gerar PDF de teste.
- Renderizar paginas para PNG.
- Checar contagem de paginas, presenca de textos-chave e regioes de overflow.
- Guardar snapshots das paginas criticas: 8, 29, 30, 33, 34.

## Proxima acao recomendada

Nao recomendo ir direto para drag-and-drop ainda.

Proximo passo mais seguro:

1. Aplicar Fase A (CSS de print).
2. Aplicar Fase B (safe area + estimativas por tipo).
3. Gerar novo PDF.
4. Comparar especificamente as paginas 8, 29, 30, 33 e 34.
5. So depois seguir para Fase 3 de edicao fluida.

## Decisoes que ficam registradas

- `html2canvas + jsPDF` segue descartado.
- `window.print()` fica apenas como fallback manual.
- O caminho de produto e Browserless/Puppeteer server-side.
- O gargalo atual e paridade de layout/paginacao, nao mais a infraestrutura de PDF.
- O PDF atual e utilizavel como prova tecnica do pipeline, mas ainda nao esta pronto para beta comercial.
