import assert from 'node:assert/strict'
import { recipeFromSongbookBlocks, songsFromNotebookItems, songsFromSongbookBlocks } from '../repertoirePdfSongs'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('reads songs from a notebook collection', () => {
  const songs = songsFromNotebookItems([
    { repertoire: { title: 'WILD HORSES', artist: 'ROLLING STONES', key: 'G', chords: ['G', 'Am'], cifra_content: 'G\nChildhood' } },
    { repertoire: null },
  ])
  assert.equal(songs.length, 1)
  assert.equal(songs[0].title, 'WILD HORSES')
  assert.equal(songs[0].cifraContent, 'G\nChildhood')
})

test('reads songs from assembled songbook blocks', () => {
  const songs = songsFromSongbookBlocks([
    { id: 'c', block_type: 'cover', content: { text: 'Caderno' } },
    { id: 'b', block_type: 'page_break' },
    {
      id: 'h',
      block_type: 'text',
      title: 'The Horse Named Bill',
      content: { html: '<p><strong>Artista:</strong> Traditional &middot; <strong>Tom:</strong> C</p>' },
    },
    { id: 'g', block_type: 'chord_grid', render_data: { chords: ['C', 'F', 'G'] } },
    { id: 'z', block_type: 'text', content: { html: '<pre>C\nI had a horse</pre>', text: 'C\nI had a horse' } },
  ])
  assert.equal(songs.length, 1)
  assert.equal(songs[0].title, 'The Horse Named Bill')
  assert.equal(songs[0].artist, 'Traditional')
  assert.deepEqual(songs[0].chords, ['C', 'F', 'G'])
  assert.equal(songs[0].cifraContent, 'C\nI had a horse')
})

test('recipe follows the grids present in the material', () => {
  const recipe = recipeFromSongbookBlocks([
    { id: 'c', block_type: 'cover' },
    { id: 'g', block_type: 'chord_grid' },
    { id: 'k', block_type: 'keyboard_grid' },
  ], { guitar: false, piano: false, ukulele: false, tab: false })
  assert.equal(recipe.guitar, true)
  assert.equal(recipe.piano, true)
})
