import {
  buildBlockSidebarMeta,
  buildSidebarPageGroups,
  buildSidebarPagePreviewItems,
  countSidebarBlocksByPage,
  getSidebarBlockTitle,
  reorderSidebarBlocks,
} from '../editorSidebar'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

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

const blocks = [
  { id: 'cover', block_type: 'cover', title: 'Capa do curso' },
  { id: 'intro', block_type: 'text', title: '', content: { html: '<p>Elementos basicos da musica: melodia, ritmo e harmonia.</p>' } },
  { id: 'song', block_type: 'notation', title: 'Tema principal' },
  { id: 'break', block_type: 'page_break', title: null },
  { id: 'exercise', block_type: 'exercise', title: 'Pratica' },
]

test('builds readable block sidebar metadata from order and page map', () => {
  const meta = buildBlockSidebarMeta(blocks, { cover: 0, intro: 1, song: 1, break: 1, exercise: 2 })

  assertEqual(meta.song, { orderLabel: '03', pageLabel: 'Pag. 2' }, 'block meta should include padded order and one-based page')
  assertEqual(meta.exercise, { orderLabel: '05', pageLabel: 'Pag. 3' }, 'later pages should stay one-based')
})

test('reorders sidebar blocks and normalizes sort order', () => {
  const result = reorderSidebarBlocks(
    [
      { id: 'a', sort_order: 1, title: 'A' },
      { id: 'b', sort_order: 2, title: 'B' },
      { id: 'c', sort_order: 3, title: 'C' },
      { id: 'd', sort_order: 4, title: 'D' },
    ],
    'b',
    'd',
  )

  assert(result.changed, 'moving a block over another position should report a change')
  assertEqual(result.blocks.map(block => block.id), ['a', 'c', 'd', 'b'], 'block should move to the target index')
  assertEqual(result.blocks.map(block => block.sort_order), [1, 2, 3, 4], 'sort orders should be contiguous after reorder')
})

test('keeps hidden structural blocks when reordering visible sidebar blocks', () => {
  const result = reorderSidebarBlocks(
    [
      { id: 'intro', sort_order: 1, block_type: 'text' },
      { id: 'break', sort_order: 2, block_type: 'page_break' },
      { id: 'exercise', sort_order: 3, block_type: 'exercise' },
      { id: 'song', sort_order: 4, block_type: 'notation' },
    ],
    'song',
    'intro',
  )

  assertEqual(result.blocks.map(block => block.id), ['song', 'intro', 'break', 'exercise'], 'page break should not disappear during reorder')
  assertEqual(result.blocks.map(block => block.sort_order), [1, 2, 3, 4], 'all blocks should receive normalized sort order')
})

test('does not reorder sidebar blocks for invalid drag targets', () => {
  const input = [
    { id: 'a', sort_order: 1 },
    { id: 'b', sort_order: 2 },
  ]

  assertEqual(reorderSidebarBlocks(input, 'a', 'a'), { changed: false, blocks: input }, 'same source and target should be ignored')
  assertEqual(reorderSidebarBlocks(input, 'missing', 'a'), { changed: false, blocks: input }, 'missing active id should be ignored')
  assertEqual(reorderSidebarBlocks(input, 'a', 'missing'), { changed: false, blocks: input }, 'missing target id should be ignored')
})

test('falls back to sensible block titles for empty labels', () => {
  assertEqual(getSidebarBlockTitle(blocks[0], 'Capa'), 'Capa do curso', 'explicit title should win')
  assertEqual(getSidebarBlockTitle(blocks[1], 'Texto'), '(sem titulo)', 'empty title should use fallback')
  assertEqual(getSidebarBlockTitle(blocks[3], 'Quebra de Pagina'), 'Quebra de Pagina', 'page breaks should use the type label')
})

test('counts real content blocks per page for page minimap badges', () => {
  const counts = countSidebarBlocksByPage(blocks, { cover: 0, intro: 1, song: 1, break: 1, exercise: 2 })

  assertEqual(counts, [1, 2, 1], 'page break blocks should not inflate page content counts')
  assert(countSidebarBlocksByPage([], {}).length === 0, 'empty materials should return no page counts')
})

test('groups sidebar blocks by canvas page while keeping the cover separate', () => {
  const groups = buildSidebarPageGroups([
    [blocks[0]],
    [blocks[1], blocks[2], blocks[3]],
    [blocks[4]],
  ])

  assertEqual(
    groups.map(group => ({ pageIndex: group.pageIndex, label: group.label, isCover: group.isCover, blockIds: group.blocks.map(block => block.id) })),
    [
      { pageIndex: 0, label: 'Capa', isCover: true, blockIds: ['cover'] },
      { pageIndex: 1, label: 'Página 2', isCover: false, blockIds: ['intro', 'song'] },
      { pageIndex: 2, label: 'Página 3', isCover: false, blockIds: ['exercise'] },
    ],
    'groups should follow canvas pages and hide manual page break blocks',
  )
})

test('keeps one sidebar item per source block within each page', () => {
  const fragmentA = { id: 'song__pagination_fragment_0', block_type: 'text', title: 'Tema parte 1', sourceId: 'song' }
  const fragmentB = { id: 'song__pagination_fragment_1', block_type: 'text', title: 'Tema parte 2', sourceId: 'song' }

  const groups = buildSidebarPageGroups([[fragmentA, fragmentB]], {
    getSourceBlockId: block => block.sourceId,
  })

  assertEqual(groups[0].blocks.map(block => block.id), ['song__pagination_fragment_0'], 'fragments from the same source block should not duplicate in one page group')
})

test('builds stable minimap preview items without depending on rendered DOM pages', () => {
  const groups = buildSidebarPageGroups([
    [blocks[0]],
    [blocks[1], blocks[2]],
    [],
    [blocks[4]],
  ])
  const previewItems = buildSidebarPagePreviewItems(groups)

  assertEqual(previewItems.length, 4, 'minimap should keep an item for every pagination page, including empty pages')
  assertEqual(previewItems[0].isCover, true, 'cover preview should stay identifiable')
  assertEqual(previewItems[1].blocks.map(block => block.type), ['text', 'notation'], 'preview should expose page block types')
  assertEqual(previewItems[1].blocks[0].previewText, 'Elementos basicos da musica: melodia, ritmo e harmonia.', 'preview should expose real block text instead of abstract placeholders')
  assertEqual(previewItems[2].blocks, [], 'empty or virtualized pages should still render as an empty preview card')
  assertEqual(previewItems[3].label, 'Página 4', 'preview labels should remain one-based')
})
