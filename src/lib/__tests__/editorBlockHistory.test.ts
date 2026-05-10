/**
 * Testes unitarios para historico compacto do Editor.
 * Executar via: npx tsx src/lib/__tests__/editorBlockHistory.test.ts
 */

import { applyBlockPatch, createBlockPatch } from '../editorBlockHistory'

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

const before: TestBlock = { id: 'b1', title: 'Antes', sort_order: 1 }
const after: TestBlock = { id: 'b1', title: 'Depois', sort_order: 1 }
const untouched: TestBlock = { id: 'b2', title: 'Igual', sort_order: 2 }

console.log('\nEditor block history\n')

const patch = createBlockPatch('b1', before, after)
const changed = applyBlockPatch([before, untouched], patch, 'forward')
assert(changed.length === 2, 'mantem o mesmo numero de blocos ao editar')
assert(changed[0].title === 'Depois', 'aplica patch para frente')
assert(changed[1] === untouched, 'mantem referencia de bloco nao alterado')

const reverted = applyBlockPatch(changed, patch, 'backward')
assert(reverted[0].title === 'Antes', 'aplica patch reverso no undo')

const addPatch = createBlockPatch('b3', null, { id: 'b3', title: 'Novo', sort_order: 3 })
const added = applyBlockPatch([before], addPatch, 'forward')
assert(added.length === 2 && added[1].id === 'b3', 'adiciona bloco por patch')
assert(applyBlockPatch(added, addPatch, 'backward').length === 1, 'remove bloco adicionado no undo')

const deletePatch = createBlockPatch('b1', before, null)
const removed = applyBlockPatch([before, untouched], deletePatch, 'forward')
assert(removed.length === 1 && removed[0].id === 'b2', 'remove bloco por patch')
const restored = applyBlockPatch(removed, deletePatch, 'backward')
assert(restored.length === 2 && restored[0].id === 'b1', 'restaura bloco removido no undo')

if (failed > 0) {
  console.error(`\n${failed} falha(s), ${passed} sucesso(s)`)
  process.exit(1)
}

console.log(`\n${passed} testes passaram`)
