import { notationFixtures } from '../__fixtures__/notationFixtures'
import { beatsToAlphaTex } from '../beatsToAlphaTex'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

for (const fixture of notationFixtures) {
  test(`${fixture.name} follows the expected AlphaTex contract`, () => {
    const tex = beatsToAlphaTex(fixture.notation_data.beats, {
      clef: fixture.notation_data.clef ?? 'treble',
      keySignature: fixture.notation_data.keySignature ?? 'C',
      timeSignature: fixture.notation_data.timeSignature ?? null,
      timeSignatureMode: fixture.notation_data.time_signature_mode,
      includeLyrics: false,
    })

    for (const expected of fixture.expected_alphaTex.contains ?? []) {
      assert(tex.includes(expected), `${fixture.name}: expected AlphaTex to contain ${expected}\n${tex}`)
    }

    for (const forbidden of fixture.expected_alphaTex.notContains ?? []) {
      assert(!tex.includes(forbidden), `${fixture.name}: expected AlphaTex not to contain ${forbidden}\n${tex}`)
    }
  })
}

