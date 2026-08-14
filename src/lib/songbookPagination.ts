import {
  A4_CONTENT_HEIGHT,
  PAGINATION_FRAGMENT_ID_SEPARATOR,
  PRE_LINE_HEIGHT,
  getEstimatedBlockHeightForPagination,
  type SharedPaginationBlock,
  type SharedPaginationResult,
} from './sharedPagination'
import { extractCifraPlainText, isCifraHtml, splitCifraPlainText, wrapCifraPre } from './cifraBlocks'

const MIN_CIFRA_LINES_ON_OPENING = 2
const CONTINUATION_FILL_RATIO = 0.92
const OPENING_FILL_PADDING = 16

export interface SongbookSongGroup<TBlock extends SharedPaginationBlock> {
  header: TBlock | null
  grid: TBlock | null
  cifra: TBlock | null
  extras: TBlock[]
}

export function looksLikeSongbook(blocks: SharedPaginationBlock[]): boolean {
  const types = new Set(blocks.map((block) => block.block_type))
  return types.has('cover') && types.has('page_break') && (types.has('chord_grid') || types.has('text'))
}

export function groupSongbookSongs<TBlock extends SharedPaginationBlock>(
  blocks: TBlock[],
): { cover: TBlock | null; songs: SongbookSongGroup<TBlock>[] } {
  let cover: TBlock | null = null
  const songs: SongbookSongGroup<TBlock>[] = []
  let current: SongbookSongGroup<TBlock> | null = null

  const startSong = () => {
    current = { header: null, grid: null, cifra: null, extras: [] }
    songs.push(current)
  }

  for (const block of blocks) {
    if (block.block_type === 'cover') {
      cover = block
      continue
    }
    if (block.block_type === 'page_break') {
      startSong()
      continue
    }
    if (!current) startSong()

    const html = typeof block.content?.html === 'string' ? block.content.html : ''
    const isCifra = block.block_type === 'text' && isCifraHtml(html)

    if (block.block_type === 'chord_grid' && !current.grid) {
      current.grid = block
      continue
    }
    if (isCifra && !current.cifra) {
      current.cifra = block
      continue
    }
    if (block.block_type === 'text' && !current.header && !isCifra) {
      current.header = block
      continue
    }
    current.extras.push(block)
  }

  return { cover, songs: songs.filter((song) => song.header || song.grid || song.cifra || song.extras.length > 0) }
}

function cloneCifraFragment<TBlock extends SharedPaginationBlock>(
  source: TBlock,
  text: string,
  index: number,
  keepTitle: boolean,
): TBlock {
  return {
    ...source,
    id: `${source.id}${PAGINATION_FRAGMENT_ID_SEPARATOR}${index}`,
    title: keepTitle ? source.title : null,
    content: {
      ...(source.content ?? {}),
      html: wrapCifraPre(text),
      text,
    },
    render_data: {
      ...(source.render_data ?? {}),
      pagination_fragment: {
        source_block_id: source.id,
        index,
      },
    },
  }
}

function linesForHeight(availableHeight: number): number {
  return Math.floor((availableHeight - 8) / PRE_LINE_HEIGHT)
}

export function paginateSongbookBlocks<TBlock extends SharedPaginationBlock>(
  blocks: TBlock[],
  getHeight: (block: TBlock) => number = (block) => getEstimatedBlockHeightForPagination(block),
): SharedPaginationResult<TBlock> {
  const { cover, songs } = groupSongbookSongs(blocks)
  const pages: TBlock[][] = []
  const breakReasons = new Map<number, { reason: 'cover' | 'manual' | 'overflow' | 'fim'; detail: string }>()

  if (cover) {
    pages.push([cover])
    breakReasons.set(0, { reason: 'cover', detail: 'Capa do caderno.' })
  }

  for (const song of songs) {
    const opening: TBlock[] = []
    let used = 0

    if (song.header) {
      opening.push(song.header)
      used += getHeight(song.header)
    }
    if (song.grid) {
      opening.push(song.grid)
      used += getHeight(song.grid)
    }
    for (const extra of song.extras) {
      opening.push(extra)
      used += getHeight(extra)
    }

    let remainingCifra = song.cifra ? extractCifraPlainText(String(song.cifra.content?.html ?? song.cifra.content?.text ?? '')) : ''
    let fragmentIndex = 0

    const openingBudget = A4_CONTENT_HEIGHT - used - OPENING_FILL_PADDING
    const openingLines = linesForHeight(openingBudget)

    if (song.cifra && remainingCifra && openingLines >= MIN_CIFRA_LINES_ON_OPENING) {
      const { head, tail } = splitCifraPlainText(remainingCifra, openingLines)
      if (head.trim()) {
        opening.push(cloneCifraFragment(song.cifra, head, fragmentIndex, false))
        fragmentIndex += 1
        remainingCifra = tail ?? ''
      }
    }

    if (opening.length > 0) {
      pages.push(opening)
      breakReasons.set(pages.length - 1, { reason: 'manual', detail: 'Música começa em página nova.' })
    } else if (song.cifra && remainingCifra) {
      pages.push([])
    }

    const continuationBudget = Math.round(A4_CONTENT_HEIGHT * CONTINUATION_FILL_RATIO)
    const continuationLines = Math.max(12, linesForHeight(continuationBudget))

    while (song.cifra && remainingCifra.trim()) {
      const { head, tail } = splitCifraPlainText(remainingCifra, continuationLines)
      if (!head.trim()) break
      pages.push([cloneCifraFragment(song.cifra, head, fragmentIndex, false)])
      fragmentIndex += 1
      remainingCifra = tail ?? ''
    }
  }

  return {
    pages: pages.filter((page) => page.length > 0),
    breakReasons,
  }
}
