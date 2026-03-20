# Auditoria Completa: Editores Musicais do LA Journey

**Data:** 20/03/2026  
**Auditor:** Cascade (AI)  
**Versão:** 1.0

---

## Sumário Executivo

Este relatório apresenta uma análise detalhada dos dois editores musicais do LA Journey:
1. **Editor de Notação Musical** — baseado em VexFlow
2. **Editor de Tablatura** — baseado em SVG customizado + AlphaTab (preview)

O objetivo é identificar o estado atual, limitações, e criar um plano de evolução para tornar o editor de notação mais robusto, inspirado nas features já implementadas no editor de tablatura.

---

## 1. Editor de Notação Musical

### 1.1 Arquivos Envolvidos

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `src/components/music/NotationEditor.tsx` | ~1955 | Modal principal do editor |
| `src/components/music/NotationRenderer.tsx` | ~244 | Renderizador VexFlow |
| `src/services/notationService.ts` | — | CRUD da `notation_library` |

### 1.2 Inventário de Features

#### Input de Notas
| Feature | Status | Observações |
|---------|--------|-------------|
| Click na pauta para posicionar nota | ✅ Funciona | Com ghost tooltip mostrando nota |
| Seleção de duração ANTES de clicar | ✅ Funciona | Toolbar com durações |
| Modo step-entry via teclado (A-G) | ❌ Não existe | Seria muito útil |
| Modo acorde (empilhar notas) | ✅ Funciona | Botão "↕ Ac" na toolbar |
| Duplo-clique para remover nota | ✅ Funciona | Remove nota mais próxima |
| Seleção de nota existente | ✅ Funciona | Click seleciona, setas navegam |
| Mover pitch com ↑/↓ | ✅ Funciona | Quando nota selecionada |

#### Claves
| Feature | Status | Observações |
|---------|--------|-------------|
| Clave de Sol (treble) | ✅ Funciona | Padrão |
| Clave de Fá (bass) | ✅ Funciona | Range E2-E4 |
| Clave de Dó (alto) | ✅ Funciona | Range D3-D5 |
| Percussão | ✅ Funciona | Noteheads X para pratos |
| Grande pauta (piano) | ❌ Não existe | Treble + Bass juntos |

#### Durações
| Feature | Status | Observações |
|---------|--------|-------------|
| Semibreve (w) | ✅ Funciona | |
| Mínima (h) | ✅ Funciona | |
| Semínima (q) | ✅ Funciona | Padrão |
| Colcheia (8) | ✅ Funciona | |
| Semicolcheia (16) | ✅ Funciona | |
| Fusa (32) | ❌ Não existe | |
| Semifusa (64) | ❌ Não existe | |
| Ponto de aumento | ✅ Funciona | Toggle na toolbar |
| Pausas | ✅ Funciona | Toggle "🔇" na toolbar |

#### Armaduras e Fórmulas
| Feature | Status | Observações |
|---------|--------|-------------|
| Armaduras de clave | ⚠️ Parcial | Só 7: C, G, D, A, F, Bb, Eb |
| Fórmulas de compasso | ⚠️ Parcial | Só 4: 4/4, 3/4, 2/4, 6/8 |
| Modo livre (sem compasso) | ✅ Funciona | Para escalas |
| Barras de compasso manuais | ✅ Funciona | Botão "|" no modo livre |

#### Articulações e Efeitos
| Feature | Status | Observações |
|---------|--------|-------------|
| Ligadura (tie) | ✅ Funciona | Modo "⌒ Lig" |
| Ligadura de expressão (slur) | ❌ Não existe | |
| Staccato | ❌ Não existe | |
| Acentos | ❌ Não existe | |
| Dinâmicas (p, mf, f) | ❌ Não existe | |
| Crescendo/decrescendo | ❌ Não existe | |

#### Cifras e Texto
| Feature | Status | Observações |
|---------|--------|-------------|
| Cifras acima da pauta | ✅ Funciona | Modo "A7" + popup |
| Anotações/texto livre | ✅ Funciona | Modo "📝" + popup |
| Letras abaixo da pauta | ✅ Funciona | Modo "🎤" com navegação |
| Drag para reposicionar | ✅ Funciona | Cifras, anotações, letras |

#### Multi-linha e Layout
| Feature | Status | Observações |
|---------|--------|-------------|
| Múltiplas linhas | ✅ Funciona | 4, 8, 12, 16 notas/linha |
| Scroll vertical | ✅ Funciona | maxHeight: 420px |
| Zoom | ✅ Funciona | 50% a 200% |
| Largura responsiva | ✅ Funciona | ResizeObserver |

#### Playback
| Feature | Status | Observações |
|---------|--------|-------------|
| Reprodução MIDI (Tone.js) | ✅ Funciona | Play/Pause/Stop |
| Cursor animado | ✅ Funciona | Highlight rosa |
| Controle de BPM | ❌ Fixo 120 | Não configurável |

#### Undo/Redo e Clipboard
| Feature | Status | Observações |
|---------|--------|-------------|
| Undo (Ctrl+Z) | ✅ Funciona | Stack de 50 estados |
| Redo (Ctrl+Y/Ctrl+Shift+Z) | ✅ Funciona | |
| Copy (Ctrl+C) | ✅ Funciona | Copia beat selecionado |
| Paste (Ctrl+V) | ✅ Funciona | Cola após seleção |

### 1.3 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                    NotationEditor.tsx                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  beats: Beat[]                                       │    │
│  │  { pitches, duration, tie, isRest, dotted,          │    │
│  │    notehead, barAfter, cifra, annotation, lyric }   │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  lineBeatsToStaveData() → NotationData              │    │
│  │  { type: 'staff', staves: [...], width, height }    │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  NotationRenderer.tsx                                │    │
│  │  VexFlow: Stave → StaveNote → Voice → Formatter     │    │
│  │  Renderiza SVG                                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ onSave()
┌─────────────────────────────────────────────────────────────┐
│  Supabase: notation_library                                  │
│  { id, name, category, clef, key_signature, time_signature, │
│    notation_data: { beats: [...] }, tags[], difficulty }    │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Problemas e Limitações

#### Bugs Conhecidos
1. **Nenhum bug crítico identificado** — o editor está funcional

#### Features Faltando (Críticas)
1. **Input via teclado (A-G)** — essencial para produtividade
2. **Beams automáticos** — colcheias/semicolcheias não agrupam
3. **Grande pauta (piano)** — treble + bass juntos
4. **Mais armaduras** — faltam 8 das 15 armaduras
5. **Mais fórmulas de compasso** — faltam 5/4, 7/8, 9/8, 12/8, etc.

#### Problemas de UX
1. **Sem ghost preview da nota** — só mostra tooltip, não a nota fantasma na pauta
2. **Sem snap to grid** — posicionamento livre pode gerar notas fora da pauta
3. **Sem feedback visual de duração** — difícil saber qual duração está ativa

---

## 2. Editor de Tablatura

### 2.1 Arquivos Envolvidos

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `src/components/music/TablatureEditor.tsx` | ~2086 | Modal principal do editor |
| `src/components/music/TabSvgEditor.tsx` | ~596 | Canvas SVG interativo |
| `src/components/music/AlphaTabViewer.tsx` | — | Preview AlphaTab |
| `src/components/music/ChordEditor.tsx` | — | Diagramador de acordes |

### 2.2 Inventário de Features

#### Input de Notas
| Feature | Status | Observações |
|---------|--------|-------------|
| Click na célula | ✅ Funciona | Seleciona célula |
| Digitação direta (0-9) | ✅ Funciona | Insere traste, auto-avança |
| Duplo-clique para limpar | ✅ Funciona | Remove valor da célula |
| Navegação com setas | ✅ Funciona | ↑↓←→ navegam o grid |
| Auto-expand de linhas | ✅ Funciona | Expande ao chegar no fim |
| Backspace inteligente | ✅ Funciona | Limpa e retrai grid |

#### Instrumentos
| Feature | Status | Observações |
|---------|--------|-------------|
| Violão/Guitarra (6 cordas) | ✅ Funciona | Padrão |
| Guitarra 7 cordas | ✅ Funciona | |
| Baixo 4 cordas | ✅ Funciona | |
| Baixo 5 cordas | ✅ Funciona | |
| Baixo 6 cordas | ✅ Funciona | |
| Ukulele | ✅ Funciona | |

#### Durações
| Feature | Status | Observações |
|---------|--------|-------------|
| Semibreve a Semifusa | ✅ Funciona | 7 durações (w, h, q, 8, 16, 32, 64) |
| Ponto de aumento | ✅ Funciona | Tecla "." cicla 0→1→2 |
| Duplo ponto | ✅ Funciona | |
| Quiálteras (3, 5, 6, 7) | ✅ Funciona | Tecla "T" cicla |

#### Fórmulas de Compasso
| Feature | Status | Observações |
|---------|--------|-------------|
| Simples (2/4, 3/4, 4/4, 5/4, 6/4, 7/4) | ✅ Funciona | |
| Alla breve (2/2, 3/2, 4/2) | ✅ Funciona | |
| Compostos (6/8, 9/8, 12/8) | ✅ Funciona | |
| Irregulares (3/8, 5/8, 7/8) | ✅ Funciona | |
| Modo livre | ✅ Funciona | Sem barras de compasso |
| Barras automáticas | ✅ Funciona | Calculadas por `computeBarlines()` |
| Números de compasso | ✅ Funciona | Exibidos no topo |

#### Articulações
| Feature | Status | Observações |
|---------|--------|-------------|
| Ligadura (tie/hammer-on) | ✅ Funciona | Tecla "L" toggle |
| Palhetada down (П) | ✅ Funciona | Tecla "D" toggle |
| Palhetada up (V) | ✅ Funciona | Tecla "U" toggle |

#### Acordes
| Feature | Status | Observações |
|---------|--------|-------------|
| Cifra acima do beat | ✅ Funciona | Tecla "C" abre popover |
| Busca no banco (chord_library) | ✅ Funciona | Debounce 300ms |
| Múltiplas posições | ✅ Funciona | Navegação ←→ |
| Aplicar notas ao grid | ✅ Funciona | Checkbox no popover |
| Diagrama de acorde (preview) | ✅ Funciona | ChordDiagram |
| Criar/editar acorde | ✅ Funciona | ChordEditor dialog |

#### Preview
| Feature | Status | Observações |
|---------|--------|-------------|
| AlphaTab preview | ✅ Funciona | Renderiza partitura + tab |
| Geração de alphaTex | ✅ Funciona | `gridToAlphaTex()` |

### 2.3 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                   TablatureEditor.tsx                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  grid: TabCell[][] (N cordas × M colunas)           │    │
│  │  durations: BeatDuration[]                           │    │
│  │  dots: DotType[]                                     │    │
│  │  pickings: PickingDirection[]                        │    │
│  │  tuplets: TupletValue[]                              │    │
│  │  ties: Set<string>                                   │    │
│  │  chordNames: (string | null)[]                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│              ┌────────────┴────────────┐                    │
│              ▼                         ▼                    │
│  ┌───────────────────┐    ┌───────────────────────────┐    │
│  │  TabSvgEditor     │    │  gridToAlphaTex()         │    │
│  │  SVG customizado  │    │  → AlphaTabViewer         │    │
│  └───────────────────┘    └───────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ onSave()
┌─────────────────────────────────────────────────────────────┐
│  Callback: retorna TablatureData                             │
│  { instrument, grid, columns, durations, timeSignature,     │
│    ties, dots, pickings, tuplets, chordNames }              │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Pontos Fortes do Editor de Tablatura

1. **Input via teclado fluido** — números diretos, auto-avanço, concatenação inteligente
2. **Auto-expand** — grid cresce automaticamente ao navegar
3. **Atalhos de teclado ricos** — D/U (palhetada), L (ligadura), T (tuplet), C (acorde), . (ponto)
4. **Fórmulas de compasso completas** — 16 opções + modo livre
5. **Barras automáticas** — calculadas em tempo real
6. **Integração com chord_library** — busca, preview, aplicação de notas
7. **Preview profissional** — AlphaTab renderiza partitura real

---

## 3. Análise Cruzada: Tablatura → Notação

### Features para Portar

| Feature no Tablature | Existe no Notation? | Viável portar? | Prioridade | Esforço |
|---------------------|---------------------|----------------|------------|---------|
| Input via teclado (A-G) | ❌ Não | ✅ Sim | 🔴 Alta | 4h |
| Auto-expand linhas | ❌ Não | ✅ Sim | 🟡 Média | 2h |
| Fórmulas de compasso (16) | ⚠️ Parcial (4) | ✅ Sim | 🔴 Alta | 2h |
| Ponto de aumento (duplo) | ⚠️ Parcial (simples) | ✅ Sim | 🟡 Média | 1h |
| Ligadura (tie) | ✅ Existe | — | — | — |
| Quiáltera (tuplet) | ❌ Não | ✅ Sim | 🟡 Média | 4h |
| Palhetada/articulação | ❌ Não | ⚠️ Parcial | 🟢 Baixa | 3h |
| AlphaTab preview | ❌ Não | ❌ Não faz sentido | — | — |
| Popover de acorde | ✅ Existe (cifra) | — | — | — |
| Atalhos de teclado | ⚠️ Parcial | ✅ Sim | 🔴 Alta | 3h |
| Hidden input (foco) | ❌ Não | ✅ Sim | 🔴 Alta | 2h |
| Barras automáticas | ⚠️ Parcial | ✅ Sim | 🟡 Média | 2h |
| Números de compasso | ❌ Não | ✅ Sim | 🟢 Baixa | 2h |

### Padrões de Código a Replicar

1. **Hidden input para captura de teclado** (`TabSvgEditor.tsx:684-691`)
   - Permite input fluido sem perder foco
   - Padrão CodeMirror/Monaco

2. **Estrutura de dados por coluna** (`TablatureEditor.tsx:283-303`)
   - Arrays paralelos: `durations[]`, `dots[]`, `tuplets[]`, `pickings[]`
   - Facilita operações por beat

3. **Cálculo de barlines** (`TablatureEditor.tsx:206-235`)
   - Função pura `computeBarlines()` baseada em acumulador de beats
   - Reutilizável para notação

4. **Atalhos de teclado no handler** (`TablatureEditor.tsx:1173-1394`)
   - Switch/case organizado por tecla
   - Cada tecla tem ação clara

---

## 4. Comparação com MuseScore/Sibelius

### O que eles fazem que NÃO temos

| Feature | MuseScore | Sibelius | LA Journey | Realista implementar? |
|---------|-----------|----------|------------|----------------------|
| Input MIDI | ✅ | ✅ | ❌ | ⚠️ Complexo (Web MIDI API) |
| Beams automáticos | ✅ | ✅ | ❌ | ✅ VexFlow suporta |
| Vozes múltiplas | ✅ | ✅ | ❌ | ⚠️ Complexo |
| Transposição | ✅ | ✅ | ❌ | ✅ Fácil |
| Partes (instrumentos) | ✅ | ✅ | ❌ | ❌ Over-engineering |
| Exportar MusicXML | ✅ | ✅ | ❌ | ⚠️ Médio |
| Exportar MIDI | ✅ | ✅ | ❌ | ✅ Tone.js pode gerar |
| Impressão profissional | ✅ | ✅ | ⚠️ | ✅ VexFlow renderiza bem |
| Plugins/extensões | ✅ | ✅ | ❌ | ❌ Over-engineering |

### O que é realista para browser com VexFlow

1. ✅ **Beams automáticos** — VexFlow tem `Beam.generateBeams()`
2. ✅ **Tuplets visuais** — VexFlow tem `Tuplet` class
3. ✅ **Slurs (ligaduras de expressão)** — VexFlow tem `Curve` class
4. ✅ **Articulações** — VexFlow tem `Articulation` modifier
5. ✅ **Dinâmicas** — VexFlow tem `TextDynamics`
6. ✅ **Grande pauta** — VexFlow suporta `StaveConnector`
7. ⚠️ **Vozes múltiplas** — VexFlow suporta, mas UX é complexa

### O que NÃO vale a pena

1. ❌ **Partes/instrumentos múltiplos** — escopo de orquestração
2. ❌ **Plugins** — complexidade desnecessária
3. ❌ **Edição de partituras completas** — foco é material didático
4. ❌ **Sincronização com áudio** — fora do escopo

---

## 5. Plano de Evolução em Fases

### Fase 1 — Quick Wins (1-2 dias)

**Objetivo:** Melhorar UX imediata sem reestruturação

| Item | Descrição | Esforço | Risco |
|------|-----------|---------|-------|
| 1.1 | Adicionar hidden input para captura de teclado | 2h | Baixo |
| 1.2 | Input via teclado: A-G para notas | 3h | Baixo |
| 1.3 | Atalhos: 1-5 para durações (w, h, q, 8, 16) | 1h | Baixo |
| 1.4 | Atalhos: R para pausa, . para ponto | 1h | Baixo |
| 1.5 | Expandir fórmulas de compasso (copiar de tablatura) | 2h | Baixo |
| 1.6 | Expandir armaduras (todas as 15) | 1h | Baixo |

**Dependências:** Nenhuma migration necessária

### Fase 2 — Features Musicais (3-5 dias)

**Objetivo:** Tornar o editor útil para professor criar exercícios

| Item | Descrição | Esforço | Risco |
|------|-----------|---------|-------|
| 2.1 | Beams automáticos (VexFlow `Beam.generateBeams()`) | 4h | Médio |
| 2.2 | Tuplets/quiálteras (tercinas, quintinas) | 4h | Médio |
| 2.3 | Duplo ponto de aumento | 1h | Baixo |
| 2.4 | Barras de compasso automáticas (copiar lógica da tablatura) | 3h | Baixo |
| 2.5 | Números de compasso no topo | 2h | Baixo |
| 2.6 | Ghost preview da nota (nota fantasma antes de clicar) | 3h | Médio |
| 2.7 | BPM configurável no playback | 1h | Baixo |

**Dependências:** Nenhuma migration necessária

### Fase 3 — Nível Profissional (5-7 dias)

**Objetivo:** Aproximar do MuseScore simplificado

| Item | Descrição | Esforço | Risco |
|------|-----------|---------|-------|
| 3.1 | Grande pauta (treble + bass para piano) | 6h | Alto |
| 3.2 | Slurs/ligaduras de expressão | 4h | Médio |
| 3.3 | Articulações (staccato, acento, tenuto) | 4h | Médio |
| 3.4 | Dinâmicas (p, mp, mf, f, ff) | 3h | Médio |
| 3.5 | Crescendo/decrescendo (hairpins) | 4h | Médio |
| 3.6 | Transposição automática | 3h | Baixo |
| 3.7 | Exportar MIDI | 4h | Médio |

**Dependências:** 
- 3.1 pode precisar de ajustes no `NotationRenderer.tsx`
- 3.7 pode usar biblioteca externa (jsmidgen ou similar)

---

## 6. Recomendação de Arquitetura

### Manter VexFlow

**Razões:**
1. Biblioteca madura e bem documentada
2. Já está integrada e funcionando
3. Suporta todas as features planejadas
4. Renderiza SVG de alta qualidade
5. Comunidade ativa

### Não migrar para AlphaTab (para notação)

**Razões:**
1. AlphaTab é focado em tablatura/Guitar Pro
2. VexFlow é mais flexível para notação pura
3. Custo de migração alto sem benefício claro

### Sugestões de Refatoração

1. **Extrair lógica de beats para hook**
   ```typescript
   // useNotationBeats.ts
   export function useNotationBeats(initialBeats: Beat[]) {
     // Estado, undo/redo, manipulação
   }
   ```

2. **Criar componente de toolbar reutilizável**
   ```typescript
   // NotationToolbar.tsx
   // Extrair da linha 1222-1340 do NotationEditor.tsx
   ```

3. **Unificar estrutura de dados com tablatura**
   ```typescript
   // Usar arrays paralelos como na tablatura
   interface NotationState {
     pitches: PitchData[][]  // por beat
     durations: Duration[]
     dots: DotType[]
     tuplets: TupletValue[]
     ties: Set<string>
     // ...
   }
   ```

---

## 7. Conclusão

### Estado Atual

| Editor | Maturidade | Usabilidade | Completude |
|--------|------------|-------------|------------|
| Notação | 🟡 Média | 🟡 Média | 🟡 60% |
| Tablatura | 🟢 Alta | 🟢 Alta | 🟢 85% |

### Prioridades Recomendadas

1. **Imediato:** Fase 1 (Quick Wins) — melhora UX sem risco
2. **Curto prazo:** Fase 2.1-2.2 (Beams + Tuplets) — features mais pedidas
3. **Médio prazo:** Fase 3.1 (Grande pauta) — essencial para piano

### Estimativa Total

| Fase | Esforço | Prazo |
|------|---------|-------|
| Fase 1 | 10h | 1-2 dias |
| Fase 2 | 18h | 3-5 dias |
| Fase 3 | 28h | 5-7 dias |
| **Total** | **56h** | **~2 semanas** |

---

*Relatório gerado por Cascade em 20/03/2026*
