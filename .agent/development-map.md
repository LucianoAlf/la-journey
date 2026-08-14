# LA Journey — mapa de desenvolvimento

Atualizado: 2026-08-14  
Quem atualiza: o agente, no fim de cada corte. Não duplicar specs aqui — só o estado.

**Próximo corte:** auditoria Songsterr (o que entra, GP, se a edição persiste).

## Como retomar

1. Ler este arquivo inteiro.
2. Ler a spec do corte atual (links abaixo), não o chat antigo.
3. Não misturar working tree sujo (image-gen / Iconify / Recraft) no PR de caderno/repertório.
4. No fim do corte: mover itens entre Feito / Radar / Pendente, atualizar a data e o “Próximo corte”.

---

## Agora

Auditoria Cifra Club (primeira fatia) pronta para ir ao ar. Caderno/PDF do corte anterior continua em produção.

- App local: http://127.0.0.1:3001 — produção: https://la-journey.vercel.app
- Conferir: Repertório → Fé (IZA). Completar com IA puxa YouTube/BPM/Spotify. Header mostra os links. Gerar PDF da folha usa o motor unificado. Duplo clique no diagrama abre Editar Acorde.
- PDF Chiquinho: `C:\Users\Texeira\Downloads\Caderno do Chiquinho  teste browser.pdf` (capa ok; diagramação fina no editor)
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
