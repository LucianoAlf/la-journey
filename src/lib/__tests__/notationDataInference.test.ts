import { alphaTexToNotationData, inferNotationDataFromAlphaTex } from '../notationDataInference'

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

test('infers free mode when AlphaTex has no explicit time signature', () => {
  const inferred = inferNotationDataFromAlphaTex('\\track\\n\\staff{score}\\n.\\n:4 c3 d3')
  assert(inferred.time_signature_mode === 'free', 'expected free mode')
  assert(inferred.timeSignature === null, 'expected no time signature')
})

test('infers metered mode from explicit AlphaTex time signature', () => {
  const inferred = inferNotationDataFromAlphaTex('\\track\\n\\staff{score}\\n\\ts 3 4\\n.\\n:4 c3 d3 e3')
  assert(inferred.time_signature_mode === 'metered', 'expected metered mode')
  assert(inferred.timeSignature === '3/4', 'expected 3/4 time signature')
})

test('keeps one-note legacy AlphaTex bars as free spacing only', () => {
  const parsed = alphaTexToNotationData('\\title "Linhas" \\tempo 80 . :1 e4 | g4 | b4')
  assert(parsed.time_signature_mode === 'free', 'expected free mode')
  assert(parsed.beats.length === 3, 'expected three beats')
  assert(parsed.beats[0].pitches[0].pitch === 'E/5', 'expected octave-preserving E/5 source pitch')
  assert(parsed.beats[0].pedagogical_separator !== true, 'one-note separators should not be pedagogical')
  assert(parsed.beats[0].barAfter !== true, 'free separators must not be metric barlines')
})

test('parses grouped legacy free AlphaTex bars as pedagogical separators', () => {
  const parsed = alphaTexToNotationData('\\title "Escala" \\tempo 80 . :4 c4 d4 e4 f4 | g4 a4 b4 c5')
  assert(parsed.time_signature_mode === 'free-with-separators', 'expected free-with-separators mode')
  assert(parsed.beats.length === 8, 'expected eight beats')
  assert(parsed.beats[3].pedagogical_separator === true, 'expected separator after first tetracord')
  assert(parsed.beats[3].barAfter !== true, 'free separator must not be metric barline')
})
