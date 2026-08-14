/**
 * Executar via: npx tsx src/lib/__tests__/cifraClubParser.test.ts
 */
import assert from 'node:assert/strict'
import { parseCifraPage } from '../../../supabase/functions/_shared/cifra-parser.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

function wrapCifra(cifra: string, extras = '') {
  return `<html><head><title>Fé - IZA</title></head><body>
    <h1>Fé</h1><h2><a href="/iza/">IZA</a></h2>
    <button>Ebm</button>
    ${extras}
    <pre>${cifra}</pre>
  </body></html>`
}

const FE_SNIPPET = `           Dm7
Hoje eu só vim agradecer
                 Em7(5-)
Pra chegar até aqui
               Em7(5-)           A7
Levantando sempre no raiar do dia
`

test('keeps altered chords like Em7(5-) in the chord list', () => {
  const parsed = parseCifraPage(wrapCifra(FE_SNIPPET), 'https://www.cifraclub.com.br/iza/fe/')
  assert.ok(parsed.chords.includes('Em7(5-)'), `chords=${parsed.chords.join(',')}`)
  assert.ok(parsed.chords.includes('Dm7'))
  assert.ok(parsed.chords.includes('A7'))
})

test('lyrics drop chord-only lines including parentheses alterations', () => {
  const parsed = parseCifraPage(wrapCifra(FE_SNIPPET), 'https://www.cifraclub.com.br/iza/fe/')
  assert.match(parsed.lyrics, /Pra chegar até aqui/)
  assert.match(parsed.lyrics, /Levantando sempre/)
  assert.doesNotMatch(parsed.lyrics, /Em7\(5-\)/)
  assert.doesNotMatch(parsed.lyrics, /\bA7\b/)
})

test('extracts youtube from a watch href', () => {
  const html = wrapCifra('C\nOi', '<a href="https://www.youtube.com/watch?v=KE0LxH8b7no">video</a>')
  const parsed = parseCifraPage(html, 'https://www.cifraclub.com.br/iza/fe/')
  assert.equal(parsed.youtube_url, 'https://www.youtube.com/watch?v=KE0LxH8b7no')
})

test('extracts youtube from embed iframe and youtu.be', () => {
  const embed = wrapCifra('C\nOi', '<iframe src="https://www.youtube.com/embed/KE0LxH8b7no"></iframe>')
  assert.equal(
    parseCifraPage(embed, 'https://www.cifraclub.com.br/iza/fe/').youtube_url,
    'https://www.youtube.com/watch?v=KE0LxH8b7no',
  )

  const short = wrapCifra('C\nOi', '<a href="https://youtu.be/KE0LxH8b7no">video</a>')
  assert.equal(
    parseCifraPage(short, 'https://www.cifraclub.com.br/iza/fe/').youtube_url,
    'https://www.youtube.com/watch?v=KE0LxH8b7no',
  )
})
