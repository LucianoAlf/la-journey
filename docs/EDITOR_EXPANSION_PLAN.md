# 🎨 Plano de Expansão — Editor de Material

> **Auditoria completa + roadmap em fases**
> Data: 13/03/2026 · Autor: Cascade (revisão com Alf)

---

## 📋 AUDITORIA DO ESTADO ATUAL

### O que já funciona

| Recurso | Status | Obs |
|---------|--------|-----|
| Layout 3 colunas (sidebar + canvas + propriedades) | ✅ | Grid 260px / 1fr / 300px |
| Lista de blocos com drag-and-drop (reordenar) | ✅ | @dnd-kit |
| Adicionar bloco (8 tipos: texto, dica, exercício, título, notação, acorde, tablatura, separador) | ✅ | Dropdown menu |
| Remover bloco com confirmação | ✅ | AlertDialog |
| Preview ao vivo (MaterialPreview) | ✅ | Renderiza VexFlow, acordes, markdown |
| Editar título e conteúdo (markdown cru) no painel lateral | ✅ | Input + Textarea |
| Salvar alterações por bloco (RPC) | ✅ | `update_material_block` |
| Reverter bloco ao original | ✅ | Guarda `original_content` |
| Editor de Notação integrado (modal) | ✅ | Duplo-clique ou botão |
| Editor de Acorde integrado (modal) | ✅ | Duplo-clique ou botão |
| Exportar HTML | ✅ | Abre nova aba |
| Imprimir / PDF | ✅ | `window.print()` com CSS @media print |
| Preservação multi-stave ao abrir/salvar | ✅ | barAfter + labels |

### O que está faltando (GAPs identificados)

#### 1. **Editor de Texto Rich (WYSIWYG)** — CRÍTICO
- Hoje: Textarea com markdown cru (`**negrito**`, `*itálico*`)
- Problema: O dono da escola / professor **não sabe markdown**
- Necessário: Editor WYSIWYG com barra de ferramentas (negrito, itálico, tamanho, fonte, listas, alinhamento, cores, links)
- Ideal: Edição **inline no canvas** (clicar no texto e editar ali mesmo, como Notion/Google Docs)

#### 2. **Layout de Página A4 / Preview de Impressão** — CRÍTICO
- Hoje: Canvas é um scroll infinito sem noção de "página"
- Problema: Material impresso precisa ter quebra de página, margens, cabeçalho/rodapé
- Necessário: Visualização tipo "folha A4" com indicador de quebra de página, zoom, réguas

#### 3. **Capa do Material** — ALTO
- Hoje: Não existe capa
- Necessário: Bloco especial "Capa" com logo da escola, título, subtítulo, instrumento, nível, data
- Design: Full-page, com template selecionável

#### 4. **Grid de Acordes (múltiplos lado a lado)** — ALTO
- Hoje: Acorde é 1 bloco = 1 diagrama isolado, pequeno e solto
- Necessário: Bloco "Grade de Acordes" com N acordes em colunas (2, 3, 4, 6)
- Controle de colunas, espaçamento, tamanho

#### 5. **Edição Inline no Canvas** — ALTO
- Hoje: Edita título/conteúdo no painel lateral (textarea markdown)
- Necessário: Clicar no bloco no canvas e editar ali mesmo (contentEditable)
- Referência: Notion, Google Docs, Canva

#### 6. **Mais Tipos de Bloco** — MÉDIO
- **Imagem**: Upload real (Supabase Storage) + crop/resize
- **Áudio**: Embed de áudio (referência sonora)
- **Vídeo**: Embed YouTube/Vimeo
- **Citação / Callout**: Destaque com ícone customizável
- **Lista**: Ordenada / não-ordenada
- **Colunas**: Layout 2 ou 3 colunas dentro de um bloco
- **Espaçador**: Altura customizável
- **QR Code**: Link para recurso externo
- **Teclado/Piano**: Diagrama de piano (KeyboardEditor já existe)

#### 7. **Barra de Ferramentas do Canvas** — MÉDIO
- Hoje: Não existe
- Necessário: Toolbar flutuante ou fixa com zoom, undo/redo global, régua, grid, preview mode

#### 8. **IA no Editor** — MÉDIO
- Reescrever texto selecionado com IA
- Simplificar / expandir conteúdo
- Gerar variação de exercício
- Traduzir bloco
- Sugerir próximo bloco

#### 9. **Templates de Material** — BAIXO
- Salvar material como template reutilizável
- Biblioteca de templates (aula introdutória, exercício técnico, prova, etc.)

#### 10. **Versionamento / Histórico** — BAIXO
- Hoje: Só `version` numérica e `is_edited`
- Necessário: Histórico de alterações, comparação entre versões

---

## 🗺️ ROADMAP EM FASES

### Fase 1 — Editor de Texto Rico + Edição Inline (Fundação) ✅ COMPLETA
**Prioridade: CRÍTICA · Estimativa: ~3-4 sessões · Banco: NÃO (100% frontend)**

> Esta fase transforma o editor de "ferramenta de dev" para "ferramenta de professor"

**1.1 — Integrar Tiptap como editor WYSIWYG** ✅
- ✅ Substituir `<Textarea>` do painel lateral por editor Tiptap v3
- ✅ Extensões: Bold, Italic, Underline, Strike, Heading (H1-H3), BulletList, OrderedList, TextAlign, Highlight, Color, FontFamily, Link, Placeholder
- ✅ Toolbar flutuante (BubbleMenu) ao selecionar texto — B/I/U, Highlight, Link, Cores rápidas
- ✅ Barra fixa no topo do editor com todas as formatações
- ✅ Seletor de fontes com 13 Google Fonts (DM Sans padrão + 12 extras)
- ✅ Seletor de cores com 11 opções (Padrão, Preto, Vermelho, Laranja, Dourado, Verde, Azul, Roxo, Rosa, Cinza, Branco)
- ✅ Toolbar compacta para título (variant="title"): Font Select + H1/H2/H3 + B/I/U + Alinhamento
- ✅ Output: HTML (armazenado em `content.html` e `content.title_html`)
- ✅ Backward-compatible: se bloco tem `content.text` (markdown), converte para HTML via `ensureHtml()`

**1.2 — Edição inline no canvas** ✅
- ✅ Clique no bloco de texto no canvas ativa Tiptap inline
- ✅ Painel lateral mantém editor com toolbar para edição precisa
- ✅ Sincronização atômica canvas ↔ painel via `setBlocks(prev => ...)`

**1.3 — Migração markdown → HTML** ✅
- ✅ `markdownToHtml()` e `htmlToMarkdown()` em `src/lib/markdownToHtml.ts`
- ✅ `renderMarkdownText()` mantido como fallback no MaterialPreview
- ✅ Novos blocos salvam HTML; blocos antigos convertidos on-the-fly via `ensureHtml()`

**Arquivos criados/modificados:**
- `src/components/editor/RichTextEditor.tsx` — componente principal
- `src/lib/markdownToHtml.ts` — helpers de conversão
- `src/pages/Editor.tsx` — integração painel + canvas
- `src/components/material/MaterialPreview.tsx` — renderização rica
- `src/index.css` — estilos canvas/editor
- `index.html` — 13 Google Fonts carregadas

**Impacto no banco:** NENHUM — `content` já é `jsonb`, campo `html` e `title_html` adicionados ao lado de `text`

---

### Fase 2 — Layout A4 + Preview de Impressão ✅ COMPLETA
**Prioridade: CRÍTICA · Estimativa: ~2-3 sessões · Banco: NÃO (100% frontend + CSS)**

**2.1 — Canvas com simulação de folha A4** ✅
- ✅ Wrapper `.a4-page` com dimensões 794×1123px (A4 a 96dpi)
- ✅ Background branco, sombra elegante, bordas arredondadas
- ✅ Margens internas 60px (cabeçalho, conteúdo, rodapé)
- ✅ Fundo pontilhado tipo Figma no canvas (radial-gradient)
- ✅ Zoom slider (50%-150%) com botões +/- e atalho Ctrl+scroll
- ✅ Zoom padrão: 75% para caber na tela

**2.2 — Quebra de página** ✅
- ✅ Bloco `page_break` adicionado ao menu de inserção
- ✅ `useMemo` que distribui blocos em páginas (divide por `page_break`)
- ✅ Cada página renderizada como folha A4 separada com gap visual
- ✅ Indicador "Página X de N" no rodapé de cada folha

**2.3 — Cabeçalho e rodapé** ✅
- ✅ Cabeçalho: título do material (fonte 10px, cor discreta)
- ✅ Rodapé: "Página X de N" (fonte 9px, alinhado à direita)
- ✅ Bordas sutis separando header/content/footer

**2.4 — Exportação PDF melhorada** ✅
- ✅ `@media print` atualizado: remove transform/zoom, reseta wrapper, page-break-after entre páginas
- ✅ Folhas A4 sem sombra/bordas na impressão, fundo branco
- ✅ Canvas sem background-image pontilhado na impressão
- Futuro: `html2canvas` + `jsPDF` para PDF programático

**Arquivos modificados:**
- `src/pages/Editor.tsx` — zoom state, controles no header, canvas A4 multi-página, bloco page_break
- `src/index.css` — `.a4-canvas-wrapper`, `.a4-page`, `.a4-page-header/content/footer`, @media print atualizado

**Impacto no banco:** NENHUM

---

### Fase 3 — Bloco de Capa + Grid de Acordes + Piano
**Prioridade: ALTA · Estimativa: ~2-3 sessões · Banco: MÍNIMO (novo block_type no enum, se for CHECK constraint)**

**3.1 — Bloco "Capa"**
- Novo `block_type: 'cover'`
- Campos: título, subtítulo, instrumento, nível, professor, escola, data, logo
- 3-4 templates visuais (minimalista, colorido, clássico, moderno)
- Sempre primeira posição no material
- Renderização full-page no preview A4

**3.2 — Bloco "Grade de Acordes"**
- Novo `block_type: 'chord_grid'` (já existe no MaterialPreview!)
- UI: Botão "Adicionar acorde à grade" → abre ChordEditor
- Controle de colunas (2, 3, 4, 6) e tamanho dos diagramas
- `render_data.chords: ChordPositions[]` + `render_data.columns: number`

**3.3 — Bloco "Piano/Teclado"**
- Novo `block_type: 'keyboard'`
- Integrar `KeyboardEditor` (já existe!) no fluxo do Editor Material
- Mesmo padrão: botão no painel + modal + salvar em render_data

**3.4 — Bloco "Colunas"**
- Container que divide em 2-3 colunas
- Cada coluna pode conter sub-blocos (texto, acorde, imagem)
- Implementação: bloco wrapper com `render_data.columns: [{ blocks: [...] }]`

**Impacto no banco:** 
- Se `block_type` tem CHECK constraint → Claude adiciona os novos valores
- Se é texto livre → nenhuma alteração

---

### Fase 4 — Upload de Imagens + Mídia
**Prioridade: MÉDIA · Estimativa: ~2 sessões · Banco: MÍNIMO (Supabase Storage bucket)**

**4.1 — Upload de imagens**
- Bucket `material-images` no Supabase Storage
- Componente de upload com drag-and-drop, crop, resize
- Armazenar URL pública em `render_data.url`
- Limit: 5MB por imagem, formatos jpg/png/webp

**4.2 — Bloco de áudio**
- Upload para bucket `material-audio` ou URL externa
- Player inline com controles play/pause/volume
- Útil para referências sonoras (como soa o acorde, escala, etc.)

**4.3 — Bloco de vídeo**
- Embed YouTube/Vimeo via URL
- Preview com thumbnail + play
- Não renderiza no PDF (mostra QR code com link)

**Impacto no banco:** 
- Criar buckets no Supabase Storage (Claude)
- Políticas RLS nos buckets por `school_id`

---

### Fase 5 — IA no Editor
**Prioridade: MÉDIA · Estimativa: ~2-3 sessões · Banco: NÃO (Edge Function existente)**

**5.1 — Menu de IA contextual**
- Selecionar texto → botão "✨ IA" aparece
- Opções: Reescrever, Simplificar, Expandir, Traduzir, Corrigir ortografia
- Usa a mesma Edge Function `generate-material` com prompt adaptado

**5.2 — Geração de bloco por IA**
- No menu "Adicionar bloco", opção "🤖 Gerar com IA"
- Input: descrição do que quer (ex: "Exercício de escala pentatônica menor")
- IA gera o bloco completo (texto + notação + dica)

**5.3 — Sugestão automática**
- Após cada bloco, sugerir "próximo bloco" baseado no contexto
- Ghost block com preview que o professor aceita ou descarta

**Impacto no banco:** NENHUM

---

### Fase 6 — Toolbar do Canvas + UX Avançado
**Prioridade: MÉDIA · Estimativa: ~2 sessões · Banco: NÃO**

**6.1 — Toolbar do canvas**
- Barra superior: Zoom (slider), Undo/Redo global, Preview mode, Grid toggle
- Barra lateral: Régua vertical com indicador de página

**6.2 — Atalhos de teclado globais**
- `Ctrl+S` = salvar bloco atual
- `Ctrl+Z/Y` = undo/redo global
- `Ctrl+D` = duplicar bloco
- `Del` = deletar bloco (com confirmação)
- `Ctrl+↑/↓` = mover bloco para cima/baixo
- `/` = abrir menu de inserção (estilo Notion slash commands)

**6.3 — Slash commands no canvas**
- Digitar `/` no final de um bloco abre menu de inserção
- `/texto`, `/acorde`, `/notação`, `/dica`, `/exercício`, `/imagem`
- Filtro por digitação

**6.4 — Drag entre canvas**
- Arrastar bloco diretamente no canvas (não só na sidebar)
- Indicador visual de drop zone entre blocos

---

### Fase 7 — Templates + Versionamento
**Prioridade: BAIXA · Estimativa: ~2 sessões · Banco: SIM (tabela `material_templates`)**

**7.1 — Salvar como template**
- Botão "Salvar como Template" no header
- Campos: nome, categoria, descrição, tags
- Tabela `material_templates` com `school_id`, `blocks_snapshot`

**7.2 — Biblioteca de templates**
- Tela de seleção ao criar novo material
- Templates da escola + templates globais (pré-seed)
- Preview do template antes de selecionar

**7.3 — Histórico de versões**
- Cada "Salvar" cria snapshot em `material_versions`
- Timeline lateral com diff visual
- Restaurar versão anterior

**Impacto no banco:** 
- Nova tabela `material_templates` (Claude)
- Nova tabela `material_versions` (Claude)

---

## 📊 RESUMO EXECUTIVO

| Fase | Descrição | Prioridade | Banco? | Sessions |
|------|-----------|------------|--------|----------|
| **1** | Editor Rich Text + Edição Inline | CRÍTICA | NÃO | 3-4 |
| **2** | Layout A4 + Preview Impressão | CRÍTICA | NÃO | 2-3 |
| **3** | Capa + Grid Acordes + Piano + Colunas | ALTA | MÍNIMO | 2-3 |
| **4** | Upload Imagens + Mídia | MÉDIA | MÍNIMO | 2 |
| **5** | IA no Editor | MÉDIA | NÃO | 2-3 |
| **6** | Toolbar Canvas + UX Avançado | MÉDIA | NÃO | 2 |
| **7** | Templates + Versionamento | BAIXA | SIM | 2 |
| | **TOTAL** | | | **~15-20** |

### Ordem recomendada: 1 → 2 → 3 → 6 → 4 → 5 → 7

A Fase 1 é a fundação — sem editor rico, o professor não consegue usar. A Fase 2 dá a noção de "material real" (A4). A Fase 3 adiciona os blocos musicais que faltam. A partir daí, as fases são incrementais.

---

## 🔧 DECISÕES TÉCNICAS

### Tiptap vs Slate vs Quill
- **Tiptap** ✅ — baseado em ProseMirror, extensível, React-first, excelente para content blocks, output HTML ou JSON
- Slate — mais baixo nível, mais trabalho para toolbar/formatação
- Quill — legacy, menos flexível

### Layout A4
- CSS `@page` + `page-break-before/after` para impressão
- Canvas: `width: 794px` (A4 a 96dpi), `min-height: 1123px` por página
- Scroll com paginação visual (sombra entre páginas)

### PDF Export
- Fase 1: `window.print()` melhorado com CSS `@media print`
- Fase 2: `html2canvas` + `jsPDF` para PDF programático
- Fase 3 (futuro): Edge Function com Puppeteer para PDF server-side perfeito

### Armazenamento
- Texto rico: `content.html` (string HTML) ao lado de `content.text` (markdown legado)
- Imagens: Supabase Storage bucket `material-images/{school_id}/{material_id}/`
- Templates: snapshot JSON completo dos blocos

---

## ✅ PRÓXIMOS PASSOS

1. **Alf decide**: validar prioridades e ordem das fases
2. **Claude**: criar tabelas/buckets quando necessário (Fases 3, 4, 7)
3. **Cascade**: implementar Fase 1 (Editor Rich Text + Inline)

> "Este editor é onde o coordenador, o dono da escola, o professor vai estar no ambiente de desenvolvimento de material." — Alf
