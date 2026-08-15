# Escrita fluida na pauta A4

Data: 2026-08-15  
Status: aprovado  
Corte: escrever na pauta in-place com a fluidez de MuseScore/Sibelius/Finale

## Problema

O gesto in-place existe (corte anterior), mas escrever nele é ruim. Seis causas, todas confirmadas no código:

1. **Escrita travada e com ruído.** Cada tecla regenera o AlphaTex e o `AlphaTabViewer` liga `loading` → um spinner com fundo `bg-card/80` cobre a pauta a cada nota digitada. Além disso, cada tecla faz patch no `render_data` do bloco → `setBlocksWithHistory` → o `MaterialPreview` repagina o material inteiro. Digitar rápido empilha renders intermediários.
2. **Setas mortas.** `useNotationInlineSession.handleKeyDown` não copiou tudo do V2: faltam `←`/`→` (navegar), `↑`/`↓` (pitch diatônico), `Ctrl+↑/↓` (oitava), `Shift+A–G` (acorde) — tudo existe em `NotationEditorV2.tsx:785-833`. As setas vazam para o atalho global do Editor e trocam de bloco no meio da escrita.
3. **Foco de teclado é loteria.** O input escondido só ganha foco depois de clicar na pauta ou num botão da fileira. Selecionou o bloco pela lista/título → teclado morto sem aviso.
4. **Zero feedback de seleção.** `selectedBeatIdx` existe mas nenhuma nota é destacada na pauta. Sem nota-fantasma no hover, sem som. Escreve-se às cegas.
5. **Gravura pequena.** `scale = 1` do AlphaTab, miúdo para material didático, pior no zoom 75%.
6. **Fileira largada.** `flex` simples, botões de 28px à esquerda, resto da largura vazio.

Pesquisa (MuseScore 4.5, Sibelius, Finale Speedy): os três convergem em números = duração, A–G = pitch com oitava inteligente, setas navegam/transpõem, `Shift+A–G` acorde, `0` pausa, `.` ponto. A fluidez percebida vem do feedback triplo — cursor destacado, nota-fantasma, som imediato — e de render que nunca bloqueia a digitação.

## Requisito nº 1 — performance operacional

Decisão do Luciano: a usabilidade operacional manda. Ferramenta bonita que trava não é usada. Critérios de aceite deste corte (medidos no browser, pauta de ~16 compassos):

| Critério | Meta |
|---|---|
| Spinner/flash entre teclas | Nunca. A pauta anterior permanece visível até o novo frame chegar |
| Som após keydown | Imediato (≤ ~20 ms, disparado no handler, antes do render) |
| Tecla → nota visível na pauta | ≤ ~150 ms |
| Rajada rápida (8+ teclas/s) | Nenhuma tecla perdida; renders intermediários coalescem, só o estado final desenha |
| Setas durante a sessão | Nunca trocam de bloco nem rolam a página |
| Repaginação do material | Nunca por tecla; só após pausa na digitação (debounce) |

## Decisões travadas

| Tema | Escolha |
|---|---|
| Modelo de escrita | **Duração-primeiro** (padrão MuseScore/V2): 1–7 escolhe duração, A–G insere. Pitch-first (Finale Speedy) fora |
| Teclado | Copiar o handler do V2 integral (setas, acorde, oitava) + `R` repete última nota. Mapa de teclas extraído para lib pura testável |
| Feedback | Completo: destaque da nota selecionada + nota-fantasma no hover + som ao inserir/selecionar (Tone, já no produto). Sem som no hover |
| Gravura | Escala didática ~**1.35** (validar valor exato com screenshot) em canvas, modal e preview de notação — mesma gravura nos três. Ritmo e tablatura não mudam |
| Fluidez | Re-render sem spinner + coalescing de rajada + patch de `render_data` com debounce (~400 ms). O visual interativo desenha do estado da sessão, não do bloco |
| Fileira | Largura total do bloco em três grupos: durações \| pausa/ponto/acidentes (com ♮ novo) \| indicador vivo à direita |
| Indicador vivo | `C4 · Semínima · 3/14` + botões ‹ ›. Vazio: "Clique na pauta ou tecle A–G" |
| Rollback | Gesto continua atrás de `?notationInline=off`. Escala nova sem flag (decisão de produto) |

## Mapa de teclado (alvo)

| Tecla | Ação |
|---|---|
| `A`–`G` | Insere nota após a seleção (oitava inteligente) |
| `Shift+A`–`G` | Adiciona ao acorde do beat selecionado |
| `1`–`7` (linha e numpad) | Duração (semifusa → semibreve); aplica ao beat selecionado |
| `0` | Pausa |
| `.` | Ponto de aumento (ciclo simples → duplo → sem) |
| `#` / `-` / `=` | Sustenido / bemol / bequadro (prefixo para a próxima nota) |
| `←` / `→` | Navegar entre beats |
| `↑` / `↓` | Pitch diatônico do beat selecionado |
| `Ctrl+↑/↓` | Oitava |
| `R` | Repete a última nota inserida (com a duração/ponto correntes) |
| `Delete` / `Backspace` | Apaga beat (Backspace recua) |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo |
| `Espaço` | Play/stop |
| `Esc` | 1º solta a nota selecionada; 2º solta o bloco (deixa subir) |

Mudança de atalho: `Shift+B` deixa de ser bemol (hoje) e passa a adicionar Si ao acorde, como no V2/MuseScore; bemol vira `-`.

Todas as teclas tratadas fazem `preventDefault` + `stopPropagation` — nada vaza para os atalhos globais do Editor. Foco: o input escondido ganha foco assim que a sessão hidrata o bloco selecionado, e re-foca após cada interação (já existente).

## Feedback visual e sonoro

- **Destaque da seleção**: overlay HTML absoluto (fundo accent translúcido + anel) sobre o rect do beat selecionado, via `api.boundsLookup` do AlphaTab após cada render. Acompanha inserção: a nota gravada fica marcada.
- **Nota-fantasma**: cabeça de nota cinza translúcida seguindo o mouse, encaixada (snap) na linha/espaço via `pitchFromStaffY`, com linhas suplementares quando fora da pauta e badge com o nome do pitch (`C4`).
- **Som**: nota curta disparada no keydown/clique (antes do render), reutilizando o synth de playback existente. Otimista: o som confirma a ação mesmo que o frame demore.

## Arquitetura da fluidez

```
tecla → handleKeyDown (lib pura decide a ação)
  ├─ som imediato (synth)
  ├─ commit(beats) → tex novo → AlphaTab re-render SEM spinner
  │    └─ render em andamento? guarda só o último tex (coalescing)
  ├─ highlight move (bounds antigos → corrige no renderFinished)
  └─ patchRenderData debounce ~400 ms → Editor repagina/autosave
```

Mudanças no `AlphaTabViewer`: distinguir primeiro render (spinner ok) de updates (sem spinner, frame anterior visível); fila de 1 posição para tex durante render em andamento. Nada muda para os demais usos (preview, snapshot, ritmo, tablatura).

## Fora deste corte

- Ligaduras, articulações, dinâmicas
- Cifra/mapas de acorde na pauta (próximo corte do Radar)
- Playhead sincronizado durante playback
- Entrada MIDI
- Folha deitada / múltiplas páginas de pauta
- Trocar o modelo `beats` pelo Score nativo do AlphaTab
- Pitch-first / toggle de modo de escrita

## O que não se constrói

- Segundo caminho de render "rápido" paralelo ao AlphaTab
- Virtual keyboard / piano on-screen
- Esquema de atalhos configurável

## Peças reutilizadas

| Peça | Uso |
|---|---|
| `NotationEditorV2.tsx` handler de teclado | Fonte a copiar (setas, acorde, oitava) para a lib pura |
| `useNotationInlineSession` | Continua dono do estado; ganha as ações novas |
| `NotationAlphaTabSurface` | Ganha overlay de seleção + nota-fantasma |
| `AlphaTabViewer` | Ganha re-render silencioso + coalescing |
| `NotationDurationStrip` | Redesenhada em três grupos + indicador vivo |
| `pitchFromStaffY` / `alphaTabIndexMap` / `boundsLookup` | Hit-test e posição do overlay |
| Synth de playback (Tone) | Som de inserção/seleção |
| `buildAlphaTabSettings` | Escala didática por purpose de notação |

## Testes

- Lib pura do teclado (`notationInlineKeyboard.ts`): `npx tsx --test` cobrindo cada tecla do mapa, incluindo numpad e modificadores.
- Critérios de performance e feedback: conferência manual no browser (rajadas de digitação, todos os atalhos, save/reload), com screenshot da gravura nova para validar a escala.
