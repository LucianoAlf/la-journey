import { notationFixtures } from '../__fixtures__/notationFixtures'
import { beatsToAlphaTex } from '../beatsToAlphaTex'
import { resolveNotationPreviewItem } from '../notationCompat'

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

test('preview prefers modern notation_data over stale legacy notation', () => {
  const modernNotationData = {
    clef: 'treble',
    keySignature: 'C',
    timeSignature: null,
    beats: ['C/4', 'D/4', 'E/4', 'F/4', 'G/4', 'A/4', 'B/4', 'C/5'].map((pitch) => ({
      pitches: [{ pitch, accidental: null }],
      duration: 'q',
      tie: false,
      isRest: false,
      dotted: false,
      cifra: null,
      annotation: null,
      lyric: null,
    })),
  }
  const staleLegacyNotation = {
    type: 'staff',
    staves: [{
      clef: 'treble' as const,
      key_signature: 'C',
      time_signature: null,
      notes: ['c/4:q', 'd/4:q', 'e/4:q', 'f/4:q', 'g/4:q', 'a/4:q', 'b/4:qr', 'c/5:q'],
      accidentals: [null, null, null, null, null, null, null, null],
    }],
  }

  const resolved = resolveNotationPreviewItem({
    notation: staleLegacyNotation,
    notationData: modernNotationData,
  })

  assert(resolved?.source === 'notation_data', 'preview must use notation_data when present')
  assert(!resolved.item.tex.includes(' r'), `modern notation preview should not contain stale rest\n${resolved.item.tex}`)
})
