import {
  DEFAULT_FLOATING_IMAGE,
  DEFAULT_FLOATING_TEXT,
  buildFloatingShapeKindUpdate,
  buildFloatingShapePrimaryColorUpdate,
  createFloatingIcon,
  createFloatingShape,
  floatingBaseCSS,
  floatingTextCSS,
  getFloatingTextAutoSize,
  floatingTextHtmlToPlainText,
  floatingTextPlainTextToHtml,
  isFloatingTextContentEmpty,
  getFloatingShapePrimaryColor,
  getFloatingShapeLabel,
} from '../floatingElements'
import { normalizeIconifyElementIconData } from '../iconifyElementCatalog'
import {
  buildCuratedInstrumentSvg,
  inferGeneratedElementType,
  resolveCuratedElementSvgCode,
} from '../elementPicker'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nExpected: ${expectedJson}\nActual:   ${actualJson}`)
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

test('creates scoped floating shapes in the existing floating element model', () => {
  const star = createFloatingShape('star', {
    id: 'shape-1',
    pageIndex: 2,
    zIndex: 40,
  })

  assertEqual(star.type, 'shape', 'new visual shapes should reuse type=shape')
  assertEqual(star.shape, 'star', 'shape kind should be preserved')
  assertEqual(star.pageIndex, 2, 'shape should target the current page')
  assertEqual(star.zIndex, 40, 'shape should receive caller z-index')
  assert(star.width > 0 && Number(star.height) > 0, 'shape should have printable dimensions')
  assertEqual(star.height, 14.1, 'aspect-locked shapes should use A4-correct visual height')
})

test('gives legacy floating images without stored height a clickable A4 box', () => {
  const image = {
    ...DEFAULT_FLOATING_IMAGE,
    id: 'image-1',
    imageUrl: 'https://example.com/logo.png',
    width: 30,
  }

  const style = floatingBaseCSS(image)

  assertEqual(style.width, '30%', 'image should keep its stored width')
  assertEqual(style.height, '21.2%', 'image should infer a real hit box height on A4 pages')
})

test('gives floating text a real editable hit box', () => {
  const text = {
    ...DEFAULT_FLOATING_TEXT,
    id: 'text-1',
  }

  const style = floatingBaseCSS(text)

  assertEqual(style.width, '21%', 'text should start close to the visible text width')
  assertEqual(style.height, '3.4%', 'text should start close to the visible text height')
  assertEqual(text.fontSize, 32, 'new floating text should be readable on the canvas')
})

test('converts floating text html to plain editable text without editor artifacts', () => {
  assertEqual(
    floatingTextHtmlToPlainText('<p>Novo texto</p>'),
    'Novo texto',
    'paragraph html should become plain text',
  )
  assertEqual(
    floatingTextHtmlToPlainText('<p>Linha 1</p><p>Linha 2</p>'),
    'Linha 1\nLinha 2',
    'paragraphs should preserve line breaks',
  )
  assert(isFloatingTextContentEmpty('<p><br class="ProseMirror-trailingBreak"></p>'), 'editor-only empty html should count as empty')
  assertEqual(
    floatingTextPlainTextToHtml('Linha 1\nLinha 2'),
    '<p>Linha 1</p><p>Linha 2</p>',
    'plain text should persist as small html paragraphs',
  )
})

test('applies floating text italic style in renderer css', () => {
  const style = floatingTextCSS({
    ...DEFAULT_FLOATING_TEXT,
    id: 'text-2',
    fontStyle: 'italic',
  })

  assertEqual(style.fontStyle, 'italic', 'floating text should support toolbar italic styling')
})

test('estimates floating text bounds from content and typography', () => {
  assertEqual(
    getFloatingTextAutoSize({
      content: '<p>Novo texto</p>',
      fontSize: 32,
      lineHeight: 1.18,
      letterSpacing: 0,
    }),
    { width: 21, height: 3.4 },
    'single-line text should get a Canva-like tight box',
  )

  assertEqual(
    getFloatingTextAutoSize({
      content: '<p>Linha 1</p><p>Linha 2 maior</p>',
      fontSize: 24,
      lineHeight: 1.2,
      letterSpacing: 0,
    }),
    { width: 20.4, height: 5.1 },
    'multi-line text should grow vertically while staying content-sized',
  )
})

test('landscape floating text percent uses the oriented page', () => {
  const args = {
    content: '<p>Novo texto</p>',
    fontSize: 32,
    lineHeight: 1.18,
    letterSpacing: 0,
  }
  const portrait = getFloatingTextAutoSize(args)
  const landscape = getFloatingTextAutoSize(args, 'landscape')
  assert(landscape.width < portrait.width, 'wider paper should shrink width percent')
  assert(landscape.height > portrait.height, 'shorter paper should grow height percent')
})

test('normalizes old circle dimensions to a square visual box on A4', () => {
  const circle = createFloatingShape('circle', {
    id: 'shape-1',
    pageIndex: 0,
    width: 20,
    height: 20,
  })

  const style = floatingBaseCSS(circle)

  assertEqual(style.width, '20%', 'circle should keep its stored width')
  assertEqual(style.height, '14.1%', 'circle visual height should be corrected from page aspect ratio')
})

test('creates Iconify icons as floating elements with local collection ids', () => {
  const icon = createFloatingIcon({
    id: 'icon-1',
    pageIndex: 1,
    zIndex: 50,
    icon: 'lucide:music',
    label: 'Musica',
  })

  assertEqual(icon.type, 'iconify_icon', 'Iconify icons should live in the floating element union')
  assertEqual(icon.icon, 'lucide:music', 'Iconify icon id should be stored in page_config')
  assertEqual(icon.name, 'Musica', 'icon label should become layer name')
  assertEqual(icon.color, '#1e3a5f', 'icon should use a brand-safe default color')
})

test('uses curated SVG for common instrument elements instead of tiny AI geometry', () => {
  const svg = buildCuratedInstrumentSvg({
    label: 'Violao SVG monocromatico',
    description: 'violao classico visto de frente',
    elementType: 'instrumento',
  })

  assert(svg != null, 'guitar should resolve to a curated SVG asset')
  assert(svg!.includes('viewBox="0 0 24 24"'), 'curated instrument SVG should keep Iconify coordinates')
  assert(svg!.includes('currentColor'), 'curated instrument SVG should be recolorable')
  assert(svg!.includes('d="'), 'curated instrument SVG should use real path geometry')

  const drumSvg = buildCuratedInstrumentSvg({
    label: 'Bateria',
    description: 'caixa de bateria com baquetas',
    elementType: 'instrumento',
  })

  assert(drumSvg != null, 'drums should also resolve to a curated SVG asset')
  assert(drumSvg!.includes('ellipse'), 'drum SVG should preserve recognizable instrument geometry')
})

test('infers instrument SVG requests from label and prompt even when UI type is music', () => {
  assertEqual(
    inferGeneratedElementType({
      label: 'Violao SVG monocromatico',
      description: 'violao classico visto de frente',
      requestedType: 'musica',
    }),
    'instrumento',
    'instrument prompts should not stay in the notation/music generator',
  )
})

test('overrides existing bad generated instrument SVG when asset text says guitar', () => {
  const badSvg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="55" r="25" fill="currentColor" /></svg>'
  const resolved = resolveCuratedElementSvgCode({
    label: 'violao svg monocromatico',
    description: 'generated ai svg guitar',
    elementType: 'musica',
    svgCode: badSvg,
    source: 'ai-svg',
  })

  assert(resolved != null, 'resolver should return SVG')
  assert(resolved !== badSvg, 'guitar-like assets should be replaced by curated SVG')
  assert(resolved!.includes('viewBox="0 0 24 24"'), 'replacement should be the curated instrument SVG')
})

test('normalizes local Iconify data to a 24x24 viewBox so icons are not clipped', () => {
  const data = normalizeIconifyElementIconData({
    body: '<path d="M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8"/>',
  })

  assertEqual(data.width, 24, 'local icons should declare the same width as their path coordinate system')
  assertEqual(data.height, 24, 'local icons should declare the same height as their path coordinate system')
})

test('exposes labels for the supported basic shapes', () => {
  assertEqual(getFloatingShapeLabel('rectangle'), 'Retângulo', 'rectangle should have a human label')
  assertEqual(getFloatingShapeLabel('circle'), 'Círculo', 'circle should have a human label')
  assertEqual(getFloatingShapeLabel('line'), 'Linha', 'line should have a human label')
  assertEqual(getFloatingShapeLabel('arrow'), 'Seta', 'arrow should have a human label')
  assertEqual(getFloatingShapeLabel('star'), 'Estrela', 'star should have a human label')
  assertEqual(getFloatingShapeLabel('callout'), 'Callout', 'callout should have a human label')
})

test('uses stroke as the primary editable color for line shapes', () => {
  const line = createFloatingShape('line', {
    id: 'line-1',
    pageIndex: 0,
    stroke: { color: '#111111', width: 3, style: 'solid' },
  })

  assertEqual(getFloatingShapePrimaryColor(line), '#111111', 'line primary color should come from stroke')
  assertEqual(
    buildFloatingShapePrimaryColorUpdate(line, '#ff2d78'),
    { stroke: { color: '#ff2d78', width: 3, style: 'solid' } },
    'changing the main color of a line should update stroke, not fill',
  )
})

test('switching a filled shape to line carries the visible color into stroke', () => {
  const rectangle = createFloatingShape('rectangle', {
    id: 'shape-2',
    pageIndex: 0,
    fill: { type: 'solid', color: '#22c55e' },
    stroke: { color: '#111111', width: 0, style: 'solid' },
  })

  assertEqual(
    buildFloatingShapeKindUpdate(rectangle, 'line'),
    {
      shape: 'line',
      name: 'Linha',
      fill: { type: 'none', color: 'transparent' },
      stroke: { color: '#22c55e', width: 3, style: 'solid' },
    },
    'line conversion should preserve the user-visible fill color as line stroke',
  )
})
