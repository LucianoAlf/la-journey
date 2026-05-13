/**
 * Testes unitarios para nudge visual de blocos no canvas.
 * Executar via: npx tsx src/lib/__tests__/canvasBlockLayout.test.ts
 */

import {
  canvasPageLayerToCSS,
  canvasBlockLayoutToCSS,
  getCanvasBlockLayout,
  nudgeCanvasBlockLayout,
} from '../canvasBlockLayout'

type TestBlock = {
  id: string
  render_data: Record<string, unknown> | null
}

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

const blocks: TestBlock[] = [
  { id: 'intro', render_data: { style: { margin: { top: 0, bottom: 8 } } } },
  { id: 'notation', render_data: { layout: { offsetX: 4, offsetY: 16 } } },
]

console.log('\nCanvas block layout nudge\n')

const movedDown = nudgeCanvasBlockLayout(blocks, 'intro', 'down')
assert(movedDown.changed, 'marca nudge valido como alterado')
assert(
  getCanvasBlockLayout(movedDown.renderData).offsetY === 8,
  'move bloco visualmente 8px para baixo',
)
assert(
  movedDown.blocks.map(block => block.id).join(',') === 'intro,notation',
  'nao altera a ordem dos blocos',
)
assert(
  movedDown.renderData?.style === blocks[0].render_data?.style,
  'preserva render_data existente',
)

const movedLeft = nudgeCanvasBlockLayout(blocks, 'notation', 'left')
assert(
  getCanvasBlockLayout(movedLeft.renderData).offsetX === -4 &&
  getCanvasBlockLayout(movedLeft.renderData).offsetY === 16,
  'ajusta eixo X sem mexer no eixo Y',
)

const missingBlock = nudgeCanvasBlockLayout(blocks, 'missing', 'down')
assert(
  !missingBlock.changed && missingBlock.blocks === blocks,
  'ignora bloco inexistente',
)

const css = canvasBlockLayoutToCSS({ layout: { offsetX: 4, offsetY: -8 } })
assert(
  css.transform === 'translate(4px, -8px)' && css.position === 'relative',
  'gera CSS de deslocamento visual',
)

const activePageCss = canvasPageLayerToCSS({ hasShiftedBlock: true, hasSelectedBlock: true })
assert(
  activePageCss.overflow === 'visible' && activePageCss.zIndex === 30,
  'eleva pagina ativa com bloco deslocado para evitar recorte entre paginas',
)

const idlePageCss = canvasPageLayerToCSS({ hasShiftedBlock: false, hasSelectedBlock: false })
assert(
  Object.keys(idlePageCss).length === 0,
  'mantem paginas sem deslocamento no fluxo normal',
)

if (failed > 0) {
  console.error(`\n${failed} falha(s), ${passed} sucesso(s)`)
  process.exit(1)
}

console.log(`\n${passed} testes passaram`)
