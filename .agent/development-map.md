# LA Journey — mapa de desenvolvimento

Atualizado: 2026-08-14  
Quem atualiza: o agente, no fim de cada corte. Não duplicar specs aqui — só o estado.

**Próximo corte:** capa ilustrada no PDF unificado + nome do professor no carimbo de curadoria.

## Como retomar

1. Ler este arquivo inteiro.
2. Ler a spec do corte atual (links abaixo), não o chat antigo.
3. Não misturar working tree sujo (image-gen / Iconify / Recraft) no PR de caderno/repertório.
4. No fim do corte: mover itens entre Feito / Radar / Pendente, atualizar a data e o “Próximo corte”.

---

## Agora

Caderno de repertório + PDF da folha estão **no ar** em produção.

- App: https://la-journey.vercel.app
- PRs: [#1](https://github.com/LucianoAlf/la-journey/pull/1) motor da folha no caderno, [#2](https://github.com/LucianoAlf/la-journey/pull/2) fix do build (`resolvePianoChordFromLibrary`)
- Branch de trabalho: `feat/caderno-repertorio-montador` (já mergeada em `main`)
- Conferir: `/biblioteca` → Exercícios → Cadernos de Repertório → Caderno do Chiquinho

---

## Feito

### Produto caderno

- Caderno é máquina de folha do aluno, não catálogo. Sempre bloco `cover`; templates `modern/elegant/colorful/bold/classic/minimal`.
- Montador: capa + `page_break` + uma música por página. Cada Gerar PDF cria **rascunho novo** `repertoire_sheet`.
- Ajeitar abre o mesmo overlay `RepertoireSheet`. Save grava na linha `repertoire` (caderno não clona cifra).
- Receita de impressão no caderno inteiro (violão / piano / ukulele / tab), tag `print-recipe:…`. Override por música = radar.
- Carimbo de curadoria na lista (`draft`/`null` = Sem curadoria). **Nome do professor ainda não entra** — `CurationStamp` aceita `curatorName`, o modal não passa `curated_by`.

### PDF unificado (folha = caderno = Download do editor em songbook)

Motor compartilhado: `generateRepertoireBookPdf`. Monta `PrintableCifra` off-screen a 794px. **Não** html2canvas o canvas do editor (`transform: scale(0.75)` gerou PDF quebrado de 67MB).

Chrome travado com o usuário:

- Página 1 da música: header HTML completo (título, artista, tom, logo).
- Página 2+: nome da música à esquerda | “Repertório” à direita, ar extra sob a linha.
- Rodapé: **LA Music** à esquerda, **`n / n`** à direita. Sem “X de Y”, sem “Material exclusivo”.
- Acorde + letra juntos (`data-pdf-break`). Cifras `#3b5998` / `#1a1a1a` via `SongbookCifra`.

**Capa ilustrada ainda não entra nesse PDF.** Vive só no rascunho do editor. O PDF hoje é pilha de folhas.

Arquivo de referência local: `C:\Users\Texeira\Downloads\Caderno do Chiquinho  teste browser.pdf`

### Specs deste corte

- `docs/superpowers/specs/2026-08-13-caderno-repertorio-montador-design.md`
- `docs/superpowers/specs/2026-08-13-caderno-repertorio-motor-design.md` (aprovada)
- Plano: `docs/superpowers/plans/2026-08-13-caderno-repertorio-motor.md`

---

## Radar (ordem combinada em 14/08)

1. **Capa no PDF unificado** — a mesma capa do rascunho (template + imagem) vira página 1 do PDF, antes das folhas.
2. **Nome do professor no carimbo** — `curated_by` na lista do caderno.
3. **Auditoria do motor de repertório** — Cifra Club, Songsterr e outras fontes: o que entra, o que quebra, se a edição persiste. Fazer **antes** de receita-por-música / caderno de exercício / apostila. É o que alimenta o caderno.
4. Receita diferente por música.
5. Cadernos de exercício (mesma ideia, outro motor).
6. Apostila / Download do editor quando **não** é songbook (hoje Browserless `generate-pdf` → `/print/:id` com `APP_URL` de produção).

---

## Pendente / fora

- Gravura estilo Chediak
- Ligar aluno / portfólio ao caderno
- Publicar tela nova na Base Curada
- Unificar apostila com o motor da folha (não misturar os dois canos sem decisão)

### Working tree local, não shipado

Não entrar no PR de capa/repertório:

- Image-gen, Recraft SVG, Iconify, import de imagem
- Ajustes de `ai-config` / Gemini / Integracoes
- Edge functions locais `cifra-club-import` / `cifra-club-batch` (relevantes para o item 3 do radar, ainda untracked)
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
| Parser cifra | `src/lib/cifraBlocks.ts` |
| Montador | `src/lib/notebookMaterialAssembler.ts` |
| Receita | `src/lib/notebookPrintRecipe.ts` |
| Folha UI | `src/components/repertoire/RepertoireSheet.tsx`, `PrintableCifra.tsx` |
| Caderno UI | `NotebookDetailModal.tsx`, `NotebookPrintRecipeDialog.tsx`, `RepertoireNotebookTab.tsx` |
| Preview/editor songbook | `SongbookCifra.tsx`, `src/lib/songbookPagination.ts`, `src/pages/Editor.tsx` |
| Carimbo | `src/components/content/CurationStamp.tsx` |

Supabase: `rkfszavfqplhorvfpkcq`. Print de apostila ainda aponta `APP_URL` de produção.

---

## Protocolo deste arquivo

Depois de um corte que muda o estado do produto:

- Mover o item de Radar → Feito (ou Pendente, se recuou).
- Reescrever **Próximo corte** em uma linha.
- Se nasceu decisão travada, uma linha em Feito ou numa tabela curta — spec completa continua em `docs/superpowers/`.
- Data no topo.
)
