import {
  getAlphaTexInlineFrameStyle,
  hasExplicitAlphaTexTimeSignature,
  normalizeAlphaTex,
  shouldHideAlphaTexInlineText,
} from '../../components/music/AlphaTexInlineRenderer'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
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

test('keeps free notation free instead of inventing a 4/4 time signature', () => {
  const normalized = normalizeAlphaTex('\\title "Notas" \\tempo 80 . :1 f4 | a4 | c5 | e5')

  assert(!normalized.includes('\\ts 4 4'), 'free notation must not receive an invented 4/4 signature')
  assert(!hasExplicitAlphaTexTimeSignature(normalized), 'free notation should remain without an explicit time signature')
})

test('recognizes explicit AlphaTex time signatures', () => {
  assert(hasExplicitAlphaTexTimeSignature('\\ts 3 2 . :4 c4'), 'expected \\ts signatures to be detected')
  assert(hasExplicitAlphaTexTimeSignature('\\time 6/8 . :8 c4'), 'expected \\time signatures to be detected')
})

test('hides AlphaTab free-time text from canvas previews without changing the music data', () => {
  assert(shouldHideAlphaTexInlineText('Free time', false), 'free-time label should be hidden in canvas preview')
  assert(!shouldHideAlphaTexInlineText('Escala de Do', false), 'regular labels should stay visible')
})

test('page-layout notation can fill the available block width', () => {
  const style = getAlphaTexInlineFrameStyle({ width: 500, layout: 'page' })

  assert(style.width === '100%', 'expected page-layout notation to fill the block width')
  assert(style.maxWidth === 620, 'expected narrow notation widths to be lifted to the A4-friendly minimum')
  assert(style.overflow === 'visible', 'expected page-layout notation not to clip the staff')
})
