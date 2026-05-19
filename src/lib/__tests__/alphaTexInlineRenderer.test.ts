import {
  getAlphaTexInlineFrameStyle,
  getLegacyNotationAlphaTexDisplayTex,
  getAlphaTexInlineRenderTex,
  hasExplicitAlphaTexTimeSignature,
  isFreeTimeSignaturePathData,
  normalizeAlphaTex,
  raiseTabSlurPathData,
  shouldHideAlphaTabSvgGroup,
  shouldHideAlphaTexInlineText,
  shiftAlphaTabTranslate,
} from '../../components/music/AlphaTexInlineRenderer'
import { getAlphaTabViewerRenderTex } from '../../components/music/AlphaTabViewer'
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

test('adds 4/4 only for legacy notation blocks whose metadata says 4/4', () => {
  const legacyTex = '\\title "Divisao - Colcheias" \\tempo 60 . :8 c4 d4 e4 f4 | :4 g4'
  const displayTex = getLegacyNotationAlphaTexDisplayTex(legacyTex, 'Colcheias em 4/4 Colcheias em compasso quaternario')
  const freeDisplayTex = getLegacyNotationAlphaTexDisplayTex(legacyTex, 'Notas soltas')

  assert(displayTex.includes('\\ts 4 4'), 'legacy 4/4 notation should receive an explicit display time signature')
  assert(hasExplicitAlphaTexTimeSignature(displayTex), 'legacy 4/4 display tex should be detected as explicit time')
  assert(!freeDisplayTex.includes('\\ts 4 4'), 'generic legacy notation must stay free-time')
  assert(!hasExplicitAlphaTexTimeSignature(freeDisplayTex), 'generic legacy notation should not become explicit time')
})

test('hides AlphaTab free-time text from canvas previews without changing the music data', () => {
  assert(shouldHideAlphaTexInlineText('Free time', false), 'free-time label should be hidden in canvas preview')
  assert(!shouldHideAlphaTexInlineText('Escala de Do', false), 'regular labels should stay visible')
})

test('renders free notation without reserving visible free-time marker space', () => {
  const freeTex = '\\track \\staff{score} \\ft . :4 c3 d3'

  assert(!getAlphaTexInlineRenderTex(freeTex).includes('\\ft'), 'inline renderer strips visual \\ft marker and marks the score free-time through the AlphaTab model')
  assert(!getAlphaTabViewerRenderTex(freeTex).includes('\\ft'), 'modal viewer strips visual \\ft marker and marks the score free-time through the AlphaTab model')
})

test('keeps tablature AlphaTex untouched when hiding notation free-time markers', () => {
  const freeTab = '\\track \\staff{tabs} \\ft . :4 1.6 3.6 5.6'

  assert(getAlphaTexInlineRenderTex(freeTab, false, true).includes('\\ft'), 'inline tablature should keep AlphaTex free-time data intact')
  assert(getAlphaTabViewerRenderTex(freeTab, false, true).includes('\\ft'), 'viewer tablature should keep AlphaTex free-time data intact')
})

test('does not hide pick-stroke glyphs while hiding free-mode signature glyphs', () => {
  assert(shouldHideAlphaTabSvgGroup('\uE084', false), 'free-mode signature glyph should be hidden')
  assert(!shouldHideAlphaTabSvgGroup('\uE610', false), 'down pick-stroke glyph must stay visible')
  assert(!shouldHideAlphaTabSvgGroup('\uE612', false), 'up pick-stroke glyph must stay visible')
})

test('hides path-based free-time parentheses without hiding slurs', () => {
  const leftParen = ' M76.49600000000001,64.41499999999999 C73.796,55.41499999999999,73.796,37.41499999999999,76.49600000000001,28.415 C71.42000000000002,37.41499999999999,71.42000000000002,55.41499999999999,76.49600000000001,64.41499999999999 z'
  const downwardSlur = ' M124.97516363636363,115.47349999999999 C131.90762727272727,123.25807374708694,145.77255454545454,123.25807374708694,152.70501818181816,115.47349999999999 C145.77255454545454,125.39647374708694,131.90762727272727,125.39647374708694,124.97516363636363,115.47349999999999 z'
  const noteheadLike = ' M20,20 C23,12,35,12,38,20 C35,28,23,28,20,20 z'

  assert(isFreeTimeSignaturePathData(leftParen), 'free-time parentheses can be emitted as narrow path glyphs')
  assert(!isFreeTimeSignaturePathData(downwardSlur), 'musical slurs must not be treated as free-time parentheses')
  assert(!isFreeTimeSignaturePathData(noteheadLike), 'musical noteheads must not be treated as free-time parentheses')
})

test('compacts free-time signature gap by shifting AlphaTab glyph transforms', () => {
  assert(
    shiftAlphaTabTranslate('translate(104.08460000000001 97.40275)', 24) === 'translate(80.08460000000001 97.40275)',
    'expected free-mode music glyphs to move left without changing vertical placement',
  )
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
