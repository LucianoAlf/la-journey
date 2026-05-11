# Auditoria PDF - LA Journey - Maio 2026

## Escopo

Material auditado: **Fundamentos da Teoria Musical - Meu Material**  
Rota: `/editor/01abd63e-77df-493c-8af1-76a401e84adb`  
Objetivo: validar o fluxo **Template -> Clone -> Editor -> PDF** antes da Fase 3 de edicao fluida.

## Decisao De Arquitetura

A abordagem `html2canvas + jsPDF` foi reavaliada e descartada. Ela ja tinha historico ruim no projeto e voltou a mostrar problemas: travamento, custo alto por pagina e risco com SVG/AlphaTab/Tailwind v4.

A decisao atual e separar o PDF profissional do DOM virtualizado do editor:

- `/print/:id`: rota React limpa, sem AppLayout, sem sidebars e sem virtualizacao, renderizando todas as paginas A4 a partir dos dados do material.
- `generate-pdf`: Supabase Edge Function que abre `/print/:id` em Chromium headless via Browserless/Astral, gera PDF A4 e salva no Storage.
- `Baixar PDF`: chama a Edge Function e abre a URL assinada retornada.
- `Imprimir / PDF`: permanece como fallback manual com `window.print()`.

Isso corrige a causa raiz do PDF incompleto: o exportador nao depende mais das 3 paginas ativas do canvas virtualizado.

## Resultado Executivo

| Item | Status | Observacao |
|---|---:|---|
| Fluxo `html2canvas + jsPDF` | Revertido | Nao deve ser usado no beta. |
| Rota `/print/:id` | Implementada | Teste local renderizou 38 paginas e 140 blocos sem UI do editor. |
| Edge Function `generate-pdf` | Implementada | Aguardando secrets `BROWSERLESS_TOKEN` e `APP_URL` publico para teste ponta a ponta. |
| Botao `Baixar PDF` | Atualizado | Chama `supabase.functions.invoke('generate-pdf')`. |
| Botao `Imprimir / PDF` | Mantido | Usa `window.print()` como fallback manual. |
| CSS de impressao | Ajustado | UI extra escondida, blocos musicais com `break-inside: avoid`, SVGs sem filtro de dark mode. |
| Capa, cabecalho e rodape | A validar no PDF real | Dependem do teste da Edge Function com Browserless. |
| Blocos musicais | A validar no PDF real | A rota local carregou SVGs; o arquivo final ainda precisa ser auditado. |

## Correcoes Aplicadas

### Reversao Do Caminho `html2canvas`

Foi removida a ligacao do `Editor.tsx` com `exportMaterialToPDF()`. O servico `pdfExportService.ts` voltou ao estado anterior no repo e nao e chamado pelo editor.

### Rota De Print Completa

Foi criada `src/pages/PrintView.tsx` e registrada a rota `/print/:id` fora do `AppLayout`.

Ela:

- carrega o material por `useMaterialWithBlocks`;
- pagina todos os blocos sem janela virtualizada;
- renderiza cabecalho, conteudo e rodape por pagina;
- usa `MaterialPreview` para manter paridade dos blocos musicais;
- define `window.status = 'ready-for-pdf'` quando o DOM fica estavel para o Puppeteer.

### Edge Function

Foi criada `supabase/functions/generate-pdf/index.ts`.

Ela:

- recebe `materialId`;
- abre `${APP_URL}/print/${materialId}` via Browserless;
- espera `window.status === "ready-for-pdf"`;
- gera PDF A4 com `page.pdf()`;
- salva em `materials/pdfs/{materialId}/...`;
- retorna URL assinada por 24 horas.

### CSS De Impressao

Foram reforcadas as regras em `src/index.css`:

- esconder toolbar contextual e guias visuais da pagina;
- manter cabecalho e rodape visiveis;
- impedir quebra interna em blocos musicais;
- aplicar `break-inside: avoid` para `notation`, `rhythm`, `tablature`, `keyboard`, `keyboard_grid`, `chord_grid`, `chord_diagram` e imagens;
- garantir SVGs sem `filter: invert()` no print;
- manter `print-color-adjust: exact`.

## Checklist De Auditoria Visual

| Tipo | Status | O que conferir no PDF salvo |
|---|---:|---|
| Texto / titulo / subtitulo | Pendente | Fonte, tamanho e espacamento. |
| Exercicios | Pendente | Boxes verdes, numeracao e subitens. |
| Notacao musical | Pendente | Notas completas, clave correta, modo livre sem 4/4 inventado. |
| Tablatura | Pendente | TAB visivel, notas nas cordas corretas, sem watermark. |
| Teclado/Piano | Pendente | Teclas coloridas, dedilhado legivel, tamanho proporcional. |
| Chord_grid violao | Pendente | Diagramas, nomes e dedilhado. |
| Capa | Pendente | Imagem, titulo, subtitulo e logo. |
| Cabecalho/Rodape | Pendente | Nome da escola, titulo e numero de pagina. |
| Quebras de pagina | Pendente | Sem bloco musical cortado ao meio. |

## Limitacao Do Ambiente De Teste

O teste local confirmou que `/print/:id` renderiza o material completo, mas o teste ponta a ponta da Edge Function ainda depende de ambiente externo:

1. configurar authtoken do ngrok nesta maquina (`ERR_NGROK_4018` apareceu ao tentar iniciar o tunel);
2. iniciar `npx ngrok http 3000`;
3. definir `APP_URL` com a URL publica do ngrok;
4. definir `BROWSERLESS_TOKEN`;
5. fazer deploy da Edge Function;
6. clicar em **Baixar PDF** e auditar o arquivo gerado.

## Backlog Antes Do Beta

- Criar token assinado para `/print/:id`, evitando que a rota publica dependa de RLS relaxada.
- Decidir bucket/retencao dos PDFs em Storage.
- Auditar PDF real gerado pela Edge Function pagina por pagina.
