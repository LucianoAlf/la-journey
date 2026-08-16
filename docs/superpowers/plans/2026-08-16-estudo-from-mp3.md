# Estudo C2 — material a partir do MP3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (este corte executa inline). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** na lista `/estudo`, **Do MP3** sobe uma faixa, o Music.AI lê cifra/BPM/tom e nasce um material novo com pauta slash + playalong já colado.

**Architecture:** upload inbox público → `musicai-transcribe { audioUrl }` → função pura `fromMp3ToStudy` → `createDraftMaterialWithBlocks` + `page_config.playalong`. A sala C1 não muda de contrato. Sem `practice_audio`. Sem Suno.

**Tech Stack:** React + TypeScript, Edge `musicai-transcribe` já no ar, Storage `content-images`, testes `npx tsx src/lib/__tests__/<arquivo>.test.ts`.

**Spec:** `docs/superpowers/specs/2026-08-16-estudo-from-mp3-design.md`

**Branch:** `feat/estudo-playalong` (worktree `.worktrees/estudo-playalong`). **Não** misturar com `feat/audio-didatico`.

**Comandos:**
- Teste: `npx tsx src/lib/__tests__/fromMp3ToStudy.test.ts`
- Dev: `npx vite --port 5202 --strictPort --host`

---

## Estrutura de arquivos

| Arquivo | Papel | Ação |
|---|---|---|
| `src/lib/fromMp3ToStudy.ts` | JSON reconhecido → beats slash + playalong | Criar |
| `src/lib/__tests__/fromMp3ToStudy.test.ts` | Fixtures da spec | Criar |
| `src/services/playalongUpload.ts` | Inbox upload + delete | Modificar |
| `src/services/studyFromMp3Service.ts` | Orquestra upload → Edge → INSERT | Criar |
| `src/pages/Estudo.tsx` | Botão Do MP3 + espera | Modificar |
| `.agent/development-map.md` | C2 em Agora | Modificar no fim |

---

### Task 1: `fromMp3ToStudy` (puro)

**Files:**
- Create: `src/lib/__tests__/fromMp3ToStudy.test.ts`
- Create: `src/lib/fromMp3ToStudy.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import { fromMp3ToStudy, titleFromAudioFilename } from '../fromMp3ToStudy'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('maps silence + mid-bar change + next bar', () => {
  const result = fromMp3ToStudy({
    audioUrl: 'https://example.com/a.mp3',
    chords: [
      { start: 1.2, end: 2.2, chord: 'C' },
      { start: 2.2, end: 3.2, chord: 'G' },
      { start: 3.2, end: 5.2, chord: 'Am' },
    ],
    bpm: 120,
    key: 'C major',
  })
  assert.equal(result.bpm, 120)
  assert.equal(result.timeSignature, '4/4')
  assert.equal(result.barsPerSystem, 4)
  assert.equal(result.keySignature, 'C')
  assert.equal(result.playalong.countInMs, 1200)
  assert.equal(result.playalong.audioUrl, 'https://example.com/a.mp3')
  assert.equal(result.beats.length, 8)
  assert.equal(result.beats[0].cifra, 'C')
  assert.equal(result.beats[2].cifra, 'G')
  assert.equal(result.beats[4].cifra, 'Am')
  assert.equal(result.beats[3].barAfter, true)
  assert.equal(result.playalong.syncPoints[0].syncTime, 1200)
  assert.equal(result.playalong.syncPoints[1].syncTime, 3200)
})

test('defaults bpm to 120 and key to C', () => {
  const result = fromMp3ToStudy({
    audioUrl: 'https://example.com/a.mp3',
    chords: [{ start: 0, end: 2, chord: 'F' }],
  })
  assert.equal(result.bpm, 120)
  assert.equal(result.keySignature, 'C')
  assert.equal(result.playalong.countInMs, 0)
})

test('keeps later chord when two quantize to the same beat', () => {
  const result = fromMp3ToStudy({
    audioUrl: 'https://example.com/a.mp3',
    chords: [
      { start: 0, end: 0.2, chord: 'C' },
      { start: 0.1, end: 2, chord: 'G' },
    ],
    bpm: 120,
  })
  assert.equal(result.beats[0].cifra, 'G')
})

test('carries chord onto the next bar downbeat', () => {
  const result = fromMp3ToStudy({
    audioUrl: 'https://example.com/a.mp3',
    chords: [{ start: 0, end: 3.5, chord: 'Dm' }],
    bpm: 120,
  })
  assert.equal(result.beats[4].cifra, 'Dm')
})

test('titleFromAudioFilename strips extension', () => {
  assert.equal(titleFromAudioFilename('Ovelha Negra.mp3'), 'Ovelha Negra')
  assert.equal(titleFromAudioFilename('base.ogg'), 'base')
})

test('throws on empty chords', () => {
  assert.throws(() => fromMp3ToStudy({ audioUrl: 'https://x', chords: [] }), /cifra/i)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/lib/__tests__/fromMp3ToStudy.test.ts`  
Expected: FAIL (módulo inexistente)

- [ ] **Step 3: Write `fromMp3ToStudy.ts` following the spec section “Conta do compasso”**

Export `fromMp3ToStudy` and `titleFromAudioFilename`. Types: `Mp3Chord = { start, end, chord }`. Beats: `B/4`, `duration: 'q'`, `slash: true`, `isRest: false`. `barMs = 4 * 60000 / bpm`. `countInMs` from min start (or min beat time); `< 50` → `0`. Cap 200 bars. `keySignature` = first token before `major`/`minor`. Sync one point per bar.

- [ ] **Step 4: Run tests — all `ok`**

- [ ] **Step 5: Commit** `feat: map Music.AI chords to slash study bars`

---

### Task 2: inbox upload + orquestração

**Files:**
- Modify: `src/services/playalongUpload.ts`
- Create: `src/services/studyFromMp3Service.ts`

- [ ] **Step 1: Add `uploadPlayalongInbox(file)` → `{ url, path }` and `removePlayalongObject(path)`**

Path: `playalong/inbox/{uuid}.{mp3|ogg}`. Mesmas regras de tipo/tamanho do upload atual.

- [ ] **Step 2: `createStudyMaterialFromMp3({ schoolId, file })`**

1. `title = titleFromAudioFilename(file.name)` (fallback `Playalong`).
2. Upload inbox.
3. `supabase.functions.invoke('musicai-transcribe', { body: { audioUrl: url } })`.
4. Se `data.error` ou `recognizedChords` vazio: `removePlayalongObject(path)`, throw.
5. `fromMp3ToStudy({ audioUrl: url, chords, bpm, key })`.
6. `createDraftMaterialWithBlocks` com um bloco `notation`, `content.notation_data` = `{ clef: 'treble', keySignature, timeSignature, bpm, barsPerSystem, beats }`.
7. `updateMaterial(id, { page_config: { playalong: playalongToJson(result.playalong) } })`.
8. Return `id`.

Não criar `practice_audio`. Não chamar Suno.

- [ ] **Step 3: Commit** `feat: create study material from Music.AI transcribe`

---

### Task 3: botão Do MP3 na lista

**Files:**
- Modify: `src/pages/Estudo.tsx`

- [ ] **Step 1: Na `EstudoList`**

- Input file hidden `accept="audio/mpeg,audio/ogg,.mp3,.ogg"`.
- Botão **Do MP3** no header (ao lado do título).
- Estado `importing`. Card “Lendo cifra e compassos…” enquanto importa.
- Sucesso: `navigate(/estudo/${id})`.
- Falha: `toast.error`. Sem navigate.
- Sem `school.id`: toast, não sobe.

**Carregar playalong** na sala **não** chama este cano.

- [ ] **Step 2: Commit** `feat: add Do MP3 on Estudo list`

---

### Task 4: mapa + verificação

- [ ] Atualizar `.agent/development-map.md`: C2 em implementação, spec + plano linkados.
- [ ] Rodar `npx tsx src/lib/__tests__/fromMp3ToStudy.test.ts` e os testes C1 (`playalong`, `alphaTabSettings`, `studyNotationTex`).
- [ ] Commit `docs: point map at Estudo C2 from-mp3`

---

## Cobertura da spec

| Spec | Task |
|---|---|
| Do MP3 na lista | 3 |
| Material novo | 2 |
| Inbox + Edge `{ audioUrl }` | 2 |
| Slash 4/4 + cifra no beat + atravessa | 1 |
| countIn + syncPoints | 1 |
| Sem practice_audio / Suno | 2 |
| Falha não cria material | 2 |
| Carregar playalong intacto | 3 |
| Testes fixture | 1 |
