# Caderno via motor de repertório — plano

> Execução neste session. Spec: `docs/superpowers/specs/2026-08-13-caderno-repertorio-motor-design.md`

**Goal:** Caderno usa a folha de repertório para ajeitar a música e uma receita (violão/teclado/ukulele/tab) para montar o PDF.

**Architecture:** `NotebookPrintRecipe` no assembler; `RepertoireSheet` overlay no detalhe; dialog antes de gerar.

---

### Task 1: Recipe + assembler
- Create `src/lib/notebookPrintRecipe.ts`
- Modify `adaptRepertoireItem` / `buildNotebookMaterialBlocks`
- Tests in existing assembler/adapter files

### Task 2: UI
- Dialog de receita no Gerar PDF
- Ajeitar + carimbo no `NotebookDetailModal`
- Overlay `RepertoireSheet`
