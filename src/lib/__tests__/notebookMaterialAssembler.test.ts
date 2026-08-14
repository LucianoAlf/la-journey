import assert from 'node:assert/strict'
import {
  buildNotebookMaterialBlocks,
  coverTemplateFromTags,
  withCoverTemplateTag,
} from '../notebookMaterialAssembler'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('empty songs returns zero included and no blocks', () => {
  const result = buildNotebookMaterialBlocks({
    title: 'Caderno do Chiquinho',
    songs: [],
  })
  assert.equal(result.includedSongs, 0)
  assert.equal(result.skippedMissingSongs, 0)
  assert.equal(result.blocks.length, 0)
})

test('skips missing songs and still builds the rest', () => {
  const result = buildNotebookMaterialBlocks({
    title: 'Pop',
    songs: [null, { title: 'Yesterday', artist: 'Beatles', chords: ['F', 'Em7', 'A7', 'Dm'] }],
  })
  assert.equal(result.skippedMissingSongs, 1)
  assert.equal(result.includedSongs, 1)
  assert.equal(result.blocks[0].blockType, 'cover')
  assert.equal(result.blocks[1].blockType, 'page_break')
  assert.equal(result.blocks[2].blockType, 'text')
  assert.equal(result.blocks[3].blockType, 'chord_grid')
  assert.equal(result.blocks.length, 4)
})

test('cover uses title, template and optional image', () => {
  const result = buildNotebookMaterialBlocks({
    title: 'Caderno do Chiquinho',
    coverTemplate: 'bold',
    coverImageUrl: 'https://cdn.example/capa.jpg',
    songs: [{ title: 'Hey Jude', chords: ['F'] }],
  })
  const cover = result.blocks[0]
  assert.equal(cover.blockType, 'cover')
  assert.equal(cover.title, 'Caderno do Chiquinho')
  assert.equal(cover.renderData?.template, 'bold')
  assert.equal(cover.renderData?.cover_image_url, 'https://cdn.example/capa.jpg')
})

test('song without chords and without cifra has no chord_grid', () => {
  const result = buildNotebookMaterialBlocks({
    title: 'X',
    songs: [{ title: 'Rascunho', artist: 'Zé' }],
  })
  const types = result.blocks.map((block) => block.blockType)
  assert.deepEqual(types, ['cover', 'page_break', 'text'])
})

test('coverTemplateFromTags reads a valid tagged template', () => {
  assert.equal(coverTemplateFromTags(['pop', 'cover-template:bold']), 'bold')
  assert.equal(coverTemplateFromTags(['cover-template:unknown']), undefined)
  assert.equal(coverTemplateFromTags([]), undefined)
  assert.equal(coverTemplateFromTags(null), undefined)
})

test('withCoverTemplateTag replaces only the cover-template tag', () => {
  assert.deepEqual(withCoverTemplateTag(['pop', 'cover-template:modern'], 'elegant'), [
    'pop',
    'cover-template:elegant',
  ])
  assert.deepEqual(withCoverTemplateTag(null, 'classic'), ['cover-template:classic'])
})

test('piano recipe emits keyboard_grid instead of chord_grid', () => {
  const result = buildNotebookMaterialBlocks({
    title: 'Teclado',
    instrument: 'piano',
    songs: [{ title: 'Yesterday', chords: ['F', 'Em7'], cifra_content: 'F\nYesterday' }],
  })
  const types = result.blocks.map((block) => block.blockType)
  assert.deepEqual(types, ['cover', 'page_break', 'text', 'keyboard_grid', 'text'])
})

test('two songs each start after a page_break', () => {
  const result = buildNotebookMaterialBlocks({
    title: 'Clássicos',
    songs: [
      { title: 'Yesterday', cifra_content: '[F]Yesterday', chords: ['F'] },
      { title: 'Let It Be', chords: ['C', 'G'] },
    ],
  })
  const types = result.blocks.map((block) => block.blockType)
  assert.deepEqual(types, [
    'cover',
    'page_break',
    'text',
    'chord_grid',
    'text',
    'page_break',
    'text',
    'chord_grid',
  ])
})
