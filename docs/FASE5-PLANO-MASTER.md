# FASE 5 — Expansão do Repertório: Plano Master Atualizado

> Última atualização: 14/03/2026
> Responsáveis: Alf (decisão) · Claude (backend/banco) · Cascade (frontend/UI)

---

## Status Geral

| Fase | Nome | Status | Progresso |
|------|------|--------|-----------|
| A | Songsterr — Importação de Metadados | COMPLETA | 100% |
| B | Editor de Cifra do Zero | COMPLETA | 100% |
| A+ | Songsterr — Importação de Conteúdo (Acordes + Cifra) | COMPLETA | 95% |
| E1 | Transposição de Tonalidade | COMPLETA | 100% |
| E2 | Parser ChordPro e Integração | COMPLETA | 100% |
| C | Music AI / Backing Tracks | PENDENTE | 0% |
| E3 | AlphaTab — Renderizador de Tablaturas | PENDENTE | 0% |
| E4 | Enriquecer Biblioteca de Acordes | PENDENTE | 0% |
| D | Consolidação e Busca Unificada | PENDENTE | 0% |

---

## FASE A — Songsterr: Importação de Metadados (COMPLETA)

### O que foi feito

- A1: Migration — colunas bpm, capo, time_signature, songsterr_id (unique), sections (jsonb)
- A2: Migration — tabela backing_tracks + RLS + bucket audio-tracks
- A3: Edge Function songsterr-search — proxy busca, categoriza instrumentos
- A3b: Edge Function songsterr-import — busca detalhes via /api/song/{songId}
- A4: Frontend — searchSongsterr(), importFromSongsterr(), saveSongsterrToRepertoire()
- A5: Frontend — SongsterrImportModal.tsx — 3 etapas (busca, resultados, preview), cor laranja
- A6: Frontend — Botão no Repertorio.tsx + badges + filtro + KPIs
- A7: Frontend — database.types.ts regenerado

### Limitação conhecida
A importação traz APENAS metadados (título, artista, instrumentos, dificuldade). NÃO traz cifra com acordes+letra, tablatura ou conteúdo ChordPro. Músicas importadas ficam "vazias" no preview. Corrigido na Fase A+.

---

## FASE B — Editor de Cifra do Zero (COMPLETA)

### O que foi feito

- B1: CifraEditor.tsx — 3 modos (Editar/Preview/Split), toolbar completa
- B2: Preview em tempo real com syntax highlighting (seções, acordes, tabs)
- B3: Toolbar com inserir seção (9 opções), acorde (6 categorias), tab, Undo/Redo, Limpar
- B4: RepertoireModal.tsx reformulado com abas Dados/Cifra (900px na aba Cifra)
- B5: Parser de cifra colada (parsePastedCifra), auto-detecção de acordes
- B6: Mini-diagramas violão (ChordDiagram) + teclado (PianoKeyboard) em tempo real
- B7: Toggles Violão/Teclado com contadores, hook useUndoRedo (50 estados)

---

## FASE A+ — Songsterr: Importação de Conteúdo Real (COMPLETA — 95%)

Objetivo: Fazer a importação do Songsterr trazer cifra+acordes+letra, não só metadados.

### Descoberta chave (14/03/2026)

A cifra completa do Songsterr pode ser extraída **SEM headless browser**!

A página de chords (`/a/wsa/{slug}-chords-s{songId}`) contém um **Redux state inline (~52KB)**
como JSON dentro de um `<script>` tag. O campo `state.chordpro.current` é um array com a
cifra parseada: letra, acordes (com nota base, sufixo, baixo, intervalos), seções e tom.

**Desafio resolvido:** O Songsterr fragmenta entidades HTML entre text fields quando um acorde
está no meio do texto (ex: `"L&aa"` + chord:D + `"cute; fora..."`). Solução: juntar todos os
text fragments de cada linha, decodificar o texto completo, e recalcular posições dos acordes.

### Entregue em 14/03/2026

| Etapa | Status | Descrição |
|-------|--------|-----------|
| A+1 | ✅ | Investigação API: `/api/meta`, `/api/chords`, `/api/song`, Redux state, CDN (403) |
| A+2 | ✅ | Edge Function `songsterr-enrich` (v5): extrai cifra, acordes, tom, BPM, vídeos, tags, tracks |
| A+3 | ✅ | Decodificação de entidades HTML fragmentadas (double-encoding + split across fields) |
| A+4 | ✅ | Frontend: `enrichFromSongsterr()` no service (import+enrich em paralelo) |
| A+5 | ✅ | Frontend: `SongsterrImportModal` mostra preview de cifra, tom, BPM, acordes, vídeos YouTube |
| A+6 | ✅ | `saveSongsterrToRepertoire()` salva cifra_content, chords[], key, bpm, youtube_url no banco |

### Dados extraídos por música (modelo "Adquirir e Reter")

- **cifra_content**: texto completo com acordes alinhados sobre a letra
- **chords[]**: lista de acordes únicos (G, F9, Em, C, Bm, Am7, D, Em7...)
- **key**: tom da música (G, Am, etc.)
- **bpm**: batidas por minuto (72, 120, etc.)
- **tuning**: afinação (Standard EADGBE, Drop D, etc.)
- **youtube_videos[]**: IDs de vídeos YouTube vinculados
- **tracks[]**: instrumentos com nome, categoria e dificuldade
- **tags[]**: gênero e país (rock, brazil, etc.)

### Decisão de negócio (Alf, 14/03/2026)

**Modelo: "Adquirir e Reter"** — importa UMA VEZ, salva no banco, é nosso para sempre.

**Estratégia Híbrida mantida:**
- Songsterr: cifra+acordes+tom+BPM+vídeos + tablatura (.gp futuro) + instrumentos detalhados
- Cifra Club: complementar quando Songsterr não tiver cifra (ou para cifras em português)
- Cruzamento automático futuro: buscar mesma música nas duas fontes

---

## FASE E1 — Transposição de Tonalidade (COMPLETA — 95%)

Objetivo: Widget de transposição (+/- semitons) no editor e na sheet, igual Cifra Club/Songsterr.

### Entregue em 14/03/2026

| Etapa | Status | Descrição |
|-------|--------|-----------|
| E1.1 | ✅ | `npm install chordsheetjs` |
| E1.2 | ✅ | `src/lib/transpose.ts` — transposeChord(), transposeCifraContent(), transposeChords(), transposeKey(), detectKey(), shouldUseFlats(), semitoneLabel(). Lib própria leve (sem dependência pesada). Regex robusta: suporta Bb5, B4, F#m7(11), E/G#, etc. |
| E1.3 | ✅ | `src/components/repertoire/TransposeControl.tsx` — botões -/+ com Phosphor Icons, badge de semitons, display tonalidade, botão reset, limites -11/+11 |
| E1.4 | ✅ | Integrado no RepertoireSheet.tsx — cifra transposta em tempo real, acordes transpostos, diagramas violão/teclado buscam novos acordes da biblioteca, tablatura NÃO alterada (correto) |
| E1.5 | ✅ | TransposeControl integrado no CifraEditor.tsx — Preview/Split mostram cifra transposta, diagramas buscam acordes transpostos na biblioteca |
| E1.6 | ✅ | Testado: Eduardo e Mônica (E→F, +1): Bb5→B5, B4→C4, F#m7(11)→Gm7(11), E/G#→F/A |

### Resultado
Usuário vê a cifra, clica +/-, todos os acordes sobem/descem N semitons, diagramas mudam em tempo real. Não salva no banco (apenas visual). Reset volta ao tom original.

---

## FASE E2 — Parser ChordPro e Integração (NOVA)

Objetivo: Suporte nativo ao formato ChordPro — parse, renderização e import/export.

### Biblioteca: ChordSheetJS (mesma da E1)

### Etapas

| Etapa | Tipo | Descrição | Dificuldade |
|-------|------|-----------|-------------|
| E2.1 | ✅ | `src/lib/chordpro.ts` — chordProToPlainText(), plainTextToChordPro(), isChordProFormat(), extractChordsFromChordPro(), extractChordProMetadata(). Converte bidirecional ChordPro ↔ ChordsOverWords. Suporta diretivas {title}, {key}, {soc/eoc}, {comment}, seções, acordes inline. |
| E2.2 | ✅ | Dropdown "ChordPro" na toolbar do CifraEditor com 3 opções: Importar .cho, Copiar ChordPro, Baixar .cho. Auto-detecção no paste (isChordProFormat). |
| E2.3 | ✅ | Import de arquivos .cho/.chordpro/.pro/.txt via file picker com auto-conversão |
| E2.4 | ✅ | Export: copiar para clipboard + download arquivo .cho |
| E2.5 | ⏳ | Edge Function chordpro-batch-import (futuro — Fase D) |
| E2.6 | ⏳ | Aba "ChordPro" no modal unificado (futuro — Fase D) |
| E2.7 | ✅ | Auto-Fill de acordes no CifraEditor: botão ⚡ identifica faltantes, busca no chords-db (violão) e gera via teoria musical (piano), cria no banco. |
| E2.8 | ✅ | Fix parser `parseChordName`: slash chords (E/G# → suffix="/G#"), atalhos BR (B4→sus4, G2→sus2), parênteses (Fm7(11)→Fm7). Agora aproveita 100% dos 529 acordes / 2.069 posições do chords-db. |
| E2.9 | ✅ | Duplo-clique nos diagramas de violão e teclado no CifraEditor abre modal de edição (ChordEditor/KeyboardEditor). Teclados padronizados com range fixo [C4, C6]. |

### Auditoria de Fontes de Acordes (14/03/2026)

| Fonte | Tipo | Cobertura | Detalhes |
|-------|------|-----------|----------|
| `@tombatossals/chords-db` | Violão (estática) | **529 acordes, 2.069 posições, 63 suffixes** | Inclui slash chords (/G#, m/C), sus, dim, aug, 7th, 9th, 11th, 13th, add, alt |
| `PIANO_INTERVALS` | Piano (teoria) | ~30 tipos + slash chords | Gera MIDI na oitava 4, slash adiciona baixo na oitava 3 |
| `chord_library` (Supabase) | Cache persistente | ~80+ registros (cresce) | Alimentada pelo auto-fill, tag "auto-preenchido" |

**REGRA**: O chords-db tem 2.069 posições — SEMPRE buscar lá antes de declarar "não encontrado".

---

## FASE C — Music AI / Backing Tracks (EXISTENTE — NAO INICIADA)

Objetivo: Upload de áudio, separação de stems, detecção de acordes/BPM/tom, player multi-track.
Custo: ~$25/mês (Music AI API)

### Etapas

| Etapa | Tipo | Descrição | Dificuldade |
|-------|------|-----------|-------------|
| C1 | Edge Function | music-ai-process — áudio no Storage, chama Music AI API, salva stems, retorna resultado | Alta |
| C2 | Secret | Configurar MUSIC_AI_API_KEY nos secrets do Supabase | Trivial |
| C3 | Modal | AudioImportModal.tsx — upload MP3/WAV, progress bar, preview, importar | Alta |
| C4 | Componente | BackingTrackPlayer.tsx — player multi-track com toggles por stem + volume individual | Alta |
| C5 | Integração | Integrar player no RepertoireSheet (nova aba "Backing Track") | Média |

### Pré-requisitos
- Tabela backing_tracks: JÁ CRIADA (Fase A2)
- Bucket audio-tracks: JÁ CRIADO (Fase A2)
- API key Music AI: Alf precisa contratar

---

## FASE E3 — AlphaTab: Renderizador de Tablaturas (NOVA)

Objetivo: Renderizar tablaturas Guitar Pro com player MIDI interativo.

### Biblioteca: AlphaTab (@coderline/alphatab + @coderline/alphatab-vite), Licença MPL-2.0

### Capacidades
- Renderiza GP3-GP7, MusicXML com notação padrão + tablatura
- Player MIDI embutido com cursor visual (igual Songsterr)
- Controle de velocidade (0.25x a 2x), seleção de tracks, loop de seção
- NÃO tem componente React pronto — precisa integração manual via refs

### Etapas

| Etapa | Tipo | Descrição | Dificuldade |
|-------|------|-----------|-------------|
| E3.1 | Dependência | npm install @coderline/alphatab @coderline/alphatab-vite | Trivial |
| E3.2 | Config | Adicionar plugin alphaTab() no vite.config.ts | Trivial |
| E3.3 | Componente | AlphaTabPlayer.tsx — wrapper React com controles play/pause/stop, velocidade, seletor de track, cursor | Alta |
| E3.4 | Integração | Nova aba "Tablatura" no RepertoireSheet para músicas com arquivo GP | Média |
| E3.5 | Edge Function | songsterr-tab-download — busca dados de tablatura do Songsterr | Alta |
| E3.6 | Migration | Coluna gp_file_url (text) na tabela repertoire | Trivial |
| E3.7 | Feature | Upload manual de arquivos .gp/.gp5/.gpx/.musicxml no editor | Média |

---

## FASE E4 — Enriquecer Biblioteca de Acordes (NOVA)

Objetivo: Ampliar a chord_library com posições de bases open source.

### Fontes
- szaza/guitar-chords-db-json: ~100.000 posições de acordes
- tombatossals/chords-db: violão + ukulele com dedilhado
- spyroskantarelis/chordonomicon: 666.000 progressões de músicas reais

### Etapas

| Etapa | Tipo | Descrição | Dificuldade |
|-------|------|-----------|-------------|
| E4.1 | Pesquisa | Auditar chord_library atual — quantos acordes, quais faltam | Baixa |
| E4.2 | Script | Script Node.js para converter guitar-chords-db-json para nosso formato | Média |
| E4.3 | Migration | Inserir acordes faltantes na chord_library | Média |
| E4.4 | Feature | Mapeamento automático: transpor acorde busca diagrama na library | Baixa |
| E4.5 | Futuro | Usar Chordonomicon para sugestões pedagógicas (músicas com mesma progressão) | Baixa |

---

## FASE D — Consolidação e Busca Unificada (EXISTENTE — NAO INICIADA)

Objetivo: Unificar importação/busca e adicionar inteligência pedagógica.

### Pré-requisitos: Fases A, B completas + pelo menos A+ ou E2 + (C desejável)

### Etapas

| Etapa | Tipo | Descrição | Dificuldade |
|-------|------|-----------|-------------|
| D1 | Modal | Modal unificado com abas: Cifra Club, Songsterr, ChordPro, Áudio, Manual | Alta |
| D2 | Feature | Filtros avançados — por acordes específicos, por nível da jornada | Média |
| D3 | RPC | suggest_repertoire(student_id) — cruza acordes dominados com músicas disponíveis | Alta |
| D4 | Feature | Busca semântica com embeddings (coluna embedding já existe com index HNSW) | Alta |
| D5 | Feature | Dashboard do repertório — gráficos de cobertura (gêneros, tonalidades, dificuldades) | Média |

---

## Dependências entre Fases

```
FASE A (COMPLETA) ----> FASE A+ (enriquecer importação Songsterr)
                  ----> FASE E3 (AlphaTab, precisa dados do Songsterr)

FASE B (COMPLETA) ----> FASE E1 (transposição no editor/sheet)
                  ----> FASE E2 (parser ChordPro no editor)

FASE E1 (transposição) ----> independente, pode começar JÁ
FASE E2 (ChordPro)     ----> usa mesma lib da E1 (ChordSheetJS)
FASE E4 (acordes DB)   ----> complementa E1 (diagramas transpostos)

FASE C (Music AI)       ----> independente (precisa API key)

FASE D (consolidação)   ----> depende de A+ / E1 / E2 / (C desejável)
```

---

## Ordem de Execução Recomendada

### Sprint 1 — Transposição (impacto imediato, 0 custo) ~2.5h
1. E1.1 — Instalar ChordSheetJS (2 min)
2. E1.2 — Criar src/lib/transpose.ts (30 min)
3. E1.3 — Criar TransposeControl.tsx (30 min)
4. E1.4 — Integrar no RepertoireSheet.tsx (45 min)
5. E1.5 — Integrar no CifraEditor.tsx (30 min)
6. E1.6 — Testar com cifras reais (15 min)

### Sprint 2 — ChordPro Parser (complementa transposição) ~2h
1. E2.1 — Criar src/lib/chordpro.ts (45 min)
2. E2.2 — Toggle formato no CifraEditor (30 min)
3. E2.3 — Import de arquivos ChordPro (30 min)
4. E2.4 — Export ChordPro (20 min)

### Sprint 3 — Enriquecer Songsterr (corrigir importação) ~4-5h
1. A+1/A+2 — Implementar scraping de acordes OU fallback Cifra Club (2-3h)
2. A+3 — Alternativa: cruzar com Cifra Club automaticamente (1h)
3. A+4/A+5 — Atualizar modal e salvar conteúdo (1h)

### Sprint 4 — Enriquecer Acordes ~2.5h
1. E4.1 — Auditar chord_library atual (30 min)
2. E4.2 — Script de conversão guitar-chords-db (1h)
3. E4.3 — Migration com acordes novos (30 min)
4. E4.4 — Mapeamento transposição para diagramas (30 min)

### Sprint 5 — AlphaTab (renderizador profissional) ~6-8h
1. E3.1/E3.2 — Instalar e configurar Vite plugin (15 min)
2. E3.3 — Criar AlphaTabPlayer.tsx (3-4h)
3. E3.4 — Integrar no RepertoireSheet (1-2h)
4. E3.5 — Edge Function download de tablatura (2h)

### Sprint 6 — Music AI (quando tiver API key) ~6-8h
1. C1 — Edge Function music-ai-process (2-3h)
2. C3 — AudioImportModal.tsx (2h)
3. C4 — BackingTrackPlayer.tsx (2-3h)
4. C5 — Integração no RepertoireSheet (1h)

### Sprint 7 — Consolidação ~4-6h
1. D1 — Modal unificado de importação (2-3h)
2. D2 — Filtros avançados (1-2h)
3. D3 — RPC suggest_repertoire (1-2h, precisa Claude)
4. D4/D5 — Busca semântica e dashboard (futuro)

---

## Estimativa Total

| Sprint | Fase(s) | Tempo | Custo |
|--------|---------|-------|-------|
| 1 | E1 — Transposição | ~2.5h | Grátis |
| 2 | E2 — ChordPro | ~2h | Grátis |
| 3 | A+ — Songsterr conteúdo | ~4-5h | Grátis |
| 4 | E4 — Acordes DB | ~2.5h | Grátis |
| 5 | E3 — AlphaTab | ~6-8h | Grátis |
| 6 | C — Music AI | ~6-8h | ~$25/mês |
| 7 | D — Consolidação | ~4-6h | Grátis |
| **TOTAL** | | **~27-34h** | **~$25/mês (só fase C)** |
