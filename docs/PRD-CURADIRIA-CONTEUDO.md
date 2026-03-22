# PRD — Sistema de Curadoria de Conteúdo

**Projeto:** LA Journey — Módulo de Curadoria  
**Versão:** 1.0  
**Data:** 22/03/2026  
**Autor:** Claude (Arquitetura/Backend) + Alf (Produto/Pedagogia)

---

## 1. O Problema

Hoje, a única forma de subir conteúdo pedagógico pro banco de dados é via Claude + MCP (SQL direto). O PDF "Teoria Complementar I" foi normalizado manualmente: Claude leu o PDF, criou 22 tópicos e 70 blocos via SQL, gerou embeddings com OpenAI.

**Coordenadores e professores N4 não têm acesso a isso.** Eles precisam de uma interface dentro do sistema pra:
- Subir novos materiais (PDFs, textos)
- A IA normalizar o conteúdo em tópicos + blocos
- Revisar, editar e aprovar o conteúdo curado
- Esse conteúdo alimentar o Gerador de Material

---

## 2. O Ciclo Completo de Produção

```
┌─────────────────────────────────────────────────────────────┐
│  ETAPA 1: CURADORIA (este PRD)                              │
│  Coordenador sobe PDF ou cria conteúdo manualmente          │
│  → IA normaliza em tópicos + blocos                         │
│  → Coordenador revisa e aprova                              │
│  → Embeddings gerados automaticamente                       │
│  → Conteúdo fica na Base Curada (content_topics + blocks)   │
├─────────────────────────────────────────────────────────────┤
│  ETAPA 2: JORNADA (já existe: /jornadas)                    │
│  Coordenador seleciona tópicos da Base Curada               │
│  → Ordena em estações (Start, Core, Checkpoint)             │
│  → Define jornada por instrumento e nível                   │
├─────────────────────────────────────────────────────────────┤
│  ETAPA 3: GERAÇÃO (já existe parcial: /gerador)             │
│  Coordenador seleciona jornada + estação                    │
│  → IA busca conteúdo curado (RAG com embeddings)            │
│  → IA gera/adapta textos e exercícios                       │
│  → Resultado: material com blocos editáveis                 │
├─────────────────────────────────────────────────────────────┤
│  ETAPA 4: EDIÇÃO (já existe: editor de material)            │
│  Coordenador edita blocos, estiliza, adiciona capas         │
│  → Exporta PDF com identidade visual da escola              │
└─────────────────────────────────────────────────────────────┘
```

**Este PRD foca na Etapa 1 e na conexão entre as etapas.**

---

## 3. Estado Atual do Banco

### Tabelas envolvidas

| Tabela | Registros | O que armazena |
|--------|-----------|---------------|
| `content_topics` | 41 | Tópicos pedagógicos (Escala Maior, Intervalos, etc.) |
| `content_blocks` | 70 | Blocos atômicos de conteúdo (texto, exercício, dica, exemplo) |
| `journeys` | 2 | Jornadas configuradas (Violão Adulto, Teoria Complementar I) |
| `journey_station_topics` | 34 | Vínculo tópico ↔ estação da jornada |
| `generated_materials` | 3 | Materiais gerados pelo pipeline |
| `material_blocks` | 38 | Blocos dos materiais gerados |

### Enums disponíveis

| Enum | Valores |
|------|---------|
| `content_block_type` | text, notation, chord_diagram, tablature, exercise, keyboard_diagram, scale_diagram, rhythm_pattern, tip, example |
| `curation_status` | draft, review, approved, published |
| `difficulty_level` | foundation, grow, advance, master |
| `topic_dimension` | theory, technique, rhythm, repertoire, auditory, evaluation |
| `pillar_type` | theoretical_foundations, instrument_practice, repertoire, improvisation_composition, auditory_development, evaluations_presentations |

### O que já existe no banco (conteúdo curado)

**22 tópicos com blocos (do PDF Teoria Complementar I):**
- Escala Maior (6 blocos), Intervalos (6 blocos), Claves Musicais (5 blocos)
- Compassos Simples (5 blocos), Tom Musical e Armadura (4 blocos)
- Alterações Musicais (4 blocos), Elementos Básicos (4 blocos)
- + 15 outros tópicos menores

**19 tópicos VAZIOS (sem blocos):**
- Violão: Anatomia, Tablatura, Acordes Abertos, Postura, Coordenação, etc.
- Canto: Aparelho Fonador
- Bateria: Rudimentos
- Universal: Propriedades do Som, Tom e Semitom, etc.

### Campos importantes

**content_topics:**
- `source_document` — de qual PDF/fonte veio (ex: "TEORIA_COMPLEMENTAR_I_Henrique_Gurgel_2016")
- `embedding vector(1536)` — pra busca semântica (RAG)
- `tags text[]` — tags de busca

**content_blocks:**
- `curation_status` — draft → review → approved → published
- `school_id` — NULL = global (plataforma), preenchido = privado (escola)
- `ai_metadata jsonb` — rastreabilidade da IA (modelo usado, prompt, etc.)
- `embedding vector(1536)` — pra busca semântica

---

## 4. Migration Necessária

O `content_topics` NÃO tem `curation_status`. Precisa adicionar pra que tópicos também tenham workflow de curadoria.

```sql
-- Migration: add_curation_status_to_content_topics
ALTER TABLE content_topics 
  ADD COLUMN IF NOT EXISTS curation_status curation_status DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS curated_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);

-- Tópicos existentes já estão publicados
UPDATE content_topics SET curation_status = 'published' WHERE curation_status IS NULL;

-- RLS: tópicos globais (school_id NULL) + privados da escola
CREATE POLICY "content_topics_select" ON content_topics
  FOR SELECT USING (
    school_id IS NULL 
    OR school_id IN (SELECT school_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "content_topics_insert" ON content_topics
  FOR INSERT WITH CHECK (
    school_id IN (SELECT school_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "content_topics_update" ON content_topics
  FOR UPDATE USING (
    school_id IN (SELECT school_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "content_topics_delete" ON content_topics
  FOR DELETE USING (
    school_id IN (SELECT school_id FROM users WHERE id = auth.uid())
  );
```

**NOTA:** Os tópicos globais (`school_id = NULL`) são da plataforma LA Music — criados pelo Alf/Claude. Escolas podem criar tópicos privados com `school_id` preenchido.

---

## 5. Interface — Página Base Curada (`/conteudo`)

### Layout

A página `/conteudo` já existe mas precisa ser expandida. Layout proposto:

```
┌────────────────────────────────────────────────────────────┐
│  Header: "Base de Conteúdo Curado"                         │
│  [+ Novo Tópico]  [📄 Importar PDF]  [Filtros ▾]          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Filtros: Instrumento | Dimensão | Nível | Status          │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📘 Escala Maior                          published  │  │
│  │  universal · theory · foundation · 6 blocos          │  │
│  │  Fonte: Teoria Complementar I                        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  📘 Intervalos                             published  │  │
│  │  universal · theory · foundation · 6 blocos          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  📙 Anatomia do Violão                       draft   │  │
│  │  Violão · theory · foundation · 0 blocos             │  │
│  │  ⚠️ Sem conteúdo                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Mostrando 41 tópicos · 70 blocos · 22 com conteúdo       │
└────────────────────────────────────────────────────────────┘
```

### Filtros

| Filtro | Opções | Default |
|--------|--------|---------|
| Instrumento | Todos, Universal, Violão, Guitarra, Piano, Canto, Bateria, Baixo, Ukulele | Todos |
| Dimensão | Todas, Teoria, Técnica, Ritmo, Repertório, Auditivo, Avaliação | Todas |
| Nível | Todos, Foundation, Grow, Advance, Master | Todos |
| Status | Todos, Rascunho, Em Revisão, Aprovado, Publicado | Todos |
| Busca texto | Input de busca por título/tags | — |

### Cards de tópico

Cada card mostra:
- Título do tópico
- Badges: instrumento, dimensão, nível, status (com cores)
- Contagem de blocos
- Fonte (source_document)
- Ícone de aviso se 0 blocos
- Click → abre página de edição do tópico

### Badges de status

| Status | Cor | Badge |
|--------|-----|-------|
| draft | Cinza | 📝 Rascunho |
| review | Âmbar | 🔍 Em Revisão |
| approved | Azul | ✅ Aprovado |
| published | Verde | 🟢 Publicado |

---

## 6. Criar Tópico Manualmente

### Dialog "Novo Tópico"

```
┌────────────────────────────────────────────┐
│  Novo Tópico                               │
│                                            │
│  Título: [________________________]        │
│                                            │
│  Descrição: [_____________________]        │
│             [_____________________]        │
│                                            │
│  Instrumento: [Universal        ▾]         │
│  Dimensão:    [Teoria           ▾]         │
│  Nível:       [Foundation       ▾]         │
│                                            │
│  Tags: [escala, tom, ________]             │
│                                            │
│  Tempo estimado: [15] min                  │
│                                            │
│  [Cancelar]              [Criar Tópico]    │
└────────────────────────────────────────────┘
```

Ao criar, o tópico nasce com `curation_status: 'draft'` e 0 blocos.

---

## 7. Editar Tópico — Página de Curadoria

### Layout da página de edição

```
┌────────────────────────────────────────────────────────────┐
│  ← Voltar    Escala Maior    [🟢 Publicado] [Salvar]      │
├──────────────────────────────┬─────────────────────────────┤
│  BLOCOS DO TÓPICO            │  PROPRIEDADES               │
│                              │                             │
│  [+ Adicionar Bloco]         │  Título: [Escala Maior]     │
│                              │  Instrumento: [Universal ▾] │
│  ┌────────────────────────┐  │  Dimensão: [Teoria ▾]      │
│  │ 1. 📝 Formação da      │  │  Nível: [Foundation ▾]     │
│  │    Escala Maior         │  │  Tags: [escala, tom, ...]  │
│  │    Escala maior: T-T-   │  │  Status: [Publicado ▾]    │
│  │    ST-T-T-T-ST...       │  │                             │
│  │    [Editar] [Mover ↕]  │  │  Fonte: Teoria Compl. I    │
│  ├────────────────────────┤  │  Tempo: 25 min              │
│  │ 2. 📝 Nomes dos Graus  │  │                             │
│  │    I-Tônica, II-Super.. │  │  ────────────────────      │
│  │    [Editar] [Mover ↕]  │  │  ESTATÍSTICAS              │
│  ├────────────────────────┤  │  Blocos: 6                  │
│  │ 3. 💡 Dica de Formação │  │  Usada em: 1 jornada       │
│  │    Semitons entre 3º-   │  │  Materiais: 2              │
│  │    [Editar] [Mover ↕]  │  │  Embedding: ✅              │
│  ├────────────────────────┤  │                             │
│  │ 4. 📝 Graus Conjuntos  │  │                             │
│  │ 5. 📋 Exemplo Sol/Fá   │  │                             │
│  │ 6. 🏋️ Exercício        │  │                             │
│  └────────────────────────┘  │                             │
│                              │                             │
│  Drag-and-drop pra reordenar │                             │
└──────────────────────────────┴─────────────────────────────┘
```

### Tipos de bloco

Ao clicar "+ Adicionar Bloco", aparece grid de tipos:

| Tipo | Ícone | Descrição |
|------|-------|-----------|
| `text` | 📝 | Texto explicativo (markdown ou HTML) |
| `tip` | 💡 | Dica ou destaque pedagógico |
| `exercise` | 🏋️ | Exercício prático |
| `example` | 📋 | Exemplo musical (com contexto) |
| `notation` | 🎵 | Notação musical (abre editor de notação) |
| `chord_diagram` | 🎸 | Diagrama de acorde (abre chord_library) |
| `tablature` | 🎼 | Tablatura (abre editor de tablatura) |
| `scale_diagram` | 🎹 | Diagrama de escala |
| `rhythm_pattern` | 🥁 | Padrão rítmico |
| `keyboard_diagram` | ⌨️ | Diagrama de teclado |

### Editar bloco inline

Ao clicar "Editar" num bloco, expande inline com editor rico:

```
┌────────────────────────────────────────┐
│  Tipo: [Texto ▾]   Título: [_______]  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Editor rico (TipTap)           │  │
│  │  B I U H1 H2 • Lista           │  │
│  │                                  │  │
│  │  Escala maior segue o padrão    │  │
│  │  de intervalos T-T-ST-T-T-T-ST │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [Cancelar]  [Salvar Bloco]           │
└────────────────────────────────────────┘
```

Para blocos de tipo `notation`, `tablature`, `chord_diagram`: abre o editor musical correspondente (os que já existem na Biblioteca Musical).

---

## 8. Importar PDF com IA — A Feature Principal

### Fluxo

```
1. Coordenador clica "📄 Importar PDF"
2. Upload do PDF (drag & drop ou file picker)
3. Sistema extrai texto do PDF (via pdf-parse ou similar)
4. IA (Gemini Flash) analisa e sugere:
   - Tópicos detectados (títulos, descrições)
   - Blocos por tópico (texto, exercícios, dicas)
   - Metadados (instrumento, dimensão, nível)
5. Coordenador vê o resultado e pode:
   - Aceitar tudo
   - Editar títulos/descrições
   - Mover blocos entre tópicos
   - Deletar tópicos/blocos irrelevantes
   - Mudar metadados
6. Coordenador confirma → tópicos e blocos são salvos no banco
7. Embeddings são gerados automaticamente (em background)
```

### Dialog de importação (3 etapas)

**Etapa 1 — Upload:**
```
┌────────────────────────────────────────────┐
│  Importar Material (PDF)                   │
│                                            │
│  ┌────────────────────────────────────┐    │
│  │                                    │    │
│  │     📄 Arraste o PDF aqui          │    │
│  │     ou clique para selecionar      │    │
│  │                                    │    │
│  └────────────────────────────────────┘    │
│                                            │
│  Instrumento: [Universal        ▾]         │
│  Nível base:  [Foundation       ▾]         │
│                                            │
│  [Cancelar]        [Processar com IA]      │
└────────────────────────────────────────────┘
```

**Etapa 2 — Revisão (IA processou):**
```
┌────────────────────────────────────────────────────────┐
│  Resultado da Importação                               │
│  📄 TEORIA_COMPLEMENTAR_I.pdf → 22 tópicos, 70 blocos │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  ☑ Escala Maior (6 blocos)                       │  │
│  │    theory · foundation                            │  │
│  │    ├─ 📝 Formação da Escala Maior                │  │
│  │    ├─ 📝 Nomes dos Graus                         │  │
│  │    ├─ 💡 Dica de Formação                        │  │
│  │    ├─ 📝 Graus Conjuntos e Disjuntos             │  │
│  │    ├─ 📋 Exemplo — Escalas Sol e Fá              │  │
│  │    └─ 🏋️ Exercício — Construir Escalas           │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  ☑ Intervalos (6 blocos)                         │  │
│  │    theory · foundation                            │  │
│  │    ├─ 📝 Definição de Intervalo                  │  │
│  │    ├─ 📝 Classificação                           │  │
│  │    └─ ... (expandir)                              │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  ☑ Tom e Semitom (3 blocos)                      │  │
│  │  ☐ Propriedades do Som (descartado)              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Tópicos selecionados: 21/22 · Blocos: 67/70          │
│                                                        │
│  [Voltar]  [Editar Detalhes]  [Importar Selecionados] │
└────────────────────────────────────────────────────────┘
```

**Etapa 3 — Confirmação:**
```
┌────────────────────────────────────────────┐
│  ✅ Importação concluída!                   │
│                                            │
│  21 tópicos criados                        │
│  67 blocos de conteúdo                     │
│  Status: Rascunho (precisa revisão)        │
│                                            │
│  Gerando embeddings em background...       │
│  ░░░░░░░░░░░░░░░░░░░░ 0/67                │
│                                            │
│  [Ir para Base Curada]                     │
└────────────────────────────────────────────┘
```

### Prompt da IA para normalização

O prompt que a IA recebe pra normalizar o PDF:

```typescript
const NORMALIZATION_PROMPT = `
Você é um curador de conteúdo pedagógico musical. 
Recebeu o texto de um material didático.

Sua tarefa é normalizar esse conteúdo em TÓPICOS e BLOCOS estruturados.

Para cada TÓPICO, forneça:
- title: título curto e descritivo
- description: descrição de 1-2 frases
- dimension: theory | technique | rhythm | repertoire | auditory | evaluation
- difficulty_level: foundation | grow | advance | master
- tags: array de palavras-chave
- estimated_minutes: tempo estimado de estudo

Para cada BLOCO dentro do tópico, forneça:
- block_type: text | exercise | tip | example
- title: título do bloco
- content: texto do conteúdo (limpo, sem formatação do PDF)
- sort_order: ordem dentro do tópico

REGRAS:
- Cada tópico deve ser uma UNIDADE de aprendizado independente
- Cada bloco deve ser ATÔMICO (uma ideia, um exercício, uma dica)
- Exercícios devem ser claramente identificados como block_type: "exercise"
- Dicas/alertas devem ser block_type: "tip"
- Exemplos musicais devem ser block_type: "example"
- Texto explicativo normal: block_type: "text"
- Preservar TODO o conteúdo pedagógico — não resumir nem cortar
- Corrigir erros de OCR se houver
- Manter termos musicais em português

Responda em JSON com a estrutura:
{
  "topics": [
    {
      "title": "...",
      "description": "...",
      "dimension": "...",
      "difficulty_level": "...",
      "tags": ["..."],
      "estimated_minutes": 15,
      "blocks": [
        {
          "block_type": "text",
          "title": "...",
          "content": "...",
          "sort_order": 1
        }
      ]
    }
  ]
}
`
```

### API de IA a usar

| Etapa | Modelo | Por quê |
|-------|--------|---------|
| Extração de texto do PDF | `pdf-parse` (lib local) | Sem custo de IA |
| Normalização em tópicos + blocos | Gemini Flash (`gemini-3-flash-preview`) | Rápido, barato, bom pra estruturação |
| Geração de embeddings | OpenAI `text-embedding-3-small` | Já usado nos 70 blocos existentes |

---

## 9. Workflow de Curadoria

### Estados

```
draft → review → approved → published
  │         │         │
  └─────────┴─────────┘
    (pode voltar pra draft a qualquer momento)
```

### Quem faz o quê

| Ação | Quem | Resultado |
|------|------|-----------|
| Criar tópico | Coordenador/N4 | Status: draft |
| Importar PDF | Coordenador/N4 | Status: draft |
| Editar conteúdo | Coordenador/N4 | Mantém status |
| Enviar pra revisão | Coordenador/N4 | Status: review |
| Aprovar | Coordenador | Status: approved |
| Publicar | Coordenador/Owner | Status: published |
| Despublicar | Coordenador/Owner | Status: draft |

### Regras

- Só tópicos `published` aparecem no Gerador de Material
- Só tópicos `published` ou `approved` podem ser vinculados a jornadas
- Tópicos com `school_id = NULL` são globais (LA Music) — escolas não editam
- Escolas podem criar tópicos privados (school_id preenchido) — visíveis só pra elas

---

## 10. Geração de Embeddings (automática)

### Quando gerar

| Evento | Ação |
|--------|------|
| Bloco criado | Gerar embedding em background |
| Bloco editado (conteúdo mudou) | Re-gerar embedding |
| Importação PDF (batch) | Gerar embeddings de todos os blocos em fila |
| Tópico criado/editado | Gerar embedding do tópico (título + descrição + tags) |

### Como gerar

```typescript
// Usar o mesmo aiService.ts que já existe
import { generateEmbedding } from '@/services/aiService'

async function generateBlockEmbedding(block: ContentBlock) {
  // Concatenar título + conteúdo pra gerar embedding
  const text = `${block.title || ''} ${block.content?.text || block.content?.html || ''}`
  const embedding = await generateEmbedding(text)
  
  // Salvar no Supabase
  await supabase
    .from('content_blocks')
    .update({ embedding })
    .eq('id', block.id)
}
```

### Rate limiting

- Batch de importação: processar 5 blocos por vez (não sobrecarregar a API)
- Indicador de progresso na UI (barra ou spinner com contagem)

---

## 11. Conexão com o Gerador de Material

### Fluxo atual do Gerador (/gerador)

A página `/gerador` já existe e faz busca semântica. O fluxo é:

1. Coordenador seleciona jornada + estação
2. Sistema busca `journey_station_topics` pra achar os tópicos da estação
3. Pra cada tópico, busca `content_blocks` ordenados por `sort_order`
4. IA (Gemini Flash) adapta o conteúdo pra o contexto da escola
5. Resultado salvo em `generated_materials` + `material_blocks`
6. Coordenador abre no Editor de Material pra finalizar

### O que falta no Gerador

| Feature | Status | O que precisa |
|---------|--------|---------------|
| Selecionar jornada | ⚠️ Parcial | Dropdown funcional |
| Selecionar estação | ⚠️ Parcial | Dropdown com estações da jornada |
| Preview dos tópicos | ❌ Falta | Mostrar quais tópicos serão incluídos |
| Gerar material | ⚠️ Parcial | Pipeline IA funcional |
| Salvar em generated_materials | ⚠️ Parcial | Funciona mas precisa ajustes |
| Abrir no Editor de Material | ⚠️ Parcial | Rota existe mas conexão pode falhar |
| Upload direto de PDF pro Gerador | ❌ Falta | Atalho: sobe PDF → gera material direto |

---

## 12. Implementação — 4 Fases

### Fase 1 — Migration + CRUD Básico (6-8h)

**Backend (Claude):**
- Aplicar migration `add_curation_fields_to_content_topics`
- Criar/atualizar RLS policies pra content_topics

**Frontend (Cascade):**
1. Expandir página `/conteudo`:
   - Listagem de tópicos com cards
   - Filtros (instrumento, dimensão, nível, status)
   - Busca por texto
   - Badges de status coloridos
2. Dialog "Novo Tópico" com formulário completo
3. Página de edição do tópico:
   - Painel de propriedades (título, dimensão, nível, status, tags)
   - Lista de blocos com drag-and-drop (reordenar)
   - Adicionar bloco (grid de tipos)
   - Editar bloco inline (TipTap pra texto)
   - Deletar bloco
4. CRUD completo via Supabase (service + hooks)
5. Atualizar status (draft → review → approved → published)

**Resultado:** Coordenador pode criar tópicos e blocos manualmente pela interface.

### Fase 2 — Importação de PDF com IA (8-10h)

**Frontend (Cascade):**
1. Dialog de importação (3 etapas: upload → revisão → confirmação)
2. Extrair texto do PDF no frontend (`pdf-parse` ou `pdfjs-dist`)
3. Chamar IA (Gemini Flash via `aiService.generateText()`) com prompt de normalização
4. UI de revisão: checkboxes, editar títulos, mover blocos
5. Salvar tópicos + blocos no Supabase em batch
6. Gerar embeddings em background com progress bar

**Resultado:** Coordenador sobe PDF → IA normaliza → revisão → salva na base curada.

### Fase 3 — Conectar com Gerador (4-6h)

**Frontend (Cascade):**
1. No Gerador (`/gerador`):
   - Dropdown de jornadas funcionando com dados reais
   - Ao selecionar jornada → mostrar estações
   - Ao selecionar estação → mostrar tópicos vinculados (com preview)
   - Botão "Gerar Material" chama pipeline IA
2. Pipeline IA:
   - Buscar blocos dos tópicos selecionados (por sort_order)
   - IA adapta/complementa conteúdo
   - Salvar em `generated_materials` + `material_blocks`
3. Botão "Abrir no Editor" → redireciona pra `/editor/:materialId`

**Resultado:** Fluxo completo Curadoria → Jornada → Geração → Edição funciona end-to-end.

### Fase 4 — Polish + Embeddings Automáticos (3-4h)

1. Embeddings gerados automaticamente ao criar/editar blocos
2. Indicador visual de "embedding pendente" nos cards
3. Busca semântica na Base Curada (além dos filtros)
4. Estatísticas: "usado em N jornadas", "N materiais gerados"
5. Atalho no Gerador: "Importar PDF e Gerar Material" (pula a Base Curada)

---

## 13. Estimativas

| Fase | Quem | Esforço | Dependência |
|------|------|---------|-------------|
| Fase 1 — CRUD | Claude (migration) + Cascade (UI) | 6-8h | Nenhuma |
| Fase 2 — Import PDF | Cascade (UI + IA) | 8-10h | Fase 1 |
| Fase 3 — Gerador | Cascade (conexão) | 4-6h | Fase 1 |
| Fase 4 — Polish | Cascade (embeddings + UX) | 3-4h | Fases 1-3 |
| **Total** | | **21-28h** | |

---

## 14. Regras para Implementação

### Obrigatório
- shadcn/ui + Phosphor Icons pra toda UI nova
- Padrão `la-journey-supabase` (service + hook + tipagem)
- TipTap pra editor rico de texto nos blocos
- Drag-and-drop com `dnd-kit` pra reordenar blocos
- Multi-tenant: content com school_id respeita RLS
- Toast com `toast.success()` (Sonner)

### Ícones Phosphor sugeridos
```tsx
import {
  Books, BookOpen, BookmarkSimple,
  FileText, FilePdf, Upload, CloudArrowUp,
  MagnifyingGlass, Funnel, Tag,
  PencilSimple, Trash, ArrowsDownUp,
  CheckCircle, Clock, Eye, Warning,
  Robot, Sparkle, Brain,
  Guitar, Piano, MicrophoneStage, Metronome,
} from '@phosphor-icons/react'
```

### Não fazer
- Não mexer nas tabelas de jornada (journey_stages, journey_stations, journey_station_topics)
- Não mudar formato dos content_blocks existentes
- Não mudar a chord_library, scale_library, notation_library
- Não mexer no editor de material ou notação

---

## 15. Critérios de Aceite

### Fase 1
- [ ] Listagem de tópicos com filtros funcionando
- [ ] Criar novo tópico via dialog
- [ ] Editar tópico (propriedades + blocos)
- [ ] Adicionar/editar/deletar blocos inline
- [ ] Reordenar blocos via drag-and-drop
- [ ] Status workflow funciona (draft → review → approved → published)
- [ ] 41 tópicos existentes aparecem na listagem

### Fase 2
- [ ] Upload de PDF funciona (drag & drop)
- [ ] IA normaliza conteúdo em tópicos + blocos
- [ ] UI de revisão mostra resultado com checkboxes
- [ ] Coordenador pode editar antes de importar
- [ ] Importar salva no Supabase com status "draft"
- [ ] Embeddings gerados em background com progress

### Fase 3
- [ ] Gerador mostra jornadas disponíveis
- [ ] Selecionar jornada → ver estações → ver tópicos
- [ ] "Gerar Material" cria material com blocos
- [ ] Material gerado abre no Editor de Material
- [ ] Fluxo end-to-end: PDF → Curadoria → Jornada → Geração → Edição → PDF

---

*PRD gerado em 22/03/2026*
*O conteúdo curado é o combustível do LA Journey. Sem ele, o motor não roda.*