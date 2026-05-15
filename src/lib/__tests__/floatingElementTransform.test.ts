import {
  calculateFloatingElementResize,
  calculateFloatingElementRotation,
} from '../floatingElementTransform'
import type { FloatingShape } from '../floatingElements'

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

test('resizes a floating element from the south-east handle', () => {
  const updates = calculateFloatingElementResize({
    element: baseShape,
    handle: 'se',
    deltaXPercent: 10,
    deltaYPercent: 5,
  })

  assertEqual(updates, { width: 30, height: 25, x: 55, y: 52.5 }, 'south-east resize should grow from the opposite corner')
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
  const circle: FloatingShape = { ...baseShape, shape: 'circle', width: 20, height: 16 }
  const updates = calculateFloatingElementResize({
    element: circle,
    handle: 'se',
    deltaXPercent: 12,
    deltaYPercent: 4,
  })

  assertEqual(updates, { width: 32, height: 32, x: 56, y: 58 }, 'circle corner resize should preserve square bounds')
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
