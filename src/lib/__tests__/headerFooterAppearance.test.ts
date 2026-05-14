import type { HeaderFooterConfig } from '../headerFooter'
import { copyHeaderFooterAppearance } from '../headerFooterAppearance'

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

const sourceHeader: HeaderFooterConfig = {
  enabled: true,
  height: 50,
  backgroundColor: '#1388c3',
  borderBottom: '2px solid #1e3a5f',
  paddingX: 32,
  left: { type: 'image', imageUrl: 'header-logo.png', imageHeight: 26 },
  center: {
    type: 'text',
    text: 'Titulo do header',
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    fontFamily: 'Montserrat',
    uppercase: true,
    letterSpacing: 1,
  },
  right: { type: 'empty' },
  showOnFirstPage: false,
  startFromPage: 1,
}

const targetFooter: HeaderFooterConfig = {
  enabled: true,
  height: 34,
  backgroundColor: 'transparent',
  borderTop: '1px dotted #ff2d78',
  paddingX: 16,
  left: { type: 'text', text: 'Escola', fontSize: 8, color: '#334155' },
  center: {
    type: 'placeholder',
    placeholder: '{titulo}',
    fontSize: 8,
    fontWeight: 400,
    color: '#64748b',
    fontFamily: 'DM Sans',
  },
  right: {
    type: 'placeholder',
    placeholder: '{pagina_de_total}',
    fontSize: 9,
    color: '#ff2d78',
  },
  showOnFirstPage: true,
  startFromPage: 0,
}

test('copies header appearance to footer without replacing footer content', () => {
  const copied = copyHeaderFooterAppearance({
    source: sourceHeader,
    sourceType: 'header',
    target: targetFooter,
    targetType: 'footer',
  })

  assertEqual(copied.backgroundColor, '#1388c3', 'footer should receive source background color')
  assertEqual(copied.borderTop, '2px solid #1e3a5f', 'footer should receive header line as top border')
  assertEqual(copied.height, 34, 'footer height should stay independent')
  assertEqual(copied.paddingX, 16, 'footer padding should stay independent')
  assertEqual(copied.left.text, 'Escola', 'footer left text should stay intact')
  assertEqual(copied.center.placeholder, '{titulo}', 'footer center placeholder should stay intact')
  assertEqual(copied.right.placeholder, '{pagina_de_total}', 'footer page number should stay intact')
  assertEqual(copied.center.color, '#ffffff', 'matching center zone should receive source text color')
  assertEqual(copied.center.fontFamily, 'Montserrat', 'matching center zone should receive source font')
})
