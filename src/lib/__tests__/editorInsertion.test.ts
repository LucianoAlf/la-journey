import assert from 'node:assert/strict'
import { resolveInsertionAnchorOrder, resolvePageInsertionAnchorOrder } from '../editorInsertion'

const blocks = [
  { id: 'a', sort_order: 1 },
  { id: 'b', sort_order: 2 },
  { id: 'c', sort_order: 3 },
  { id: 'd', sort_order: 4 },
]

function run() {
  {
    const anchor = resolveInsertionAnchorOrder({
      blocks,
      selectedBlockId: 'b',
      pageBlockIds: ['c'],
      previousPageBlockIds: ['a', 'b'],
    })

    assert.equal(anchor, 2, 'selected block should be the insertion anchor')
  }

  {
    const anchor = resolveInsertionAnchorOrder({
      blocks,
      selectedBlockId: null,
      pageBlockIds: ['b', 'c'],
      previousPageBlockIds: ['a'],
    })

    assert.equal(anchor, 3, 'without selection, anchor should be the current page last block')
  }

  {
    const anchor = resolveInsertionAnchorOrder({
      blocks,
      selectedBlockId: null,
      pageBlockIds: [],
      previousPageBlockIds: ['a', 'b'],
    })

    assert.equal(anchor, 2, 'empty current pages should anchor after the nearest previous page block')
  }

  {
    const anchor = resolveInsertionAnchorOrder({
      blocks,
      selectedBlockId: 'missing',
      pageBlockIds: ['b'],
      previousPageBlockIds: ['a'],
    })

    assert.equal(anchor, 2, 'missing selected blocks should fall back to the current page')
  }

  {
    const anchor = resolvePageInsertionAnchorOrder({
      blocks,
      pageBlockIds: ['b', 'c'],
      previousPageBlockIds: ['a'],
    })

    assert.equal(anchor, 3, 'page-specific insertion should anchor after the target page last block')
  }

  {
    const anchor = resolvePageInsertionAnchorOrder({
      blocks,
      pageBlockIds: [],
      previousPageBlockIds: ['a', 'b'],
    })

    assert.equal(anchor, 2, 'empty target pages should anchor after the nearest previous page block')
  }
}

run()
