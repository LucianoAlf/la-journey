import assert from 'node:assert/strict'
import {
  deleteBeat,
  resolveDeleteBeatIndex,
  insertNote,
  insertRest,
  replaceNote,
  sessionToAlphaTex,
  applySessionToRenderData,
} from '../notationInlineOps.ts'
import { beatsToAlphaTex } from '../beatsToAlphaTex.ts'
import type { InlineBeat } from '../notationInlineHydrate.ts'
import { hydrateNotationFromBlock } from '../notationInlineHydrate.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

const c4: InlineBeat = { pitches: [{ pitch: 'C/4' }], duration: 'q', isRest: false }

test('insertNote appends after index and selects the new beat', () => {
  const next = insertNote({
    beats: [c4],
    selectedBeatIdx: 0,
    pitch: 'E/4',
    afterIdx: 0,
    duration: 'q',
    accidental: null,
    dotted: false,
    doubleDotted: false,
  })
  assert.equal(next.beats.length, 2)
  assert.equal(next.beats[1].pitches[0].pitch, 'E/4')
  assert.equal(next.selectedBeatIdx, 1)
})

test('replaceNote changes pitch in place', () => {
  const next = replaceNote({ beats: [c4], atIdx: 0, pitch: 'G/4', accidental: '#' })
  assert.equal(next.beats[0].pitches[0].pitch, 'G/4')
  assert.equal(next.beats[0].pitches[0].accidental, '#')
  assert.equal(next.beats[0].isRest, false)
})

test('resolveDeleteBeatIndex uses selection or the last note', () => {
  assert.equal(resolveDeleteBeatIndex(2, 5), 2)
  assert.equal(resolveDeleteBeatIndex(-1, 5), 4)
  assert.equal(resolveDeleteBeatIndex(9, 3), 2)
  assert.equal(resolveDeleteBeatIndex(-1, 0), -1)
})

test('deleteBeat removes and clamps selection', () => {
  const next = deleteBeat({
    beats: [c4, { pitches: [{ pitch: 'D/4' }], duration: 'q', isRest: false }],
    selectedBeatIdx: 1,
    idx: 1,
  })
  assert.equal(next.beats.length, 1)
  assert.equal(next.selectedBeatIdx, 0)
})

test('insertRest uses current duration', () => {
  const next = insertRest({
    beats: [c4],
    selectedBeatIdx: 0,
    duration: 'h',
    dotted: false,
    doubleDotted: false,
  })
  assert.equal(next.beats[1].isRest, true)
  assert.equal(next.beats[1].duration, 'h')
})

test('sessionToAlphaTex uses the same AlphaTab octave as the idle preview', () => {
  // Preview (NotationPreviewCompat) chama beatsToAlphaTex sem offset → default -1.
  // C/4 do modelo vira c3 no AlphaTex. A sessão não pode emitir c4: o clique oitava a pauta.
  const preview = beatsToAlphaTex(
    [{ pitches: [{ pitch: 'C/4' }], duration: 'q', isRest: false, tie: false, dotted: false, cifra: null, annotation: null, lyric: null }],
    { clef: 'treble', keySignature: 'C', timeSignature: null, includeLyrics: false },
  )
  const { tex } = sessionToAlphaTex({
    beats: [c4],
    clef: 'treble',
    keySignature: 'C',
    timeSignature: 'free',
    bpm: 120,
    grandStaff: false,
  })
  const previewNote = preview.match(/\bc3\b/i)
  const sessionNote = tex.match(/\bc3\b/i)
  assert.ok(previewNote, `preview deve gravar C/4 como c3, veio: ${preview}`)
  assert.ok(sessionNote, `sessão deve gravar C/4 como c3 (igual ao preview), veio: ${tex}`)
  assert.equal(tex.includes('c4'), false, 'c4 na sessão = uma oitava acima do preview')
})

test('sessionToAlphaTex emits the new pitch', () => {
  const { tex, indexMap } = sessionToAlphaTex({
    beats: [
      c4,
      { pitches: [{ pitch: 'E/4' }], duration: 'q', isRest: false },
    ],
    clef: 'treble',
    keySignature: 'C',
    timeSignature: 'free',
    bpm: 120,
    grandStaff: false,
  })
  assert.match(tex, /e3/i)
  assert.ok(indexMap.length >= 2)
})

test('applySessionToRenderData writes notation_data and alphaTex without dropping other keys', () => {
  const rd = applySessionToRenderData(
    { foo: 1, notation: { type: 'staff', staves: [] } },
    {
      beats: [{ pitches: [{ pitch: 'C/4' }], duration: 'q', isRest: false }],
      clef: 'treble',
      keySignature: 'C',
      timeSignature: 'free',
      bpm: 120,
      grandStaff: false,
      barsPerSystem: 4,
      title: 'Intervalos',
    },
  )
  assert.equal(rd.foo, 1)
  assert.equal(rd.clef, 'treble')
  assert.equal(rd.barsPerSystem, 4)
  assert.equal(rd.notation_data.barsPerSystem, 4)
  assert.ok(Array.isArray(rd.notation_data.beats))
  assert.equal(typeof rd.alphaTex, 'string')
  assert.match(rd.alphaTex, /c3/i)
  assert.equal(rd.notation.staves.length >= 1, true)
})

test('sessionToAlphaTex puts chord names on the beats that carry cifra', () => {
  const { tex } = sessionToAlphaTex({
    beats: [
      { pitches: [{ pitch: 'D/4' }], duration: 'q', isRest: false, cifra: 'D' },
      { pitches: [{ pitch: 'G/4' }], duration: 'q', isRest: false, cifra: 'G' },
    ],
    clef: 'treble',
    keySignature: 'C',
    timeSignature: '4/4',
    bpm: 120,
    grandStaff: false,
  })
  assert.match(tex, /\{ch "D"\}/)
  assert.match(tex, /\{ch "G"\}/)
})

test('sessionToAlphaTex marks the tie on the destination beat', () => {
  // tieToNext no beat N liga N ao N+1; o {-} do AlphaTex marca quem recebe a ligadura.
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
  const comTie = tokens.filter(token => token.includes('{-}'))
  assert.equal(comTie.length, 1, `ligadura deve sair em exatamente um beat, veio: ${tex}`)
  assert.equal(
    tokens.indexOf(comTie[0]),
    tokens.length - 1,
    `ligadura deve sair no beat destino (o segundo), veio: ${tex}`,
  )
})

test('sessionToAlphaTex emits slashed on slash beats', () => {
  const { tex } = sessionToAlphaTex({
    beats: [
      { pitches: [{ pitch: 'B/4' }], duration: 'q', isRest: false, slash: true, cifra: 'D' },
      { pitches: [], duration: 'q', isRest: false, slash: true },
    ],
    clef: 'treble',
    keySignature: 'C',
    timeSignature: 'free',
    bpm: 120,
    grandStaff: false,
  })
  assert.ok(tex.includes('b3{slashed ch "D"}'), `slash e cifra na mesma chave, veio: ${tex}`)
  assert.ok(tex.includes('b3{slashed}'), `slash sem pitch cai em b3, veio: ${tex}`)
})

test('hydrateNotationFromBlock preserves bar-level facts on beats', () => {
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
  assert.equal(b0.slash, true, 'slash sobrevive')
  assert.equal(b0.sectionStart?.marker, 'A', 'marcador de secao sobrevive')
  assert.equal(b0.repeatOpen, true, 'repeatOpen sobrevive')
  assert.equal(b0.timeSignature, '2/4', 'metrica do compasso sobrevive')
  assert.equal(b1.repeatClose, 7, 'repeatClose sobrevive')
  assert.equal(b1.simile, 'simple', 'simile sobrevive')
  assert.equal(b1.jump, 'fine', 'jump sobrevive')
})

test('replaceNote keeps cifra; insertNote does not copy it', () => {
  const withCifra: InlineBeat = { pitches: [{ pitch: 'D/4' }], duration: 'q', isRest: false, cifra: 'D' }
  const replaced = replaceNote({ beats: [withCifra], atIdx: 0, pitch: 'F/4', accidental: null })
  assert.equal(replaced.beats[0].cifra, 'D')
  const inserted = insertNote({
    beats: [withCifra],
    selectedBeatIdx: 0,
    pitch: 'A/4',
    afterIdx: 0,
    duration: 'q',
    accidental: null,
    dotted: false,
    doubleDotted: false,
  })
  assert.equal(inserted.beats[1].cifra, undefined)
})

test('insertNote with slash writes a rhythmic slash at the neutral pitch', () => {
  const next = insertNote({
    beats: [c4],
    selectedBeatIdx: 0,
    pitch: 'E/5',
    afterIdx: 0,
    duration: 'q',
    accidental: '#',
    dotted: false,
    doubleDotted: false,
    slash: true,
  })
  const slashBeat = next.beats[1]
  assert.equal(slashBeat.slash, true, 'beat novo sai como barra ritmica')
  assert.equal(slashBeat.pitches[0].pitch, 'B/4', 'professor nao escolhe altura: sempre B/4')
  assert.equal(slashBeat.pitches[0].accidental, undefined, 'slash nao carrega acidente do clique')
  assert.equal(slashBeat.isRest, false)
})

test('insertNote without slash keeps the clicked pitch', () => {
  const next = insertNote({
    beats: [c4],
    selectedBeatIdx: 0,
    pitch: 'E/5',
    afterIdx: 0,
    duration: 'q',
    accidental: null,
    dotted: false,
    doubleDotted: false,
  })
  assert.equal(next.beats[1].slash, undefined)
  assert.equal(next.beats[1].pitches[0].pitch, 'E/5')
})
