import assert from 'node:assert/strict'
import {
  ESTUDO_PRINT_PAGE_CSS,
  ESTUDO_PRINTVIEW_PAGE_CSS,
  estudoPdfFilename,
  estudoPdfUsesLandscape,
} from '../estudoPdf'
import { browserlessA4PdfOptions } from '../a4Preview'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('keeps a readable title', () => {
  assert.equal(estudoPdfFilename('Faixa Reconhecida (F)'), 'Faixa Reconhecida (F)')
})

test('strips path and reserved characters', () => {
  assert.equal(estudoPdfFilename('a/b:c*d?'), 'a-b-c-d')
})

test('empty title falls back', () => {
  assert.equal(estudoPdfFilename('   '), 'estudo')
})

test('estudo PDF paper is A4 landscape', () => {
  assert.match(ESTUDO_PRINT_PAGE_CSS, /landscape/)
  assert.doesNotMatch(ESTUDO_PRINT_PAGE_CSS, /portrait/)
  assert.equal(estudoPdfUsesLandscape({ estudo: { origin: 'from-mp3' } }), true)
  assert.equal(estudoPdfUsesLandscape({ estudo: { origin: 'from-mp3' }, orientation: 'portrait' }), true)
  assert.equal(estudoPdfUsesLandscape({ orientation: 'portrait' }), false)
  assert.equal(estudoPdfUsesLandscape({ orientation: 'landscape' }), true)
})

test('PrintView of the sala uses landscape A4 and does not lock portrait height', () => {
  assert.match(ESTUDO_PRINTVIEW_PAGE_CSS, /size:\s*A4 landscape/)
  assert.doesNotMatch(ESTUDO_PRINTVIEW_PAGE_CSS, /portrait/)
  assert.match(ESTUDO_PRINTVIEW_PAGE_CSS, /297mm/)
  assert.match(ESTUDO_PRINTVIEW_PAGE_CSS, /max-height:\s*none/)
  assert.match(ESTUDO_PRINTVIEW_PAGE_CSS, /overflow:\s*visible/)
  assert.equal(
    browserlessA4PdfOptions(estudoPdfUsesLandscape({ estudo: { origin: 'from-mp3' } }) ? 'landscape' : 'portrait').landscape,
    true,
  )
})
