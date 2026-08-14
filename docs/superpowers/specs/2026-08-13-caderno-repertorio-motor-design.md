# Caderno de repertório — passa pelo motor da folha

Data: 2026-08-13  
Status: aprovado em conversa  
Corte: o caderno compila músicas já ajeitadas no Repertório; não inventa um terceiro editor de cifra.

## Problema

Gerar PDF do caderno só empilha título + grade de violão + texto da cifra. O professor não escolhe teclado, tab ou ukulele. Não vê se a música foi curada. Não abre o motor da folha para ajeitar antes de mandar ao aluno.

A folha (`RepertoireSheet`) já tem esse motor: Exibir Violão / Teclado / Tablatura, biblioteca, “sem diagrama”, save no `repertoire`.

## Decisões

| Tema | Escolha |
|---|---|
| Fonte da música | Sempre a linha em `repertoire`. Caderno não clona cifra. |
| Onde ajeita | Overlay da mesma `RepertoireSheet` em cima do caderno. Salvou, volta à lista. |
| Receita de impressão | No caderno, no Gerar PDF. Padrão = instrumento do caderno. |
| Override por música | Radar. Corte 1: uma receita para o caderno inteiro. |
| Curadoria | Carimbo na lista do caderno. `draft`/`null` = “Sem curadoria”. `approved`/`published` = curada. Nome do professor quando `curated_by` existir. |
| Destino do PDF | Igual ao corte anterior: rascunho `repertoire_sheet` → `/editor/:id` com capa. |
| Exercícios | Fora. Mesma ideia, outro motor, outro corte. |

## Receita

```ts
type NotebookPrintRecipe = {
  guitar: boolean
  piano: boolean
  ukulele: boolean
  tab: boolean
}
```

Padrão a partir de `collection.instrument`:

- violão / guitarra → guitar + tab
- piano → piano
- ukulele → ukulele
- baixo → guitar
- universal / canto → guitar + piano + tab

Persistida em `tags` como `print-recipe:guitar+piano+tab`. Próximo Gerar PDF reabre com a última receita.

Montador:

- `guitar` ou `ukulele` → `chord_grid` (`strings: 4` se ukulele)
- `piano` → `keyboard_grid` com os nomes dos acordes (preview resolve na `chord_library` piano)
- `tab: false` → cifra sem blocos `[Tab` e linhas de tablatura
- Nenhum diagrama ligado e sem cifra → só cabeçalho, não bloqueia

## Interface

**Lista do caderno (detalhe)**  
Coluna Curadoria + botão Ajeitar. Clique na música também abre a folha.

**Gerar PDF**  
Dialog: toggles Violão / Teclado / Ukulele / Tablatura → Confirmar → `createDraftMaterialFromNotebook` com a receita → editor.

**Folha overlay**  
Mesma `RepertoireSheet` da página Repertório (`open`, `onSaved`). Professor tira acorde, completa diagrama, liga Exibir. Save grava em `repertoire` (base da escola / curadoria).

## Fora

- Receita diferente por faixa
- Publicar tela nova na Base Curada
- Editar paginação no caderno
- Caderno de exercícios
- Gravura Chediak com pauta
