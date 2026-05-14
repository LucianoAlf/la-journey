import {
  buildHeaderFooterLine,
  getHeaderFooterLineConfig,
} from '../headerFooterLine'

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

test('reads legacy header and footer border strings as editable line settings', () => {
  assertEqual(
    getHeaderFooterLineConfig({
      enabled: true,
      height: 40,
      backgroundColor: 'transparent',
      borderBottom: '2px dashed #1e3a5f',
      paddingX: 24,
      left: { type: 'empty' },
      center: { type: 'empty' },
      right: { type: 'empty' },
      showOnFirstPage: false,
      startFromPage: 1,
    }, 'header'),
    {
      enabled: true,
      width: 2,
      style: 'dashed',
      color: '#1e3a5f',
    },
    'legacy header border should be parsed into editable controls',
  )

  assertEqual(
    getHeaderFooterLineConfig({
      enabled: true,
      height: 36,
      backgroundColor: 'transparent',
      borderTop: '0.5px solid #cbd5e1',
      paddingX: 24,
      left: { type: 'empty' },
      center: { type: 'empty' },
      right: { type: 'empty' },
      showOnFirstPage: false,
      startFromPage: 1,
    }, 'footer'),
    {
      enabled: true,
      width: 0.5,
      style: 'solid',
      color: '#cbd5e1',
    },
    'legacy footer border should be parsed into editable controls',
  )
})

test('builds border strings from editable line settings', () => {
  assertEqual(
    buildHeaderFooterLine({
      enabled: true,
      width: 3,
      style: 'dotted',
      color: '#ff2d78',
    }),
    '3px dotted #ff2d78',
    'enabled line settings should become a CSS border string',
  )

  assertEqual(
    buildHeaderFooterLine({
      enabled: false,
      width: 1,
      style: 'solid',
      color: '#e2e8f0',
    }),
    undefined,
    'disabled line settings should remove the border string',
  )
})
