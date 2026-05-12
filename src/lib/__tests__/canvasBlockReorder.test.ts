/**
 * Testes unitarios para reordenacao de blocos no canvas.
 * Executar via: npx tsx src/lib/__tests__/canvasBlockReorder.test.ts
 */

import {
  reorderBlocksByDirection,
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

const movedDown = reorderBlocksByDirection(blocks, 'intro', 'down')
assert(movedDown.changed, 'marca reordenacao valida como alterada')
assert(
  movedDown.blocks.map(block => block.id).join(',') === 'cover,notation,intro,keyboard',
  'move bloco ativo uma posicao para baixo',
)
assert(
  movedDown.blocks.every((block, index) => block.sort_order === index + 1),
  'renumera sort_order sequencialmente apos o drop',
)
assert(
  movedDown.blocks.find(block => block.id === 'intro') !== blocks[1],
  'cria novo objeto para bloco com sort_order alterado',
)

const movedUp = reorderBlocksByDirection(blocks, 'keyboard', 'up')
assert(
  movedUp.blocks.map(block => block.id).join(',') === 'cover,intro,keyboard,notation',
  'move bloco ativo uma posicao para cima',
)

const firstBlockUp = reorderBlocksByDirection(blocks, 'cover', 'up')
assert(
  !firstBlockUp.changed && firstBlockUp.blocks === blocks,
  'ignora movimento para cima no primeiro bloco',
)

const lastBlockDown = reorderBlocksByDirection(blocks, 'keyboard', 'down')
assert(
  !lastBlockDown.changed && lastBlockDown.blocks === blocks,
  'ignora movimento para baixo no ultimo bloco',
)

const missingBlock = reorderBlocksByDirection(blocks, 'missing', 'down')
assert(
  !missingBlock.changed && missingBlock.blocks === blocks,
  'ignora bloco inexistente',
)

assert(
  movedDown.patch?.type === 'reorder' &&
  movedDown.patch.blockId === 'intro' &&
  movedDown.patch.fromIndex === 1 &&
  movedDown.patch.toIndex === 2,
  'gera patch unico de reorder com fromIndex e toIndex',
)

if (failed > 0) {
  console.error(`\n${failed} falha(s), ${passed} sucesso(s)`)
  process.exit(1)
}

console.log(`\n${passed} testes passaram`)
