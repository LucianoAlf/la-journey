import {
  DEFAULT_FLOATING_IMAGE,
  buildFloatingShapeKindUpdate,
  buildFloatingShapePrimaryColorUpdate,
  createFloatingIcon,
  createFloatingShape,
  floatingBaseCSS,
  getFloatingShapePrimaryColor,
  getFloatingShapeLabel,
} from '../floatingElements'
import { normalizeIconifyElementIconData } from '../iconifyElementCatalog'

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
