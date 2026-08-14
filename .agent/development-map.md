# LA Journey — mapa de desenvolvimento

Atualizado: 2026-08-14  
Quem atualiza: o agente, no fim de cada corte. Não duplicar specs aqui — só o estado.

**Próximo corte:** Auditoria Songsterr — search/import/GP, o que entra, se a edição persiste.

## Como retomar

1. Ler este arquivo inteiro.
2. Ler a spec do corte atual (links abaixo), não o chat antigo.
3. Não misturar working tree sujo (image-gen / Iconify / Recraft) no PR de caderno/repertório.
4. No fim do corte: mover itens entre Feito / Radar / Pendente, atualizar a data e o “Próximo corte”.

---

## Agora

Corte Spotify/YouTube/PDF da ficha vai no git (sem Iconify/Recraft). Próximo: Songsterr.

- App local: http://127.0.0.1:3001 — produção: https://la-journey.vercel.app
- Conferido na Vercel: Fé (IZA) toca no embed HTTPS. HTTP local ainda pode mostrar “Vídeo indisponível”.
- Branch: `feat/caderno-repertorio-montador`. Não misturar image-gen/Iconify/Recraft.

---

## Feito

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

### Specs do caderno

- `docs/superpowers/specs/2026-08-13-caderno-repertorio-montador-design.md`
- `docs/superpowers/specs/2026-08-13-caderno-repertorio-motor-design.md` (aprovada)
- Plano: `docs/superpowers/plans/2026-08-13-caderno-repertorio-motor.md`

---

## Radar (ordem combinada em 14/08)

1. **Auditoria Songsterr** — search/import/GP, o que entra, se a edição persiste.
2. Backfill YouTube/Spotify nas 11 Cifra Club que ainda não têm (Completar com IA ou re-import).
3. Duplicatas na `chord_library` piano (3–4 linhas por nome) — a conta na ficha já não infla, os dados ainda estão sujos.
4. Trazer `cifra-club-search` para o git (hoje só no Supabase).
5. Receita diferente por música.
6. Cadernos de exercício.
7. Apostila / Download do editor quando **não** é songbook (Browserless `generate-pdf` → `/print/:id`).
8. Tom/capo no PDF: Cifra Club “Tom: Ebm (com forma de Dm) + Capotraste 1ª casa” — hoje grava Ebm e `capo=0`.

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

Supabase: `rkfszavfqplhorvfpkcq`. Print de apostila ainda aponta `APP_URL` de produção.

---

## Protocolo deste arquivo

Depois de um corte que muda o estado do produto:

- Mover o item de Radar → Feito (ou Pendente, se recuou).
- Reescrever **Próximo corte** em uma linha.
- Se nasceu decisão travada, uma linha em Feito ou numa tabela curta — spec completa continua em `docs/superpowers/`.
- Data no topo.
)
