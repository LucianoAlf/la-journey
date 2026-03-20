# Auditoria do Notation Editor — LA Journey

**Data:** 2025-01-XX  
**Arquivos auditados:**
- `src/components/music/NotationEditor.tsx` (3106 linhas)
- `src/components/music/NotationRenderer.tsx` (434 linhas)
- `src/components/music/TablatureEditor.tsx` (2086 linhas) — referência de paridade

---

## PARTE 1A — Auditoria de Features (Fases 1-3)

### Fase 1 — Fundamentos ✅ COMPLETA

| Feature | Status | Verificação |
|---------|--------|-------------|
| Input por teclado (A-G) | ✅ | `handleKeyDown` linhas 1799-1811 |
| Oitava inteligente | ✅ | `getSmartOctave()` linhas 343-367 |
| Durações 1-7 | ✅ | linhas 1708-1714 |
| Navegação ←→ | ✅ | linhas 1716-1728 |
| Seleção de nota | ✅ | `selectedElement` state + overlay click |
| Delete/Backspace | ✅ | linhas 1738-1741 |
| Pausa (0) | ✅ | linhas 1779-1782 |
| Ponto de aumento | ✅ | linhas 1743-1757 |
| Ligadura (T) | ✅ | linhas 1772-1777 |
| Acordes (Shift+A-G) | ✅ | linhas 1802-1804 |
| Undo/Redo (Ctrl+Z/Y) | ✅ | linhas 1482-1496 |
| Copy/Paste (Ctrl+C/V) | ✅ | linhas 1582-1597 |
| Hidden input pattern | ✅ | `hiddenInputRef` + `focusHiddenInput()` |
| Badge "⌨ INPUT" | ✅ | Toolbar visual indicator |

### Fase 2 — Features Musicais ✅ COMPLETA

| Feature | Status | Verificação |
|---------|--------|-------------|
| Beams automáticos | ✅ | NotationRenderer linhas 198-211 |
| Tuplets (Ctrl+3/5/6/7) | ✅ | linhas 1621-1635, renderer 213-234 |
| Articulações (Shift+S/V/E/M/F) | ✅ | linhas 1813-1828, renderer 133-139 |
| Barlines automáticas | ✅ | `computeAutoBarlines()` linhas 162-177 |
| Números de compasso | ✅ | `computeMeasureNumbers()` linhas 179-198 |
| Duplo ponto | ✅ | `doubleDotted` no Beat, ciclo com `.` |
| BPM configurável | ✅ | Slider na toolbar, `bpm` state |
| Transposição (↑↓) | ✅ | `applyTransposition()` linhas 1277-1288 |
| Playback Tone.js | ✅ | `playAll()` linhas 1516-1566 |
| Zoom | ✅ | `zoomIn/zoomOut/zoomReset` linhas 1577-1580 |

### Fase 3 — Expressividade ✅ COMPLETA

| Feature | Status | Verificação |
|---------|--------|-------------|
| Dinâmicas (Ctrl+D) | ✅ | `setDynamic()` linha 1339, popover |
| Hairpins (<, >) | ✅ | `toggleHairpin()` linhas 1347-1365, renderer 254-271 |
| Grace notes (/) | ✅ | `addGraceNote()` linhas 1367-1382, renderer 141-161 |
| Ornamentos | ✅ | `toggleOrnament()` linhas 1384-1391, renderer 163-171 |
| Slurs (Ctrl+L) | ✅ | `toggleSlur()` linhas 1393-1411, renderer 273-289 |
| Volta brackets (Ctrl+1/2) | ✅ | `toggleVolta()` linhas 1413-1435, renderer 291-310 |
| Pedal marking (Ctrl+P) | ✅ | `togglePedal()` linhas 1437-1455, renderer 312-326 |
| Export MIDI | ✅ | `exportMidi()` linhas 1905-1963 |
| Persistência Fase 3 | ✅ | `beatsToSaveFormat()` linhas 240-251, `loadBeatsFromData()` linhas 284-295 |

---

## PARTE 1B — Paridade com TablatureEditor

### Micro-interações Comparadas

| Micro-interação | TablatureEditor | NotationEditor | Gap? |
|-----------------|-----------------|----------------|------|
| **Ghost note visual** | ✅ `hoverCell` com preview | ❌ Só `hoverPos` sem preview | 🔴 ALTA |
| **Auto-advance após input** | ✅ `setSelectedCol(selectedCol + 1)` | ❌ Não avança cursor | 🔴 ALTA |
| **Backspace inteligente** | ✅ Limpa + retrocede + shrink | ⚠️ Só deleta, não retrocede | 🔴 ALTA |
| **Double-click remove** | ✅ `handleCellDoubleClick` | ✅ `handleOverlayDblClick` | ✅ OK |
| **Substituição direta** | ✅ Digitar sobrescreve | ❌ Sempre insere nova | 🔴 ALTA |
| **Auto-expand linhas** | ✅ `expandToNextFullLine()` | ❌ Não expande | 🟡 MÉDIA |
| **Cursor visual pulsante** | ✅ CSS animation | ❌ Só highlight estático | 🟡 MÉDIA |
| **Feedback seleção** | ✅ Border + background | ⚠️ Só background | 🟡 MÉDIA |
| **Popover de acorde** | ✅ Integração chord_library | ❌ Não aplicável | N/A |
| **Tecla `.` cicla ponto** | ✅ 0→1→2→0 | ✅ 0→1→2→0 | ✅ OK |
| **Navegação ←→** | ✅ | ✅ | ✅ OK |
| **Navegação ↑↓** | ✅ Entre cordas | ✅ Semitom | ✅ OK (diferente) |
| **Hidden input focus** | ✅ | ✅ | ✅ OK |
| **Escape cancela modo** | ✅ | ✅ | ✅ OK |

---

## GAPS IDENTIFICADOS

### 🔴 Prioridade ALTA (5 itens)

#### 1. Ghost Note Visual
**Problema:** Ao mover o mouse sobre a pauta, não há preview visual da nota que será inserida.  
**TablatureEditor:** Mostra célula com valor fantasma (opacity 0.4).  
**Solução:** Renderizar nota fantasma no overlay com `hoverPos` + `currentDuration`.

#### 2. Auto-Advance após Input
**Problema:** Após inserir nota com A-G, o cursor não avança automaticamente.  
**TablatureEditor:** `setSelectedCol(selectedCol + 1)` após cada input.  
**Solução:** Em `insertNoteAtCursor`, após inserir, avançar `selectedElement.beatIdx`.

#### 3. Backspace Inteligente
**Problema:** Backspace só deleta a nota, não retrocede o cursor nem contrai o grid.  
**TablatureEditor:** Limpa célula atual, retrocede cursor, e shrink colunas vazias.  
**Solução:** Implementar lógica similar em `handleKeyDown` para Backspace.

#### 4. Double-Click Consistente
**Status:** ✅ Já implementado em `handleOverlayDblClick`.  
**Verificação:** Funciona corretamente.

#### 5. Substituição Direta
**Problema:** Digitar A-G sempre insere nova nota após a selecionada, não substitui.  
**TablatureEditor:** Digitar número sobrescreve o valor da célula selecionada.  
**Solução:** Se `isKeyboardMode` e há nota selecionada, substituir ao invés de inserir.

### 🟡 Prioridade MÉDIA (3 itens)

#### 6. Auto-Expand Linhas
**Problema:** Ao chegar no final, não expande automaticamente.  
**TablatureEditor:** `expandToNextFullLine()` ao pressionar → no final.  
**Solução:** Implementar expansão automática quando cursor atinge `beats.length - 1`.

#### 7. Cursor Visual Pulsante
**Problema:** Nota selecionada tem highlight estático, sem animação.  
**TablatureEditor:** CSS animation `pulse` no cursor.  
**Solução:** Adicionar `@keyframes pulse` e aplicar na nota selecionada.

#### 8. Feedback de Seleção Melhorado
**Problema:** Seleção usa só background, sem border distintivo.  
**TablatureEditor:** Border + background + shadow.  
**Solução:** Adicionar border e box-shadow na nota selecionada.

### 🟢 Prioridade BAIXA (1 item)

#### 9. Chord Popover Integration
**Problema:** NotationEditor não tem integração com chord_library.  
**Nota:** Não é prioridade para notação tradicional (foco em cifras/annotations).  
**Status:** Documentado para futuro.

---

## RESUMO EXECUTIVO

| Categoria | Total | Implementado | Gap |
|-----------|-------|--------------|-----|
| Fase 1 | 14 | 14 | 0 |
| Fase 2 | 10 | 10 | 0 |
| Fase 3 | 9 | 9 | 0 |
| **Features** | **33** | **33** | **0** |
| Micro-interações | 10 | 5 | 5 |

### Ações Necessárias

1. **🔴 ALTA:** Implementar ghost note visual
2. **🔴 ALTA:** Implementar auto-advance após input
3. **🔴 ALTA:** Implementar backspace inteligente
4. **🔴 ALTA:** Implementar substituição direta (ao invés de inserção)
5. **🟡 MÉDIA:** Implementar auto-expand linhas
6. **🟡 MÉDIA:** Adicionar cursor visual pulsante
7. **🟡 MÉDIA:** Melhorar feedback de seleção

---

## PRÓXIMOS PASSOS

1. Implementar gaps 🔴 ALTA (4 itens)
2. Implementar gaps 🟡 MÉDIA (3 itens)
3. Testar no Chrome DevTools (localhost:3000)
4. Verificar `tsc --noEmit` sem erros
5. Atualizar memória com status final
