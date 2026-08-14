# LA Journey — mapa de desenvolvimento

Atualizado: 2026-08-14  
Quem atualiza: o agente, no fim de cada corte. Não duplicar specs aqui — só o estado.

**Próximo corte:** Cadernos de exercício (Tarefa 2 do Radar).

## Como retomar

1. Ler este arquivo inteiro.
2. Ler a spec do corte atual (links abaixo), não o chat antigo.
3. Não misturar working tree sujo (image-gen / Iconify / Recraft) no PR de caderno/repertório.
4. No fim do corte: mover itens entre Feito / Radar / Pendente, atualizar a data e o “Próximo corte”.

---

## Agora

Receita diferente por música no montador de caderno e motor de PDF concluída com 100% de cobertura (14/08).
- Modal `NotebookPrintRecipeDialog.tsx` expandido com seção de personalização individual por faixa (chips rápidos de Violão, Teclado, Ukulele, Tablatura por música e botão de restaurar padrão).
- Montador de blocos (`notebookMaterialAssembler.ts`) e motor de PDF (`repertoirePdfEngine.ts`, `repertoirePdfSongs.ts`) respeitam o override de receita de cada música independente do padrão do caderno.
- 51/51 testes unitários passando e build de produção validado.

- App local: http://127.0.0.1:3001 — produção: https://la-journey.vercel.app
- Branch: `feat/caderno-repertorio-montador`. Não misturar image-gen/Iconify/Recraft.

---

## Feito

### Receita Diferente por Música no Caderno e Motor de PDF (14/08)

- **Personalização Individual no Diálogo de Impressão (`NotebookPrintRecipeDialog.tsx`):**
  - Mantém toggles globais do caderno (Violão, Teclado, Ukulele, Tablatura) com resumo no topo.
  - Carrega as faixas do caderno e fornece seção expansível para customizar faixas individualmente.
  - Cada música exibe título, artista, tom e 4 chips de ação rápida (🎸 Violão, 🎹 Teclado, 🪕 Ukulele, 📑 Tab), permitindo ligar/desligar elementos específicos por faixa.
  - Botão de restauração rápida para o padrão do caderno e contador de faixas customizadas.
- **Montador de Materiais e Rascunhos (`notebookMaterialAssembler.ts` / `repertoireCollectionService.ts`):**
  - `NotebookSongInput` suporta `recipe?: NotebookPrintRecipe` e `tags?: string[]` (com suporte a tags `print-recipe:...`).
  - `buildNotebookMaterialBlocks` e `createDraftMaterialFromNotebook` aplicam a receita individual da faixa com fallback suave para a receita do caderno.
- **Motor de Renderização e PDF (`repertoirePdfEngine.ts` / `repertoirePdfSongs.ts`):**
  - `generateRepertoireBookPdf` analisa todas as receitas individuais e do caderno para carregar os mapas de acordes corretos (violão e teclado) e renderiza cada `PrintableCifra` com seu layout instrumental individual (`showGuitar`, `showPiano`, `showTab`).
  - `songsFromNotebookItems` extrai e propaga as receitas individuais das faixas.
  - `isSameRecipe` e `formatRecipeSummary` adicionados em `notebookPrintRecipe.ts` com testes unitários.
- **Testes e Build:**
  - Testes unitários em `notebookMaterialAssembler.test.ts`, `notebookPrintRecipe.test.ts` e `repertoirePdfSongs.test.ts`.
  - 51 testes passando em `npx tsx --test` e build Vite de produção sem erros.

### Saneamento e Voicings de Piano na `chord_library` (14/08)

- **Diagnóstico e Banco de Dados:**
  - Identificado que as linhas múltiplas por nome de acorde de piano representam inversões harmônicas legítimas (`root_position`, `1st_inversion`, `2nd_inversion`, `3rd_inversion`), com 0 pares de duplicatas exatas (nome + voicing).
  - 20 registros com `voicing_position: null` no Supabase foram identificados, saneados e atualizados para suas respectivas posições fundamentais ou de inversão.
- **Resolução Prioritária da Posição Fundamental:**
  - `chordLibraryResolver.ts` (`resolvePianoChordFromLibrary`): agora busca e prioriza explicitamente `voicing_position === 'root_position'` ao resolver acordes para materiais, montador e caderno.
  - `RepertoireSheet.tsx` e `CifraEditor.tsx`: mapas de acordes de teclado (`pianoChordMap`) ordenados com prioridade para `root_position`, garantindo que a cifra e PDF exibam a posição fundamental por padrão.
- **UI e Badges Pedagógicos na Biblioteca (`Biblioteca.tsx`):**
  - `PianoChordCard` agora exibe badge de inversão (`Fund.`, `1ª Pos`, `2ª Pos`, `3ª Pos`).
  - `chordFooterText` exibe a descrição completa do voicing (`Posição Fundamental · tríade · nível 1`), tornando claro que cada card é uma inversão distinta.
  - Swimlanes do modo Voicing utilizam fallback robusto para `positions.voicing_position`.
- **Validação:**
  - `musicSnapshotValidation.ts` atualizado para aceitar caracteres SMuFL (`\uE0A0-\uE0FF`).
  - 51/51 testes unitários passando (`npx tsx --test`) e build Vite validado.

### Backfill YouTube/Spotify nas 11 Cifra Club (14/08)

- **Backfill no Banco de Dados (11/11 Cifra Club):**
  - Eduardo e Mônica (`Dois`, 1986 | Legião Urbana - Topic `5RC_buIlexc`)
  - Pais e Filhos (`As Quatro Estações`, 1989 | LegiaoUrbanaVEVO `bvIMBVBRpJU`)
  - Quase Sem Querer (`Dois`, 1986 | Legiao Urbana - Topic `lk_EXr9xEr0`)
  - Eu Te Devoro (`Bicho Solto - O XIII`, 1998 | DjavanVEVO `_dnB4nWckxg`)
  - Burguesinha (`America Brasil`, 2007 | Seu Jorge - Topic `bWSn9jL1g7I`)
  - Tempo Perdido (`Dois`, 1986 | Legiao Urbana - Topic `zpzoG5KGaHg`)
  - Será (`Legião Urbana`, 1985 | LegiaoUrbanaVEVO `hZg1r7BOXVA`)
  - Fé (`Fé`, 2022 | IZA `Tr7mwAGTdK4`)
  - Oceano (`Djavan`, 1989 | DjavanOficial `MWh78SM5G7k`)
  - Sweet Dreams (`Smells Like Children`, 1995 | MarilynMansonVEVO `QUvVdTlA23w`)
  - Sina (`Luz`, 1982 | DjavanVEVO `5siQ-ml5lqY`)
- **Extração Automática no Import (`cifra-club-batch` e `saveCifraToRepertoire`):**
  - `saveCifraToRepertoire` e `cifra-club-batch` agora extraem e persistem `youtube_video_id` automaticamente ao salvar novas cifras.
  - Edge Function `cifra-club-batch` atualizada e redeployada no Supabase.

### Songsterr BPM Real + Tom Diatônico + YouTube Embeddable (14/08)

- **BPM Real via CDN Track Automations:**
  - `songsterr-enrich` e `songsterr-gp-download` agora extraem o BPM real do track 0 diretamente da CDN Songsterr (`automations.tempo[0].bpm` ou `data.tempo`), eliminando o valor placeholder padrão de 72 BPM.
- **Detecção de Tom Diatônico Real:**
  - Algoritmo de scoring diatônico maior/menor analisando a lista completa de acordes (`detectKeyFromChords`), eliminando o falso tom baseado no primeiro acorde (ex: Wonderwall agora é `Em` e não `Em7`; Champagne Supernova agora é `D` e não `Asus2`; Sweet Child O' Mine é `G` e não `D`).
- **YouTube Embeddable Lookup via Data API v3:**
  - Integração com `_shared/youtube.ts` avaliando até 10 IDs candidatos do Songsterr em lote (`videos.list` com `status.embeddable` e restrição regional BR).
  - Prioriza clipes oficiais/HQ e grava metadados completos (`youtube_url`, `youtube_video_id`, `youtube_title`, `youtube_channel`, `youtube_duration`, `youtube_thumbnail_url`).
- **UI de Importação Unificada (`UnifiedImportModal`):**
  - Preview exibe badges de Tom detectado, BPM real, acordes e card de vídeo do YouTube com título e duração.
- **Backfill no Banco de Dados:**
  - As 4 músicas Songsterr (`repertoire`) foram re-enriquecidas com sucesso no banco de produção.

### Songsterr GP + Edges no Git + Fix Origem (14/08)

- **Edges no git:** `songsterr-search`, `songsterr-import`, `songsterr-enrich`, `songsterr-gp-download` e `cifra-club-search` salvas em `supabase/functions/`.
- **Edge `songsterr-gp-download` reformulada e deployada (v19):**
  - Removido AlphaTab/WASM da Edge Function (causava crash `WORKER_ERROR` no Deno Deploy).
  - URL moderna de CDN mapeada: `https://dqsljvtekg760.cloudfront.net/${songId}/${revisionId}/${image}/${partId}.json` com fallback para CloudFront 2 e formatos legados.
  - Empacota `SongsterrBundle` JSON completo com todas as tracks e metadados.
  - Salva em Supabase Storage (`gp-files/songsterr/${songId}/${filename}`) com `contentType: application/json`.
  - Atualiza automaticamente a coluna `gp_file_url` na tabela `repertoire`.
  - Invocação via `supabase.functions.invoke` no `repertoireService.ts` com autenticação automática.
- **Backfill completo das 4 músicas Songsterr:**
  - Wonderwall (`2`), Sweet Child O' Mine (`23`), Like a Virgin (`10767`), Champagne Supernova (`49284`) — 100% com bundles no storage e `gp_file_url` preenchido.
- **Correção no `RepertoireModal`:**
  - Preserva `cifra_source` original ao editar música existente em vez de sobrescrever para `'manual'`.
- **Soundfont corrigido no `AlphaTabPlayer`:**
  - Atualizado para `/soundfont/sonivox.sf2`, removendo aviso de "Soundfont is not a valid Soundfont2 file".
- **Validação visual completa:**
  - As 4 músicas exibem a aba "Tablatura" com partitura, tablatura, seletor de faixas e player MIDI interativo prontos.

### Produto caderno

- Caderno é máquina de folha do aluno, não catálogo. Sempre bloco `cover`; templates `modern/elegant/colorful/bold/classic/minimal`.
- Montador: capa + `page_break` + uma música por página. Cada Gerar PDF cria **rascunho novo** `repertoire_sheet`.
- Ajeitar abre o mesmo overlay `RepertoireSheet`. Save grava na linha `repertoire` (caderno não clona cifra).
- Receita de impressão no caderno inteiro (violão / piano / ukulele / tab), tag `print-recipe:…`. Override por música = radar.
- Carimbo na lista: `draft`/`null` = Sem curadoria; `approved`/`published` = Curada + nome do professor (`repertoire.curated_by` → `users.name`). Grava `curated_by` no save da folha quando o status é curado. Migration `20260814120000_repertoire_curated_by.sql` (já aplicada no projeto `rkfszavfqplhorvfpkcq`).

### PDF unificado (folha = caderno = Download do editor em songbook)

Motor compartilhado: `generateRepertoireBookPdf`. Monta `PrintableCifra` off-screen a 794px. **Não** html2canvas o canvas do editor (`transform: scale(0.75)` gerou PDF quebrado de 67MB).

Chrome travado com o usuário:

- Página 1 da música: header HTML completo (título, artista, tom, logo).
- Página 2+: nome da música à esquerda | “Repertório” à direita, ar extra sob a linha.
- Rodapé: **LA Music** à esquerda, **`n / n`** à direita. Sem “X de Y”, sem “Material exclusivo”.
- Acorde + letra juntos (`data-pdf-break`). Cifras `#3b5998` / `#1a1a1a` via `SongbookCifra`.

Capa ilustrada entra como **página 1 do PDF** (full-bleed, sem chrome da folha). Mesmo `render_data` do rascunho: template, imagem, título, instrumento, nível, professor, escola, logo. Folha avulsa (uma música) continua sem capa.

Arquivo de referência local (folhas, pré-capa): `C:\Users\Texeira\Downloads\Caderno do Chiquinho  teste browser.pdf`

### Motor Cifra Club (14/08)

12 músicas no banco (cifra + letra + `source_url`). Busca Solr + scrape funciona. Preview e import funcionam.

Clicado na Fé (IZA): Completar com IA, Editar, Letra, Informações (embed YouTube), Gerar PDF, Editar Acorde (duplo clique). Caderno do Chiquinho é OLGA, não Cifra Club.

Furos e o que foi feito:

| Furo | Correção |
|---|---|
| YouTube no import: 1/12. Regex só pegava `href` watch/youtu.be | Parser lê watch, youtu.be, embed, `youtubeId`. Completar com IA continua como fallback (Fé → `KE0LxH8b7no`) |
| Sem Spotify | Coluna `spotify_url`, link no header, campo em Editar, Completar com IA. Sem API do Spotify — URL oficial via IA ou cola manual |
| Letra misturava `Em7(5-)` | Linha só de acorde (com parêntese) sai da letra |
| `Em7(5-)` sumia da lista (virava `Em7`) | Token de acorde aceita alteração entre parênteses |
| Teclado “32 de 9” | Conta nomes únicos (`pianoChordMap.size`), não linhas duplicadas da biblioteca |
| Dois Tempo Perdido no mesmo `source_url` | Ficou o de 10 acordes. Unique index em `source_url`. Save recusa duplicata |

Edge `cifra-club-import` e `cifra-club-batch` redeployadas. `cifra-club-search` já estava no ar (v23) e ainda não está no git.

Migration `20260814140000_repertoire_spotify_and_source_unique.sql` aplicada em `rkfszavfqplhorvfpkcq`.

### Spotify busca + confirmação (14/08)

Client Credentials na Edge `spotify-search`. Query `track:"…" artist:"…"`, `type=track`, `limit=5`, `market=BR`. Token em memória (~1h, skew 60s). 429 devolve `Retry-After` sem loop.

UI: botão **Buscar no Spotify** na ficha (`RepertoireSheet`) e no modal da tabela (`RepertoireModal`). Professor escolhe a faixa. Campo continua editável na mão.

Fé / IZA devolveu 3 hits: single `Fé` (2022), coletânea `As Melhores da IZA` (2024), e `Fé inabalável` do Izael Lopes — exatamente o motivo de não auto-preencher.

Save da ficha/modal grava `spotify_track_id`, nomes oficiais, álbum, ano, `duration_ms` e as 3 capas. URL colada à mão zera os extras até nova busca.

BPM/tom continuam manuais / Cifra Club.

### PDF inteligente — capas clicáveis (14/08)

Tarefa 4. Folha e caderno (`songsFromNotebookItems`) levam `media` para o `PrintableCifra`. Dois cards depois do título: thumb YouTube (play) e capa Spotify. Label é o nome da plataforma + álbum/ano/duração — **sem URL na cara**.

html2canvas vira imagem; `collectPdfHotspots` + `pdf.link` colocam o retângulo clicável em cima da capa e do texto do card. Sem capa, o card daquela plataforma não entra (não cai em link bruto).

Conferido na Fé: 2 anotações `/Link` — YouTube `Tr7mwAGTdK4` e Spotify `647I6AeX6QTUWrW3mQkPCm`.

### YouTube validação de URL (14/08)

Tarefa 2 só. `GET https://www.googleapis.com/youtube/v3/videos` com `part=snippet,contentDetails,status` (1 unidade). Checa `status.embeddable`, `contentDetails.regionRestriction` (BR em `blocked` ou ausente de `allowed`), e `items` vazio.

IDs extraídos de `watch?v=`, `youtu.be/` e `shorts/`. Aviso no formulário na hora. Aba Informações revalida e mostra o aviso no lugar do player quebrado. `quotaExceeded` → mensagem de limite, sem retry. `rateLimitExceeded` → 429, sem loop.

Log: `[youtube-lookup] units=1 via=videos.list day=YYYY-MM-DD total=N` (dia no horário do Pacífico). Cache por ID (ok 10 min, falha 60s).

Player da ficha: lookup + embed HTTPS (Tarefa 4, abaixo).

### YouTube IFrame Player API (14/08)

Tarefa 4. Lookup `videos.list` decide se o clipe embeda. Play é botão (nunca `href` watch). Iframe oEmbed em `youtube.com/embed` + `referrerpolicy`. Vite local continua HTTP.

Player da ficha: lookup + iframe oEmbed em `youtube.com/embed` + `referrerpolicy`. Play é botão (nunca `href` watch). MaterialPreview continua iframe nocookie (não é a ficha).

### YouTube busca + confirmação (14/08)

Tarefa 1. Edge `youtube-search`: `search.list` (`part=snippet`, `type=video`, `maxResults=5`, `regionCode=BR`, `videoEmbeddable=true`, 100 unidades) + um `videos.list` em lote (1 unidade) para duração e rechecagem de embed/região. Sem paginar. `quotaExceeded` → 403, sem retry.

UI: botão **Buscar no YouTube** na ficha e no modal. Professor escolhe o vídeo — não auto-preenche o 1º. Cache da busca sementeia o lookup pra não gastar outra unidade no pick.

Fé / IZA: 1º hit é o clipe oficial `Tr7mwAGTdK4`; lyric, ao vivo e cover ficam na lista.

Save grava `youtube_video_id`, título, canal, duração e thumbnail. Limpar a URL zera os extras.

### Metadados no registro (14/08)

Migration `20260814170000_repertoire_spotify_youtube_metadata.sql` aplicada. Helper `src/lib/repertoireMediaFields.ts`. Conferido na Fé: track id, nomes, álbum 2022, 185400 ms, 3 capas Spotify; video id, título, canal IZA, 3:11, thumb YouTube.

### Auditoria Songsterr (14/08)

4 músicas, todas draft de março/2026: Wonderwall, Like a Virgin, Sweet Child O' Mine, Champagne Supernova.

Cano: `UnifiedImportModal` (aba Songsterr) → `search` → `enrich` (import+scrape) → `saveSongsterrToRepertoire` → GP em background. `SongsterrImportModal` existe e **ninguém importa**.

| Peça | Onde | No git? |
|---|---|---|
| `songsterr-search` v16 | GET `/api/songs?pattern=` | Não (só Supabase) |
| `songsterr-import` v16 | GET `/api/song/{id}` metadados | Não |
| `songsterr-enrich` v22 | scrape `/a/wsa/…-chords-s{id}` Redux ChordPro | Não |
| `songsterr-gp-download` v17 | HTML state + CDN JSON → GP7 AlphaTab → bucket `gp-files` | Não |

Smoke 14/08: search Wonderwall = 10 hits, id=2. Enrich ainda devolve cifra (2638 chars, 6 acordes).

O que entra no `repertoire`:

| Campo | Nas 4 | Nota |
|---|---|---|
| title/artist/`songsterr_id`/`source_url` | sim | URL curta `tab-s{id}` |
| `cifra_content` + `chords` | sim | ChordPro reconstruído |
| `lyrics` | vazio | letra só dentro da cifra |
| `youtube_url` | 1º de `meta.videos` | enrich Wonderwall tem 52 ids; sem checar embed |
| `youtube_video_id` / Spotify | vazio | import anterior às colunas novas |
| `key` | 1º acorde | Em7 / Asus2, não o tom |
| `bpm` | **72 em todas** | Wonderwall real ~87; path `state.tempo.tempo.bpm` |
| `gp_file_url` | 1/4 | só Sweet Child (`.songsterr.json`) |

Storage `gp-files`: Wonderwall JSON existe (`songsterr/2/…json`, 773 KB) e a coluna na linha está **null**. Like a Virgin e Champagne sem arquivo. Código atual do GP grava `.gp`; o player ainda lê `.songsterr.json` via `convertSongsterrToScore`. Aba Tablatura só aparece se `gp_file_url` está preenchido.

Edição:

| Caminho | Persiste? |
|---|---|
| Ficha → Editar → Save | sim (`cifra_content`, `gp_file_url`, mídia). Não mexe em `cifra_source` |
| Duplo clique em bloco tab ASCII | sim (`updateSong` no `cifra_content`) |
| Transposição na ficha | não (só preview) |
| AlphaTab na aba Tablatura | não (view-only) |
| Modal da tabela (`RepertoireModal`) | save com `cifra_content` **grava `cifra_source: 'manual'`** — apaga o carimbo Songsterr |
| GP em background no import | erro só no `console.warn`; 3/4 ficaram sem URL |

### Specs do caderno

- `docs/superpowers/specs/2026-08-13-caderno-repertorio-montador-design.md`
- `docs/superpowers/specs/2026-08-13-caderno-repertorio-motor-design.md` (aprovada)
- Plano: `docs/superpowers/plans/2026-08-13-caderno-repertorio-motor.md`
- Caderno de exercício: `docs/superpowers/specs/2026-08-14-caderno-exercicio-montador-design.md` (aprovada)
- Plano: `docs/superpowers/plans/2026-08-14-caderno-exercicio-montador.md`

---

## Radar (ordem combinada em 14/08)

1. **Cadernos de exercício.**
2. Apostila / Download do editor quando **não** é songbook (Browserless `generate-pdf` → `/print/:id`).
3. Tom/capo no PDF: Cifra Club “Tom: Ebm (com forma de Dm) + Capotraste 1ª casa” — hoje grava Ebm e `capo=0`.

---

## Pendente / fora

- Gravura estilo Chediak
- Ligar aluno / portfólio ao caderno
- Publicar tela nova na Base Curada
- Unificar apostila com o motor da folha (não misturar os dois canos sem decisão)

### Working tree local, não shipado

Não entrar no PR de repertório/Cifra Club:

- Image-gen, Recraft SVG, Iconify, import de imagem
- Ajustes de `ai-config` / Gemini / Integracoes
- `tmp/`, `.cursor/mcp.json`

---

## Dois canos de PDF — não confundir

| Cano | Onde | Motor | Estado |
|---|---|---|---|
| Folha | Modal da música → Cifra Completa → Gerar PDF | `generateRepertoireBookPdf` | Padrão ouro |
| Caderno / editor songbook | Biblioteca → Gerar PDF, ou Download no `repertoire_sheet` | O mesmo | No ar |
| Apostila (não songbook) | Download no editor | Browserless `generate-pdf` → `/print/:id` | Separado de propósito |

---

## Arquivos-chave

| Peça | Path |
|---|---|
| Motor PDF | `src/services/repertoirePdfEngine.ts` |
| Folhas a partir de caderno/blocos | `src/lib/repertoirePdfSongs.ts` |
| Paginação html2canvas | `src/services/pdfService.ts`, `src/lib/pdfPageSlices.ts` |
| Parser cifra (folha) | `src/lib/cifraBlocks.ts` |
| Parser Cifra Club | `supabase/functions/_shared/cifra-parser.ts` |
| Import Cifra Club | `supabase/functions/cifra-club-import/index.ts`, `cifra-club-batch` |
| Enrich IA | `src/services/aiEnrichService.ts` |
| Spotify search | `supabase/functions/spotify-search/index.ts`, `_shared/spotify.ts` |
| Spotify UI | `src/components/repertoire/SpotifySearchPicker.tsx` |
| YouTube lookup | `supabase/functions/youtube-lookup/index.ts`, `_shared/youtube.ts` |
| YouTube search | `supabase/functions/youtube-search/index.ts` |
| YouTube UI | `src/components/repertoire/YoutubeUrlField.tsx`, `YoutubeSearchPicker.tsx`, `YoutubePlayer.tsx` |
| YouTube player | `src/lib/youtubeEmbed.ts`, `src/components/repertoire/YoutubePlayer.tsx` |
| Campos de mídia | `src/lib/repertoireMediaFields.ts`, `src/lib/repertoirePdfMedia.ts` |
| Hotspots PDF | `src/lib/pdfHotspots.ts`, `src/services/pdfService.ts` |
| Montador | `src/lib/notebookMaterialAssembler.ts` |
| Receita | `src/lib/notebookPrintRecipe.ts` |
| Folha UI | `src/components/repertoire/RepertoireSheet.tsx`, `PrintableCifra.tsx` |
| Caderno UI | `NotebookDetailModal.tsx`, `NotebookPrintRecipeDialog.tsx`, `RepertoireNotebookTab.tsx` |
| Preview/editor songbook | `SongbookCifra.tsx`, `src/lib/songbookPagination.ts`, `src/pages/Editor.tsx` |
| Carimbo | `src/components/content/CurationStamp.tsx` |
| Capa PDF | `src/lib/repertoirePdfCover.ts`, `src/components/repertoire/PrintableCover.tsx` |
| Songsterr UI | `UnifiedImportModal.tsx` (aba Songsterr). `SongsterrImportModal.tsx` morto. |
| Songsterr client | `src/services/repertoireService.ts` (`search`/`enrich`/`save`/`downloadGp`) |
| Songsterr edges | só no Supabase: `songsterr-search`, `songsterr-import`, `songsterr-enrich`, `songsterr-gp-download` |
| AlphaTab | `src/components/music/AlphaTabPlayer.tsx`, `src/lib/songsterr-converter/` |

Supabase: `rkfszavfqplhorvfpkcq`. Print de apostila ainda aponta `APP_URL` de produção.

---

## Protocolo deste arquivo

Depois de um corte que muda o estado do produto:

- Mover o item de Radar → Feito (ou Pendente, se recuou).
- Reescrever **Próximo corte** em uma linha.
- Se nasceu decisão travada, uma linha em Feito ou numa tabela curta — spec completa continua em `docs/superpowers/`.
- Data no topo.
)
