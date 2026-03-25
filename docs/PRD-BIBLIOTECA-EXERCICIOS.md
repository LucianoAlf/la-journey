# PRD MVP v2.1 — LA Journey: Bibliotecas, Exercícios, Exemplos e Templates

**Versão:** 2.1 (atualizado)  
**Data:** 23/03/2026  
**Autor:** Claude (Arquitetura) + Alf (Produto/Pedagogia)  
**Changelog v2.1:** Eliminada redundância de editor. NÃO existe "Editor de Exercício" separado. Exercícios/exemplos são criados no Editor de Material (que já existe) e salvos na biblioteca via "Salvar como Bloco Reutilizável". Tab Exercícios é apenas browser/visualizador. Redução de 3-4 dias pra 1-2 dias na Fase 2.

---

## 1. Visão do MVP

> *"O editor de material + bibliotecas musicais já é um produto."* — Mateus (Emusys)

O MVP do LA Journey é uma **máquina de criação e personalização de material didático musical**. A escola parte de templates e blocos reutilizáveis, personaliza com os editores que já existem, e exporta PDF com identidade visual própria.

**O que JÁ funciona:**
- 6 editores musicais (Notação, Tablatura, Acordes, Piano, Guitarra/Fretboard, Imagens IA)
- Editor de Material com 7 fases completas (21 tipos de bloco, IA integrada)
- 10.603 acordes na biblioteca
- 2.935 músicas no repertório
- Base Curada com CRUD (42 tópicos, 76 blocos)

**O que FALTA pra ser produto:**
1. Biblioteca de Exercícios e Exemplos (conteúdo reutilizável)
2. Cadernos de Repertório (organização por estilo/artista/nível)
3. Templates de Apostila (ponto de partida pra escola)
4. Popular banco com conteúdo curado real
5. Fluxo completo: Biblioteca → Editor de Material → PDF

---

## 2. DECISÃO ARQUITETURAL — Zero Redundância

### Princípio

O Editor de Material (7 fases, 21 blocos, IA integrada) **já faz tudo**. Criar um "Editor de Exercício" separado seria redundância: mesmo código, mesma funcionalidade, dois componentes pra manter.

### A solução: 2 features novas no Editor de Material + 1 tab de listagem

```
┌─────────────────────────────────────────────────────────────┐
│  EDITOR DE MATERIAL (já existe — 7 fases completas)         │
│                                                             │
│  Feature NOVA 1:                                            │
│  "💾 Salvar como Bloco Reutilizável"                        │
│  → Seleciona blocos → classifica → salva na exercise_library│
│                                                             │
│  Feature NOVA 2:                                            │
│  "+ Adicionar Bloco → 📚 Da Biblioteca"                     │
│  → Abre browser da exercise_library → insere blocos         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  TAB EXERCÍCIOS (na Biblioteca Musical — NOVA)              │
│                                                             │
│  Browser/visualizador da exercise_library                    │
│  → Filtros, preview, "Usar no Material"                     │
│  → NÃO tem editor próprio                                   │
│  → "Editar" abre o exercício no Editor de Material           │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo CRIANDO exercício/exemplo

```
1. Coordenador abre o Editor de Material (o mesmo de sempre)
2. Cria os blocos que formam o exercício:
   - Bloco de texto ("Pratique a progressão abaixo a 80 BPM...")
   - Bloco chord_grid (C Am F G — com diagramas)
   - Bloco de notação (abre NotationEditorV2)
   - Bloco de tablatura (abre TablatureEditor)
   - Usa IA pra melhorar o texto
3. Seleciona os blocos que formam o exercício
4. Clica "💾 Salvar como Bloco Reutilizável"
5. Dialog pergunta:
   - Tipo: [Exercício ▾] ou [Exemplo ▾]
   - Categoria: [Técnica ▾] [Harmonia ▾] [Leitura ▾] [Ritmo ▾] ...
   - Instrumento: [Universal ▾] [Violão ▾] [Piano ▾] ...
   - Nível: [Foundation ▾] [Grow ▾] ...
   - Título: [________________________]
6. Salva na exercise_library com todos os blocos em JSONB
7. Os blocos continuam no material atual E ficam disponíveis na biblioteca
```

### Fluxo USANDO exercício/exemplo

```
1. Coordenador está no Editor de Material montando apostila
2. Clica "+ Adicionar Bloco"
3. No menu de tipos de bloco, nova opção: "📚 Da Biblioteca"
4. Abre browser/buscador da exercise_library
   - Filtros: tipo, categoria, instrumento, nível, busca
   - Preview com primeiro bloco visual
   - Contadores (📝 3 textos · 🎸 2 diagramas · 🎵 1 pauta)
5. Clica "Inserir" no exercício desejado
6. TODOS os blocos do exercício são inseridos no material
7. Coordenador pode editar os blocos inseridos normalmente
```

### Fluxo via Tab Exercícios (atalho)

```
1. Coordenador acessa Biblioteca Musical → tab Exercícios
2. Navega/filtra exercícios e exemplos
3. Clica "Usar no Material" → abre o Editor de Material com blocos inseridos
4. OU clica "Editar" → abre o exercício no Editor de Material pra ajustar
5. OU clica "+ Novo Conteúdo" → abre o Editor de Material vazio
```

---

## 3. Estado do Banco (pós-migrations)

**30 tabelas** no projeto. Migrations aplicadas nesta sessão:

| Tabela | Registros | Status |
|--------|-----------|--------|
| `exercise_library` | 0 | ✅ NOVA — pronta |
| `repertoire_collections` | 0 | ✅ NOVA — pronta |
| `repertoire_collection_items` | 0 | ✅ NOVA — pronta |
| `generated_materials` | 3 | ✅ Campos template adicionados |
| `chord_library` | 10.603 | ✅ Rico |
| `repertoire` | 2.935 | ⚠️ Tudo draft |
| `content_topics` | 42 | ✅ 41 publicados |
| `content_blocks` | 76 | ✅ OK |
| `notation_library` | 28 | ⚠️ Só escalas |
| `scale_library` | 6 | ❌ Quase vazio |
| `image_library` | 18 | ✅ OK |
| `backing_tracks` | 0 | ❌ Vazio |

### Migrations aplicadas

1. `create_exercise_library` — tabela com `content_type` (exercise/example), `category`, `blocks JSONB`, RLS
2. `create_repertoire_collections` — cadernos + itens, RLS
3. `add_template_fields_to_generated_materials` — `is_template`, `template_instrument`, etc.

---

## 4. Módulo 1 — Features Novas no Editor de Material

### Feature 1: "Salvar como Bloco Reutilizável"

**Onde:** Toolbar do Editor de Material (botão novo) ou menu de contexto dos blocos selecionados.

**Comportamento:**
1. Coordenador seleciona 1 ou mais blocos no material (checkbox ou multi-select)
2. Clica no botão "💾 Salvar como Bloco Reutilizável" (ou ícone na toolbar)
3. Abre dialog de classificação:

```
┌──────────────────────────────────────────────┐
│  💾 Salvar como Bloco Reutilizável           │
│                                              │
│  Título:      [Progressão I-vi-IV-V____]     │
│  Descrição:   [Exercício de harmonia___]     │
│                                              │
│  Tipo:        [Exercício ▾]                  │
│               • Exercício (pra praticar)     │
│               • Exemplo (pra ilustrar)       │
│                                              │
│  Categoria:   [Harmonia ▾]                   │
│               Técnica, Harmonia, Leitura,    │
│               Ritmo, Escalas, Intervalos,    │
│               Peça, Progressão, Outro        │
│                                              │
│  Instrumento: [Universal ▾]                  │
│  Nível:       [Foundation ▾]                 │
│  Tags:        [progressão, acordes, ___]     │
│                                              │
│  📋 Blocos selecionados: 4                   │
│  📝 Texto · 🎸 Chord Grid · 🎵 Notação ·   │
│  🎸 Tablatura                                │
│                                              │
│  [Cancelar]         [💾 Salvar na Biblioteca]│
└──────────────────────────────────────────────┘
```

4. Ao confirmar → salva na `exercise_library` com:
   - `blocks`: JSONB array com os blocos selecionados (mesmo formato do material_blocks)
   - `content_type`: 'exercise' ou 'example'
   - `category`: a categoria selecionada
   - `block_count`: número de blocos
   - `preview_data`: dados do primeiro bloco visual (pra preview no card)
   - `curation_status`: 'draft' (coordenador revisa depois)
   - `school_id`: da escola

5. Toast: "Exercício salvo na biblioteca! ✅"
6. Os blocos originais continuam no material (não são removidos)

### Feature 2: "Adicionar da Biblioteca" no menu de blocos

**Onde:** Menu "+ Adicionar Bloco" do Editor de Material.

**Comportamento:**
1. No menu de tipos de bloco (que já mostra text, notation, tablature, chord_diagram, etc.), nova opção no topo:

```
┌────────────────────────────────┐
│  + Adicionar Bloco             │
├────────────────────────────────┤
│  📚 DA BIBLIOTECA              │  ← NOVO (destaque)
├────────────────────────────────┤
│  📝 Texto                      │
│  🎵 Notação Musical            │
│  🎸 Diagrama de Acorde         │
│  🎼 Tablatura                  │
│  ⌨️ Teclado                    │
│  🎸 Grade de Acordes           │
│  🏋️ Exercício (texto)          │
│  💡 Dica                       │
│  📷 Imagem                     │
│  🥁 Ritmo                      │
│  📄 Quebra de Página           │
│  ── Separador                  │
│  📷 Capa                       │
│  📐 Colunas                    │
│  🎬 Áudio                      │
│  🎬 Vídeo                      │
└────────────────────────────────┘
```

2. Ao clicar "📚 Da Biblioteca" → abre modal de busca:

```
┌────────────────────────────────────────────────────────────┐
│  📚 Inserir da Biblioteca                             [✕]  │
├────────────────────────────────────────────────────────────┤
│  [🔍 Buscar exercício ou exemplo...]                       │
│  [Tipo: Todos ▾] [Categoria ▾] [Instrumento ▾] [Nível ▾] │
├────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────┐  ┌──────────────────────┐ │
│  │ [Exercício] Harmonia Nv.2 │  │ [Exemplo] Leitura    │ │
│  │ ┌──────────────────────┐  │  │ ┌──────────────────┐ │ │
│  │ │ C → Am → F → G       │  │  │ │ 𝄞 ♩ ♩ ♩ ♩ ...  │ │ │
│  │ └──────────────────────┘  │  │ └──────────────────┘ │ │
│  │ Progressão I-vi-IV-V      │  │ Escala Sol Maior     │ │
│  │ 📝2 🎸1 🎵1 · 4 blocos   │  │ 📝1 🎵1 · 2 blocos  │ │
│  │ [Inserir no Material]     │  │ [Inserir no Material]│ │
│  └────────────────────────────┘  └──────────────────────┘ │
│                                                            │
│  ┌────────────────────────────┐  ┌──────────────────────┐ │
│  │ [Exercício] Técnica Nv.1  │  │ [Exemplo] Ritmo      │ │
│  │ ┌──────────────────────┐  │  │ ┌──────────────────┐ │ │
│  │ │ TAB: 1-2-3-4 cromát. │  │  │ │ 4/4 TA TA TA TA  │ │ │
│  │ └──────────────────────┘  │  │ └──────────────────┘ │ │
│  │ Cromático 1-2-3-4         │  │ Divisão Semínimas    │ │
│  │ 📝1 🎸1 · 2 blocos       │  │ 📝1 🎵1 · 2 blocos  │ │
│  │ [Inserir no Material]     │  │ [Inserir no Material]│ │
│  └────────────────────────────┘  └──────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

3. Ao clicar "Inserir no Material" → TODOS os blocos do exercício são adicionados na posição atual do material
4. Toast: "4 blocos inseridos ✅"
5. Coordenador pode editar/reordenar os blocos normalmente

---

## 5. Módulo 2 — Tab Exercícios na Biblioteca Musical

### Conceito

A tab "Exercícios" é um **browser/visualizador** da `exercise_library`. NÃO tem editor próprio. Serve pra navegar, filtrar, encontrar e usar exercícios/exemplos.

### Sub-abas

```
[Todos] [Exercícios] [Exemplos] [Leitura] [Técnica] [Ritmo]
[Harmonia] [Escalas] [Intervalos] [Peças] [Cadernos]
```

| Sub-aba | Filtra por |
|---------|-----------|
| Todos | Sem filtro de tipo/categoria |
| Exercícios | `content_type = 'exercise'` |
| Exemplos | `content_type = 'example'` |
| Leitura | `category = 'reading'` |
| Técnica | `category = 'technique'` |
| Ritmo | `category = 'rhythm'` |
| Harmonia | `category = 'harmony'` |
| Escalas | `category = 'scales'` |
| Intervalos | `category = 'intervals'` |
| Peças | `category = 'piece'` |
| Cadernos | Cadernos de repertório (seção separada) |

### Filtros

```
[🔍 Buscar...]  [Instrumento ▾]  [Nível ▾]  [Formato ▾]
```

### Cards

Cada card mostra:
- Badge de tipo (Exercício / Exemplo) + badge de categoria
- Preview do primeiro bloco visual (pauta, tablatura ou diagrama)
- Título
- Contadores por tipo de bloco (📝 3 · 🎸 2 · 🎵 1)
- Instrumento e nível
- Badge "⭐ Template LA" se for conteúdo modelo

### Ações por card

| Botão | O que faz |
|-------|----------|
| **Usar no Material** | Abre o Editor de Material e insere TODOS os blocos do exercício |
| **Editar** | Abre o exercício no Editor de Material pra ajustar (carrega os blocos) |
| **Duplicar** | Cria cópia do exercício na biblioteca |
| **Excluir** | Remove da exercise_library |

### Botão "+ Novo Conteúdo"

Abre o **Editor de Material** (o normal, que já existe). O coordenador cria os blocos e depois usa "Salvar como Bloco Reutilizável" pra colocar na biblioteca.

Pode ter um toast/banner no topo do Editor de Material quando aberto via tab Exercícios:

```
💡 Crie os blocos do seu exercício ou exemplo. Quando terminar, 
selecione os blocos e clique "💾 Salvar como Bloco Reutilizável".
```

---

## 6. Módulo 3 — Cadernos de Repertório

### Conceito

Cadernos são coleções temáticas de músicas do repertório (2.935 músicas). Aparecem na sub-aba "Cadernos" da tab Exercícios, ou como seção separada.

### Exemplos de cadernos

| Caderno | Instrumento | Nível | Músicas |
|---------|------------|-------|---------|
| Primeiros Acordes | Violão | Foundation | 10 |
| MPB Essencial | Universal | Grow | 15 |
| Rock Clássico | Guitarra | Grow | 12 |
| Bossa Nova | Universal | Advance | 10 |
| Gospel & Louvor | Canto | Foundation | 10 |
| Sertanejo Universitário | Violão | Foundation | 10 |
| Infantil | Universal | Foundation | 15 |

### Funcionalidades

- CRUD de cadernos (nome, instrumento, nível, gênero, tags, capa)
- Buscar músicas no `repertoire` e adicionar ao caderno
- Reordenar músicas via drag-and-drop
- Campo de notas do professor por música
- Badge "⭐ Template LA" nos cadernos modelo
- Filtros: instrumento, nível, gênero, busca

### Estrutura

Tabelas `repertoire_collections` + `repertoire_collection_items` (já criadas).

---

## 7. Módulo 4 — Templates de Apostila

### Conceito

Templates são apostilas modelo completas da LA Music. A escola clona e personaliza.

### Fluxo

```
1. Coordenador acessa Templates (no Gerador ou menu)
2. Vê grid de templates com preview
3. Clica "Usar Template"
4. Sistema CLONA o material (novo ID, school_id da escola)
5. Abre no Editor de Material
6. Coordenador personaliza (logo, textos, exercícios, IA)
7. Exporta PDF
```

### Templates planejados (MVP)

| Template | Instrumento | Conteúdo |
|----------|------------|----------|
| Teoria Musical Básica | Universal | Notas, claves, escalas, intervalos, compassos |
| Violão Foundation | Violão | Postura, acordes, batidas, repertório |

### Estrutura

Campos no `generated_materials`: `is_template`, `template_instrument`, `template_level`, `template_description`, `template_cover_url` (já criados).

---

## 8. Módulo 5 — Popular Banco com Conteúdo Real

### Estratégia: curadoria gradual

| Prioridade | Conteúdo | Como | Volume |
|------------|----------|------|--------|
| **P1** | Escalas (todas as tonalidades maiores/menores) | Claude gera via tonal.js → AlphaTex | 24-48 |
| **P1** | Exercícios de leitura (Bona Cap. 1-5) | Claude normaliza → AlphaTex | 20-30 |
| **P1** | Progressões harmônicas básicas | Claude gera sequências + diagramas | 15-20 |
| **P2** | Repertório curado (publicar melhores drafts) | Alf revisa → aprovar | 50-100 |
| **P2** | Peças de piano (Czerny Op.599 nº 1-10) | Download MusicXML do PDMX → AlphaTab | 10 |
| **P2** | Estudos de violão (Giuliani, Carcassi) | Download MusicXML → AlphaTab | 10-15 |
| **P3** | Cadernos de repertório modelo | Alf monta | 5-6 |
| **P3** | Template "Teoria Musical Básica" | Claude + Alf | 1 apostila |
| **P3** | Template "Violão Foundation" | Claude + Alf | 1 apostila |

### Fontes de conteúdo (da pesquisa profunda)

| Fonte | Licença | O que aproveitar |
|-------|---------|-----------------|
| **PDMX** (250K partituras MusicXML) | Domínio público | Peças de piano e violão clássico |
| **OpenScore Lieder** (1.200+ canções) | CC0 | Canções pra voz e piano |
| **Mutopia** (2.124 peças) | Domínio público / CC | Piano e violão |
| **Musica Brasilis** (6.000+ partituras brasileiras) | Autorizado | Nazareth, Chiquinha Gonzaga, Carlos Gomes |
| **Método Bona** (Pasquale Bona †1878) | Domínio público | Solfejo e divisão rítmica |
| **tonal.js** (programático) | MIT | Gerar escalas, acordes, intervalos dinamicamente |

---

## 9. APIs Externas — Roadmap

### Já integrado
| API | Uso |
|-----|-----|
| Gemini Flash (`gemini-3-flash-preview`) | IA no editor |
| Gemini Image (`gemini-3.1-flash-image-preview`) | Gerar imagens |

### Médio prazo
| API | Uso | Custo |
|-----|-----|-------|
| **Moises** | Separar stems → backing tracks | $0.10/min |
| **tonal.js** (local) | Gerar exercícios de teoria | Grátis |
| **Essentia.js** (local) | Análise de áudio no browser | Grátis |

### Futuro
| API | Uso |
|-----|-----|
| Flat.io | Notação colaborativa |
| SoundSlice | Partitura + áudio sincronizado |
| WebMIDI.js | Input MIDI |
| Impress | Impressão automática |

---

## 10. Plano de Implementação — 5 Fases

### Fase 1 — Infraestrutura (1-2 dias)

**Claude (Backend/MCP):** ✅ JÁ FEITO
- [x] Aplicar Migration 1 (`exercise_library`)
- [x] Aplicar Migration 2 (`repertoire_collections` + `repertoire_collection_items`)
- [x] Aplicar Migration 3 (campos template no `generated_materials`)

**Claude (Backend/MCP):** A FAZER
- [ ] Popular `scale_library` com todas as escalas maiores e menores (24 escalas)
- [ ] Gerar primeiros exercícios na `exercise_library` (5-10 exercícios modelo)

**Claude Code (Frontend):**
- [ ] Swap NotationEditorV2 pra produção
- [ ] Instalar tonal.js (`npm install tonal`)

### Fase 2 — Features no Editor de Material + Tab Exercícios (2-3 dias)

**Claude Code (Frontend):**

No Editor de Material (já existe):
- [ ] Botão "💾 Salvar como Bloco Reutilizável" na toolbar
- [ ] Multi-seleção de blocos (checkbox em cada bloco)
- [ ] Dialog de classificação (tipo, categoria, instrumento, nível, tags)
- [ ] Salvar na `exercise_library` com blocos em JSONB
- [ ] Nova opção "+ Adicionar Bloco → 📚 Da Biblioteca"
- [ ] Modal de busca/browser da `exercise_library` com filtros
- [ ] Inserir TODOS os blocos de um exercício no material
- [ ] Service + hook pra `exercise_library`

Na Biblioteca Musical:
- [ ] Tab "Exercícios" (browser/visualizador)
- [ ] Sub-abas: Todos, Exercícios, Exemplos, Leitura, Técnica, Ritmo, Harmonia, Escalas, Intervalos, Peças, Cadernos
- [ ] Filtros: tipo, categoria, instrumento, nível, busca
- [ ] Cards com preview visual + contadores por tipo de bloco
- [ ] Botões: Usar no Material, Editar, Duplicar, Excluir
- [ ] "+ Novo Conteúdo" → abre Editor de Material

### Fase 3 — Cadernos de Repertório (1-2 dias)

**Claude Code (Frontend):**
- [ ] Sub-aba "Cadernos" na tab Exercícios
- [ ] CRUD de coleções
- [ ] Buscar e adicionar músicas do `repertoire`
- [ ] Reordenar músicas via drag-and-drop
- [ ] Service + hook pra `repertoire_collections`

**Claude (Backend):**
- [ ] Criar 3-5 cadernos modelo (Template LA)
- [ ] Curar e aprovar 50-100 músicas do repertoire

### Fase 4 — Popular com Conteúdo Real (2-3 dias)

**Claude (MCP direto):**
- [ ] Gerar TODAS as escalas em AlphaTex (24+ na notation_library)
- [ ] Gerar exercícios compostos na exercise_library (Bona, progressões, técnica)
- [ ] Importar peças do PDMX (Czerny, Bach, Giuliani)

**Alf (Curadoria):**
- [ ] Revisar e aprovar exercícios
- [ ] Montar cadernos de repertório modelo

### Fase 5 — Templates de Apostila + Fluxo Completo (2-3 dias)

**Claude + Alf:**
- [ ] Montar apostila "Teoria Musical Básica" 
- [ ] Montar apostila "Violão Foundation"
- [ ] Salvar como templates

**Claude Code (Frontend):**
- [ ] Tela de Templates
- [ ] Botão "Usar Template" → clonar → Editor de Material
- [ ] Fluxo completo: Template → Personalizar → PDF

---

## 11. Divisão de trabalho por agente

| Tarefa | Agente | Fase |
|--------|--------|------|
| Migrations no banco | Claude (MCP) | ✅ Feito |
| Popular escalas e exercícios | Claude (MCP) | Fase 1 |
| Swap NotationEditorV2 | Claude Code | Fase 1 |
| Instalar tonal.js | Claude Code | Fase 1 |
| "Salvar como Bloco Reutilizável" no Editor | Claude Code | Fase 2 |
| "Da Biblioteca" no menu de blocos | Claude Code | Fase 2 |
| Tab Exercícios (browser) | Claude Code | Fase 2 |
| Service/hook exercise_library | Claude Code | Fase 2 |
| Cadernos de repertório (UI) | Claude Code | Fase 3 |
| Popular banco (dados reais) | Claude (MCP) | Fase 4 |
| Curadoria | Alf | Fase 4 |
| Templates de apostila | Claude + Alf + Claude Code | Fase 5 |

---

## 12. O que NÃO fazer

- ❌ Editor de Exercício separado (usa o Editor de Material)
- ❌ Importar 250 mil partituras de uma vez
- ❌ Import de PDF com visão
- ❌ Exercícios interativos tipo Duolingo (Fase 2 do produto)
- ❌ Integração Suno (sem API oficial)
- ❌ Auth/multi-tenancy real
- ❌ WhatsApp integration
- ❌ Novas features no Editor de Material (7 fases é suficiente)
- ❌ Gamificação completa

---

## 13. Estimativa Total

| Fase | Esforço | Quem |
|------|---------|------|
| Fase 1 — Infraestrutura | 1-2 dias | Claude (dados) + Claude Code (swap + tonal.js) |
| Fase 2 — Editor features + Tab Exercícios | 2-3 dias | Claude Code |
| Fase 3 — Cadernos Repertório | 1-2 dias | Claude Code + Claude |
| Fase 4 — Popular banco | 2-3 dias | Claude (MCP) + Alf |
| Fase 5 — Templates + Fluxo | 2-3 dias | Todos |
| **Total** | **8-13 dias** | |

---

## 14. Critério de Sucesso do MVP

1. ✅ Professor cria exercício no Editor de Material → "Salvar como Bloco Reutilizável" → aparece na biblioteca
2. ✅ Coordenador monta apostila → "+ Adicionar → Da Biblioteca" → insere exercício completo
3. ✅ Tab Exercícios mostra exercícios e exemplos com filtros e preview
4. ✅ Cadernos de repertório organizados por estilo/nível
5. ✅ Templates de apostila modelo disponíveis
6. ✅ Fluxo: Template → Personalizar → PDF profissional
7. ✅ Alf diz: "Esse material foi criado dentro do LA Journey"

---

*PRD v2.1 — 23/03/2026*
*Um editor, múltiplos contextos. Zero redundância.*