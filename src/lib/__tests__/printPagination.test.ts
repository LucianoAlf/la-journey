import assert from 'node:assert/strict'
import { paginatePrintBlocks, type PrintBlock } from '../printPagination'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

const notation = (id: string): PrintBlock => ({
  id,
  block_type: 'notation',
  sort_order: 0,
  content: { text: id },
})

test('landscape print pagination can split sooner than portrait', () => {
  const blocks = [notation('a'), notation('b'), notation('c')]
  const portrait = paginatePrintBlocks(blocks, 'exercise_sheet')
  const landscape = paginatePrintBlocks(blocks, 'exercise_sheet', 'landscape')
  assert.ok(landscape.length > portrait.length)
})
