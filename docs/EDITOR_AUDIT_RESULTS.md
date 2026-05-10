# Auditoria dos Editores Musicais

Data: 2026-05-10

Escopo desta passada: diagnostico e documentacao. Nenhuma correcao de codigo foi aplicada.

## ChordEditor

### Resumo

Status geral: [OK] paridade funcional entre editor e canvas.

O editor de acorde individual usa renderizacao propria em canvas para edicao e preview em tempo real (`ChordEditor.tsx`). O canvas/PDF usa `ChordDiagram.tsx`, que encapsula SVGuitar. Para blocos `chord_grid`, o `MaterialPreview` tambem renderiza cada acorde com `ChordDiagram`, entao o renderer final do canvas e o mesmo componente usado para os diagramas reaproveitaveis.

Evidencias coletadas:

- Browser: no bloco "Triades no Violao", o canvas mostra os acordes C, Cm, C+ e Cdim como botoes/diagramas. Ao clicar em C, o dialog "Editar Acorde" abriu com nome `C`, traste inicial `1a casa` e botao `Salvar na Grade`.
- Browser: console sem warnings/errors durante a abertura do editor de acorde.
- Codigo: `BlockChordGrid` resolve strings pela `chord_library`, cai para fallback local apenas quando permitido, e passa `fingers`, `barres`, `muted` e `position` para `ChordDiagram`.
- Codigo: `openChordEditorForGrid()` converte o acorde clicado com `positionsToState()`, preservando dedos, pestanas, cordas abertas/mudas e traste inicial.
- Banco: a `chord_library` tem acordes de pestana como `F` e `Bm` com `barres` estruturado; tambem existem acordes com `position > 1`, usados para validar traste inicial acima da 1a casa.
- Banco/codigo: acordes com tensao como `C7M(9)` sao normalizados por candidatos (`Cmaj9`, `Cmaj7(9)`, `CM9`) e a biblioteca possui `Cmaj9` com `positions` completos.

### Casos Testados

| Caso | Status | Resultado |
| --- | --- | --- |
| Abrir "Trocar Acorde" / clicar em acorde existente no `chord_grid` | [OK] Funcionando | Clicar no diagrama `C` abriu o editor com `Nome = C` e `Traste inicial = 1a casa`. O fluxo correto para editar um acorde especifico da grade e clicar no proprio diagrama no canvas. |
| Preview em tempo real ao editar acorde | [OK] Funcionando | O `ChordEditor` redesenha o preview a cada mudanca de `state` (`dots`, `openMuted`, `barres`) via `renderAll()`. A mesma estrutura e usada para converter de volta em `fingers`, `barres` e `muted`. |
| Salvar acorde editado e atualizar canvas | [OK] Funcionando no canvas / [ATENCAO] risco de persistencia | `handleChordGridSave()` atualiza `render_data.chords[]` do bloco e o canvas rerenderiza. Ponto de atencao: nesta funcao nao ha chamada explicita a `queueBlockAutosave(chordGridTargetBlockId)`, entao a persistencia imediata no banco depende de outro fluxo de salvamento/manual. Nao corrigido nesta passada. |
| Acorde com pestana (F/Bm) | [OK] Funcionando | `F` e `Bm` existem na `chord_library` com `barres` estruturado. `ChordEditor` converte pestanas com `positionsToState()`, e `ChordDiagram` passa `barres` para SVGuitar. |
| Acorde com traste inicial diferente de 1a casa | [OK] Funcionando | `ChordDiagram` recebe `position`, normaliza frets absolutos para relativos quando `position > 1`, e configura SVGuitar com `position`. A biblioteca contem acordes com `position` 3, 4, 6, 7, 8 e 9. |
| Acorde com tensao (C7M(9)) | [OK] Funcionando | O resolver gera candidatos BR->US e encontra `Cmaj9` na `chord_library`. Quando resolvido, o canvas recebe objeto estruturado com `source: 'chord_library'`, `fingers`, `barres`, `muted` e `position`. |

### Observacoes

- A acao da toolbar contextual em um bloco `chord_grid` chama `openChordEditorForGrid(selectedBlock.id)` sem um acorde especifico; isso funciona como adicionar novo acorde a grade. Para trocar um acorde ja existente, o caminho validado e clicar no diagrama do acorde dentro da grade.
- O ponto mais importante para backlog tecnico e a persistencia do save da grade: `handleChordGridSave()` atualiza o estado local, mas nao agenda autosave explicitamente. Isso nao quebrou a paridade visual, mas merece uma correcao pequena em uma passada separada.
