# Handoff para novo chat Codex - Brand Kit e Capas Salvas

Data: 14/05/2026  
Projeto: LA Journey  
Repositorio: LucianoAlf/la-journey  
Workspace local: D:\2026\la-journey\la-journey  
Supabase project ref correto: rkfszavfqplhorvfpkcq

## Resumo executivo

Esta sessao fechou a etapa de Brand Kit aplicado a capas. O editor passou a permitir configurar a identidade visual da escola, aplicar logos e fontes na capa, editar logomarca diretamente no canvas e salvar capas como modelos reutilizaveis.

O fluxo ficou validado pelo usuario no browser local. A migration de capas salvas foi executada manualmente no Supabase SQL Editor e retornou sucesso.

## Commits importantes desta etapa

- `b63f498 feat(brand-kit): add basic school identity settings`
- `92c6537 feat(brand-kit): support logo variants in cover editor`
- `da95a77 feat(brand-kit): apply school identity to cover`
- Commit final desta etapa deve conter a Fase 3.3 de capas salvas.

## O que foi implementado

### Brand Kit basico

- Aba Identidade Visual em Configuracoes.
- Paleta principal da escola:
  - cor primaria;
  - cor secundaria.
- Fontes padrao:
  - fonte de capa e titulos;
  - fonte de textos corridos.
- Preview visual da escola.
- Persistencia em `public.schools`.

### Variacoes de logomarca

Foram adicionados slots de logo:

- Completa;
- Solo;
- Horizontal;
- Light mode;
- Dark mode.

Armazenamento:

- bucket `school-logos`;
- coluna `schools.logo_variants`;
- policies RLS para uso em desenvolvimento com `public.is_dev_admin()`.

### Editor de capa

Na sidebar da capa, aba Elementos:

- galeria de logos do Brand Kit;
- aplicar logo do Brand Kit na capa;
- enviar logo personalizada;
- remover logo da capa.

No canvas:

- clicar na logo seleciona;
- arrastar move a logo;
- handles redimensionam a logo;
- `Alt` ao redimensionar escala pelo centro;
- toolbar da logo permite duplicar, excluir e abrir menu;
- `Delete`/`Backspace` removem a logo selecionada;
- `Esc` desseleciona a logo.

### Botao Brand Kit na capa

Foi adicionado o botao `Brand Kit` em Dados da Capa.

Ao confirmar, ele aplica na capa:

- logo principal do Brand Kit;
- fonte padrao de capa;
- fonte padrao de corpo;
- cores da escola;
- textos da capa como elementos editaveis quando necessario.

O comportamento foi validado pelo usuario.

### Capas salvas

Foi criada a migration:

`supabase/migrations/20260514182000_create_school_cover_templates.sql`

Ela cria:

- tabela `public.school_cover_templates`;
- indices por escola e data;
- RLS;
- policy dev admin;
- trigger `updated_at`.

Foi criado o servico:

`src/services/coverTemplateService.ts`

Com funcoes para:

- listar capas salvas;
- criar capa salva;
- excluir capa salva.

Na aba Imagem da capa foi criada a secao `Capas salvas`.

Fluxos disponiveis:

- Salvar capa atual como modelo;
- listar capas salvas da escola;
- excluir modelo salvo;
- aplicar modelo completo;
- aplicar modelo mantendo textos atuais;
- criar variacao com contexto e Brand Kit atual.

O usuario validou no browser que salvar e aplicar estao funcionando.

## Arquivos tocados na etapa final

- `src/pages/Editor.tsx`
- `src/lib/database.types.ts`
- `src/services/coverTemplateService.ts`
- `supabase/migrations/20260514182000_create_school_cover_templates.sql`
- `docs/HANDOFF_NOVO_CHAT_CODEX_2026-05-14_BRAND_KIT.md`

## Validacao executada

Comandos executados durante a implementacao:

- `npm run lint`
- `npm run build`

Ambos passaram. O build continua exibindo apenas warnings conhecidos de chunk grande/dynamic import.

Validacao manual pelo usuario:

- Brand Kit aplicado na capa;
- logomarca editavel no canvas;
- Delete/Backspace removendo logo selecionada;
- migration de capas salvas executada no Supabase;
- capa salva criada e listada;
- modos de aplicacao funcionando.

## Proxima fase recomendada

Abrir novo chat para a Fase 4: Brand Kit aplicado ao material inteiro.

Objetivo: sair de uma identidade visual apenas da capa e fazer a escola ter uma identidade consistente em todo o material.

Escopo sugerido:

1. Header e rodape do material
   - aplicar logo horizontal/light/dark;
   - nome da escola;
   - titulo do material;
   - numeracao de paginas;
   - estilo padrao por Brand Kit.

2. Paginas internas
   - fontes padrao para blocos comuns;
   - cores de destaque;
   - padrao visual para exercicios, dicas e separadores.

3. PDF
   - garantir que header, rodape, logos, fontes e cores aparecem iguais no Browserless;
   - validar rota `/print/:id`;
   - gerar PDF e auditar capa + paginas internas.

4. UX
   - botao `Aplicar identidade no material inteiro`;
   - confirmacao antes de sobrescrever estilos;
   - opcoes: aplicar apenas header/rodape, aplicar em blocos, aplicar em tudo.

5. Persistencia
   - decidir se header/rodape padrao vivem em `schools`, em `page_config`, ou em uma nova estrutura de Brand Kit;
   - preservar compatibilidade com materiais antigos.

## Recomendacao para o novo chat

Comecar auditando:

- `src/components/editor/HeaderFooterEditor.tsx`
- `src/components/editor/HeaderFooterBar.tsx`
- `src/lib/headerFooter.ts`
- uso de `page_config` em `src/pages/Editor.tsx`
- rota de print e como `page_config` chega no PDF.

Depois implementar em fases pequenas:

1. Brand Kit -> header/rodape da capa/material.
2. Brand Kit -> paginas internas.
3. Brand Kit -> PDF.
4. UX de aplicacao global.

Nao iniciar por refatoracao ampla. A prioridade e fazer a identidade visual aparecer de ponta a ponta sem quebrar paginacao, PDF ou renderizadores musicais.
