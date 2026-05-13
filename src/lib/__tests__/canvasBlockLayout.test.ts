/**
 * Testes unitarios para nudge visual de blocos no canvas.
 * Executar via: npx tsx src/lib/__tests__/canvasBlockLayout.test.ts
 */

import {
  anchorCanvasBlockToPageOffset,
  applyCanvasLayoutPageOffsets,
  canvasPageLayerToCSS,
  canvasBlockLayoutToCSS,
  getCanvasPageBoundaryDelta,
  getCanvasBlockLayout,
  isCanvasNudgeKey,
  nudgeCanvasBlockLayout,
  resetCanvasBlockLayout,
  settleCanvasBlockOnPageAnchor,
  shouldSettleCanvasBlockOnPageAnchor,
  shouldApplyCanvasNudgeKey,
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

const movedToNextPage = nudgeCanvasBlockLayout([
  { id: 'crossing', render_data: { layout: { offsetX: 0, offsetY: 320, pageOffset: 0 } } },
], 'crossing', 'down')
assert(
  getCanvasBlockLayout(movedToNextPage.renderData).pageOffset === 1 &&
  getCanvasBlockLayout(movedToNextPage.renderData).offsetY === 0,
  'ancora bloco na proxima pagina ao cruzar o limite inferior',
)

assert(
  getCanvasPageBoundaryDelta('down', {
    blockTop: 520,
    blockBottom: 645,
    pageTop: 0,
    pageBottom: 660,
  }) === 1,
  'detecta cruzamento real do rodape da pagina',
)

assert(
  getCanvasPageBoundaryDelta('up', {
    blockTop: 12,
    blockBottom: 160,
    pageTop: 0,
    pageBottom: 660,
  }) === -1,
  'detecta cruzamento real do topo da pagina',
)

const anchoredByBoundary = anchorCanvasBlockToPageOffset(movedDown.blocks, 'intro', 1)
assert(
  anchoredByBoundary.changed &&
  getCanvasBlockLayout(anchoredByBoundary.renderData).pageOffset === 1 &&
  getCanvasBlockLayout(anchoredByBoundary.renderData).offsetY === 0,
  'ancora bloco em pagina adjacente preservando nudge horizontal',
)

const settledOnPage = settleCanvasBlockOnPageAnchor([
  { id: 'settle', render_data: { layout: { offsetX: 0, offsetY: -312, pageOffset: 0 } } },
], 'settle')
assert(
  settledOnPage.changed &&
  getCanvasBlockLayout(settledOnPage.renderData).offsetY === 0,
  'zera deslocamento vertical quando bloco atravessado entra na pagina ancorada',
)

assert(
  !shouldSettleCanvasBlockOnPageAnchor('up', 200, {
    blockTop: 300,
    blockBottom: 500,
    pageTop: 0,
    pageBottom: 660,
  }),
  'nao zera deslocamento positivo ao inverter direcao dentro da pagina',
)

assert(
  shouldSettleCanvasBlockOnPageAnchor('up', 200, {
    blockTop: 620,
    blockBottom: 780,
    pageTop: 0,
    pageBottom: 660,
  }),
  'zera deslocamento positivo apenas quando bloco ainda esta abaixo da pagina ancorada',
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

assert(
  isCanvasNudgeKey({ altKey: true, key: 'ArrowDown', repeat: true }),
  'permite repeticao de tecla para nudge continuo com Alt',
)

assert(
  !isCanvasNudgeKey({ altKey: false, key: 'ArrowDown', repeat: true }),
  'nao trata seta repetida sem Alt como nudge do canvas',
)

const clampedMove = nudgeCanvasBlockLayout(
  [{ id: 'far', render_data: { layout: { offsetX: 0, offsetY: -320 } } }],
  'far',
  'up',
)
assert(
  getCanvasBlockLayout(clampedMove.renderData).offsetY === 0 &&
  getCanvasBlockLayout(clampedMove.renderData).pageOffset === -1,
  'ancora bloco na pagina anterior ao cruzar o limite superior',
)

const resetMove = resetCanvasBlockLayout([
  { id: 'far', render_data: { layout: { offsetX: 24, offsetY: -320, pageOffset: 1 }, style: { color: 'red' } } },
], 'far')
assert(
  resetMove.changed &&
  getCanvasBlockLayout(resetMove.renderData).offsetX === 0 &&
  getCanvasBlockLayout(resetMove.renderData).offsetY === 0 &&
  getCanvasBlockLayout(resetMove.renderData).pageOffset === 0,
  'reseta deslocamento visual preservando render_data',
)

const resetPageOffsetOnly = resetCanvasBlockLayout([
  { id: 'anchored', render_data: { layout: { offsetX: 0, offsetY: 0, pageOffset: 1 } } },
], 'anchored')
assert(
  resetPageOffsetOnly.changed &&
  getCanvasBlockLayout(resetPageOffsetOnly.renderData).pageOffset === 0,
  'reseta ancoragem de pagina mesmo sem deslocamento local',
)

const pageOffsetPages = applyCanvasLayoutPageOffsets<TestBlock>([
  [{ id: 'a', render_data: null }, { id: 'b', render_data: { layout: { pageOffset: 1 } } }],
  [{ id: 'c', render_data: null }],
])
assert(
  pageOffsetPages[0].map(block => block.id).join(',') === 'a' &&
  pageOffsetPages[1].map(block => block.id).join(',') === 'b,c',
  'renderiza bloco ancorado na pagina seguinte antes do conteudo da pagina alvo',
)

assert(
  shouldApplyCanvasNudgeKey({ repeat: true, nowMs: 1000, lastAppliedAtMs: 900 }),
  'aceita repeticao dentro da cadencia controlada',
)

assert(
  !shouldApplyCanvasNudgeKey({ repeat: true, nowMs: 1000, lastAppliedAtMs: 980 }),
  'bloqueia repeticao muito proxima para evitar movimento descontrolado',
)

if (failed > 0) {
  console.error(`\n${failed} falha(s), ${passed} sucesso(s)`)
  process.exit(1)
}

console.log(`\n${passed} testes passaram`)
