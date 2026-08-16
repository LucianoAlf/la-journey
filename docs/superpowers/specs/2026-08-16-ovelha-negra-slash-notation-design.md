# Ovelha Negra — barras rítmicas na pauta (corte 1)

Data: 2026-08-16  
Status: conferida na sonda `/dev/alphatab-fixtures` (16/08, tarde). Gerador emite `{slashed}`, cabeçalho de compasso e `[A]` só com marcador. Fileira **Ritmo** e Drawer **Compasso** estão na A4. Folha dos 45 compassos transcrita dos frames ainda não — o ritmo interno não se inventa.  
Corte: o professor escreve **grade rítmica com cifra** na mesma pauta da A4 — barra de tempo no lugar da melodia, seção de ensaio, repetição e troca de métrica.

Alvo visual: vídeo da Escola de Música Rafael Bastos (Ovelha Negra / Rita Lee), 45 compassos em 4 telas — `[A]` `[A'] (Banda)` `[B]` `[Interlúdio (Vocalize)]` `[Solo]`, `Fine` no fim.

Não conferido no vídeo (não usar como dado): BPM e armadura. O ritmo compasso a compasso sai dos frames na hora de montar a fixture, não de memória.

Próximo corte (não misturar): folha deitada (orientação de material). Depois: playalong com cursor no compasso.

## Problema

A pauta da A4 hoje só escreve **melodia**: cabeça de nota com altura. A grade da Ovelha não tem melodia — tem barra rítmica no tempo (`/ / / /`), síncope com ligadura, cifra em cima, `[A]`, `|: :|`, `7x`, simile `%` e um compasso `2/4` no meio de uma música `4/4`.

O corte A (cifra no beat) resolveu a cifra. Todo o resto o `beatsToAlphaTex` não emite: hoje ele emite `\clef`, `\ks`, `\ts` (uma vez, no cabeçalho), `\ft`, `{ch "…"}`, durações, pontos, ligadura, articulações. Não emite `{slashed}`, `\simile`, `\ro`/`\rc`, `\section` nem `\ts` no meio do fluxo.

## O motor já faz — não se constrói gravura nova

Verificado no `@coderline/alphatab` 1.8.1 instalado (`node_modules/@coderline/alphatab/dist/alphaTab.d.ts` e `alphaTab.core.mjs`):

| Item do alvo | Mecanismo AlphaTab | Tag AlphaTex |
|---|---|---|
| Barra rítmica | `Beat.slashed`; pauta dedicada em `Staff.showSlash` | `{slashed}` no beat; `\staff{slash}` |
| Simile `%` | `MasterBar.simileMark` (`Simple`, `FirstOfDouble`, `SecondOfDouble`) | `\simile simple` |
| Caixa de ensaio `[A]` | seção de masterbar (texto + marcador curto) | `\section "A"` |
| `|:` `:|` e `7x` | repeat open / close com contagem | `\ro` / `\rc 7` |
| Métrica no meio | por masterbar | `\ts 2 4` |
| `Fine` | tabela de jumps (`fine`, `dalsegnoalfine`, …) | `\jump fine` |
| Barra de compasso especial | `barlineleft` / `barlineright` | `\barlineright lightheavy` |

Fora deste corte, mas registrado porque decide o corte do playalong: o AlphaTab 1.8 tem **backing track nativo** — `PlayerMode.EnabledBackingTrack`, `score.backingTrack`, `BackingTrackSyncPoint[]` (com `masterBarIndex`, `masterBarOccurence`, `synthBpm`, tempo em ms), `api.updateSyncPoints()`, tag `\sync` e output que toca por `HTMLAudioElement`. O cursor dele segue repetição e métrica mista porque ele é dono do tick map.

## Decisões travadas

| Tema | Escolha |
|---|---|
| Motor | AlphaTab via AlphaTex, o cano que já existe. **Sem** segundo renderizador (grid de `div`/Tailwind ou SVG próprio): duplicaria gravura e criaria uma 2ª fonte de verdade concorrendo com `notation_data.beats` |
| Barra rítmica | Propriedade **do beat** (`slash: true`), não modo do bloco. Duração, ponto e ligadura continuam sendo os campos que já existem: `/ / / /` é 4 semínimas slashed; a síncope do compasso 2 é semínima pontuada + colcheia ligada, ambas slashed |
| Altura do slash | Beat slashed **guarda altura** — o AlphaTab posiciona o slash lendo `beat.notes[0]`. Altura neutra fixa: **`B/4` no formato do nosso modelo** (linha do meio da clave de Sol). Nunca escrever oitava de AlphaTex à mão: o gerador aplica `octaveOffset = -1` (`beatsToAlphaTex.ts:140,174`), então `B/4` sai como `b3` no tex — o próprio código registra isso em `notationInlineOps.ts:207`. O professor não escolhe altura de barra rítmica |
| Pauta | `\staff{score}` + `{slashed}` por beat, **não** `\staff{slash}`. Não é gosto: `StaveProfile.Score` habilita só o `ScoreBarRenderer` (`alphaTab.core.mjs:75940`), e nosso `buildAlphaTabSettings` fixa `Score` para todos os propósitos não-tab (`alphaTabSettings.ts:147-149`). A pauta dedicada renderizaria vazia sem mexer na fábrica central, que serve nove propósitos. Confirmado na sonda: o `{slashed}` grava barra diagonal na linha do meio da pauta de 5 linhas |
| Fatos de compasso | Seção, repetição, simile e métrica moram **no beat que abre o compasso**, do mesmo jeito que `barAfter` já mora no beat que fecha. Sem array `bars[]` paralelo ao `beats[]` |
| Simile `%` | Compasso de simile emite `\simile simple` e **mais nada** — compasso vazio, sem beats e **sem pausa**. Testado: com `:1 r` a pausa de semibreve aparece desenhada ao lado do `%`; com o compasso vazio sai só o `%`. Quem toca é o compasso anterior, por decisão do motor (`_getPlaybackBar`, `alphaTab.core.mjs:48208`). Ver "Simile não é conteúdo escondido" |
| Seção | Modelo guarda `sectionStart.marker` + `sectionStart.text`. O gerador emite `\section "A" ""` — caixa `[A]` na pauta, texto no Drawer. Dois argumentos no AlphaTex (marcador + texto); texto longo na pauta cobria a cifra do 1º tempo |
| Cifra | Reusa o corte A inteiro (`Beat.cifra` → `{ch "…"}`, overlay na faixa do acorde). Nada muda |
| Áudio | Fora deste corte. Quando vier: backing track MP3 (Suno, motor já ligado) + sync points do AlphaTab. **Não** playhead por `currentTime / secondsPerBar` |
| Folha deitada | Fora deste corte |

## O que não se constrói

- Grade em `div`/Tailwind ou JSON `sections[].bars[]` paralelo ao modelo de beats.
- Playhead calculado por BPM: `Math.floor(tempo / segundosPorCompasso)` assume todo compasso em `4/4` e desanda no compasso 6 da Ovelha (que é `2/4`), e ignora as repetições — no `7x` do solo o índice passa do fim da grade.
- Import do PDF ou do vídeo (OCR de partitura).
- Count-in de baqueta: é do player, não da gravura.
- Folha deitada, cursor, auto-scroll, troca de página.

## Verificado na sonda visual

Sondas em `src/pages/AlphaTabFixtures.tsx` (topo da página `/dev/alphatab-fixtures`), com AlphaTex cru, sem tocar no gerador. O que ficou provado:

| Item | Resultado |
|---|---|
| `{slashed}` na pauta de 5 linhas | Barra diagonal na linha do meio, clave e armadura normais. É o alvo do vídeo |
| Ponto e ligadura em barra rítmica | `{d slashed}` grava barra pontuada com haste; `{- slashed}` grava o arco de ligadura entre barras |
| `\ts` no meio do fluxo | Troca para `2/4` e volta para `4/4` no compasso seguinte, sem repetir a tag |
| `\ro` / `\rc 7` | `|:` e `:|` com `x7` acima da barra de fechamento |
| `\simile simple` em compasso vazio | Só o `%`. Com `:1 r` sai `%` **mais** a pausa desenhada |
| `\jump fine` | Escreve `Fine` acima do fim |
| `\section "A" "Texto"` | `[A] Texto`, marcador em caixa |
| Barra de semibreve (`:1` + `{slashed}`) | Sai como **losango** — é o último compasso do vídeo. Não precisa de `notehead`, vem de graça |

Um problema achado, e ele é de layout, não de sintaxe: **o texto da seção cai na mesma faixa vertical da cifra e cobre o acorde do primeiro tempo do compasso**. Padding de faixa de efeito não separou. Decisão (16/08): emitir `\section "A" ""` — `[A]` em caixa, D visível. O texto longo fica no modelo (Drawer / título do bloco).

## Simile não é conteúdo escondido

Verificado no motor, e é contraintuitivo o bastante para valer a seção:

- **Quem toca é o compasso anterior.** `_getPlaybackBar` (`alphaTab.core.mjs:48208-48226`) redireciona a geração de MIDI de um compasso `Simple` para o compasso anterior. Beats emitidos num compasso de simile não tocam nada.
- **O renderizador não esconde beat nenhum.** `paintSimileMark` é chamado no `paintBackground` (`:69097`) e os beats são pintados por cima em `paintContent`. Emitir `%` **e** beats desenha as duas coisas sobrepostas.
- **A convenção do próprio AlphaTab é um beat vazio.** O importador de GP chama `_clearBar`, que deixa exatamente um beat com `isEmpty = true` no compasso (`:26138-26144`).
- **O compasso precisa desse beat para o cursor funcionar.** O tick lookup registra esse beat único para a duração inteira do compasso (`:48203-48206`), e o `paintSimileMark` usa `voices[0].beats[0]` como id de grupo. Compasso sem beat nenhum não tem onde ancorar destaque.

Daí a regra: emitir `\simile simple` + uma pausa de compasso, nunca os beats. E a UI precisa impedir edição de beat dentro de um compasso `%`, senão o professor escreve notas que não aparecem nem tocam.

## Trabalho anterior ao corte

A ligadura sai **um beat adiantada** quando vem da sessão inline. `sessionToAlphaTex` faz `tie: beat.tieToNext` (`notationInlineOps.ts:191`), mas o `{-}` do AlphaTex marca a nota **destino** (`note.isTieDestination`), e o teste de `beatsToAlphaTex` confirma essa semântica pondo `tie: true` no segundo beat (`__tests__/beatsToAlphaTex.test.ts:167-172`). Ou seja: `tieToNext` no beat N precisa virar `tie` no beat N+1.

Isso é bug anterior a este corte, mas entra aqui porque a síncope da Ovelha depende de ligadura — sem corrigir, a fixture vai sair errada e a culpa vai parecer ser do `{slashed}`.

## Modelo

`InlineBeat` (`src/lib/notationInlineHydrate.ts`) ganha:

| Campo | Tipo | Papel |
|---|---|---|
| `slash` | `boolean` | Beat gravado como barra rítmica |
| `sectionStart` | `{ text: string; marker?: string }` | Caixa de ensaio no compasso que este beat abre |
| `repeatOpen` | `boolean` | `|:` antes deste compasso |
| `repeatClose` | `number` | `:|` no fim do compasso, com número de voltas (`7` no solo) |
| `simile` | `'simple' \| 'firstOfDouble' \| 'secondOfDouble'` | `%` no lugar do conteúdo do compasso |
| `timeSignature` | `string` | Métrica que passa a valer deste compasso em diante (`'2/4'`) |
| `jump` | `'fine'` | Marca de salto no fim do compasso |

Mesmos campos entram no `Beat` de `src/lib/beatsToAlphaTex.ts` e sobrevivem em `notation_data.beats` (`applySessionToRenderData`) e na hidratação (`normalizeBeats`).

Nada disso é campo novo de bloco: continua tudo dentro de `render_data.notation_data`.

## AlphaTex a emitir

| Tag | Quando |
|---|---|
| `{slashed}` | beat com `slash` |
| `\section "A" "Texto"` | beat que abre compasso com `sectionStart` (marcador + texto, sempre os dois) |
| `\ro` | beat que abre compasso com `repeatOpen` |
| `\rc N` | compasso que fecha a repetição (`repeatClose`) |
| `\simile simple` | compasso com `simile` |
| `\ts N D` | no meio do fluxo, quando o compasso muda de métrica |
| `\jump fine` | compasso com `jump` |

### Sintaxe real do gerador — não escrever de memória

Tudo abaixo está no `beatsToAlphaTex.ts` de hoje e vale contra qualquer tex escrito à mão (o nosso ou o de um modelo):

| Coisa | Como este projeto emite | Como **não** é |
|---|---|---|
| Duração | prefixo `:4`, e **só quando muda** (`:187-192`) | `b4.4` (isso é sintaxe de tablatura, `casa.corda.duração`) |
| Ponto | efeito `{d}` / `{dd}` (`:227-228`) | `.` repetido depois da nota |
| Ligadura | efeito `{-}` (`:231`), e vai na nota **destino** — o parser faz `case '-': note.isTieDestination = true` (`alphaTab.core.mjs:14906`) | `~`, ou marca na nota de origem |
| Cifra | efeito **do mesmo beat**: `b3{slashed ch "D"}` (`:270-272`, tudo dentro de uma chave) | `{ch "D"} b3{slashed}` como token separado antes da nota |
| Clave | `\clef G2` | `\clef treble` |
| Armadura | `\ks Dmajor` (KEY_SIG_MAP) | `\ks D` |
| Oitava | modelo `B/4` → tex `b3` (offset −1) | `b4` escrito direto no tex |

### Ordem canônica no compasso

Metadado de compasso é propriedade de masterbar (o `\rc`, por exemplo, só faz `bar.masterBar.repeatCount = N`), então **tudo sai no cabeçalho do compasso**, em ordem fixa, e o compasso fecha com o `|` que o gerador já emite a partir de `barAfter`:

```
\ts 2 4  \section "A"  \ro  \simile simple  \rc 7  \jump fine   <beats>  |
```

Ordem fixa não é exigência do parser — é para o tex ser estável, diffável e testável por string. Não existe "footer de compasso" no gerador.

## UX

A grade rítmica é um jeito de escrever na pauta que já existe, não um bloco novo.

- **Fileira de duração:** botão **Barra rítmica** (toggle, ao lado do botão Cifra). Ligado, os beats que o professor escrever nascem `slash`; a nota que ele digitar não vira altura, vira barra no tempo. Toggle também converte o beat selecionado.
- **Drawer** (fatos de compasso, mais raros que nota): Seção (`[A]`), Repetição (abre / fecha / número de voltas), Simile `%`, Métrica deste compasso, `Fine`. Todos agem no compasso do beat selecionado, e o Drawer mostra a qual compasso está aplicando.
- Cifra segue igual ao corte A: `K`, botão Cifra, Drawer ou o alvo na faixa do acorde.
- `A`–`G` continuam escrevendo; com Barra rítmica ligada, a tecla anda no tempo em vez de escolher altura.

## Casos

| Caso | Comportamento |
|---|---|
| Beat slashed sem altura | Recebe a altura neutra fixa (`B/4`); nunca fica sem nota (o AlphaTab precisa de `notes[0]` para posicionar) |
| Compasso marcado como `%` | Emite `\simile simple` + pausa de compasso, sem os beats. A UI trata o compasso como uma unidade: selecionar o compasso, não beats dentro dele |
| Desmarcar `%` | O conteúdo guardado no modelo volta a ser emitido. Enquanto o compasso está `%`, esse conteúdo não toca nem aparece — e a UI não deixa editá-lo |
| `repeatClose` sem `repeatOpen` antes | Fecha no início da seção/peça, como o AlphaTab já resolve |
| Métrica trocada no meio | `\ts` sai só no compasso que muda; os seguintes herdam |
| Bloco antigo (só melodia) | `slash` ausente = melodia normal. Nada de material existente muda de aparência |

## Testes

- `beatsToAlphaTex`: beat com `slash` emite `{slashed}`; sem `slash` não emite.
- `beatsToAlphaTex`: `sectionStart`, `repeatOpen`, `repeatClose: 7`, `simile`, `jump: 'fine'` saem nas posições certas do tex.
- `beatsToAlphaTex`: `\ts 2 4` sai no compasso que muda e não no cabeçalho; o compasso seguinte não repete a tag.
- `beatsToAlphaTex`: compasso com `simile` emite `\simile simple` e nada mais — sem beats e sem pausa.
- `beatsToAlphaTex`: beat `slash` sem pitch sai como `b3` (modelo `B/4` + offset −1), não `b4`.
- `sessionToAlphaTex`: `tieToNext` no beat N produz `{-}` no beat N+1.
- Ordem do cabeçalho de compasso: `\ts` antes de `\section` antes de `\ro`, string estável.
- `notationInlineHydrate`: `notation_data.beats` preserva os campos novos; bloco legado sem eles hidrata como melodia.
- `notationInlineOps`: `applySessionToRenderData` grava os campos novos sem derrubar as outras chaves.
- Altura neutra: beat `slash` sem pitch sai do gerador com nota.

## Como verifica

0. Material existente com melodia continua idêntico (nenhum `{slashed}` no tex).
1. Fixture (`src/pages/AlphaTabFixtures.tsx`) com os 8 primeiros compassos da Ovelha: `[A]`, `D`/`G` alternando, síncope no 2, `2/4` no 6, volta pra `4/4` no 7. Esqueleto na sintaxe correta (conteúdo rítmico e armadura a conferir nos frames do vídeo, não de memória):

```
\track
\staff{score}
\tuning piano
\ks Dmajor
\ts 4 4
.
\section "A" "Violão, piano e vocal" :4 b3{slashed ch "D"} b3{slashed} b3{slashed} b3{slashed} |
:4 b3{d slashed ch "G"} :8 b3{slashed} :4 b3{- slashed} b3{slashed} |
\ts 2 4 :4 b3{slashed ch "A"} b3{slashed} |
\ts 4 4 :4 b3{slashed ch "A"} b3{slashed} b3{slashed} b3{slashed} |
```

Esse cabeçalho é o que o `beatsToAlphaTex` já monta hoje para instrumento único (`:437-486`). As sondas 1 a 3 na página de fixtures usam exatamente esse formato.
2. Comparar a fixture com o frame do vídeo: barra no meio da pauta, cifra na faixa do acorde, caixa de ensaio antes da clave.
3. Decidir `\staff{score}` vs `\staff{slash}` olhando a fixture.
4. A4: escrever um compasso rítmico no editor in-place, salvar, reabrir — a grade continua.
5. Folha inteira (45 compassos, `[B]` com `|: :|`, solo com `7x`, `Fine`).

## Arquivos-chave

| Peça | Path |
|---|---|
| Modelo do beat inline | `src/lib/notationInlineHydrate.ts` |
| Gerador de AlphaTex | `src/lib/beatsToAlphaTex.ts` |
| Tex + persistência da sessão | `src/lib/notationInlineOps.ts` |
| Teclado da pauta | `src/lib/notationInlineKeyboard.ts` |
| Fileira de duração | `src/components/music/NotationDurationStrip.tsx` |
| Drawer | `src/components/music/NotationToolsSidebar.tsx` |
| Sessão A4 | `src/components/music/useNotationInlineSession.ts` |
| Pauta interativa | `src/components/music/NotationAlphaTabSurface.tsx` |
| Fixtures de gravura | `src/pages/AlphaTabFixtures.tsx` |
| Spec do corte A (cifra) | `docs/superpowers/specs/2026-08-16-lead-sheet-cifra-pauta-design.md` |
