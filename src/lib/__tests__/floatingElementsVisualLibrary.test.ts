import {
  createFloatingIcon,
  createFloatingShape,
  getFloatingShapeLabel,
} from '../floatingElements'

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

test('exposes labels for the supported basic shapes', () => {
  assertEqual(getFloatingShapeLabel('rectangle'), 'Retângulo', 'rectangle should have a human label')
  assertEqual(getFloatingShapeLabel('circle'), 'Círculo', 'circle should have a human label')
  assertEqual(getFloatingShapeLabel('line'), 'Linha', 'line should have a human label')
  assertEqual(getFloatingShapeLabel('arrow'), 'Seta', 'arrow should have a human label')
  assertEqual(getFloatingShapeLabel('star'), 'Estrela', 'star should have a human label')
  assertEqual(getFloatingShapeLabel('callout'), 'Callout', 'callout should have a human label')
})
