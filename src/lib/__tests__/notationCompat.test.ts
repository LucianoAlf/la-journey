import assert from 'node:assert/strict'
import { notationDataToPreviewItem } from '../notationCompat.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

/** Tokens da linha de notas do tex (a ultima, fora de grande pauta). */
function noteTokens(tex: string): string[] {
  return tex.split('\n').at(-1)!.trim().split(/\s+/)
}

function previewTex(beats: unknown[]): string {
  const item = notationDataToPreviewItem({ clef: 'treble', keySignature: 'C', timeSignature: null, beats })
  assert.ok(item, 'preview deve sair para beats validos')
  return item.tex
}

test('preview moves tieToNext to the beat that receives the tie', () => {
  const tex = previewTex([
    { pitches: [{ pitch: 'C/4', accidental: null }], duration: 'q', isRest: false, tieToNext: true },
    { pitches: [{ pitch: 'C/4', accidental: null }], duration: 'q', isRest: false },
  ])
  const tokens = noteTokens(tex)
  const comTie = tokens.filter(token => token.includes('{-}'))
  assert.equal(comTie.length, 1, `ligadura em exatamente um beat, veio: ${tex}`)
  assert.equal(tokens.indexOf(comTie[0]), tokens.length - 1, `ligadura no beat destino, veio: ${tex}`)
})

test('preview reads the legacy tie alias as the origin of the tie', () => {
  // `tie` gravado pelo editor VexFlow antigo marcava quem SAI, igual ao tieToNext.
  const tex = previewTex([
    { pitches: [{ pitch: 'C/4', accidental: null }], duration: 'q', isRest: false, tie: true },
    { pitches: [{ pitch: 'C/4', accidental: null }], duration: 'q', isRest: false },
  ])
  const tokens = noteTokens(tex)
  assert.equal(tokens.filter(token => token.includes('{-}')).length, 1, `uma ligadura so, veio: ${tex}`)
  assert.ok(tokens.at(-1)!.includes('{-}'), `ligadura no beat destino, veio: ${tex}`)
})

test('preview without ties emits no tie marker', () => {
  const tex = previewTex([
    { pitches: [{ pitch: 'C/4', accidental: null }], duration: 'q', isRest: false },
    { pitches: [{ pitch: 'D/4', accidental: null }], duration: 'q', isRest: false },
  ])
  assert.equal(tex.includes('{-}'), false, `sem ligadura no modelo, sem {-} no tex, veio: ${tex}`)
})

test('preview keeps a treble tie on treble when bass is interleaved', () => {
  const item = notationDataToPreviewItem({
    clef: 'treble',
    keySignature: 'C',
    timeSignature: '4/4',
    grandStaff: true,
    beats: [
      { pitches: [{ pitch: 'C/4', accidental: null }], duration: 'q', isRest: false, tieToNext: true, staff: 'treble', timeSlot: 0 },
      { pitches: [{ pitch: 'C/3', accidental: null }], duration: 'q', isRest: false, staff: 'bass', timeSlot: 0 },
      { pitches: [{ pitch: 'C/4', accidental: null }], duration: 'q', isRest: false, staff: 'treble', timeSlot: 1 },
      { pitches: [{ pitch: 'C/3', accidental: null }], duration: 'q', isRest: false, staff: 'bass', timeSlot: 1 },
    ],
  })
  assert.ok(item, 'preview de grande pauta deve sair')
  const [trebleStaff, bassStaff] = item.tex.split('\\staff').slice(1)
  assert.equal((item.tex.match(/\{-\}/g) ?? []).length, 1, `uma ligadura so, veio: ${item.tex}`)
  assert.ok(trebleStaff.includes('{-}'), `ligadura na clave de Sol, veio: ${item.tex}`)
  assert.equal(bassStaff.includes('{-}'), false, `bass sem ligadura orfa, veio: ${item.tex}`)
})
