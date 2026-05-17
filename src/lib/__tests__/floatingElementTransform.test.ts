import {
  calculateFloatingElementResize,
  calculateFloatingElementRotation,
  calculateFloatingElementRotationFromDrag,
  formatFloatingRotationForDisplay,
  shouldShowFloatingSelectionFrame,
} from '../floatingElementTransform'
import type { FloatingImage, FloatingShape, FloatingText } from '../floatingElements'

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nExpected: ${expectedJson}\nActual:   ${actualJson}`)
  }
}

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

const baseShape: FloatingShape = {
  id: 'shape-1',
  type: 'shape',
  pageIndex: 0,
  x: 50,
  y: 50,
  width: 20,
  height: 20,
  rotation: 0,
  opacity: 1,
  zIndex: 10,
  locked: false,
  visible: true,
  name: 'Forma',
  shape: 'rectangle',
  fill: { type: 'solid', color: '#000000' },
  stroke: { color: '#000000', width: 0, style: 'solid' },
  borderRadius: 0,
}

const baseInlineSvgImage: FloatingImage = {
  id: 'svg-1',
  type: 'floating_image',
  pageIndex: 0,
  x: 50,
  y: 50,
  width: 20,
  height: 14.1,
  rotation: 0,
  opacity: 1,
  zIndex: 10,
  locked: false,
  visible: true,
  name: 'Clave de sol',
  imageUrl: 'https://example.com/clave.svg',
  svgCode: '<svg viewBox="0 0 100 100" />',
  color: '#111827',
  objectFit: 'contain',
  borderRadius: 0,
  shadow: { enabled: false, color: '#00000030', blur: 8, offsetX: 0, offsetY: 2 },
  border: { enabled: false, color: '#e2e8f0', width: 1, style: 'solid' },
  flipX: false,
  flipY: false,
}

const baseText: FloatingText = {
  id: 'text-1',
  type: 'floating_text',
  pageIndex: 0,
  x: 50,
  y: 50,
  width: 40,
  height: 6,
  rotation: 0,
  opacity: 1,
  zIndex: 10,
  locked: false,
  visible: true,
  name: 'Texto',
  content: '<p>Novo texto</p>',
  fontFamily: 'DM Sans',
  fontSize: 16,
  fontWeight: 400,
  fontStyle: 'normal',
  color: '#1e293b',
  align: 'left',
  lineHeight: 1.4,
  letterSpacing: 0,
  uppercase: false,
  background: { enabled: false, color: '#ffffff80', padding: 8, borderRadius: 4 },
  border: { enabled: false, color: '#e2e8f0', width: 1, style: 'solid', radius: 4 },
  shadow: { enabled: false, color: '#00000030', blur: 8, offsetX: 0, offsetY: 2 },
}

test('resizes a floating element from the south-east handle', () => {
  const updates = calculateFloatingElementResize({
    element: baseShape,
    handle: 'se',
    deltaXPercent: 10,
    deltaYPercent: 5,
  })

  assertEqual(updates, { width: 30, height: 25, x: 55, y: 52.5 }, 'south-east resize should grow from the opposite corner')
})

test('maps resize drag into the rotated element local axis', () => {
  const updates = calculateFloatingElementResize({
    element: { ...baseShape, rotation: 90 },
    handle: 'e',
    deltaXPercent: 0,
    deltaYPercent: 10,
  })

  assertEqual(updates, { width: 30, height: 20, x: 50, y: 55 }, 'east handle should grow and keep the opposite rotated edge anchored')
})

test('alt-resizes a floating element from the center', () => {
  const updates = calculateFloatingElementResize({
    element: baseShape,
    handle: 'se',
    deltaXPercent: 10,
    deltaYPercent: 5,
    fromCenter: true,
  })

  assertEqual(updates, { width: 40, height: 30, x: 50, y: 50 }, 'alt resize should keep the center anchored')
})

test('keeps circles and icons proportional while corner resizing', () => {
  const circle: FloatingShape = { ...baseShape, shape: 'circle', width: 20, height: 14.1 }
  const updates = calculateFloatingElementResize({
    element: circle,
    handle: 'se',
    deltaXPercent: 12,
    deltaYPercent: 4,
  })

  assertEqual(updates, { width: 32, height: 22.6, x: 56, y: 54.3 }, 'circle corner resize should preserve square bounds on an A4 page')
})

test('keeps inline SVG images proportional from side handles', () => {
  const updates = calculateFloatingElementResize({
    element: baseInlineSvgImage,
    handle: 'e',
    deltaXPercent: -8,
    deltaYPercent: 0,
  })

  assertEqual(updates, { width: 12, height: 8.5, x: 46, y: 50 }, 'inline SVG side resize should scale the visible symbol instead of adding inner whitespace')
})

test('resizes floating text horizontal writing area without scaling font from side handles', () => {
  const updates = calculateFloatingElementResize({
    element: baseText,
    handle: 'e',
    deltaXPercent: 10,
    deltaYPercent: 0,
  })

  assertEqual(updates, { width: 50, height: 6, x: 55, y: 50 }, 'text side handles should change writing width without changing font size')
})

test('resizes floating text vertical writing area without scaling font from top or bottom handles', () => {
  const updates = calculateFloatingElementResize({
    element: baseText,
    handle: 's',
    deltaXPercent: 0,
    deltaYPercent: 4,
  })

  assertEqual(updates, { width: 40, height: 10, x: 50, y: 52 }, 'text top and bottom handles should change writing area without changing font size')
})

test('resizes floating text corner writing area without scaling font', () => {
  const updates = calculateFloatingElementResize({
    element: baseText,
    handle: 'se',
    deltaXPercent: 10,
    deltaYPercent: 4,
  })

  assertEqual(updates, { width: 50, height: 10, x: 55, y: 52 }, 'text corner handles should resize the text box without changing font size')
})

test('calculates rotation from the element center to the pointer', () => {
  assertEqual(
    calculateFloatingElementRotation({
      center: { x: 100, y: 100 },
      pointer: { x: 100, y: 0 },
    }),
    0,
    'pointer above center should be zero degrees',
  )
  assertEqual(
    calculateFloatingElementRotation({
      center: { x: 100, y: 100 },
      pointer: { x: 200, y: 100 },
    }),
    90,
    'pointer at right should be ninety degrees',
  )
})

test('rotates from the drag start angle without jumping to the handle absolute angle', () => {
  const rotation = calculateFloatingElementRotationFromDrag({
    center: { x: 100, y: 100 },
    startPointer: { x: 100, y: 200 },
    currentPointer: { x: 105, y: 200 },
    startRotation: 0,
  })

  assert(rotation > 350 || rotation < 10, 'small movement from the bottom rotation handle should not jump to 180 degrees')
})

test('formats rotation preview as a signed editor angle', () => {
  assertEqual(formatFloatingRotationForDisplay(308), -52, 'large clockwise CSS angle should be shown as the equivalent negative angle')
  assertEqual(formatFloatingRotationForDisplay(42), 42, 'small positive angles should stay positive')
})

test('hides selection frame while rotating an element', () => {
  assertEqual(shouldShowFloatingSelectionFrame({ isRotating: true }), false, 'selection frame should disappear during rotation')
  assertEqual(shouldShowFloatingSelectionFrame({ isRotating: false }), true, 'selection frame should be visible outside rotation')
})
