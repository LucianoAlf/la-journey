/**
 * Testes unitarios para controles visuais de espacamento no canvas.
 * Executar via: npx tsx src/lib/__tests__/canvasSpacingControls.test.ts
 */

import {
  CANVAS_BLOCK_SPACING_MAX,
  CANVAS_BLOCK_SPACING_MIN,
  createCanvasBlockMarginUpdate,
} from '../canvasSpacingControls'

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed += 1
    console.log(`  OK ${msg}`)
  } else {
    failed += 1
    console.error(`  FAIL ${msg}`)
  }
}

console.log('\nCanvas spacing controls\n')

const topUpdate = createCanvasBlockMarginUpdate(
  { margin: { top: 12, bottom: 20 } },
  'top',
  40,
)
assert(
  topUpdate.margin?.top === 40 && topUpdate.margin?.bottom === 20,
  'atualiza espaco antes preservando espaco depois',
)

const bottomUpdate = createCanvasBlockMarginUpdate(
  { margin: { top: 12, bottom: 20 } },
  'bottom',
  4,
)
assert(
  bottomUpdate.margin?.top === 12 && bottomUpdate.margin?.bottom === 4,
  'atualiza espaco depois preservando espaco antes',
)

const minUpdate = createCanvasBlockMarginUpdate(null, 'top', -20)
assert(
  minUpdate.margin?.top === CANVAS_BLOCK_SPACING_MIN,
  'limita espacamento minimo',
)

const maxUpdate = createCanvasBlockMarginUpdate(null, 'bottom', 200)
assert(
  maxUpdate.margin?.bottom === CANVAS_BLOCK_SPACING_MAX,
  'limita espacamento maximo',
)

if (failed > 0) {
  console.error(`\n${failed} falha(s), ${passed} sucesso(s)`)
  process.exit(1)
}

console.log(`\n${passed} testes passaram`)
