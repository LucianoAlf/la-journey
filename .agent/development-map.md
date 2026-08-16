# LA Journey — mapa de desenvolvimento

Atualizado: 2026-08-16 (noite) — Ovelha 45 compassos no gerador  
Quem atualiza: o agente, no fim de cada corte. Não duplicar specs aqui — só o estado.

**Próximo corte:** Folha deitada (orientação de material + PDF). Playalong (vídeo + áudio + cursor) fica depois.

## Como retomar

1. Ler este arquivo inteiro.
2. Ler a spec do corte atual (links abaixo), não o chat antigo.
3. Não misturar working tree sujo (image-gen / Iconify / Recraft) no PR de caderno/repertório.
4. No fim do corte: mover itens entre Feito / Radar / Pendente, atualizar a data e o “Próximo corte”.

---

## Agora

Lead sheet corte A **em produção**. Ovelha corte 1 **na branch `feat/ovelha-slash`**: barras rítmicas, Ritmo + Drawer Compasso, e os **45 compassos** do vídeo no gerador (`src/lib/ovelhaNegraBeats.ts`, sonda `/dev/alphatab-fixtures`). Folha deitada é o próximo. Áudio didático continua em `feat/audio-didatico` — não misturar.
- Spec Ovelha corte 1: `docs/superpowers/specs/2026-08-16-ovelha-negra-slash-notation-design.md`
- Plano Ovelha corte 1: `docs/superpowers/plans/2026-08-16-ovelha-negra-slash-notation.md`
- Spec lead sheet A: `docs/superpowers/specs/2026-08-16-lead-sheet-cifra-pauta-design.md`
- **Playalong (corte futuro):** AlphaTab 1.8 tem backing track nativo — `PlayerMode.EnabledBackingTrack`, `score.backingTrack`, `BackingTrackSyncPoint[]`, `api.updateSyncPoints()`, tag `\sync`, output por `HTMLAudioElement`. Decisão travada: MP3 do Suno + sync points, **não** playhead calculado por BPM (quebra em métrica mista e em repetição).
- Áudio didático corte 1 está em `feat/audio-didatico` (Suno V5.5 + Lyria fallback + Music.AI). **Não** misturar neste PR. Smoke no Chrome ainda falta.
- Spec áudio: `docs/superpowers/specs/2026-08-15-audio-didatico-lyria-musicai-design.md`
- Plano áudio: `docs/superpowers/plans/2026-08-15-audio-didatico-lyria-musicai.md`
- Stash local `wip-not-audio-didatico` tem image-gen/Recraft. Não dar pop nesta branch.
- Produção: https://la-journey.vercel.app — pauta já no ar. Preview Tone.js no Simple Browser do Cursor não toca.

---

## Feito

### Ovelha corte 1 — barras rítmicas na pauta (16/08, tarde)

Sonda aprovada. `{slashed}` na pauta de 5 linhas, `[A]` só na caixa (texto longo no Drawer — senão cobre o D), `\ts` no meio, `\ro`/`\rc`, `%` em compasso vazio, Fine em losango. Fileira **Ritmo** (altura neutra `B/4`) e Drawer **Compasso**. Branch `feat/ovelha-slash`.
- Spec: `docs/superpowers/specs/2026-08-16-ovelha-negra-slash-notation-design.md`
- Plano: `docs/superpowers/plans/2026-08-16-ovelha-negra-slash-notation.md`
- **45 compassos** do vídeo no gerador (`src/lib/ovelhaNegraBeats.ts`) e na sonda: 4 telas, 12 `%`, três `2/4`, Solo `7x`, Fine em losango. Ritmo interno (levada, vocalize) sai do mapeamento das telas. Página de fixtures é DEV — professor em produção usa Ritmo/Drawer na A4.

### Áudio didático — pesquisa e credenciais (15/08)

Spec aprovada. Generate Lyria ao vivo ok (Clip + Pro HTTP 200). Music.AI PAYG + US$ 20 + key no `.env` e na Edge. Gemini já listava e gerou os dois modelos. Áudio em `steps[].content[]`.
- Spec: `docs/superpowers/specs/2026-08-15-audio-didatico-lyria-musicai-design.md`
- Implementação: duas Edges (`lyria-generate`, `musicai-transcribe`), tabela `practice_audio`, bucket `audio-tracks`. A partir de `origin/main`.

### Áudio didático — decisão Suno (16/08, meio-dia)

Suno V5.5 é o generate. Vocalize com “ah” no Suno (instrumental off) acertou C e a voz. Levada C–F–G: tom ok, acordes extras. Lyria no mesmo prompt saiu Eb / 180 BPM. Custo: ~12 créditos/generate (~US$ 0,06), 2 takes. Pacote de 1.000 = US$ 5. Lyria clip ~US$ 0,04 mas não trava tom. Lyria fica fallback + experimentos de textura, não aula com tom marcado.

### Áudio didático corte 1 — código + Edges (16/08)

Branch `feat/audio-didatico`. Modal de receita, `practice_audio` (migration aplicada), libs + testes, service, botões em Exercícios e na ficha. Edges `lyria-generate` e `musicai-transcribe` deployadas. Aba Enviar visível e inerte. Smoke no Chrome ainda falta.

### Lead sheet corte A — cifra no beat + escrita na pauta (16/08, noite)

`Beat.cifra` persiste e o AlphaTab desenha `{ch}`. O campo **CIFRA (K)** saiu da fileira à direita: escreve-se na faixa do acorde acima da nota, com camada de acordes inteiros (C, Cm, C7, Cmaj7…). Abre por `K`, botão Cifra na fileira ou pela seção do Drawer, que mostra a cifra da nota selecionada. Commit no Enter/Tab/clique fora — não a cada tecla.
- **Loop de render corrigido:** o repaint da seleção chamava `api.render()` em `renderFinished` e o `postRenderFinished` repintava de novo — a pauta piscava sem parar, o foco caía e o clique virava nota. Repaint agora tem chave `alphaIdx|tex` + instância da API.
- **Botão Cifra “não fazia nada”:** o `previewStateKey` do `EditableBlock` não carregava o estado da cifra, então o memo engolia a abertura — o Drawer acendia e a folha continuava com o alvo fechado. Chave agora leva `cifra:editing|value`.
- **Altura do campo:** o offset chutado (`h*0.28`) nascia encostado na nota. `chordRowY` mede o `<text>` das cifras já gravadas e alinha o campo com elas; sem nenhuma cifra na pauta cai em `h*0.55`.
- Alvo fechado deixou de ser `+`: mostra a palavra “cifra” em itálico serif na própria faixa do acorde.
- Esc/V em captura no Editor não roubam mais a tecla enquanto o campo de cifra está aberto.
- **Conferido na A4 (16/08, meio-dia):** Intervalos a partir de Dó — G7, Cmaj7, Dm7, C6, G7 na faixa do acorde; overlay abre; Drawer mostra a cifra da nota e **Escrever**.
- Spec: `docs/superpowers/specs/2026-08-16-lead-sheet-cifra-pauta-design.md`

### Fechamento da pauta: compassos por linha + fluidez (15/08)

- **Por linha** (1–8, padrão 4) na lateral: AlphaTab `UseModelLayout` + `defaultSystemsLayout` — não é mais 1 compasso por sistema. MuseScore/Finale: Fit Measures / Add System Breaks.
- Atalhos de pular compasso: `Ctrl/Cmd+←/→` (MuseScore 4) e `Tab` / `Shift+Tab`.
- Livre/Compasso ocupam a largura inteira da pílula (50/50). Fileira de duração deixa de abrir um vão no meio.
- Stretch da gravura baixou (1.8/3.5 → 0.85/1.0). Resize do AlphaTab não dispara re-tex no meio do render.
- Fechamento UX: Compasso e Por linha na mesma linha, cada um com rótulo em cima do controle; layout Parchment (6 por linha vale); Esc sai da escrita (Sibelius, listener em captura — não some o bloco no 1º toque); V também sai da escrita; sem ícone de seta na fileira; barras pretas; setas do indicador com stopPropagation.
- Clique fluido (15/08, tarde): clique em nota SEMPRE seleciona (MuseScore/Finale) — nunca substitui/insere; vazio armado insere, vazio desarmado solta a seleção. Hit-test por coluna do beat em `notationBeatHit.ts`. Ctrl+Z/Y e undo do header ficam na sessão. `previewStateKey` carrega tex/seleção/armed.
- **Raiz da oitava no clique (15/08, noite):** o preview idle gera AlphaTex com `octaveOffset` default `-1` (`C/4` → `c3`). A sessão forçava `octaveOffset: 0` (`C/4` → `c4`) — clicar no bloco trocava o gravador e subia tudo uma oitava. `sessionToAlphaTex` agora usa o mesmo default do preview. Teste: sessão e preview emitem o mesmo token. Bloco "Intervalos a partir de Dó" restaurado no banco (14 beats).
- **Seleção = a própria nota (15/08, noite):** a pílula rosa no `visualBounds` da coluna ficava à direita da cabeça. A seleção agora pinta a gravura no modelo do AlphaTab (`NoteStyle` / `BeatStyle`, `#c41e3a`) — a glifa da nota fica vermelha, sem overlay. Som ao selecionar (já existia) com mute na fileira (alto-falante); persiste em `localStorage`.

### Escrita fluida na pauta A4 (15/08)

- Teclado completo via `notationInlineKeyboard`: A–G, Shift+acorde, 1–7/numpad, setas, Ctrl+oitava, R, 0, ponto, `#`/`-`/`=`, Esc em dois tempos. Foco no input ao hidratar o bloco.
- Feedback: destaque accent no beat (`boundsLookup`, last-index para grace, offset+zoom), nota-fantasma com ledger/badge, som `playNotePreview` com acidente.
- Fileira em três grupos (durações | pausa/ponto/acidentes+♮ | indicador `C4 · Semínima · n/m` + ‹ ›).
- Gravura `NOTATION_DIDACTIC_SCALE = 1.35` em canvas, modal e preview. Ritmo/tab não mudam.
- Render sem spinner nos updates + `TexRenderQueue`. Patch de `render_data` com debounce 400 ms; flush no save/duplicar/biblioteca; undo global cancela o pendente.
- Conferência local + merge em `main` (15/08) para produção. Rollback `?notationInline=off`. Validar no ar o som, as setas e o tamanho 1.35.
- Spec: `docs/superpowers/specs/2026-08-15-escrita-fluida-pauta-design.md`
- Plano: `docs/superpowers/plans/2026-08-15-escrita-fluida-pauta.md`

### Notação in-place na A4 (15/08)

- Clique no bloco de notação seleciona e mostra fileira de duração acima da pauta + ferramentas na lateral direita. Não abre modal. Segundo clique / A–G escreve na folha.
- Motor AlphaTab; modelo `beats` → `beatsToAlphaTex`; `render_data` local + autosave / Salvar Alterações persiste.
- Biblioteca → Notação continua no `NotationEditorV2`. Rollback: `?notationInline=off` (botão Editar Notação volta).
- Spec: `docs/superpowers/specs/2026-08-15-notacao-inplace-a4-design.md`
- Plano: `docs/superpowers/plans/2026-08-15-notacao-inplace-a4.md`

### Modal Editar notação = AlphaTab do canvas (15/08)

- A pauta do modal é `AlphaTabViewer` com purpose `canvas-notation-score`, layout `page`, scale `1`, largura da folha A4.
- `beats` → `beatsToAlphaTex` preserva duração AlphaTex (`:2` → mínima) e barras pedagógicas em tempo livre.
- Rollback: `?notationSurface=svg` devolve o SVG + preview. `NotationSvgEditor` permanece.
- Spec: `docs/superpowers/specs/2026-08-15-notacao-alphatab-folha-design.md`

### Cadernos de exercício (15/08)

- Tabelas dedicadas `exercise_collections` + `exercise_collection_items` (migration `20260814200000_exercise_collections.sql`, aplicada em `rkfszavfqplhorvfpkcq`). Só `exercise_library`. Sem unificar com repertório.
- Montador `buildExerciseNotebookBlocks`: capa + `page_break` + cabeçalho (título, categoria, nível, minutos) + blocos da biblioteca.
- Service `createDraftMaterialFromExerciseNotebook` → rascunho `generated_materials` `type: exercise_sheet`. **Nunca** `generateRepertoireBookPdf`.
- UI: `ExerciseNotebookTab` / card / form / detalhe / `AddExerciseModal`. Picker só dentro do caderno.
- Repertório: `/repertorio?section=cadernos` renderiza `RepertoireNotebookTab`. Exercícios não lista mais cadernos de música.
- Spec implementada: `docs/superpowers/specs/2026-08-14-caderno-exercicio-montador-design.md`
- Plano: `docs/superpowers/plans/2026-08-14-caderno-exercicio-montador.md`

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
- Caderno de exercício: `docs/superpowers/specs/2026-08-14-caderno-exercicio-montador-design.md` (implementada)
- Plano: `docs/superpowers/plans/2026-08-14-caderno-exercicio-montador.md`

### Specs de notação

- Folha AlphaTab (modal = mesma gravura): `docs/superpowers/specs/2026-08-15-notacao-alphatab-folha-design.md`
- In-place A4 (escrever na pauta): `docs/superpowers/specs/2026-08-15-notacao-inplace-a4-design.md`
- Plano in-place: `docs/superpowers/plans/2026-08-15-notacao-inplace-a4.md`

---

## Radar (ordem combinada em 16/08, tarde)

1. **Folha deitada (landscape)** — orientação de material + PDF. Hoje A4 é retrato fixo (`794×1123` em `src/lib/a4Preview.ts`, `.a4-page` no CSS, três serviços de PDF em portrait). Cuidado: o `layout: 'horizontal'` que já usamos é `LayoutMode.Horizontal` do AlphaTab (sistemas em linha contínua), não folha deitada.
2. Apostila / Download do editor quando **não** é songbook (Browserless `generate-pdf` → `/print/:id`).
3. Escrita avançada na pauta: ligadura, articulação, dinâmica, letra, voz 2, copiar/colar, seleção.
4. **Playalong com cursor no compasso** — backing track MP3 (Suno) + `BackingTrackSyncPoint` do AlphaTab (`PlayerMode.EnabledBackingTrack`, `api.updateSyncPoints()`, tag `\sync`). Exige ligar o player, hoje desligado em `src/lib/alphaTabSettings.ts` para os nove propósitos. **Não** calcular playhead por BPM: quebra em métrica mista e em repetição.
5. Tom/capo no PDF: Cifra Club “Tom: Ebm (com forma de Dm) + Capotraste 1ª casa” — hoje grava Ebm e `capo=0`.
6. **Áudio didático corte 1 → produção** — código em `feat/audio-didatico`. Smoke no Chrome ainda falta. Não puxar na frente da folha deitada.
7. **Áudio didático corte 2 (Music.AI)** — upload MP3/WAV + stems (sem bateria/baixo/voz) + pitch/tempo. Motor já ligado (`MUSIC_AI_API_KEY`, `musicai-transcribe`). Slugs confirmados nesta conta: `stem-separation-suite`, `stems-vocals-accompaniment`, `isolate-drums`, `isolate-bass`, `isolate-piano`, `isolate-vocals`, `pitch-shift`, `tempo-shift`. Job na nuvem (segundos), não Moises Live. Mixer local depois da 1ª separação.
8. **Soundslice (fase 3)** — player de partitura + vídeo/MP3 sincronizado (playhead, loop, slowdown). **Não** substitui Music.AI: a API deles não transcreve áudio→cifra/pauta; o “Transcribe” é editor humano + scanner de PDF (OCR de partitura, sem API). Embed no LA Journey exige plano **Licensing** (~US$ 100/mês, 200 users). PUT de MusicXML/GP na API precisa permissão especial. Teacher (US$ 20/100 alunos) tem Data API mas não embed comercial. Doc: https://www.soundslice.com/help/data-api/

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
| Caderno de exercício | Download no editor (`exercise_sheet`) | Apostila (Browserless) — **não** o motor da folha | No ar o rascunho; PDF = próximo corte |
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
| Caderno de exercício | `src/lib/exerciseNotebookAssembler.ts`, `src/services/exerciseCollectionService.ts`, `ExerciseNotebookTab.tsx` |
| Preview/editor songbook | `SongbookCifra.tsx`, `src/lib/songbookPagination.ts`, `src/pages/Editor.tsx` |
| Carimbo | `src/components/content/CurationStamp.tsx` |
| Capa PDF | `src/lib/repertoirePdfCover.ts`, `src/components/repertoire/PrintableCover.tsx` |
| Songsterr UI | `UnifiedImportModal.tsx` (aba Songsterr). `SongsterrImportModal.tsx` morto. |
| Songsterr client | `src/services/repertoireService.ts` (`search`/`enrich`/`save`/`downloadGp`) |
| Songsterr edges | só no Supabase: `songsterr-search`, `songsterr-import`, `songsterr-enrich`, `songsterr-gp-download` |
| AlphaTab | `src/components/music/AlphaTabPlayer.tsx`, `src/lib/songsterr-converter/` |
| Áudio didático | `src/lib/practiceAudio.ts`, `practiceAudioRecipe.ts`, `PracticeAudioModal.tsx`, `practiceAudioService.ts` |
| Edges áudio | `supabase/functions/lyria-generate`, `musicai-transcribe` |

Supabase: `rkfszavfqplhorvfpkcq`. Print de apostila ainda aponta `APP_URL` de produção.

---

## Protocolo deste arquivo

Depois de um corte que muda o estado do produto:

- Mover o item de Radar → Feito (ou Pendente, se recuou).
- Reescrever **Próximo corte** em uma linha.
- Se nasceu decisão travada, uma linha em Feito ou numa tabela curta — spec completa continua em `docs/superpowers/`.
- Data no topo.
)
