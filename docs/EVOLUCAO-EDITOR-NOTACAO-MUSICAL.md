# PRD — Evolução do Editor de Notação Musical

**Projeto:** LA Journey — Editor de Notação Musical  
**Versão:** 1.0  
**Data:** 20/03/2026  
**Autor:** Claude (Arquitetura) + Alf (Produto/Pedagogia)  
**Baseado em:** Auditoria do Cascade (20/03) + Pesquisa MuseScore/Sibelius/Finale/VexFlow

---

## 1. Visão Geral

O Editor de Notação Musical do LA Journey usa VexFlow para renderizar notação na pauta. Atualmente está em ~60% de maturidade (vs. ~85% do editor de tablatura). Este plano detalha a evolução em 3 fases para atingir nível de "MuseScore simplificado" — suficiente para que coordenadores e professores criem exercícios, escalas, melodias e material de piano sem precisar de software externo.

### 1.1 Público-alvo do editor

- **Coordenador pedagógico:** Cria exercícios de teoria, escalas, intervalos
- **Professor de piano:** Precisa de grande pauta (treble + bass), pedal, dinâmicas
- **Professor de instrumento:** Cria melodias, exercícios técnicos, exemplos musicais
- **NÃO é objetivo:** Substituir MuseScore/Sibelius para composição orquestral completa

### 1.2 Princípio de design

> O editor deve seguir os **padrões de interação estabelecidos pela indústria** (MuseScore, Sibelius, Finale). Professores de música já conhecem esses padrões. Inventar uma UX diferente cria fricção desnecessária.

---

## 2. Estado Atual (Auditoria Cascade — 20/03/2026)

### 2.1 Arquivos do editor

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `NotationEditor.tsx` | ~1955 | Modal principal (estado, toolbar, interações) |
| `NotationRenderer.tsx` | ~244 | Renderizador VexFlow (beats → SVG) |
| `notationService.ts` | — | CRUD da `notation_library` |

### 2.2 O que já funciona

| Categoria | Features ✅ |
|-----------|------------|
| Input | Click na pauta com ghost tooltip, seleção de duração, modo acorde, duplo-clique remove |
| Claves | Sol (treble), Fá (bass), Dó (alto), Percussão |
| Durações | Semibreve, mínima, semínima, colcheia, semicolcheia, ponto, pausas |
| Armaduras | 7 de 15 (C, G, D, A, F, Bb, Eb) |
| Fórmulas | 4 de 16+ (4/4, 3/4, 2/4, 6/8) |
| Efeitos | Ligadura (tie), modo livre, barras manuais |
| Texto | Cifras, anotações, letras (lyrics) com drag |
| Layout | Multi-linha (4/8/12/16), scroll, zoom 50-200% |
| Playback | Tone.js (play/pause/stop), cursor animado |
| Undo/Redo | Stack de 50 estados, Ctrl+Z/Y |
| Clipboard | Copy (Ctrl+C), Paste (Ctrl+V) |

### 2.3 O que NÃO funciona / falta

| Categoria | Gaps ❌ |
|-----------|--------|
| Input | Sem teclado (A-G), sem hidden input, sem paradigma duration-first |
| Claves | Sem grande pauta (treble+bass juntos pra piano) |
| Durações | Sem fusa (32), sem duplo ponto |
| Armaduras | Faltam 8: E, B, F#, C#, Ab, Db, Gb, Cb |
| Fórmulas | Faltam 12+: 5/4, 7/4, 2/2, 3/2, 3/8, 5/8, 7/8, 9/8, 12/8, etc. |
| Beams | Colcheias/semicolcheias não agrupam automaticamente |
| Tuplets | Sem tercinas, quintinas, etc. |
| Articulações | Sem staccato, acento, tenuto, marcato, fermata |
| Dinâmicas | Sem p, mp, mf, f, ff, sfz |
| Expressão | Sem slurs, crescendo, decrescendo |
| Piano | Sem pedal marking, sem grace notes |
| Atalhos | Limitados — sem padrão MuseScore/Sibelius |
| BPM | Fixo em 120, não configurável |
| Transposição | Não existe |

---

## 3. Pesquisa — Padrões da Indústria

### 3.1 Paradigma de input (MuseScore / Sibelius / Finale)

Todos os editores profissionais usam o modelo **"duration-first, then pitch"**:

1. Professor seleciona duração (número no teclado)
2. Depois insere pitch (letra A-G no teclado OU click na pauta)
3. A nota é criada com duração + pitch simultaneamente

**MuseScore (padrão — Input by Note Name):**
- `N` → entra no modo de input
- Números 1-7 → selecionam duração (1=64ª, 2=32ª, 3=16ª, 4=colcheia, 5=semínima, 6=mínima, 7=semibreve)
- Letras A-G → inserem nota com a duração selecionada
- `.` → ponto de aumento
- `0` → pausa
- `T` → ligadura (tie)
- `Ctrl+3-9` → tuplets (3=tercina, 5=quintina, etc.)
- `↑/↓` → sobe/desce meio tom
- `Ctrl+↑/↓` → sobe/desce oitava
- `Shift+A-G` → adiciona nota ao acorde

**MuseScore 4.5 (alternativo — Input by Duration):**
- `M` → ativa modo "duration second"
- A-G ou setas → selecionam pitch primeiro
- Números 1-7 → inserem nota com duração escolhida
- Inspirado no Speedy Entry do Finale

**Sibelius:**
- `N` → modo input
- A-G → pitch (com numpad pra durações)
- `S` → slur, `H` → crescendo, `Shift+H` → decrescendo
- `Ctrl+3-9` → tuplets
- `Spacebar` → estende slur/hairpin pra próxima nota

**Decisão para LA Journey:** Implementar **duration-first** (padrão MuseScore) como modo principal. É o mais universal e o que professores de música esperam.

### 3.2 Atalhos padrão da indústria

| Ação | MuseScore | Sibelius | **LA Journey (proposta)** |
|------|-----------|----------|--------------------------|
| Entrar/sair modo input | N | N | **N** |
| Durações | 1-7 | Numpad 1-6 | **1-7** (MuseScore) |
| Notas | A-G | A-G | **A-G** |
| Ponto de aumento | . | Numpad . | **.** |
| Pausa | 0 | Numpad 0 | **0** |
| Ligadura (tie) | T | Numpad Enter | **T** |
| Sustenido | ↑ (após nota) | Numpad 8 | **Shift+↑** ou toolbar |
| Bemol | ↓ (após nota) | Numpad 9 | **Shift+↓** ou toolbar |
| Oitava acima | Ctrl+↑ | Ctrl+↑ | **Ctrl+↑** |
| Oitava abaixo | Ctrl+↓ | Ctrl+↓ | **Ctrl+↓** |
| Nota ao acorde | Shift+A-G | Shift+1-9 | **Shift+A-G** |
| Tuplet (tercina) | Ctrl+3 | Ctrl+3 | **Ctrl+3** |
| Tuplet (quintina) | Ctrl+5 | 5 (top row) | **Ctrl+5** |
| Staccato | Shift+S | — | **Shift+S** |
| Acento | Shift+V | — | **Shift+V** |
| Tenuto | Shift+N | — | **Shift+T** (N conflita) |
| Marcato | Shift+O | — | **Shift+M** |
| Slur | S | S | **S** (com nota selecionada) |
| Crescendo | < | H | **<** |
| Decrescendo | > | Shift+H | **>** |
| Diminuir duração | Q | — | **Q** |
| Aumentar duração | W | — | **W** |
| Inverter stem | X | X | **X** |
| Undo | Ctrl+Z | Ctrl+Z | **Ctrl+Z** (já existe) |
| Redo | Ctrl+Y | Ctrl+Y | **Ctrl+Y** (já existe) |
| Delete nota | Delete | Delete | **Delete / Backspace** |
| Navegar ←/→ | ←/→ | ←/→ | **←/→** |

### 3.3 VexFlow — Classes disponíveis (confirmadas por pesquisa)

A biblioteca VexFlow (v5.0.0) suporta nativamente TODAS as features planejadas:

| Classe | Função | Código de uso |
|--------|--------|---------------|
| `Beam` | Agrupamento de colcheias | `Beam.generateBeams(notes)` ou `Beam.applyAndGetBeams(voice)` |
| `Tuplet` | Quiálteras | `new Tuplet(notes, { num_notes: 3, notes_occupied: 2 })` |
| `Curve` | Slurs (ligaduras de expressão) | `new Curve(note1, note2, { cps: [{x:0,y:10},{x:0,y:10}] })` |
| `StaveHairpin` | Crescendo/Decrescendo | `new StaveHairpin({ first_note, last_note }, type)` |
| `TextDynamics` | Dinâmicas (p, f, mf, etc.) | `new TextDynamics({ text: 'mf', duration: 'q', line: 10 })` |
| `Articulation` | Staccato, acento, tenuto, etc. | `note.addModifier(new Articulation('a.'))` |
| `StaveConnector` | Grande pauta (piano) | `new StaveConnector(treble, bass).setType(StaveConnector.type.BRACE)` |
| `GraceNote` | Appoggiatura/Acciaccatura | `new GraceNote({ keys: ['d/5'], duration: '8', slash: true })` |
| `GraceNoteGroup` | Grupo de grace notes | `note.addModifier(new GraceNoteGroup([graceNote]))` |
| `Ornament` | Trinado, mordente, grupeto | `note.addModifier(new Ornament('tr'))` |
| `PedalMarking` | Pedal de piano | `new PedalMarking([note1, note2])` |
| `StaveVolta` | Casas de repetição | `stave.setVoltaType(Volta.type.BEGIN, '1.', 0)` |
| `Dot` | Ponto de aumento | `Dot.buildAndAttach([note])` |
| `Accidental` | Acidentes | `note.addModifier(new Accidental('#'))` |
| `KeySignature` | Armaduras | `stave.addKeySignature('G')` |
| `TimeSignature` | Fórmulas | `stave.addTimeSignature('6/8')` |

**Códigos de articulação VexFlow:**

| Código | Símbolo | Nome |
|--------|---------|------|
| `a.` | • | Staccato |
| `av` | ▾ | Staccatissimo |
| `a>` | > | Acento |
| `a-` | — | Tenuto |
| `a^` | ^ | Marcato |
| `a@a` | 𝄐 | Fermata (acima) |
| `a@u` | 𝄑 | Fermata (abaixo) |
| `ah` | ○ | Open note / harmônico |
| `a\|` | ∨ | Arco para cima |
| `am` | ∧ | Arco para baixo |
| `a+` | + | LH Pizzicato |
| `ao` | ○ | Snap pizzicato |

### 3.4 Grande Pauta — Complexidade técnica

A implementação da grande pauta (treble + bass para piano) com VexFlow requer um padrão específico que foi confirmado pela pesquisa:

```
┌──────────────────────────────────────────────┐
│  BRACE        Treble Stave (y = 0)           │
│  (StaveConnector)                            │
│               Bass Stave (y = ~120)          │
└──────────────────────────────────────────────┘
```

**Padrão VexFlow para grande pauta:**
1. Criar duas Staves separadas (treble em y=topY, bass em y=topY+gap)
2. Adicionar `StaveConnector` tipo BRACE entre elas
3. Criar `Voice` separada para cada stave
4. Chamar `joinVoices()` individualmente para cada voice (pra alinhar acidentes)
5. Chamar `formatToStave([voiceTreble, voiceBass], trebleStave)` — formata ambas juntas
6. Alinhar `noteStartX` de ambas as staves pro mesmo valor
7. Desenhar voices em suas respectivas staves
8. Gerar `Beam` separado por stave

**Impacto no modelo de dados:**
- Cada beat precisa de campo `staff: 'treble' | 'bass'` (ou equivalente)
- O professor precisa poder alternar entre mão direita (treble) e mão esquerda (bass)
- Atalhos: alguma tecla pra trocar de stave (ex: `Tab` ou `Alt+↑/↓`)

### 3.5 Editores web (Noteflight / Flat.io) — Lições de UX

- **Flat.io** usa paradigma "rhythm first, then pitch" (como Sibelius)
- **Noteflight** usa "pitch first, then rhythm" (como MuseScore Input by Duration)
- Ambos são 100% browser, provando que é viável ter um bom editor de notação na web
- **Flat.io reconstruiu sua engine em 2025** pra performance em Chromebooks — considerar performance em dispositivos modestos
- Ambos suportam **colaboração em tempo real** — feature futura para LA Journey
- Ambos exportam **MusicXML e MIDI** — importante pra interoperabilidade

---

## 4. Features a Portar do Editor de Tablatura

O editor de tablatura (85% completo) tem padrões de código que podem ser reaproveitados:

| Feature | Arquivo fonte | Adaptar para |
|---------|---------------|-------------|
| Hidden input para foco de teclado | `TabSvgEditor.tsx` (L684-691) | `NotationEditor.tsx` |
| Auto-expand de linhas ao navegar | `TablatureEditor.tsx` | `NotationEditor.tsx` |
| 16 fórmulas de compasso + modo livre | `TablatureEditor.tsx` (L206-235) | `NotationEditor.tsx` |
| `computeBarlines()` — barras automáticas | `TablatureEditor.tsx` (L206-235) | `NotationEditor.tsx` |
| Números de compasso acima da pauta | `TabSvgEditor.tsx` | `NotationRenderer.tsx` |
| Atalhos de teclado organizados | `TablatureEditor.tsx` (L1173-1394) | `NotationEditor.tsx` |
| Ponto de aumento duplo | `TablatureEditor.tsx` | `NotationEditor.tsx` |
| Quiálteras (3, 5, 6, 7) | `TablatureEditor.tsx` | `NotationEditor.tsx` |

---

## 5. Plano de Evolução — 3 Fases

### FASE 1 — Input Profissional + Quick Wins

**Objetivo:** Transformar a experiência de input para o padrão da indústria.  
**Estimativa:** 15 horas  
**Risco:** Baixo (não muda estrutura de dados, não precisa de migration)  
**Resultado:** Professor consegue escrever notação pelo teclado como no MuseScore.

#### 1.1 — Hidden input para captura de teclado

Criar `<input>` invisível que mantém foco para capturar teclas.  
Padrão usado em CodeMirror, Monaco Editor, e no nosso `TabSvgEditor.tsx`.

**Referência:** `TabSvgEditor.tsx` linhas 684-691.

**Comportamento:**
- O input fica posicionado absolutamente, opacity 0, tamanho 1x1
- Ao clicar em qualquer lugar do editor, o foco vai pro hidden input
- Todas as teclas são capturadas pelo onKeyDown do input
- Previne que teclas como "N" ou "A" ativem funcionalidades do browser

#### 1.2 — Input via teclado (A-G) — Paradigma Duration-First

O professor seleciona duração primeiro (toolbar ou número), depois tecla a nota.

**Comportamento:**
- Teclar A → insere nota Lá na duração selecionada, na posição do cursor
- Teclar C → insere nota Dó
- A oitava é decidida pelo contexto: se a nota anterior era C4, a próxima nota A será A3 ou A4 (a mais próxima, como no MuseScore)
- Se nenhuma nota anterior, usar oitava padrão da clave (4 para treble, 3 para bass)

**Mapeamento de teclas:**
| Tecla | Nota |
|-------|------|
| C | Dó |
| D | Ré |
| E | Mi |
| F | Fá |
| G | Sol |
| A | Lá |
| B | Si |

#### 1.3 — Atalhos de duração (1-7)

| Tecla | Duração | Símbolo |
|-------|---------|---------|
| 1 | Fusa (64th) | 𝅘𝅥𝅲 |
| 2 | Semifusa (32nd) | 𝅘𝅥𝅱 |
| 3 | Semicolcheia (16th) | 𝅘𝅥𝅯 |
| 4 | Colcheia (8th) | ♪ |
| 5 | Semínima (quarter) | ♩ |
| 6 | Mínima (half) | 𝅗𝅥 |
| 7 | Semibreve (whole) | 𝅝 |

#### 1.4 — Atalhos essenciais

| Tecla | Ação |
|-------|------|
| N | Entrar/sair do modo de input |
| 0 | Inserir pausa (com duração selecionada) |
| . | Toggle ponto de aumento |
| T | Toggle ligadura (tie) |
| ← / → | Navegar entre beats (mover cursor) |
| ↑ / ↓ | Mover nota selecionada meio tom acima/abaixo |
| Ctrl+↑ / Ctrl+↓ | Mover nota selecionada uma oitava acima/abaixo |
| Shift+A-G | Adicionar nota ao acorde (empilhar) |
| Q | Diminuir duração da nota selecionada |
| W | Aumentar duração da nota selecionada |
| X | Inverter direção do stem (up↔down) |
| Delete / Backspace | Remover nota selecionada |
| R | Repetir última nota/acorde inserido |

#### 1.5 — Expandir armaduras de clave (7 → 15)

Adicionar as 8 armaduras faltantes ao select do editor:

| Armadura | Alterações | VexFlow key |
|----------|------------|-------------|
| C major / A minor | — | `C` |
| G major / E minor | 1# | `G` |
| D major / B minor | 2# | `D` |
| A major / F# minor | 3# | `A` |
| E major / C# minor | 4# | `E` |
| B major / G# minor | 5# | `B` |
| F# major / D# minor | 6# | `F#` |
| C# major / A# minor | 7# | `C#` |
| F major / D minor | 1b | `F` |
| Bb major / G minor | 2b | `Bb` |
| Eb major / C minor | 3b | `Eb` |
| Ab major / F minor | 4b | `Ab` |
| Db major / Bb minor | 5b | `Db` |
| Gb major / Eb minor | 6b | `Gb` |
| Cb major / Ab minor | 7b | `Cb` |

#### 1.6 — Expandir fórmulas de compasso (4 → 16+)

Copiar a lista completa do editor de tablatura:

**Simples:** 2/4, 3/4, 4/4, 5/4, 6/4, 7/4  
**Alla breve:** 2/2, 3/2, 4/2  
**Compostos:** 6/8, 9/8, 12/8  
**Irregulares:** 3/8, 5/8, 7/8  
**Modo livre** (sem compasso — para escalas)

#### 1.7 — Ghost note na pauta

Ao mover o mouse sobre a pauta, mostrar uma nota fantasma (semitransparente) na posição onde a nota será inserida se o professor clicar.

**Comportamento:**
- A nota fantasma usa a duração atualmente selecionada
- Cor: accent com 30% de opacidade
- Atualiza em tempo real conforme o mouse se move
- Desaparece quando o mouse sai da área da pauta
- Mostra o nome da nota como tooltip (ex: "C4", "F#5")

---

### FASE 2 — Features Musicais

**Objetivo:** Tornar o editor útil para criação real de exercícios e material didático.  
**Estimativa:** 22 horas  
**Risco:** Médio (beams e tuplets afetam o renderer)  
**Resultado:** Professor pode criar exercícios com beams, tuplets, articulações e barras automáticas.  
**Dependências de migration:** Nenhuma

#### 2.1 — Beams automáticos

Agrupar colcheias e semicolcheias automaticamente usando `Beam.generateBeams()`.

**Regras de agrupamento:**
- 4/4: 2 colcheias por grupo (por beat)
- 3/4: 2 colcheias por grupo
- 6/8: 3 colcheias por grupo (beat composto)
- Semínimas e maiores nunca agrupam
- VexFlow tem `Beam.getDefaultBeamGroups(timeSignature)` que implementa isso

**Impacto no renderer:**
- Após criar StaveNotes, chamar `Beam.generateBeams(notes)` antes de formatar
- Guardar referências dos beams e chamar `beam.setContext(ctx).draw()` após a voice

#### 2.2 — Tuplets / Quiálteras

Suportar tercinas (3:2), quintinas (5:4), sextinas (6:4), septinas (7:4).

**UX:**
- Selecionar 3+ notas → Ctrl+3 cria tercina
- Ou: ativar modo tuplet, inserir notas, fechar tuplet
- Visual: colchete com número acima das notas (VexFlow `Tuplet`)

**Modelo de dados — adicionar ao beat:**
```typescript
interface Beat {
  // campos existentes...
  tuplet?: {
    num_notes: number    // 3, 5, 6, 7
    notes_occupied: number // 2, 4, 4, 4
    groupId: string      // pra agrupar beats do mesmo tuplet
  }
}
```

**Atalhos:**
| Tecla | Ação |
|-------|------|
| Ctrl+3 | Criar tercina com notas selecionadas |
| Ctrl+5 | Criar quintina |
| Ctrl+6 | Criar sextina |
| Ctrl+7 | Criar septina |

#### 2.3 — Articulações

Adicionar articulações nas notas usando `Articulation` modifier do VexFlow.

**Articulações a implementar (Fase 2):**
| Articulação | Código VexFlow | Atalho | Uso pedagógico |
|-------------|----------------|--------|----------------|
| Staccato | `a.` | Shift+S | Muito comum — exercícios de técnica |
| Acento | `a>` | Shift+V | Acentuação rítmica |
| Tenuto | `a-` | Shift+T | Sustentação — piano, canto |
| Marcato | `a^` | Shift+M | Ênfase forte |
| Fermata (acima) | `a@a` | Shift+F | Pausas expressivas, finais |
| Fermata (abaixo) | `a@u` | — | Selecionável via toolbar |

**Modelo de dados — adicionar ao beat:**
```typescript
interface Beat {
  // campos existentes...
  articulations?: string[]  // ex: ['a.', 'a>']
}
```

**UX:**
- Selecionar uma nota → teclar atalho → toggle articulação
- Articulações são mostradas como botões na toolbar (com toggle visual)
- Múltiplas articulações na mesma nota (ex: staccato + acento)

#### 2.4 — Barras de compasso automáticas

Portar a lógica `computeBarlines()` do editor de tablatura.

**Comportamento:**
- No modo "compasso" (metered), barras são calculadas automaticamente
- A soma das durações em cada compasso deve bater com a fórmula de compasso
- Se sobrar tempo, completar com pausas invisíveis (ou mostrar alerta)
- Números de compasso aparecem acima da primeira nota de cada compasso

**Referência:** `TablatureEditor.tsx` linhas 206-235 (`computeBarlines()`)

#### 2.5 — Duplo ponto de aumento

Estender o ponto de aumento para suportar duplo ponto (duração × 1.75).

**Modelo de dados:**
```typescript
// Mudar de boolean para número
dotted: 0 | 1 | 2  // 0=sem, 1=ponto simples (×1.5), 2=duplo ponto (×1.75)
```

#### 2.6 — BPM configurável no playback

Adicionar slider de BPM na toolbar do playback.

**Range:** 40 BPM a 220 BPM  
**Default:** 120 BPM  
**Componente:** `<Slider>` do shadcn/ui  
**Persistência:** salvar no `notation_data` do registro

#### 2.7 — Transposição

Subir ou descer todas as notas por X semitons.

**UX:**
- Botões +/- semitons na toolbar (ou dialog)
- Selecionar "Transpor" → escolher intervalo → aplicar
- Atualiza também a armadura de clave automaticamente

**Implementação:**
- Mapear cada pitch pra número MIDI
- Adicionar/subtrair semitons
- Converter de volta pra nome de nota (respeitando enharmonia da armadura)

---

### FASE 3 — Nível Profissional (Piano + Expressão)

**Objetivo:** Suportar piano com grande pauta e elementos expressivos profissionais.  
**Estimativa:** 34 horas  
**Risco:** Alto (refatoração do renderer para grande pauta)  
**Resultado:** Material de piano profissional, exercícios com dinâmicas e expressão.  
**Dependências de migration:** Possível ajuste na `notation_library` (campo staff)

#### 3.1 — Grande Pauta (Piano)

**A feature mais transformadora.** Renderizar treble + bass conectados por BRACE.

**Modelo de dados:**
```typescript
interface NotationData {
  grandStaff: boolean           // true = modo piano
  beats: Beat[]                 // beats contêm campo 'staff'
}

interface Beat {
  // campos existentes...
  staff: 'treble' | 'bass'     // em qual pauta a nota está
}
```

**UX:**
- Ao selecionar "Piano" como modo ou clave, ativar grande pauta
- Tab ou Alt+↑/↓ alterna entre treble (mão direita) e bass (mão esquerda)
- Cores diferenciadas: mão direita = rosa (accent), mão esquerda = roxo (foundation)
- Cursor mostra em qual stave está
- Click direto na stave desejada também funciona

**Renderização VexFlow:**
1. Criar `Stave` treble (y=topY) e `Stave` bass (y=topY+130)
2. `StaveConnector(treble, bass).setType(BRACE)` — chave de piano
3. `StaveConnector(treble, bass).setType(SINGLE_LEFT)` — barra vertical à esquerda
4. Formatter recebe ambas as voices, renderiza cada uma na sua stave
5. Beams separados por stave

**Esforço realista:** 10-12h (não 6h como estimado pelo Cascade, devido à complexidade do formatter e interação de click em duas staves)

#### 3.2 — Slurs (Ligaduras de expressão)

Curvas que conectam notas para tocar legato. Diferente de ties (que conectam notas da mesma altura).

**UX:**
- Selecionar nota inicial → teclar S → selecionar nota final → slur criado
- Ou: selecionar range de notas → S → slur cobre o range
- VexFlow `Curve` com control points automáticos

**Modelo de dados:**
```typescript
interface Beat {
  // campos existentes...
  slurStart?: string   // ID do slur que começa aqui
  slurEnd?: string     // ID do slur que termina aqui
}
```

#### 3.3 — Dinâmicas (p, mp, mf, f, ff, sfz)

Marcações de volume abaixo da pauta.

**UX:**
- Selecionar nota → abrir palette de dinâmicas → clicar na desejada
- Ou atalho: Ctrl+D → digitar "mf" → Enter
- VexFlow `TextDynamics` renderiza com fonte musical correta

**Dinâmicas disponíveis:**
| Símbolo | Significado |
|---------|-------------|
| ppp | Pianississimo |
| pp | Pianissimo |
| p | Piano |
| mp | Mezzo piano |
| mf | Mezzo forte |
| f | Forte |
| ff | Fortissimo |
| fff | Fortississimo |
| sfz | Sforzando |
| fp | Fortepiano |

#### 3.4 — Crescendo / Decrescendo (Hairpins)

Linhas em V abaixo da pauta indicando aumento/diminuição de volume.

**UX:**
- Selecionar nota início → < (crescendo) ou > (decrescendo)
- Spacebar estende pra próxima nota (padrão Sibelius)
- VexFlow `StaveHairpin`

#### 3.5 — Grace Notes (Apoggiaturas/Acciaccaturas)

Notas pequenas antes da nota principal, para ornamentação.

**Tipos:**
- **Acciaccatura** (grace note cortada — com barra no stem): execução rápida antes do beat
- **Appoggiatura** (sem barra): "rouba" tempo da nota principal

**UX:**
- Selecionar nota → tecla "/" (padrão MuseScore) → inserir pitch da grace note
- VexFlow `GraceNote` + `GraceNoteGroup`

#### 3.6 — Ornamentos (Trinado, Mordente, Grupeto)

Símbolos de ornamentação acima da nota.

**Ornamentos:**
| Símbolo | Nome | Código VexFlow |
|---------|------|----------------|
| tr | Trinado | `tr` |
| 𝆖 | Mordente | `mordent` |
| 𝆗 | Mordente invertido | `mordent_inverted` |
| ~ | Grupeto | `turn` |
| ~̃ | Grupeto invertido | `turn_inverted` |

#### 3.7 — Pedal Marking (Piano)

Marcação de pedal sustain para piano (Ped. .... *)

**UX:**
- Selecionar nota início do pedal → toolbar "Pedal" → selecionar nota fim
- VexFlow `PedalMarking` com estilos BRACKET ou TEXT

#### 3.8 — Volta Brackets (Casas de repetição)

Indicadores de 1ª vez, 2ª vez sobre compassos.

**UX:**
- Selecionar compasso → adicionar volta → configurar número (1., 2.)
- VexFlow `StaveVolta` com tipos BEGIN, MID, END

#### 3.9 — Exportar MIDI

Gerar arquivo MIDI a partir dos beats do editor.

**Implementação:**
- Usar biblioteca `jsmidgen` ou `midi-writer-js`
- Mapear cada beat para nota MIDI (pitch + duração + velocity)
- Respeitar BPM, fórmula de compasso, dinâmicas
- Download como arquivo .mid

---

## 6. Estimativas Consolidadas

| Fase | Itens | Esforço | Prazo | Risco |
|------|-------|---------|-------|-------|
| **Fase 1** | 1.1-1.7 (input, atalhos, armaduras, fórmulas, ghost note) | **15h** | 2-3 dias | Baixo |
| **Fase 2** | 2.1-2.7 (beams, tuplets, articulações, barras auto, transposição) | **22h** | 3-5 dias | Médio |
| **Fase 3** | 3.1-3.9 (grande pauta, slurs, dinâmicas, hairpins, grace notes, ornamentos, pedal, volta, MIDI) | **34h** | 5-7 dias | Alto |
| **Total** | **27 itens** | **~71h** | **~2 semanas** | — |

---

## 7. Migrations Necessárias

**Fase 1:** Nenhuma  
**Fase 2:** Nenhuma (tuplets e articulações vão no JSONB do `notation_data`)  
**Fase 3:** Possível adição de campo `grand_staff BOOLEAN DEFAULT false` na `notation_library`, mas pode ser gerenciado via `notation_data` JSONB sem migration.

---

## 8. Regras para Implementação (Cascade)

### 8.1 — Regras de codebase (OBRIGATÓRIAS)

- Usar `(block.content as any)?.html` — não `render_data?.content`
- Usar `toast.success()` (Sonner) — não `toast({ title })` (shadcn)
- Usar `pushSnapshot` único antes de batch operations
- `handleUpdateBlock` NÃO existe — usar `setBlocks(prev => prev.map(...))`
- Todos os componentes UI: **shadcn/ui** (Slider, Switch, Select, Button, Label, Dialog, Separator, ScrollArea, Tabs, Tooltip)
- Todos os ícones: **Phosphor Icons** (`@phosphor-icons/react`)
- **PROIBIDO:** `<select>` nativo, `<input type="range">`, `<button>` nativo, ícones Lucide

### 8.2 — Ícones Phosphor relevantes

```tsx
import {
  MusicNotes, MusicNote, MusicNotesSimple,
  Piano, Metronome, SpeakerHigh, SpeakerLow,
  Play, Pause, Stop, SkipBack, SkipForward,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ArrowsOutLineVertical, ArrowsInLineVertical,
  Keyboard, TextT, Hash, Plus, Minus,
  Timer, Gauge, Sliders, FadersHorizontal,
  Eraser, Pencil, Cursor, CursorClick,
  CircleDashed, Dot, DotsThree,
} from '@phosphor-icons/react'
```

### 8.3 — Ordem de implementação recomendada

Dentro de cada fase, implementar nesta ordem:

**Fase 1:**
1. Hidden input (1.1) — base pra tudo
2. A-G input (1.2) — feature principal
3. Atalhos de duração 1-7 (1.3) — complementa 1.2
4. Atalhos essenciais (1.4) — complementa 1.2-1.3
5. Armaduras 15 (1.5) — select simples
6. Fórmulas 16 (1.6) — select simples
7. Ghost note (1.7) — polish visual

**Fase 2:**
1. Barras automáticas (2.4) — base pra beams
2. Beams automáticos (2.1) — visual imediato
3. Articulações (2.3) — alta demanda pedagógica
4. Tuplets (2.2) — depende de beams
5. Duplo ponto (2.5) — quick win
6. BPM configurável (2.6) — quick win
7. Transposição (2.7) — feature completa

**Fase 3:**
1. Grande pauta (3.1) — refatoração maior, fazer primeiro
2. Dinâmicas (3.3) — mais simples
3. Crescendo/Decrescendo (3.4) — complementa dinâmicas
4. Slurs (3.2) — curvas
5. Grace notes (3.5) — ornamentação
6. Ornamentos (3.6) — ornamentação
7. Pedal (3.7) — piano
8. Volta (3.8) — repetições
9. Exportar MIDI (3.9) — última (depende de tudo)

---

## 9. Critérios de Aceite por Fase

### Fase 1 — Aceite
- [ ] Professor consegue escrever uma escala de Dó maior digitando: 5 C D E F G A B C
- [ ] Navegação ←/→ move entre notas, ↑/↓ altera pitch
- [ ] Ctrl+↑/↓ move oitava
- [ ] Shift+C/E/G adiciona notas ao acorde
- [ ] Todas as 15 armaduras disponíveis no select
- [ ] Todas as 16 fórmulas de compasso disponíveis
- [ ] Ghost note aparece ao mover mouse sobre a pauta
- [ ] N entra/sai do modo de input

### Fase 2 — Aceite
- [ ] Colcheias agrupam automaticamente com beams
- [ ] Selecionar 3 colcheias + Ctrl+3 → tercina com colchete
- [ ] Shift+S toggle staccato, Shift+V toggle acento
- [ ] Barras de compasso aparecem automaticamente no modo metered
- [ ] Números de compasso acima da pauta
- [ ] Slider de BPM funciona (40-220)
- [ ] Transposição sobe/desce todas as notas + armadura

### Fase 3 — Aceite
- [ ] Modo piano mostra treble + bass com BRACE
- [ ] Tab alterna entre treble e bass
- [ ] Mão direita (rosa) vs mão esquerda (roxo) — cores distintas
- [ ] Selecionar nota + "mf" → dinâmica aparece abaixo da pauta
- [ ] < e > criam hairpins entre duas notas
- [ ] S cria slur entre nota início e nota fim
- [ ] "/" insere grace note antes da nota selecionada
- [ ] Pedal marking (Ped. ... *) funciona
- [ ] Exportar .mid com todas as notas, durações e dinâmicas

---

## 10. Não Implementar (Fora de escopo)

| Feature | Motivo |
|---------|--------|
| Múltiplas vozes por stave | Complexidade de UX desproporcional |
| Partes/instrumentos orquestrais | Escopo de composição, não material didático |
| Input MIDI via dispositivo | Web MIDI API é instável e exige hardware |
| Plugins/extensões | Over-engineering |
| Importar MusicXML | Complexo, baixa prioridade |
| Engraving profissional (ajuste fino de posição) | MuseScore faz melhor |
| Sincronização com áudio | Fora do escopo do editor de notação |

---

*PRD gerado por Claude em 20/03/2026 — baseado em pesquisa de MuseScore 4.6, Sibelius, Finale, Noteflight, Flat.io e VexFlow 5.0.0.*