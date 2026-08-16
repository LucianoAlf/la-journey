# Ovelha Negra — barras rítmicas na pauta (corte 1) — Plano de Implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar tarefa por tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** o professor escreve uma grade rítmica com cifra na pauta da A4 — barra de tempo no lugar da melodia, caixa de ensaio, repetição com número de voltas, simile `%` e troca de métrica no meio do fluxo.

**Arquitetura:** nada de gravura nova. O AlphaTab 1.8.1 já desenha tudo isso; o trabalho é o modelo carregar os campos e o `beatsToAlphaTex` emitir as tags. Fatos de compasso (seção, repetição, simile, métrica, jump) moram no **primeiro beat do compasso**, do mesmo jeito que `barAfter` já mora no último. A emissão passa a ser por compasso, não por beat solto.

**Stack:** React + TypeScript + Vite, `@coderline/alphatab` 1.8.1, testes em scripts `tsx` com asserção manual.

**Spec:** `docs/superpowers/specs/2026-08-16-ovelha-negra-slash-notation-design.md` — leia antes de começar, em especial "Sintaxe real do gerador", "Verificado na sonda visual" e "Simile não é conteúdo escondido".

**Branch:** `feat/ovelha-slash` (worktree `.worktrees/ovelha-slash`), a partir de `origin/main`.

**Comandos:**
- Teste de um arquivo: `npx tsx src/lib/__tests__/<arquivo>.test.ts`
- Tipos: `npm run lint` (é `tsc --noEmit`)
- Sonda visual: `npx vite --port 5199 --strictPort` e abrir `/dev/alphatab-fixtures`

**Regra de ouro da sintaxe** (a sonda já provou; não escreva de memória): duração é prefixo `:4` e só quando muda; ponto é `{d}`; ligadura é `{-}` e vai na nota **destino**; cifra é efeito do mesmo beat (`b3{slashed ch "D"}`); clave é `G2`; armadura é `Dmajor`; oitava do tex = oitava do modelo − 1, então `B/4` sai `b3`.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `src/lib/notationInlineHydrate.ts` | Tipo `InlineBeat` e hidratação de `notation_data` | Modificar |
| `src/lib/notationInlineOps.ts` | `sessionToAlphaTex` e persistência em `render_data` | Modificar |
| `src/lib/beatsToAlphaTex.ts` | Tipo `Beat` e emissão do AlphaTex | Modificar |
| `src/lib/__tests__/beatsToAlphaTex.test.ts` | Testes de emissão | Modificar |
| `src/lib/__tests__/notationInlineOps.test.ts` | Testes de sessão e persistência | Modificar |
| `src/components/music/useNotationInlineSession.ts` | Estado da sessão de escrita | Modificar |
| `src/components/music/NotationDurationStrip.tsx` | Fileira de ferramentas | Modificar |
| `src/components/music/NotationToolsSidebar.tsx` | Drawer lateral | Modificar |
| `src/pages/AlphaTabFixtures.tsx` | Sondas visuais (já tem Slash 1-3) | Modificar |

---

## Task 1: ligadura na nota destino (pré-requisito)

Bug anterior ao corte: `sessionToAlphaTex` põe `tie` no beat que **sai** da ligadura, mas o `{-}` do AlphaTex marca o beat que **recebe**. A síncope da Ovelha depende disso.

**Files:**
- Modify: `src/lib/notationInlineOps.ts:188-205`
- Test: `src/lib/__tests__/notationInlineOps.test.ts`

- [x] **Passo 1: escrever o teste que falha**

Adicione ao fim de `src/lib/__tests__/notationInlineOps.test.ts`, seguindo o estilo de asserção manual que já existe no arquivo:

```ts
// Ligadura: tieToNext no beat N marca o beat N+1 no tex (o {-} do AlphaTex é destino)
{
  const { tex } = sessionToAlphaTex({
    beats: [
      { pitches: [{ pitch: 'C/4' }], duration: 'q', isRest: false, tieToNext: true },
      { pitches: [{ pitch: 'C/4' }], duration: 'q', isRest: false },
    ],
    clef: 'treble',
    keySignature: 'C',
    timeSignature: 'free',
    bpm: 120,
    grandStaff: false,
  })
  const tokens = tex.split('\n').at(-1)!.trim().split(/\s+/)
  const comTie = tokens.filter(t => t.includes('{-}'))
  assert(comTie.length === 1, 'ligadura sai em exatamente um beat')
  assert(tokens.indexOf(comTie[0]) === tokens.length - 1, 'ligadura sai no beat destino (o segundo)')
}
```

- [x] **Passo 2: rodar e confirmar que falha**

Run: `npx tsx src/lib/__tests__/notationInlineOps.test.ts`
Esperado: falha em "ligadura sai no beat destino" — hoje o `{-}` sai no primeiro token.

- [x] **Passo 3: corrigir o mapeamento**

Em `src/lib/notationInlineOps.ts`, na montagem de `beats` dentro de `sessionToAlphaTex`, troque a linha `tie: beat.tieToNext ?? false` por uma leitura do beat anterior:

```ts
  const beats: AlphaTexBeat[] = input.beats.map((beat, index) => ({
    pitches: beat.pitches.map(pitch => ({ pitch: pitch.pitch, accidental: pitch.accidental ?? null })),
    duration: beat.duration,
    // O {-} do AlphaTex marca a nota destino: quem recebe a ligadura é o beat seguinte.
    tie: Boolean(input.beats[index - 1]?.tieToNext),
    isRest: beat.isRest,
```

- [x] **Passo 4: rodar e confirmar que passa**

Run: `npx tsx src/lib/__tests__/notationInlineOps.test.ts`
Esperado: todas as asserções passam, sem quebrar as existentes.

- [x] **Passo 5: commit**

```bash
git add src/lib/notationInlineOps.ts src/lib/__tests__/notationInlineOps.test.ts
git commit -m "fix: emit tie marker on the destination beat"
```

**Concluída — e cresceu além do previsto.** A revisão achou o mesmo mapeamento errado em mais três produtores de AlphaTex, então a conversão virou um helper único (`toTieDestinations` / `isTieDestination` em `src/lib/beatsToAlphaTex.ts`) e foi aplicada em `notationInlineOps.ts`, `NotationEditorV2.tsx`, `Biblioteca.tsx` e `notationCompat.ts`. O parser de colagem do `Editor.tsx` foi corrigido junto: além de ler o `{-}` como origem, ele lia os efeitos por substring, e por isso perdia qualquer chave com mais de um efeito (`{d -}`, `{- ch "D"}`) — agora usa `parseAlphaTexEffects`, que quebra a chave em átomos.

Isso importa para as tarefas seguintes: `{slashed}` vai conviver com outros efeitos na mesma chave, e essa leitura já está pronta. Ligadura na grande pauta agrupa por `staff` — não vaza mais para a outra pauta.

**Dívida anotada (não neste corte):**
- (a) parser de colagem do `Editor.tsx:5845-5889` não é testável de fora; o teste em `beatsToAlphaTex.test.ts` mantém um tokenizador próprio
- (b) `parseAlphaTexEffects` (`beatsToAlphaTex.ts:147`) é leitor morando no módulo de escrita, cujo docstring diz que só escreve
- (c) `notationDataInference.ts:145` é um segundo parser com a semântica antiga e leitura por substring, hoje só usado pelo próprio teste
- (d) `parseAlphaTexEffects` quebra argumento entre aspas com espaço (`{ch "D min"}`), inofensivo para os efeitos que usamos mas não declarado no docstring
- (e) `notationCompat.test.ts` aborta na primeira falha, diferente do estilo que acumula e resume

---

## Task 2: barra rítmica no modelo e no tex

**Files:**
- Modify: `src/lib/beatsToAlphaTex.ts` (tipo `Beat`, função `beatsToAlphaTexNotes`)
- Modify: `src/lib/notationInlineHydrate.ts` (tipo `InlineBeat`, `normalizeBeats`)
- Modify: `src/lib/notationInlineOps.ts` (`sessionToAlphaTex`)
- Test: `src/lib/__tests__/beatsToAlphaTex.test.ts`

- [x] **Passo 1: escrever os testes que falham**

Adicione em `src/lib/__tests__/beatsToAlphaTex.test.ts`:

```ts
console.log('\n--- Barra rítmica (slash) ---')
const slashTex = beatsToAlphaTexNotes([
  makeBeat({ pitches: [makeNote('B/4')], slash: true }),
  makeBeat({ pitches: [makeNote('B/4')], slash: true, dotted: true }),
]).tex
assertContains(slashTex, '{slashed}', 'beat com slash emite {slashed}')
assertContains(slashTex, '{d slashed}', 'ponto e slash saem na mesma chave')
assertContains(slashTex, 'b3', 'B/4 do modelo sai como b3 no tex')

const semSlashTex = beatsToAlphaTexNotes([makeBeat({ pitches: [makeNote('B/4')] })]).tex
assertNotContains(semSlashTex, 'slashed', 'beat sem slash não emite {slashed}')

// Slash sem altura recebe a linha do meio: o AlphaTab posiciona o slash por beat.notes[0]
const slashSemAlturaTex = beatsToAlphaTexNotes([makeBeat({ slash: true, isRest: false })]).tex
assertContains(slashSemAlturaTex, 'b3{slashed}', 'slash sem pitch cai na altura neutra b3')

// Cifra continua no mesmo beat
const slashCifraTex = beatsToAlphaTexNotes([
  makeBeat({ pitches: [makeNote('B/4')], slash: true, cifra: 'D' }),
]).tex
assertContains(slashCifraTex, 'b3{slashed ch "D"}', 'slash e cifra saem na mesma chave')
```

- [x] **Passo 2: rodar e confirmar que falha**

Run: `npx tsx src/lib/__tests__/beatsToAlphaTex.test.ts`
Esperado: erro de tipo em `slash` e falha nas asserções de `{slashed}`.

- [x] **Passo 3: campo no tipo `Beat` e altura neutra**

Em `src/lib/beatsToAlphaTex.ts`, adicione ao `interface Beat`, junto de `notehead`:

```ts
  /** Beat gravado como barra rítmica (barra de tempo em vez de cabeça de nota). */
  slash?: boolean
```

E acima de `beatsToAlphaTexNotes`, a altura neutra:

```ts
// Linha do meio da clave de Sol. Beat slashed precisa de nota: o AlphaTab posiciona
// a barra lendo beat.notes[0]. O professor não escolhe altura de barra rítmica.
const SLASH_NEUTRAL_PITCH: PitchData = { pitch: 'B/4', accidental: null }
```

- [x] **Passo 4: emitir na função de notas**

Em `beatsToAlphaTexNotes`, no bloco "Nota ou pausa", garanta a altura neutra antes de escolher o que emitir:

```ts
    // Nota ou pausa
    const pitches = beat.slash && !beat.isRest && beat.pitches.length === 0
      ? [SLASH_NEUTRAL_PITCH]
      : beat.pitches
    if (beat.isRest) {
      noteParts.push('r')
    } else if (pitches.length === 1) {
      noteParts.push(pitchToAlphaTex(pitches[0], octaveOffset))
    } else if (pitches.length > 1) {
      const chord = pitches.map(p => pitchToAlphaTex(p, octaveOffset)).join(' ')
      noteParts.push(`(${chord})`)
    }
```

E no bloco de efeitos, **depois** do ponto e da ligadura e **antes** da cifra, para a ordem da chave ficar estável:

```ts
    // Barra rítmica
    if (beat.slash) effects.push('slashed')
```

- [x] **Passo 5: rodar e confirmar que passa**

Run: `npx tsx src/lib/__tests__/beatsToAlphaTex.test.ts`
Esperado: todas as asserções novas passam e as antigas seguem passando.

- [x] **Passo 6: levar o campo até a sessão**

Em `src/lib/notationInlineHydrate.ts`, adicione ao `interface InlineBeat`:

```ts
  slash?: boolean
```

E em `normalizeBeats`, dentro do objeto retornado:

```ts
      slash: Boolean(raw.slash),
```

Em `src/lib/notationInlineOps.ts`, no `map` de `sessionToAlphaTex`:

```ts
    slash: beat.slash,
```

- [x] **Passo 7: tipos e commit**

Run: `npm run lint`
Esperado: nenhum erro novo (erros pré-existentes em `notationBeatHit.test.ts`, `notationInlineOps.test.ts` e `practiceAudio.test.ts` já estavam lá).

```bash
git add src/lib/beatsToAlphaTex.ts src/lib/notationInlineHydrate.ts src/lib/notationInlineOps.ts src/lib/__tests__/beatsToAlphaTex.test.ts
git commit -m "feat: render beats as rhythmic slashes on the staff"
```

---

## Task 3: fatos de compasso no modelo

Seção, repetição, simile, métrica e jump são fatos **do compasso**, guardados no **primeiro beat** do compasso. Inclusive `repeatClose` e `jump`: eles dizem "este compasso fecha a repetição" e "este compasso tem Fine", porque no AlphaTex todo metadado de compasso é propriedade de masterbar e sai no cabeçalho.

**Files:**
- Modify: `src/lib/beatsToAlphaTex.ts` (tipo `Beat`)
- Modify: `src/lib/notationInlineHydrate.ts` (tipo `InlineBeat`, `normalizeBeats`)
- Modify: `src/lib/notationInlineOps.ts` (`sessionToAlphaTex`)
- Test: `src/lib/__tests__/notationInlineOps.test.ts`

- [x] **Passo 1: escrever o teste que falha**

Adicione em `src/lib/__tests__/notationInlineOps.test.ts`:

```ts
// Fatos de compasso sobrevivem à ida e volta pelo notation_data
{
  const beats = [
    {
      pitches: [{ pitch: 'B/4' }],
      duration: 'q' as const,
      isRest: false,
      slash: true,
      sectionStart: { marker: 'A', text: 'Violao, piano e vocal' },
      repeatOpen: true,
      timeSignature: '2/4',
      barAfter: true,
    },
    {
      pitches: [{ pitch: 'B/4' }],
      duration: 'q' as const,
      isRest: false,
      slash: true,
      repeatClose: 7,
      simile: 'simple' as const,
      jump: 'fine' as const,
    },
  ]
  const hidratado = hydrateNotationFromBlock({ render_data: { notation_data: { beats } } })
  const b0 = hidratado.beats[0]
  const b1 = hidratado.beats[1]
  assert(b0.slash === true, 'slash sobrevive')
  assert(b0.sectionStart?.marker === 'A', 'marcador de seção sobrevive')
  assert(b0.repeatOpen === true, 'repeatOpen sobrevive')
  assert(b0.timeSignature === '2/4', 'métrica do compasso sobrevive')
  assert(b1.repeatClose === 7, 'repeatClose sobrevive')
  assert(b1.simile === 'simple', 'simile sobrevive')
  assert(b1.jump === 'fine', 'jump sobrevive')
}
```

Se `hydrateNotationFromBlock` ainda não estiver importado nesse arquivo, adicione ao import existente de `notationInlineHydrate`.

- [x] **Passo 2: rodar e confirmar que falha**

Run: `npx tsx src/lib/__tests__/notationInlineOps.test.ts`
Esperado: falha nas asserções dos campos novos (chegam `undefined`).

- [x] **Passo 3: tipos**

Em `src/lib/beatsToAlphaTex.ts`, no `interface Beat`, junto de `slash`:

```ts
  /** Fatos do compasso que este beat abre (ou fecha, no caso de repeatClose e jump). */
  sectionStart?: { marker: string; text: string }
  repeatOpen?: boolean
  repeatClose?: number
  simile?: 'simple' | 'firstOfDouble' | 'secondOfDouble'
  timeSignature?: string
  jump?: 'fine'
```

Em `src/lib/notationInlineHydrate.ts`, os mesmos campos no `interface InlineBeat`.

- [x] **Passo 4: hidratação**

Em `normalizeBeats` de `src/lib/notationInlineHydrate.ts`, no objeto retornado:

```ts
      sectionStart: raw.sectionStart && typeof raw.sectionStart.marker === 'string'
        ? { marker: String(raw.sectionStart.marker), text: String(raw.sectionStart.text ?? '') }
        : undefined,
      repeatOpen: raw.repeatOpen ? true : undefined,
      repeatClose: Number.isFinite(raw.repeatClose) && raw.repeatClose > 1 ? Number(raw.repeatClose) : undefined,
      simile: raw.simile === 'simple' || raw.simile === 'firstOfDouble' || raw.simile === 'secondOfDouble'
        ? raw.simile
        : undefined,
      timeSignature: typeof raw.timeSignature === 'string' ? raw.timeSignature : undefined,
      jump: raw.jump === 'fine' ? 'fine' : undefined,
```

- [x] **Passo 5: repassar na sessão**

Em `sessionToAlphaTex` de `src/lib/notationInlineOps.ts`, no `map`, junto de `slash`:

```ts
    sectionStart: beat.sectionStart,
    repeatOpen: beat.repeatOpen,
    repeatClose: beat.repeatClose,
    simile: beat.simile,
    timeSignature: beat.timeSignature,
    jump: beat.jump,
```

- [x] **Passo 6: rodar, checar tipos e commitar**

Run: `npx tsx src/lib/__tests__/notationInlineOps.test.ts` e `npm run lint`
Esperado: asserções passam, sem erro novo de tipo.

```bash
git add src/lib/beatsToAlphaTex.ts src/lib/notationInlineHydrate.ts src/lib/notationInlineOps.ts src/lib/__tests__/notationInlineOps.test.ts
git commit -m "feat: carry bar-level facts on the beat that opens the bar"
```

---

## Task 4: emissão por compasso (cabeçalho em ordem canônica)

Hoje `beatsToAlphaTexNotes` percorre beat a beat e joga `|` quando vê `barAfter`. Ela passa a percorrer **compassos**, com cabeçalho antes dos beats.

Cuidado que vale o corte: a função devolve `indexMap`, o mapa `índice de beat do AlphaTab → nosso índice`, usado pelo hit-testing da pauta e pelo overlay de cifra. Toda mudança na quantidade de tokens emitidos precisa manter esse mapa alinhado, senão a seleção de nota anda sozinha.

**Files:**
- Modify: `src/lib/beatsToAlphaTex.ts:172-294`
- Test: `src/lib/__tests__/beatsToAlphaTex.test.ts`

- [x] **Passo 1: escrever os testes que falham**

```ts
console.log('\n--- Cabeçalho de compasso ---')
const cabecalhoTex = beatsToAlphaTexNotes([
  makeBeat({
    pitches: [makeNote('B/4')], slash: true, cifra: 'D',
    sectionStart: { marker: 'A', text: 'Violao, piano e vocal' },
    repeatOpen: true, timeSignature: '4/4', barAfter: true,
  }),
  makeBeat({ pitches: [makeNote('B/4')], slash: true, timeSignature: '2/4', barAfter: true }),
  makeBeat({ pitches: [makeNote('B/4')], slash: true, repeatClose: 7, jump: 'fine' }),
]).tex

assertContains(cabecalhoTex, '\\section "A" "Violao, piano e vocal"', 'seção com marcador e texto')
assertContains(cabecalhoTex, '\\ts 4 4 \\section', 'métrica antes da seção')
assertContains(cabecalhoTex, '\\section "A" "Violao, piano e vocal" \\ro', 'seção antes do repeat open')
assertContains(cabecalhoTex, '\\ts 2 4', 'métrica muda no compasso do meio')
assertContains(cabecalhoTex, '\\rc 7', 'repeat close com número de voltas')
assertContains(cabecalhoTex, '\\jump fine', 'Fine no último compasso')
assert(cabecalhoTex.split('\\ts 2 4').length === 2, 'métrica não repete no compasso seguinte')
```

- [x] **Passo 2: rodar e confirmar que falha**

Run: `npx tsx src/lib/__tests__/beatsToAlphaTex.test.ts`
Esperado: falha em todas as asserções de cabeçalho.

- [x] **Passo 3: segmentar em compassos e montar o cabeçalho**

Em `src/lib/beatsToAlphaTex.ts`, acima de `beatsToAlphaTexNotes`:

```ts
const SIMILE_MAP: Record<string, string> = {
  simple: 'simple',
  firstOfDouble: 'firstofdouble',
  secondOfDouble: 'secondofdouble',
}

/** Agrupa beats em compassos usando o barAfter que já existe no modelo. */
function segmentBars(beats: Beat[]): Beat[][] {
  const bars: Beat[][] = []
  let current: Beat[] = []
  for (const beat of beats) {
    current.push(beat)
    if (beat.barAfter) {
      bars.push(current)
      current = []
    }
  }
  if (current.length > 0) bars.push(current)
  return bars
}

/**
 * Metadado de compasso do AlphaTex é propriedade de masterbar, então sai tudo no
 * cabeçalho, em ordem fixa: ts, section, ro, simile, rc, jump. Ordem fixa não é
 * exigência do parser — é para o tex ser estável e testável por string.
 */
function barHeaderTex(bar: Beat[], activeTimeSignature: string | null): { tex: string; timeSignature: string | null } {
  const first = bar[0]
  const parts: string[] = []
  let timeSignature = activeTimeSignature

  const barFacts = bar.find(b => b.repeatClose || b.jump) ?? first

  if (first.timeSignature && first.timeSignature !== activeTimeSignature) {
    const [n, d] = first.timeSignature.split('/')
    parts.push(`\\ts ${n} ${d}`)
    timeSignature = first.timeSignature
  }
  if (first.sectionStart) {
    parts.push(`\\section "${first.sectionStart.marker}" "${first.sectionStart.text}"`)
  }
  if (first.repeatOpen) parts.push('\\ro')
  if (first.simile) parts.push(`\\simile ${SIMILE_MAP[first.simile]}`)
  if (barFacts.repeatClose && barFacts.repeatClose > 1) parts.push(`\\rc ${barFacts.repeatClose}`)
  if (barFacts.jump === 'fine') parts.push('\\jump fine')

  return { tex: parts.join(' '), timeSignature }
}
```

- [x] **Passo 4: reescrever o laço de emissão**

Ainda em `beatsToAlphaTexNotes`, envolva o laço atual de beats num laço de compassos. O corpo que monta cada beat (duração, grace, nota, efeitos) **não muda**; o que muda é a moldura:

```ts
  const bars = segmentBars(beats)
  let activeTimeSignature: string | null = null
  let beatIndex = 0

  for (let barIdx = 0; barIdx < bars.length; barIdx++) {
    const bar = bars[barIdx]
    const header = barHeaderTex(bar, activeTimeSignature)
    activeTimeSignature = header.timeSignature
    if (header.tex) parts.push(header.tex)

    // Compasso de simile: sai só a tag, sem beats e sem pausa. Quem toca é o
    // compasso anterior (_getPlaybackBar do AlphaTab). O AlphaTab cria um beat
    // vazio para o compasso, então o indexMap ganha uma entrada apontando para o
    // primeiro beat nosso — sem isso a seleção de nota desalinha.
    if (bar[0].simile) {
      indexMap.push(beatIndex)
      beatIndex += bar.length
      lastDuration = ''
      if (barIdx < bars.length - 1 || bar[bar.length - 1].barAfter) parts.push('|')
      continue
    }

    for (const beat of bar) {
      const i = beatIndex
      beatIndex++
      // ... corpo existente de montagem do beat, usando `beat` e `i` ...
    }
  }
```

O corpo interno preserva tudo que já existia: `:${dur}` só quando muda, grace notes empurrando `indexMap.push(i)`, nota ou pausa, efeitos em `{}`, `indexMap.push(i)` no beat principal e `parts.push('|')` quando `beat.barAfter` e `includeBarlines`.

Depois de um compasso de simile, `lastDuration` é zerado porque o compasso vazio quebra o estado de duração do AlphaTex.

- [x] **Passo 5: rodar os testes de emissão**

Run: `npx tsx src/lib/__tests__/beatsToAlphaTex.test.ts`
Esperado: as asserções novas passam **e** todas as antigas (duração stateful, tie, tuplet, cifra, barline) seguem passando. Se alguma antiga quebrar, o `indexMap` ou o `lastDuration` saiu do lugar.

- [x] **Passo 6: rodar o resto da bateria de notação**

Run:
```bash
npx tsx src/lib/__tests__/notationInlineOps.test.ts
npx tsx src/lib/__tests__/notationPipeline.test.ts
npx tsx src/lib/__tests__/notationBeatHit.test.ts
```
Esperado: sem regressão. O `notationBeatHit` é o que protege o mapa de índice.

- [x] **Passo 7: commit**

```bash
git add src/lib/beatsToAlphaTex.ts src/lib/__tests__/beatsToAlphaTex.test.ts
git commit -m "feat: emit bar-level alphaTex metadata in a canonical header"
```

---

## Task 5: sonda visual da Ovelha (compassos 1 a 8) pelo gerador

As sondas Slash 1-3 que já existem usam AlphaTex escrito à mão. Agora a mesma gravura tem que sair **do gerador**.

**Files:**
- Modify: `src/pages/AlphaTabFixtures.tsx`

- [x] **Passo 1: montar a fixture a partir de beats**

Em `src/pages/AlphaTabFixtures.tsx`, acima do componente, monte os 8 primeiros compassos com o modelo e passe pelo gerador:

```ts
import type { Beat } from '@/lib/beatsToAlphaTex'

const B: Beat['pitches'] = [{ pitch: 'B/4', accidental: null }]

function slashBeat(over: Partial<Beat> = {}): Beat {
  return {
    pitches: B, duration: 'q', tie: false, isRest: false, dotted: false,
    cifra: null, annotation: null, lyric: null, slash: true, ...over,
  }
}

// Compassos 1 a 8 do vídeo. Ritmo e armadura conferidos nos frames, não de memória.
const ovelhaBeats: Beat[] = [
  slashBeat({ cifra: 'D', sectionStart: { marker: 'A', text: 'Violao, piano e vocal' }, timeSignature: '4/4' }),
  slashBeat(), slashBeat(), slashBeat({ barAfter: true }),
  slashBeat({ cifra: 'G' }), slashBeat(), slashBeat(), slashBeat({ barAfter: true }),
  slashBeat({ cifra: 'D' }), slashBeat(), slashBeat(), slashBeat({ barAfter: true }),
  slashBeat({ cifra: 'G' }), slashBeat(), slashBeat(), slashBeat({ barAfter: true }),
  slashBeat({ cifra: 'A', timeSignature: '2/4' }), slashBeat({ barAfter: true }),
  slashBeat({ cifra: 'A', timeSignature: '4/4' }), slashBeat(), slashBeat(), slashBeat({ barAfter: true }),
]

const ovelhaTex = beatsToAlphaTex(ovelhaBeats, {
  clef: 'treble',
  keySignature: 'D',
  timeSignature: '4/4',
  timeSignatureMode: 'metered',
  includeLyrics: false,
})
```

- [x] **Passo 2: renderizar ao lado das sondas cruas**

Adicione uma seção com `AlphaTabViewer` recebendo `tex={ovelhaTex}`, `purpose="editor-notation-score"`, `staveProfile="score"`, `layout="page"`, `scale={1.3}`, `minHeight={200}`, `showTimeSignature`, mais um `<pre>` com `{ovelhaTex}`, no mesmo formato das sondas Slash 1-3.

- [ ] **Passo 3: olhar**

Run: `npx vite --port 5199 --strictPort` e abrir `/dev/alphatab-fixtures`
Esperado: barras diagonais na linha do meio, cifras `D`/`G`/`A` acima, `[A] Violao, piano e vocal`, `2/4` no compasso 5 e volta para `4/4` no 6. Compare com o frame do vídeo.

- [ ] **Passo 4: commit**

```bash
git add src/pages/AlphaTabFixtures.tsx
git commit -m "test: add Ovelha Negra slash fixture rendered from the generator"
```

---

## Task 6: colisão entre o texto da seção e a cifra

Achado na sonda: o texto da seção cai na mesma faixa vertical da cifra e cobre o acorde do primeiro tempo. No vídeo, `[A]` e a instrumentação ficam numa linha acima da fileira de cifras.

**Files:**
- Modify: `src/lib/alphaTabSettings.ts:46-77` (`applyNotationElements`)
- Modify: `src/pages/AlphaTabFixtures.tsx` (conferência visual)

- [ ] **Passo 1: reproduzir com o mínimo**

Na sonda Slash 1, confirme que com `\section "A" "Texto"` mais `{ch "D"}` no primeiro beat os dois se sobrepõem, e que sem a cifra o texto aparece sozinho e legível.

- [ ] **Passo 2: tentar separar por padding de faixa de efeito**

Em `buildAlphaTabSettings`, para propósitos de notação, experimente:

```ts
  settings.display.effectBandPaddingBottom = 6
```

Rode a sonda e olhe. `EffectMarker` (25) e `EffectChordNames` (16) são elementos distintos de notação, então o esperado é que ganhem faixas empilhadas.

- [ ] **Passo 3: se o padding não separar, decidir com evidência**

Duas saídas, nesta ordem de preferência:
1. Manter `\section` só com marcador (`\section "A" "A"`), aceitando o texto curto dentro da caixa, e levar a instrumentação para o título do bloco na A4 — que é onde o professor já escreve texto.
2. Desenhar a caixa de ensaio como overlay na nossa camada React, do mesmo jeito que o overlay de cifra do corte A já faz, mantendo `\section` no modelo para o playalong futuro achar a seção.

Não invente uma terceira saída sem antes rodar o passo 2 e olhar.

- [ ] **Passo 4: commit**

```bash
git add src/lib/alphaTabSettings.ts src/pages/AlphaTabFixtures.tsx
git commit -m "fix: keep rehearsal marks from colliding with chord symbols"
```

---

## Task 7: botão de barra rítmica na fileira

**Files:**
- Modify: `src/components/music/NotationDurationStrip.tsx`
- Modify: `src/components/music/useNotationInlineSession.ts`

- [ ] **Passo 1: estado armado na sessão**

Em `useNotationInlineSession.ts`, junto dos outros `useState` (perto de `const [cifraEditing, setCifraEditing] = useState(false)`):

```ts
  const [slashArmed, setSlashArmed] = useState(false)
```

Na função que insere beat, marque o beat novo com `slash: slashArmed`. Exponha `slashArmed` e um `toggleSlashArmed` no retorno do hook:

```ts
  const toggleSlashArmed = useCallback(() => {
    setSlashArmed(prev => !prev)
    setBeats(prev => {
      if (selectedBeatIdx < 0 || !prev[selectedBeatIdx]) return prev
      const next = [...prev]
      next[selectedBeatIdx] = { ...next[selectedBeatIdx], slash: !next[selectedBeatIdx].slash }
      return next
    })
  }, [selectedBeatIdx])
```

- [ ] **Passo 2: botão na fileira**

Em `NotationDurationStrip.tsx`, acrescente às props:

```ts
  slashArmed?: boolean
  onToggleSlash?: () => void
```

E, ao lado do botão Cifra, seguindo exatamente o mesmo padrão de classe:

```tsx
      {onToggleSlash && (
        <button
          type="button"
          onClick={onToggleSlash}
          title="Barra rítmica: escreve barra de tempo em vez de nota"
          className={`${BASE_BUTTON} w-auto gap-1.5 px-2.5 text-[12px] font-semibold ${slashArmed ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          <span className="text-[16px] leading-none">/</span>
          Ritmo
        </button>
      )}
```

- [ ] **Passo 3: ligar no lugar onde a fileira é usada**

Passe `slashArmed` e `onToggleSlash={toggleSlashArmed}` onde `NotationDurationStrip` é montada, do mesmo jeito que `cifraOpen` e `onOpenCifra` já são passados.

- [ ] **Passo 4: conferir na A4**

Run: `npx vite --port 5199 --strictPort`
Abra um material, entre num bloco de notação, ligue **Ritmo**, escreva quatro tempos, ponha cifra no primeiro, salve e reabra.
Esperado: quatro barras diagonais com a cifra acima, e a grade continua depois de reabrir.

- [ ] **Passo 5: commit**

```bash
git add src/components/music/NotationDurationStrip.tsx src/components/music/useNotationInlineSession.ts
git commit -m "feat: add rhythmic slash toggle to the notation strip"
```

---

## Task 8: fatos de compasso no Drawer

**Files:**
- Modify: `src/components/music/NotationToolsSidebar.tsx`
- Modify: `src/components/music/useNotationInlineSession.ts`

- [ ] **Passo 1: ações na sessão**

Em `useNotationInlineSession.ts`, uma função que aplica fato ao compasso do beat selecionado. Ela precisa achar o primeiro beat do compasso, porque é lá que o fato mora:

```ts
  const barStartIndex = useCallback((beats: InlineBeat[], index: number) => {
    for (let i = index - 1; i >= 0; i--) {
      if (beats[i].barAfter) return i + 1
    }
    return 0
  }, [])

  const applyBarFact = useCallback((fact: Partial<InlineBeat>) => {
    setBeats(prev => {
      if (selectedBeatIdx < 0 || !prev[selectedBeatIdx]) return prev
      const start = barStartIndex(prev, selectedBeatIdx)
      const next = [...prev]
      next[start] = { ...next[start], ...fact }
      return next
    })
  }, [selectedBeatIdx, barStartIndex])
```

- [ ] **Passo 2: controles no Drawer**

No `NotationToolsSidebar.tsx`, numa seção nova chamada "Compasso", seguindo o padrão visual das seções que já existem: campo de texto para marcador e texto da seção, botões de `|:` e `:|` com número de voltas, botão `%`, seletor de métrica do compasso e botão `Fine`. Cada um chama `applyBarFact` com o campo respectivo. O cabeçalho da seção mostra a qual compasso está aplicando, contando os `barAfter` até o beat selecionado.

- [ ] **Passo 3: travar edição dentro de compasso com `%`**

Compasso marcado como simile não toca os beats dele (quem toca é o anterior) e não os desenha. Então, quando o beat selecionado estiver num compasso com `simile`, a fileira de duração e a escrita de nota ficam desabilitadas, e o Drawer mostra só o botão de desmarcar o `%`. Sem isso o professor escreve notas que não aparecem nem tocam.

- [ ] **Passo 4: conferir na A4**

Escreva dois compassos, marque o segundo como `%`, salve, reabra. Depois desmarque e confirme que o conteúdo guardado volta.
Esperado: `%` sozinho no compasso, sem pausa desenhada.

- [ ] **Passo 5: commit**

```bash
git add src/components/music/NotationToolsSidebar.tsx src/components/music/useNotationInlineSession.ts
git commit -m "feat: edit bar-level facts from the notation drawer"
```

---

## Task 9: folha inteira e fechamento

- [ ] **Passo 1: a Ovelha completa na sonda**

Estenda a fixture da Task 5 até os 45 compassos: `[A]`, `[A'] (Banda)`, `[B]` com `|: :|`, `[Interlúdio (Vocalize)]`, `[Solo]` com `7x`, e `Fine` no último compasso com barra de semibreve (que sai como losango).

- [ ] **Passo 2: bateria completa**

Run:
```bash
npx tsx src/lib/__tests__/beatsToAlphaTex.test.ts
npx tsx src/lib/__tests__/notationInlineOps.test.ts
npx tsx src/lib/__tests__/notationPipeline.test.ts
npx tsx src/lib/__tests__/notationBeatHit.test.ts
npx tsx src/lib/__tests__/notationInlineHydrate.test.ts
npm run lint
```
Esperado: tudo passa; nenhum erro novo de tipo.

- [ ] **Passo 3: não quebrei material antigo**

Abra um material que já tinha bloco de notação melódica e confirme que a gravura está idêntica: nenhum `{slashed}` no tex e nenhum cabeçalho de compasso novo onde não havia fato de compasso.

- [ ] **Passo 4: atualizar spec e mapa**

Na spec, mude o Status para o que ficou de fato conferido na A4, com a data. No `.agent/development-map.md`, mova o corte para **Feito** e aponte o próximo (folha deitada).

- [ ] **Passo 5: PR**

```bash
git push -u origin feat/ovelha-slash
gh pr create --title "feat: rhythmic slash notation with bar-level facts" --body "..."
```

---

## Auto-revisão

**Cobertura da spec:** barra rítmica (Task 2), altura neutra (Task 2), fatos de compasso no modelo (Task 3), ordem canônica e `\ts` no meio (Task 4), simile como compasso vazio (Task 4), seção com marcador e texto (Tasks 4 e 6), UI de escrita (Task 7), UI de compasso (Task 8), ligadura destino (Task 1), fixture e A4 (Tasks 5 e 9).

**Fora deste plano, de propósito:** folha deitada, playalong com cursor, backing track, import de PDF.

**Risco maior:** o `indexMap` da Task 4. Ele é o que liga clique na pauta a beat do modelo; se desalinhar, a seleção e o overlay de cifra do corte A quebram sem erro no console. O `notationBeatHit.test.ts` é o guarda dessa fronteira e tem que rodar em toda tarefa dali para frente.
