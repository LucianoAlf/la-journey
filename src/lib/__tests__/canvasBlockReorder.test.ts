/**
 * Testes unitarios para reordenacao de blocos no canvas.
 * Executar via: npx tsx src/lib/__tests__/canvasBlockReorder.test.ts
 */

import {
  createCanvasDropZoneId,
  getDropInsertIndexFromDropZone,
  getDropInsertIndexByPointerY,
  parseCanvasDropZoneId,
  reorderBlocksById,
  reorderBlocksByInsertIndex,
} from '../canvasBlockReorder'

type TestBlock = {
  id: string
  title: string
  sort_order: number
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
  { id: 'cover', title: 'Capa', sort_order: 1 },
  { id: 'intro', title: 'Intro', sort_order: 2 },
  { id: 'notation', title: 'Notacao', sort_order: 3 },
  { id: 'keyboard', title: 'Teclado', sort_order: 4 },
]

console.log('\nCanvas block reorder\n')

const movedDown = reorderBlocksById(blocks, 'intro', 'keyboard')
assert(movedDown.changed, 'marca reordenacao valida como alterada')
assert(
  movedDown.blocks.map(block => block.id).join(',') === 'cover,notation,keyboard,intro',
  'move bloco ativo para a posicao do bloco alvo',
)
assert(
  movedDown.blocks.every((block, index) => block.sort_order === index + 1),
  'renumera sort_order sequencialmente apos o drop',
)
assert(
  movedDown.blocks.find(block => block.id === 'intro') !== blocks[1],
  'cria novo objeto para bloco com sort_order alterado',
)

const movedUp = reorderBlocksById(blocks, 'keyboard', 'intro')
assert(
  movedUp.blocks.map(block => block.id).join(',') === 'cover,keyboard,intro,notation',
  'move bloco ativo para cima quando o alvo esta antes',
)

const sameTarget = reorderBlocksById(blocks, 'intro', 'intro')
assert(!sameTarget.changed && sameTarget.blocks === blocks, 'ignora drop sobre o proprio bloco')

const missingTarget = reorderBlocksById(blocks, 'intro', 'missing')
assert(!missingTarget.changed && missingTarget.blocks === blocks, 'ignora alvo inexistente')

const dropInsertAfterNotation = getDropInsertIndexByPointerY([
  { id: 'cover', index: 0, top: 0, bottom: 180 },
  { id: 'intro', index: 1, top: 200, bottom: 320 },
  { id: 'notation', index: 2, top: 340, bottom: 520 },
  { id: 'keyboard', index: 3, top: 540, bottom: 700 },
], 650)
assert(dropInsertAfterNotation === 4, 'resolve slot depois do bloco cuja metade inferior recebeu o ponteiro')

const noSwapWhenDroppingBelowSelf = reorderBlocksByInsertIndex(blocks, 'notation', 3)
assert(
  !noSwapWhenDroppingBelowSelf.changed && noSwapWhenDroppingBelowSelf.blocks === blocks,
  'soltar logo abaixo do proprio bloco nao troca com o bloco acima',
)

const moveIntroAfterKeyboard = reorderBlocksByInsertIndex(blocks, 'intro', 4)
assert(
  moveIntroAfterKeyboard.blocks.map(block => block.id).join(',') === 'cover,notation,keyboard,intro',
  'insercao por slot move bloco para depois do alvo visual',
)

const moveKeyboardBeforeIntro = reorderBlocksByInsertIndex(blocks, 'keyboard', 1)
assert(
  moveKeyboardBeforeIntro.blocks.map(block => block.id).join(',') === 'cover,keyboard,intro,notation',
  'insercao por slot move bloco para antes do alvo visual',
)

const afterIntroDropZone = createCanvasDropZoneId('intro', 'after')
assert(
  afterIntroDropZone === 'canvas-drop-zone:after:intro',
  'cria id estavel para zona de drop do canvas',
)
assert(
  parseCanvasDropZoneId(afterIntroDropZone)?.blockId === 'intro',
  'parseia id de zona de drop',
)
assert(
  getDropInsertIndexFromDropZone(blocks.map(block => block.id), afterIntroDropZone) === 2,
  'zona depois do bloco aponta para o slot seguinte',
)
assert(
  getDropInsertIndexFromDropZone(blocks.map(block => block.id), createCanvasDropZoneId('notation', 'before')) === 2,
  'zona antes do bloco aponta para o proprio indice do alvo',
)

if (failed > 0) {
  console.error(`\n${failed} falha(s), ${passed} sucesso(s)`)
  process.exit(1)
}

console.log(`\n${passed} testes passaram`)
