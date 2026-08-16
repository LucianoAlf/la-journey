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
