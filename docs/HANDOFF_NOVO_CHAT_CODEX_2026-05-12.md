# Handoff para novo chat Codex - LA Journey

Data: 12/05/2026  
Repositorio: `LucianoAlf/la-journey`  
Workspace local: `D:\2026\la-journey\la-journey`  
Supabase project ref correto: `rkfszavfqplhorvfpkcq`

## Objetivo deste documento

Este documento orienta um novo chat/agent Codex sobre como continuar o desenvolvimento do LA Journey sem perder o contexto operacional consolidado.

A forma de trabalho aqui e: entender a feature, auditar com evidencia, implementar com escopo controlado, validar no browser real, validar banco quando necessario, rodar build/lint, fazer commit e push ao final de cada fase.

## Stack do projeto

- Frontend: React + TypeScript + Vite.
- UI: Tailwind/shadcn/ui, Phosphor Icons e componentes proprios.
- Banco/auth/storage/functions: Supabase.
- PDF profissional: rota `/print/:id` + Supabase Edge Function `generate-pdf` + Browserless + Vercel.
- Deploy publico do app: `https://la-journey.vercel.app`.
- GitHub: `LucianoAlf/la-journey`.

## Supabase e MCP

O projeto Supabase correto e:

- Project ref: `rkfszavfqplhorvfpkcq`
- URL publica do projeto: `https://rkfszavfqplhorvfpkcq.supabase.co`

Nunca expor tokens, anon keys, service role, Browserless token ou conteudo de `.env.local`.

Antes de mexer em banco ou Edge Functions, confirmar que o MCP Supabase esta conectado ao projeto correto. Se houver ferramenta MCP Supabase disponivel, verificar:

- project ref ou project URL;
- tabelas acessiveis;
- se a consulta bate com o material atual.

Se o MCP parecer apontar para outro projeto, parar e avisar o Alf antes de executar qualquer alteracao.

## Banco de dados

Usar Supabase MCP/SQL com cuidado para:

- consultar `generated_materials`, `material_versions`, blocos e bibliotecas musicais;
- validar dados reais antes de corrigir renderizadores;
- executar migracoes pequenas e reversiveis;
- fazer backup quando alterar dados gerados/template.

Regra importante: ambiente ainda e de desenvolvimento, mas nao tratar isso como permissao para vazar credenciais ou fazer alteracoes destrutivas.

## GitHub e fluxo de commit

Trabalhamos por fases pequenas. Ao final de cada fase funcional:

1. Rodar `git status --short`.
2. Conferir diffs relevantes.
3. Rodar verificacoes:
   - `npm run lint`
   - `npm run build`
4. Testar no browser quando envolver UI.
5. Fazer commit com mensagem clara.
6. Fazer push para `main`.

Exemplo:

```bash
git add .
git commit -m "fix(pdf): make print pagination safer for long text blocks"
git push
```

Nao commitar:

- `.env.local`;
- secrets;
- `.mcp.json`;
- `docs/audit-assets/`;
- PDFs/PNGs temporarios de auditoria;
- logs grandes.

## Browser, Simple Browser e Chrome real

Nao entregar trabalho visual apenas olhando codigo.

Fluxo esperado:

- Usar o browser embutido/Codex Browser para abrir `localhost:3000`.
- Quando o usuario pedir visualizacao real, usar Browser/Chrome/Playwright se disponivel.
- Para PDF, validar a rota real:
  - local: `http://localhost:3000/print/:materialId`
  - producao: `https://la-journey.vercel.app/print/:materialId?...`
- Quando gerar PDF, abrir o PDF e auditar paginas criticas.
- Se possivel, renderizar paginas do PDF localmente com PyMuPDF para comparar imagens.

O usuario valoriza evidencia visual. Sempre que possivel, reportar:

- URL testada;
- paginas auditadas;
- o que melhorou;
- o que ainda nao esta 100%.

## PDF profissional - estado atual

O PDF agora usa arquitetura server-side:

1. Frontend chama Supabase Edge Function `generate-pdf`.
2. Edge Function gera token temporario para `/print/:id`.
3. Browserless abre a rota publicada na Vercel.
4. A rota `/print/:id` renderiza o material completo sem UI do editor.
5. Browserless gera PDF A4.
6. PDF e salvo no Supabase Storage.
7. Frontend recebe URL publica para download.

Importante: nao voltar para `html2canvas`, `jsPDF` ou `html2pdf.js`. Essa abordagem ja foi tentada e descartada porque quebra SVG/AlphaTab e gera baixa fidelidade.

PDF final da rodada anterior:

`https://rkfszavfqplhorvfpkcq.supabase.co/storage/v1/object/public/materials/pdfs/01abd63e-77df-493c-8af1-76a401e84adb/1778541185181.pdf`

Estado atual do PDF: aproximadamente nota 9/10.

O que falta para 10/10:

- medicao real do DOM na rota `/print` antes de paginar;
- fragmentacao semantica melhor para tabelas/listas/blocos ricos;
- auditoria completa pagina por pagina antes do beta.

## Editor de material - estado atual

Principais melhorias ja feitas:

- performance saiu de aproximadamente 2300ms por clique para algo muito mais fluido;
- editor dividido em componentes por tipo de bloco;
- Canvas-First com edicao inline;
- toolbar contextual;
- renderizadores musicais estabilizados;
- snapshot/cache para reduzir custo de AlphaTab;
- controles de paginacao no painel direito;
- motor compartilhado de paginacao entre editor e PDF.

Ainda ha desejo claro do produto: mais liberdade visual dentro da pagina A4, sem destruir a estrutura de blocos.

## Editores musicais - estado atual

Ja foram auditados/corrigidos em sessoes anteriores:

- Notacao/AlphaTab:
  - modo livre sem 4/4 inventado;
  - pipeline AlphaTab mais estavel;
  - snapshots anti-staff-only.
- Tablatura:
  - editor SVG de entrada preservado;
  - preview AlphaTab funcionando;
  - palhetadas alinhadas;
  - ligadura visual ajustada;
  - duracoes respeitadas.
- Teclado/Piano:
  - editor abre com dados existentes;
  - highlights/fundamental/dedilhado renderizam no canvas;
  - visual melhorado.
- Chord grid/violao:
  - usa `chord_library` real;
  - equivalencias BR -> US implementadas;
  - fallback controlado, sem trocar acorde harmonicamente errado.
- ChordEditor:
  - auditoria funcional aprovada.

## Proxima etapa recomendada: Fase 3 - Drag and drop no canvas

Objetivo: dar liberdade controlada ao professor para ajustar o material visualmente, mantendo a arquitetura por blocos e a fidelidade do PDF.

### Fase 3.1 - Reordenacao fluida

Implementar primeiro:

- drag handle no bloco selecionado;
- indicador visual de drop entre blocos;
- mover bloco para cima/baixo;
- mover entre paginas;
- preservar scroll durante o drag;
- recalcular paginacao sem travar;
- autosave da nova ordem;
- undo/redo para reordenacao.

Critico: testar com material grande, nao so com exemplo pequeno.

### Fase 3.2 - Ajuste de espaco no canvas

Depois da reordenacao:

- espaco antes/depois visual;
- botoes rapidos para "puxar para pagina anterior" e "mandar para proxima";
- destacar paginas com muito espaco vazio;
- manter com proximo;
- comecar em nova pagina;
- permitir quebra.

Esses dados devem continuar em `render_data.pagination` ou estrutura equivalente ja existente.

### Fase 3.3 - Posicionamento fino guiado

So depois:

- nudge por teclado;
- passos pequenos;
- guias de alinhamento;
- snap suave;
- limites da pagina A4;
- resetar posicao.

Nao transformar em canvas absoluto livre de primeira. O caminho correto e "InDesign guiado por blocos".

## Regras de seguranca de desenvolvimento

- Nao reverter mudancas do usuario sem pedir.
- Nao usar `git reset --hard`.
- Antes de corrigir bug visual, reproduzir e entender causa.
- Em problema recorrente, parar e fazer diagnostico antes de mexer.
- Evitar "consertar por cima" se houver regressao; checar historico Git.
- Para UI, sempre validar no browser.
- Para PDF, sempre validar o arquivo gerado, nao apenas a rota `/print`.

## Checklist de inicio para o proximo chat

1. Entrar em `D:\2026\la-journey\la-journey`.
2. Rodar:

```bash
git status --short
git log --oneline -5
npm run lint
npm run build
```

3. Confirmar app local em `http://localhost:3000`.
4. Abrir o editor:

`http://localhost:3000/editor/01abd63e-77df-493c-8af1-76a401e84adb`

5. Confirmar que a proxima tarefa e Fase 3.1: drag and drop/reordenacao fluida no canvas.

## Tom da colaboracao

O Alf quer velocidade, mas com evidencia. Ele prefere que o Codex:

- aja, nao fique so planejando;
- seja honesto quando algo nao esta pronto;
- use browser/PDF real antes de dizer que esta certo;
- commite e envie ao GitHub ao fim de cada fase;
- preserve o que ja esta funcionando;
- evite regressao em renderizadores musicais.

Se algo parecer arriscado, explicar o risco antes de implementar.

