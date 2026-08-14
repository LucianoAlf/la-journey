import assert from 'node:assert/strict'
import { extractCifraPlainText, isCifraHtml, parseCifraBlocks, splitCifraPlainText, stripCifraTablature } from '../cifraBlocks'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('detects cifra html', () => {
  assert.equal(isCifraHtml('<pre>C\nhello</pre>'), true)
  assert.equal(isCifraHtml('<p>Artista</p>'), false)
})

test('parses chord lines above lyrics', () => {
  const blocks = parseCifraBlocks('[Intro]\nE   A9\nQuem um dia irá dizer\n')
  assert.equal(blocks[0].type, 'section')
  assert.equal(blocks[1].type, 'chord')
  assert.equal(blocks[2].type, 'lyric')
})

test('strips tab headers and tab lines but keeps lyrics', () => {
  const stripped = stripCifraTablature('[Intro]\nE A9\n[Tab - Primeira Parte]\nE|--0--|\nQuem um dia irá dizer')
  assert.match(stripped, /Quem um dia/)
  assert.doesNotMatch(stripped, /Tab - Primeira|E\|--0--/)
})

test('splits cifra without dropping leftover lines', () => {
  const { head, tail } = splitCifraPlainText('a\nb\nc\nd', 2)
  assert.equal(head, 'a\nb')
  assert.equal(tail, 'c\nd')
  assert.equal(extractCifraPlainText('<pre>C\nOi</pre>'), 'C\nOi')
})

test('decodes apostrophes left as html entities', () => {
  assert.equal(
    extractCifraPlainText('<pre>He couldn&#39;t stop</pre>'),
    "He couldn't stop",
  )
})
