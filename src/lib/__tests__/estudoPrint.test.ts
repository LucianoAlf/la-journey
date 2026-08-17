import assert from 'node:assert/strict'
import { estudoPrintModel } from '../estudoPrint'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

const slashBlock = {
  block_type: 'notation',
  content: {
    notation_data: {
      clef: 'treble',
      keySignature: 'F',
      timeSignature: '4/4',
      bpm: 120,
      barsPerSystem: 4,
      beats: [
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, cifra: 'F', barAfter: true },
      ],
    },
  },
}

test('non-estudo material is not a sala print', () => {
  assert.equal(estudoPrintModel({
    title: 'Apostila',
    schoolName: 'LA',
    pageConfig: {},
  }, [slashBlock]), null)
})

test('estudo material keeps the current gravura and chrome', () => {
  const model = estudoPrintModel({
    title: 'Faixa Reconhecida (F)',
    schoolName: 'LA Music School',
    schoolLogoUrl: 'https://x/logo.png',
    pageConfig: {
      estudo: { origin: 'from-mp3', displayMode: 'slash-rhythm', curatorName: 'Alf' },
    },
  }, [slashBlock])
  assert.ok(model)
  assert.equal(model.title, 'Faixa Reconhecida (F)')
  assert.equal(model.schoolName, 'LA Music School')
  assert.equal(model.schoolLogoUrl, 'https://x/logo.png')
  assert.equal(model.curatorName, 'Alf')
  assert.equal(model.estudo.displayMode, 'slash-rhythm')
  assert.match(model.tex, /slashed/)
  assert.match(model.tex, /\\ks/)
})
