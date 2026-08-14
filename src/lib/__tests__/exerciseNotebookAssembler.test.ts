import assert from 'node:assert/strict'
import { buildExerciseNotebookBlocks } from '../exerciseNotebookAssembler.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('empty exercises returns zero included and no blocks', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'Técnica Grow',
    exercises: [],
  })
  assert.equal(result.includedExercises, 0)
  assert.equal(result.skippedMissingExercises, 0)
  assert.equal(result.blocks.length, 0)
})

test('skips missing exercises and still builds the rest', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'Técnica',
    exercises: [
      null,
      {
        title: 'Cromático 1-2-3-4',
        category: 'technique',
        difficulty_level: 'grow',
        blocks: [{ block_type: 'text', title: 'Instruções', content: { html: '<p>Palheta</p>' } }],
      },
    ],
  })
  assert.equal(result.skippedMissingExercises, 1)
  assert.equal(result.includedExercises, 1)
  assert.equal(result.blocks[0].blockType, 'cover')
  assert.equal(result.blocks[1].blockType, 'page_break')
  assert.equal(result.blocks[2].blockType, 'text')
  assert.equal(result.blocks[2].title, 'Cromático 1-2-3-4')
  assert.equal(result.blocks[3].blockType, 'text')
  assert.equal(result.blocks[3].title, 'Instruções')
})

test('cover uses title, template and optional image', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'Leitura',
    coverTemplate: 'bold',
    coverImageUrl: 'https://cdn.example/capa.jpg',
    exercises: [{ title: 'Semínimas', category: 'rhythm', blocks: [] }],
  })
  const cover = result.blocks[0]
  assert.equal(cover.blockType, 'cover')
  assert.equal(cover.renderData?.template, 'bold')
  assert.equal(cover.renderData?.titulo, 'Leitura')
  assert.equal(cover.renderData?.cover_image_url, 'https://cdn.example/capa.jpg')
})

test('exercise without blocks still gets a header', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'X',
    exercises: [{ title: 'Rascunho', category: 'other' }],
  })
  const types = result.blocks.map((block) => block.blockType)
  assert.deepEqual(types, ['cover', 'page_break', 'text'])
  assert.equal(result.blocks[2].title, 'Rascunho')
})

test('header shows category, level and minutes', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'X',
    exercises: [{
      title: 'Cromático',
      category: 'technique',
      difficulty_level: 'grow',
      estimated_minutes: 10,
      blocks: [],
    }],
  })
  const header = result.blocks[2]
  assert.match(String(header.content?.text ?? ''), /Técnica/)
  assert.match(String(header.content?.text ?? ''), /Grow/)
  assert.match(String(header.content?.text ?? ''), /10 min/)
})

test('two exercises each start after a page_break', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'Pack',
    exercises: [
      { title: 'A', category: 'rhythm', blocks: [{ block_type: 'text', title: 'Um', content: { html: '<p>1</p>' } }] },
      { title: 'B', category: 'harmony', blocks: [{ block_type: 'text', title: 'Dois', content: { html: '<p>2</p>' } }] },
    ],
  })
  const types = result.blocks.map((block) => block.blockType)
  assert.deepEqual(types, [
    'cover',
    'page_break',
    'text',
    'text',
    'page_break',
    'text',
    'text',
  ])
  assert.equal(result.blocks[2].title, 'A')
  assert.equal(result.blocks[5].title, 'B')
})

test('cover includes school and professor when provided', () => {
  const result = buildExerciseNotebookBlocks({
    title: 'Técnica Grow',
    instrument: 'Violão',
    level: 'grow',
    schoolName: 'LA Music',
    professorName: 'Alf',
    exercises: [{ title: 'Cromático', blocks: [] }],
  })
  const cover = result.blocks[0]
  assert.equal(cover.renderData?.professor, 'Alf')
  assert.equal(cover.renderData?.escola, 'LA Music')
  assert.equal(cover.renderData?.nivel, 'Grow')
  assert.equal(cover.renderData?.instrumento, 'Violão')
})
