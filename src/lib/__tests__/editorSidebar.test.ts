import {
  buildBlockSidebarMeta,
  countSidebarBlocksByPage,
  getSidebarBlockTitle,
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
  { id: 'intro', block_type: 'text', title: '' },
  { id: 'song', block_type: 'notation', title: 'Tema principal' },
  { id: 'break', block_type: 'page_break', title: null },
  { id: 'exercise', block_type: 'exercise', title: 'Pratica' },
]

test('builds readable block sidebar metadata from order and page map', () => {
  const meta = buildBlockSidebarMeta(blocks, { cover: 0, intro: 1, song: 1, break: 1, exercise: 2 })

  assertEqual(meta.song, { orderLabel: '03', pageLabel: 'Pag. 2' }, 'block meta should include padded order and one-based page')
  assertEqual(meta.exercise, { orderLabel: '05', pageLabel: 'Pag. 3' }, 'later pages should stay one-based')
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
