# Lead sheet — cifra em cima do compasso

Data: 2026-08-16  
Status: corte A conferido na A4 (16/08)  
Corte: o professor escreve o nome do acorde no beat; o AlphaTab desenha em cima da pauta.

Alvos visuais (não importar PDF neste corte):

- Ovelha Negra (Rita Lee): D | G no mesmo compasso, cifra acima da pauta.
- Batucaê (Luiz Guima): Gm, C7, Eø, D7(#9) acima da melodia escrita.

Próximo corte (não misturar): Ovelha completa — barras rítmicas (slash) + folha deitada (horizontal).

## Problema

O professor precisa de lead sheet na A4: cifra no compasso, não só no bloco de texto da ficha. O modelo já tem `Beat.cifra` e o AlphaTex já emite `{ch "G7"}`. A sessão in-place **zera** a cifra (`sessionToAlphaTex` manda `cifra: null`) e a UI nunca preenche o campo. Toda nota nova nasce muda.

## Decisões travadas

| Tema | Escolha |
|---|---|
| Superfície | Pauta A4 in-place **e** modal Biblioteca → Notação. Mesmo campo, mesma persistência |
| Onde mora | `notation_data.beats[].cifra` (string ou null). Já no `Beat` do `beatsToAlphaTex` |
| Gravura | AlphaTex `{ch "Gm"}` no beat. Sem diagrama de braço neste corte |
| Dois acordes no compasso | Dois beats com cifra (ex.: 1ª semínima D, 3ª G). Sem “cifra de compasso” à parte |
| Texto | O que o professor digitar, aparado. Máx. 24 caracteres. Vazio = null. Sem reescrever qualidade (Eø, C7(#9), Bbmaj7 ficam) |
| Teclado | `A`–`G` continuam nota. `K`, botão **Cifra** na fileira, botão **Acordes na nota** no Drawer, ou clique no cursor acima da nota abrem a cifra. Esc / Enter devolve o foco à pauta. Com o campo focado, teclas não inserem nota |
| Transpor ↑↓ da nota | Não mexe na cifra (é pitch da melodia). Transpor cifra de repertório continua na ficha |
| Trocar a nota do beat | A cifra **fica** (`replaceNote` espalha o beat) |
| Nota nova / pausa nova | `cifra` ausente |
| Folha deitada, slash, segno, playhead, import PDF | Fora. Radar: Ovelha (slash + horizontal), escrita avançada, Soundslice |

## O que não se constrói

- Importar Batucaê.pdf / OCR
- Barras rítmicas (cabeça em X / slash)
- Letra de seção [A], segno, coda, volta
- Diagrama de violão em cima da pauta
- Campo de cifra no bloco de texto ChordPro (já existe na ficha)

## Peças reutilizadas

| Peça | Uso |
|---|---|
| `Beat.cifra` + `{ch "…"}` | Já testado em `beatsToAlphaTex.test.ts` |
| `InlineBeat` / hydrate / `sessionToAlphaTex` | Passar `cifra` em vez de null |
| `NotationDurationStrip` | Botão **Cifra** (K) — não é mais o campo de texto |
| `useNotationInlineSession.updateBeat` | Grava no beat selecionado |
| `transposeChord` | Não neste corte |

## UX

O texto **não** vai para a fileira de duração nem para o Drawer. Escreve-se na **faixa em que o AlphaTab grava a cifra**, acima da nota selecionada (Finale / Sibelius). A altura é **medida**, não chutada: `chordRowY` lê o `<text>` das cifras já gravadas no sistema e alinha o campo com elas; sem nenhuma cifra na pauta cai em `beat.visualBounds.y - h * 0.55`. Offset fixo pequeno (`0.28`) nascia encostado na cabeça da nota, longe da linha dos acordes.

- Nota selecionada, sem cifra: alvo pontilhado com a palavra **cifra** em itálico serif, na faixa do acorde. Não pisca e não é `+` — nenhum dos dois dizia o que ia acontecer ao clicar.
- Nota com cifra: a própria cifra gravada é o alvo — clicar nela abre o campo.
- Abre também por `K`, pelo botão **Cifra** na fileira, ou pelo Drawer.
- Aberto: input com caret nativo no lugar da cifra + camada de acordes acima (raízes C–B, ♯/♭ e o **acorde inteiro** — C, Cm, C7, Cm7, Cmaj7, C6, C9, Csus4, Cdim, Cø — em vez de sufixos soltos).
- Enter grava · Tab grava e vai para a próxima nota · Esc cancela · clicar na pauta grava e sai (não insere nota).

O texto só entra no modelo no commit. A cada tecla, gravar no beat re-renderizava a pauta inteira.

Drawer (`NotationToolsSidebar`): seção **Cifra da nota selecionada** mostra a cifra do beat (ou “sem cifra”) e leva para o campo na pauta. Sem seleção, é uma faixa inerte “Selecione uma nota na pauta” — não um botão solto sem contexto.

Preview idle (bloco não selecionado) usa o `alphaTex` já persistido — a cifra aparece igual.

### Piscar da pauta (corrigido no mesmo corte)

`paintScoreSelection` pedia `api.render()` a cada `renderFinished`, e o `postRenderFinished` chamava o repaint outra vez: loop infinito de render sempre que havia beat selecionado. A pauta piscava, o foco não parava de pé e o clique caía na gravura em vez do campo. Agora o repaint tem chave (`alphaIdx|tex` + instância da API) e só re-renderiza quando a seleção ou o tex mudam.

### Botão Cifra sem efeito (corrigido no mesmo corte)

`EditableBlock` é memoizado por `previewStateKey`. A chave não carregava o estado da cifra, então abrir pelo botão da fileira, pelo Drawer ou por `K` mudava o estado da sessão sem re-renderizar a folha: o Drawer acendia “digite na pauta” e a pauta continuava mostrando o alvo fechado — de fora, “não faz nada”. A chave agora inclui `cifra:editing|value`.

## Arquitetura

```
K, botão Cifra, Drawer, ou clique no alvo acima da nota
        │
        ▼
  overlay na faixa do acorde (input + camada de acordes)
        │  texto local enquanto digita
        ▼  Enter / Tab / clique fora
  updateBeat(idx, { cifra: normalize(texto) })
        │
        ├─ InlineBeat.cifra
        ├─ sessionToAlphaTex → {ch "Gm"}
        └─ applySessionToRenderData → notation_data.beats + alphaTex
```

`hydrateNotationFromBlock` lê `cifra` de `notation_data.beats`. Hoje descarta.

## Erros

| Caso | Comportamento |
|---|---|
| Texto só espaço | null, some da pauta |
| Aspas no nome | remove `"` (quebra o AlphaTex) |
| Sem seleção + K | não faz nada |
| Cifra em pausa | permitido (troca de acorde no silêncio) |

## Testes

- `normalizeCifraSymbol`: trim, vazio→null, corta 24, tira aspas, preserva `Eø` e `D7(#9)`
- hydrate: beat com `cifra: 'Gm'` volta `Gm`
- `sessionToAlphaTex`: dois beats D e G no mesmo compasso emitem `{ch "D"}` e `{ch "G"}`
- `replaceNote` preserva cifra
- `insertNote` não copia cifra do beat anterior
- `K` resolve para `focus-cifra` no teclado da pauta
- `cifraSuggestions`: camada mostra acordes inteiros sobre a raiz atual (`Bb7` → `Bbm7`, `Bbmaj7`); `cifraRootLabel` lê a raiz com acidente

## Como verifica

0. A pauta **não** pisca com nota selecionada, e `A`–`G` escrevem nota normalmente.
1. Material com bloco de notação → clicar na pauta → selecionar 1ª semínima → alvo **cifra** acima da nota (ou **Cifra** na fileira / `K` / **Escrever** no Drawer — os três abrem o campo na pauta) → `D` + Enter → cifra D na altura das outras cifras.
2. 3ª semínima do mesmo compasso → `G`. Dois nomes no mesmo compasso.
3. Batucaê: `Gm` depois `C7(#9)` na melodia escrita. Sem diagrama de braço.
4. Salvar material, reabrir: cifras continuam.
5. `A`–`G` ainda inserem nota quando o overlay de cifra não está focado.
6. Biblioteca → Notação (modal): o mesmo overlay acima da nota, não um campo na fileira.

## Arquivos-chave

| Peça | Path |
|---|---|
| Normalizar texto | `src/lib/notationCifra.ts` (novo) |
| Beat da sessão | `src/lib/notationInlineHydrate.ts` |
| Tex + persistência | `src/lib/notationInlineOps.ts` |
| Teclado | `src/lib/notationInlineKeyboard.ts` |
| Fileira | `src/components/music/NotationDurationStrip.tsx` |
| Overlay | `src/components/music/NotationCifraOverlay.tsx` |
| Pauta | `src/components/music/NotationAlphaTabSurface.tsx` |
| Altura da faixa do acorde | `chordRowY` em `src/lib/notationStaffPitch.ts` |
| Memo da folha (`previewStateKey`) | `src/pages/Editor.tsx` |
| Sessão A4 | `src/components/music/useNotationInlineSession.ts` |
| Modal | `src/components/music/NotationEditorV2.tsx` |
