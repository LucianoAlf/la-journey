# 🎸 Relatório Executivo — AlphaTab Player & Importação GP

**Data:** 14 de março de 2026  
**Sprint:** Fase 5 — Repertório e Conteúdo Musical  
**Status:** ✅ CONCLUÍDA  
**Autor:** Cascade (Windsurf)  
**Revisão:** Luciano Alf

---

## 1. Resumo Executivo

Nesta sessão, completamos a **integração do AlphaTab como player de tablatura interativo** e criamos um **fluxo completo de importação de arquivos Guitar Pro** com auto-preenchimento inteligente de metadados. O professor agora pode baixar um `.gp` do Songsterr Plus, arrastar para o LA Journey, e em segundos ter a música cadastrada com título, artista, BPM e 11 tracks identificadas — pronta para tocar com player MIDI.

---

## 2. O que foi entregue

### 2.1 SoundFont de Alta Qualidade
- **GeneralUser GS** (30MB) — 270 instrumentos GM, qualidade profissional
- Substituiu o SoundFont padrão do AlphaTab (~1.8MB, som metálico)
- Servido via `/public/soundfont/` com lazy loading

### 2.2 Upload de Arquivos Guitar Pro
- **Bucket Supabase Storage:** `gp-files` (10MB max, formatos .gp/.gpx/.gp7/.musicxml/.mxl)
- **Service:** `gpFileService.ts` — `uploadGpFile()`, `updateGpFileUrl()`, `deleteGpFile()`
- **Coluna no banco:** `repertoire.gp_file_url` (já existia via migration anterior)
- **UI:** Campo de upload integrado na aba Editar do `RepertoireSheet`

### 2.3 Pipeline Songsterr → Score (Frontend)
- **Edge Function** `songsterr-gp-download` baixa o JSON do CDN Songsterr
- **Conversor frontend** (`songsterrConverter.ts`) transforma JSON → objeto `Score` do AlphaTab in-memory
- **Decisão arquitetural:** Conversão no frontend (não na Edge Function) por limitações do Deno + performance
- Testado com **Sweet Child O' Mine** (9 tracks) e **Stairway to Heaven** (11 tracks)

### 2.4 AlphaTab Player Completo
- **Componente:** `AlphaTabPlayer.tsx` — renderiza partitura + tablatura interativa
- **Player MIDI:** play/pause, barra de progresso, cursor animado verde, scroll automático
- **Velocidade:** 0.25x até 2x (atalho para prática lenta)
- **Seletor de tracks:** dropdown com todas as tracks da música
- **UI compacta:** espaçamento reduzido para não ocupar tela demais

### 2.5 Mixer de Volumes por Track
- Painel expansível (botão Faders) acima do player
- **Volume individual** por track: slider 0-160%
- **Solo (S):** destaca uma track, muta as demais — badge amarelo
- **Mute (M):** silencia a track — badge vermelho
- **Ícone de speaker** clicável (toggle mute)
- **Nome da track** clicável (troca a visualização)
- Track ativa destacada com borda accent

### 2.6 Modal "Importar GP" Dedicado ⭐
- **Componente:** `GpImportModal.tsx`
- **Fluxo em 2 etapas:**
  1. Zona drag & drop / file picker — visual clean com ícone grande
  2. Preview auto-preenchido com campos editáveis

- **Auto-preenchimento via AlphaTab:**
  - `ScoreLoader.loadScoreFromBytes()` lê o arquivo no browser
  - **Título:** `score.title` ou parse do nome do arquivo
  - **Artista:** `score.artist` ou parse do nome do arquivo
  - **Tracks:** lista com badges (nome + ícone do instrumento inferido via MIDI program)
  - **BPM:** `score.masterBars[0].tempoAutomation.value`
  - **Gênero:** inferido do nome do arquivo
  - **Dificuldade:** default 3 (editável)

- **Ao salvar:** `createSong()` + `uploadGpFile()` + `updateGpFileUrl()` numa só ação
- **Testado:** Stairway to Heaven (Led Zeppelin) — 11 tracks, 72 BPM, 132 KB → importada com sucesso

---

## 3. Arquivos criados/modificados

### Novos
| Arquivo | Descrição |
|---------|-----------|
| `src/components/modals/GpImportModal.tsx` | Modal dedicado de importação GP com auto-preenchimento |
| `src/services/gpFileService.ts` | Upload, update e delete de arquivos GP no Storage |
| `src/lib/songsterrConverter.ts` | Conversor Songsterr JSON → AlphaTab Score |
| `public/soundfont/` | SoundFont GeneralUser GS (30MB) |

### Modificados
| Arquivo | Mudança |
|---------|---------|
| `src/components/music/AlphaTabPlayer.tsx` | Player MIDI completo + mixer + seletor de tracks |
| `src/components/modals/RepertoireModal.tsx` | Campo de upload GP na aba Dados |
| `src/components/repertoire/RepertoireSheet.tsx` | Upload GP na aba Editar |
| `src/pages/Repertorio.tsx` | Botão "Importar GP" + integração GpImportModal |
| `docs/PRD.md` | v3.0 — AlphaTab nas integrações ativas, Fase 5 concluída |

---

## 4. Decisões Técnicas

| Decisão | Justificativa |
|---------|---------------|
| Conversão Songsterr no frontend, não na Edge Function | Deno não suporta o ecossistema AlphaTab. O frontend já tem a lib carregada. Performance OK (~100ms para 9 tracks). |
| SoundFont GeneralUser GS (30MB) em vez do padrão | Qualidade sonora incomparavelmente melhor. Lazy loading — só baixa quando o player é aberto. |
| `ScoreLoader.loadScoreFromBytes()` para parse de metadados | Evita dependências externas. O AlphaTab já está no bundle. Parse instantâneo no browser. |
| Modal dedicado em vez de reusar "Nova Música" | UX muito melhor — o professor vê as tracks, o título auto-preenchido, antes de salvar. |
| `guessInstrument()` por MIDI program + nome da track | Cobertura de ~95% dos casos. Fallback: "Violão". |

---

## 5. Testes Realizados

| Teste | Resultado |
|-------|-----------|
| Sweet Child O' Mine (Guns N' Roses) — 9 tracks via Songsterr | ✅ Player MIDI funcional, mixer operacional |
| Stairway to Heaven (Led Zeppelin) — 11 tracks via upload GP | ✅ Auto-preenchimento: título, artista, 72 BPM, gênero Rock |
| Mixer: volume, solo, mute em 11 tracks simultâneas | ✅ Sem latência perceptível |
| Upload GP → Supabase Storage → gp_file_url | ✅ Arquivo salvo e linkado |
| Compilação TypeScript (`tsc --noEmit`) | ✅ Zero erros |

---

## 6. Métricas de Impacto

| Antes | Depois |
|-------|--------|
| GP upload escondido na aba "Editar" | Botão "Importar GP" visível na barra de topo |
| Campos preenchidos manualmente | Auto-preenchimento de título, artista, BPM, tracks |
| Sem player de tablatura | Player MIDI interativo com partitura + tablatura |
| SoundFont metálico (1.8MB) | GeneralUser GS profissional (30MB, 270 instrumentos) |
| Sem controle de volume por track | Mixer completo: volume, solo, mute |

---

## 7. Próximos Passos

| Prioridade | Item | Descrição |
|-----------|------|-----------|
| 🟡 Média | Modal unificado de importação | Cifra Club + Songsterr + GP numa busca só |
| 🟡 Média | Filtros avançados no Repertório | Por instrumento, origem, status, BPM range |
| 🟡 Média | Dashboard do repertório | KPIs visuais, gráficos por gênero/dificuldade |
| 🟢 Baixa | Limpar gp_file_url de teste | Wonderwall tem URL de teste que precisa ser limpa |
| 🟢 Baixa | Parser ChordPro | Formato padrão de cifras digitais |

### Sobre o Modal Unificado de Importação

**Recomendação: SIM, vale a pena.** Hoje o professor vê 3 botões separados (Cifra Club, Songsterr, Importar GP) e precisa saber qual usar. Um modal unificado com **busca inteligente** simplifica drasticamente:

1. Professor digita "Stairway to Heaven"
2. Sistema mostra resultados de **todas as fontes** (Cifra Club, Songsterr, ou "Subir arquivo GP")
3. Professor escolhe a melhor fonte
4. Preview + edição → salvar

Isso reduz a carga cognitiva e mantém a barra de topo limpa (um botão "Importar" em vez de três).

---

*LA Journey — Aprender → Ancorar → Evoluir → Celebrar*
