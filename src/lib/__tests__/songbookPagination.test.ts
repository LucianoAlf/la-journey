import assert from 'node:assert/strict'
import { A4_CONTENT_HEIGHT } from '../sharedPagination'
import { groupSongbookSongs, isSongbookMaterial, looksLikeSongbook, paginateSongbookBlocks } from '../songbookPagination'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

function longCifra(lines = 80) {
  const verse = [
    'G                Am',
    'Childhood living is easy to do',
    'Bm              C',
    'The things you wanted I bought them for you',
    '',
  ]
  const rows: string[] = []
  while (rows.length < lines) rows.push(...verse)
  return rows.slice(0, lines).join('\n')
}

test('looksLikeSongbook detects caderno assembly', () => {
  assert.equal(looksLikeSongbook([
    { id: 'c', block_type: 'cover' },
    { id: 'b', block_type: 'page_break' },
    { id: 't', block_type: 'text' },
  ]), true)
  assert.equal(looksLikeSongbook([
    { id: 't', block_type: 'text' },
  ]), false)
})

test('exercise_sheet with cover, page_break and header is not a songbook', () => {
  const exerciseBlocks = [
    { id: 'c', block_type: 'cover' },
    { id: 'b', block_type: 'page_break' },
    { id: 'h', block_type: 'text', title: 'Cromático' },
  ]
  assert.equal(looksLikeSongbook(exerciseBlocks), true)
  assert.equal(isSongbookMaterial('exercise_sheet', exerciseBlocks), false)
  assert.equal(isSongbookMaterial('repertoire_sheet', exerciseBlocks), true)
  assert.equal(isSongbookMaterial(null, exerciseBlocks), true)
})

test('groups title, chord grid and cifra as one song', () => {
  const { cover, songs } = groupSongbookSongs([
    { id: 'c', block_type: 'cover', title: 'Caderno' },
    { id: 'b', block_type: 'page_break' },
    { id: 'h', block_type: 'text', title: 'The Horse Named Bill', content: { html: '<p>Artista</p>' } },
    { id: 'g', block_type: 'chord_grid', render_data: { chords: ['C', 'F', 'G'] } },
    { id: 'z', block_type: 'text', content: { html: '<pre>C\nOh the horse</pre>' } },
  ])
  assert.equal(cover?.id, 'c')
  assert.equal(songs.length, 1)
  assert.equal(songs[0].header?.title, 'The Horse Named Bill')
  assert.equal(songs[0].grid?.id, 'g')
  assert.equal(songs[0].cifra?.id, 'z')
})

test('opening page keeps title, chords and starts cifra', () => {
  const cifra = longCifra(70)
  const { pages } = paginateSongbookBlocks([
    { id: 'cover', block_type: 'cover', title: 'Caderno' },
    { id: 'break', block_type: 'page_break' },
    {
      id: 'header',
      block_type: 'text',
      title: 'WILD HORSES',
      content: { html: '<p><strong>Artista:</strong> ROLLING STONES</p>' },
    },
    {
      id: 'chords',
      block_type: 'chord_grid',
      render_data: { chords: ['G', 'Am', 'Bm', 'C', 'D', 'F'], columns: 6 },
    },
    {
      id: 'cifra',
      block_type: 'text',
      content: { html: `<pre>${cifra}</pre>`, text: cifra },
    },
  ])

  assert.equal(pages[0][0].block_type, 'cover')
  const firstSong = pages[1]
  assert.ok(firstSong.some((block) => block.title === 'WILD HORSES'))
  assert.ok(firstSong.some((block) => block.block_type === 'chord_grid'))
  assert.ok(
    firstSong.some((block) => String(block.content?.html ?? '').includes('<pre>')),
    'first song page must start the cifra under the diagrams',
  )
  assert.ok(pages.length >= 3, `cifra should continue, got ${pages.length} pages`)
})

test('two songs never share a page', () => {
  const { pages } = paginateSongbookBlocks([
    { id: 'cover', block_type: 'cover' },
    { id: 'b1', block_type: 'page_break' },
    { id: 'h1', block_type: 'text', title: 'Horse', content: { html: '<p>A</p>' } },
    { id: 'c1', block_type: 'text', content: { html: '<pre>aaa</pre>' } },
    { id: 'b2', block_type: 'page_break' },
    { id: 'h2', block_type: 'text', title: 'Wild', content: { html: '<p>B</p>' } },
    { id: 'c2', block_type: 'text', content: { html: '<pre>bbb</pre>' } },
  ])

  const horsePage = pages.findIndex((page) => page.some((block) => block.title === 'Horse'))
  const wildPage = pages.findIndex((page) => page.some((block) => block.title === 'Wild'))
  assert.ok(horsePage >= 0 && wildPage > horsePage)
  assert.ok(!pages[horsePage].some((block) => block.title === 'Wild'))
})

test('continuation pages stay within the printable height', () => {
  const cifra = longCifra(120)
  const { pages } = paginateSongbookBlocks([
    { id: 'cover', block_type: 'cover' },
    { id: 'break', block_type: 'page_break' },
    { id: 'header', block_type: 'text', title: 'Song', content: { html: '<p>Meta</p>' } },
    { id: 'cifra', block_type: 'text', content: { html: `<pre>${cifra}</pre>`, text: cifra } },
  ])

  for (const page of pages.slice(1)) {
    const html = page.map((block) => String(block.content?.html ?? '')).join('\n')
    const lines = (html.match(/\n/g)?.length ?? 0) + 1
    assert.ok(lines * 22 < A4_CONTENT_HEIGHT + 80, `page overflowed with ${lines} lines`)
  }
})
