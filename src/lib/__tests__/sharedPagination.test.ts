import assert from 'node:assert/strict'
import {
  A4_CONTENT_HEIGHT,
  createPaginationFragments,
  estimateBlockHeight,
  paginateBlocks,
  type SharedPaginationBlock,
} from '../sharedPagination'

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

function songBlock(title: string, lines = 80): SharedPaginationBlock {
  const cifra = longCifra(lines)
  return {
    id: `song-${title}`,
    block_type: 'text',
    title,
    content: {
      html: `<p><strong>Artista:</strong> ROLLING STONES · <strong>Tom:</strong> G</p><pre>${cifra}</pre>`,
      text: cifra,
    },
  }
}

test('long pre cifra is split into more than one fragment', () => {
  const fragments = createPaginationFragments(songBlock('WILD HORSES', 80))
  const preFragments = fragments.filter((fragment) => String(fragment.content?.html ?? '').includes('<pre>'))
  assert.ok(preFragments.length >= 2, `expected the cifra itself to split, got ${preFragments.length} pre fragment(s)`)
  assert.equal(fragments[0].title, 'WILD HORSES')
  assert.equal(fragments[1].title, null)
})

test('first fragment keeps title with cifra, not a title-only page', () => {
  const fragments = createPaginationFragments(songBlock('WILD HORSES', 80))
  const firstHtml = String(fragments[0].content?.html ?? '')
  assert.match(firstHtml, /WILD HORSES|ROLLING STONES/)
  assert.match(firstHtml, /<pre>/)
  assert.match(firstHtml, /Childhood living|G\s+Am/)
})

test('long pre height is not capped at 320px', () => {
  const height = estimateBlockHeight(songBlock('WILD HORSES', 80))
  assert.ok(height > 320, `expected honest height, got ${height}`)
})

test('paginated long song fills pages instead of clipping one block', () => {
  const { pages } = paginateBlocks([
    { id: 'cover', block_type: 'cover', title: 'Caderno', content: { text: 'Caderno' } },
    { id: 'break', block_type: 'page_break', title: null, content: null },
    songBlock('WILD HORSES', 80),
  ])

  const contentPages = pages.filter((page) => page.some((block) => block.block_type !== 'cover'))
  assert.ok(contentPages.length >= 2, `expected cifra to continue on next page, got ${contentPages.length}`)

  const firstSongPage = contentPages[0]
  const firstHtml = firstSongPage.map((block) => String(block.content?.html ?? '')).join(' ')
  assert.match(firstHtml, /<pre>/)

  for (const page of contentPages) {
    const textHeight = page
      .filter((block) => block.block_type === 'text')
      .reduce((sum, block) => sum + estimateBlockHeight(block), 0)
    assert.ok(
      textHeight <= A4_CONTENT_HEIGHT + 40,
      `page text height ${textHeight} overflowed ${A4_CONTENT_HEIGHT}`,
    )
  }
})

test('assembled song keeps title with chords and flows cifra', () => {
  const cifra = longCifra(70)
  const { pages } = paginateBlocks([
    { id: 'cover', block_type: 'cover', title: 'Caderno', content: { text: 'Caderno' } },
    { id: 'break', block_type: 'page_break', title: null, content: null },
    {
      id: 'header',
      block_type: 'text',
      title: 'WILD HORSES',
      content: { html: '<p><strong>Artista:</strong> ROLLING STONES · <strong>Tom:</strong> G</p>' },
      render_data: { pagination: { keepWithNext: true, allowSplit: false } },
    },
    {
      id: 'chords',
      block_type: 'chord_grid',
      title: 'WILD HORSES — Acordes',
      content: { text: 'Acordes', chords: ['C', 'F', 'G'] },
      render_data: { chords: ['C', 'F', 'G'], columns: 3, pagination: { keepWithNext: true } },
    },
    {
      id: 'cifra',
      block_type: 'text',
      title: null,
      content: { html: `<pre>${cifra}</pre>`, text: cifra },
      render_data: { pagination: { behavior: 'breakable', allowSplit: true } },
    },
  ])

  const songPages = pages.filter((page) => page.some((block) => block.block_type !== 'cover'))
  const first = songPages[0]
  assert.ok(first.some((block) => block.title === 'WILD HORSES'))
  assert.ok(first.some((block) => block.block_type === 'chord_grid'))
  assert.ok(
    first.some((block) => String(block.content?.html ?? '').includes('<pre>')),
    'opening page should start the cifra under the chords instead of leaving a blank hole',
  )
  assert.ok(songPages.length >= 2, 'cifra should continue after the opening page')
  assert.ok(
    songPages.slice(1).some((page) => page.some((block) => String(block.content?.html ?? '').includes('<pre>'))),
    'later pages should carry the remaining cifra',
  )
})

test('page_break still starts the next song on a new page', () => {
  const { pages } = paginateBlocks([
    { id: 'cover', block_type: 'cover', title: 'Caderno', content: { text: 'Caderno' } },
    { id: 'b1', block_type: 'page_break', title: null, content: null },
    songBlock('Horse', 12),
    { id: 'b2', block_type: 'page_break', title: null, content: null },
    songBlock('Wild', 12),
  ])

  const titles = pages.map((page) => page.map((block) => block.title).filter(Boolean))
  const horsePage = titles.findIndex((page) => page.includes('Horse'))
  const wildPage = titles.findIndex((page) => page.includes('Wild'))
  assert.ok(horsePage >= 0 && wildPage > horsePage, `songs should not share a page: ${JSON.stringify(titles)}`)
})

test('paginateBlocks uses a shorter content height on landscape', () => {
  const block: SharedPaginationBlock = {
    id: 'n1',
    block_type: 'notation',
    content: { text: 'pauta' },
  }
  const portrait = paginateBlocks([block, { ...block, id: 'n2' }, { ...block, id: 'n3' }])
  const landscape = paginateBlocks(
    [block, { ...block, id: 'n2' }, { ...block, id: 'n3' }],
    undefined,
    566,
  )
  assert.ok(landscape.pages.length > portrait.pages.length)
})
