import {
  getAlphaTexInlineFrameStyle,
  hasExplicitAlphaTexTimeSignature,
  normalizeAlphaTex,
  raiseTabSlurPathData,
  shouldHideAlphaTabSvgGroup,
  shouldHideAlphaTexInlineText,
} from '../../components/music/AlphaTexInlineRenderer'
import { getTabSvgTiePath } from '../../components/music/TabSvgEditor'

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

test('does not hide pick-stroke glyphs while hiding free-mode signature glyphs', () => {
  assert(shouldHideAlphaTabSvgGroup('\uE084', false), 'free-mode signature glyph should be hidden')
  assert(!shouldHideAlphaTabSvgGroup('\uE610', false), 'down pick-stroke glyph must stay visible')
  assert(!shouldHideAlphaTabSvgGroup('\uE612', false), 'up pick-stroke glyph must stay visible')
})

test('raises AlphaTab tablature slur paths above the fret numbers', () => {
  const downwardSlur = ' M124.97516363636363,115.47349999999999 C131.90762727272727,123.25807374708694,145.77255454545454,123.25807374708694,152.70501818181816,115.47349999999999 C145.77255454545454,125.39647374708694,131.90762727272727,125.39647374708694,124.97516363636363,115.47349999999999 z'
  const raised = raiseTabSlurPathData(downwardSlur)

  assert(raised !== downwardSlur, 'expected downward slur path to be transformed')
  assert(raised.includes(',101.47349999999999'), 'slur anchors should sit clearly above the fret numbers')
  assert(raised.includes(',93.6889262529130'), 'first curve should move higher above the lifted anchor y')
  assert(raised.includes(',91.5505262529130'), 'second curve should move higher above the lifted anchor y')
  assert(raiseTabSlurPathData(' M98,132.2 L125,132.2 L125,128.15 L98,128.15 z') === null, 'beam rectangles must not be transformed')
})

test('draws editable SVG tablature ties above the fret numbers', () => {
  const path = getTabSvgTiePath(100, 130, 80)

  assert(path === 'M 105 72 Q 115 62 125 72', `expected the editable SVG tie to arc above the fret number, got ${path}`)
})

test('page-layout notation can fill the available block width', () => {
  const style = getAlphaTexInlineFrameStyle({ width: 500, layout: 'page' })

  assert(style.width === '100%', 'expected page-layout notation to fill the block width')
  assert(style.maxWidth === 620, 'expected narrow notation widths to be lifted to the A4-friendly minimum')
  assert(style.overflow === 'visible', 'expected page-layout notation not to clip the staff')
})
