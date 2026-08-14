import { extractCifraPlainText, isCifraHtml } from '@/lib/cifraBlocks'
import { groupSongbookSongs, type SongbookSongGroup } from '@/lib/songbookPagination'
import type { SharedPaginationBlock } from '@/lib/sharedPagination'
import type { NotebookPrintRecipe } from '@/lib/notebookPrintRecipe'
import { mediaFromRepertoire, type RepertoireMediaSource, type RepertoirePdfMedia } from '@/lib/repertoirePdfMedia'

export interface RepertoirePdfSong {
  title: string
  artist: string
  key?: string
  chords: string[]
  cifraContent: string | null
  media?: RepertoirePdfMedia
}

function stripTags(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&middot;/g, '·')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickMeta(html: string, label: string) {
  const text = stripTags(html)
  const match = text.match(new RegExp(`${label}:\\s*([^·|]+)`, 'i'))
  return match?.[1]?.trim() || ''
}

function chordsFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        const record = item as { chord_name?: unknown; name?: unknown }
        return String(record.chord_name ?? record.name ?? '').trim()
      }
      return ''
    })
    .filter(Boolean)
}

export function recipeFromSongbookBlocks(
  blocks: SharedPaginationBlock[],
  fallback?: NotebookPrintRecipe,
): NotebookPrintRecipe {
  const types = new Set(blocks.map((block) => block.block_type))
  return {
    guitar: types.has('chord_grid') || Boolean(fallback?.guitar),
    piano: types.has('keyboard_grid') || Boolean(fallback?.piano),
    ukulele: Boolean(fallback?.ukulele),
    tab: fallback?.tab ?? true,
  }
}

export function songsFromNotebookItems(
  items: Array<{ repertoire?: ({ title?: string | null; artist?: string | null; key?: string | null; chords?: string[] | null; cifra_content?: string | null } & RepertoireMediaSource) | null }>,
): RepertoirePdfSong[] {
  return items
    .map((item) => item.repertoire)
    .filter((song): song is NonNullable<typeof song> => Boolean(song?.title || song?.cifra_content || song?.chords?.length))
    .map((song) => ({
      title: song.title?.trim() || 'Sem título',
      artist: song.artist?.trim() || '',
      key: song.key?.trim() || undefined,
      chords: (song.chords ?? []).filter(Boolean),
      cifraContent: song.cifra_content?.trim() || null,
      media: mediaFromRepertoire(song),
    }))
}

export function songFromSongbookGroup(group: SongbookSongGroup<SharedPaginationBlock>): RepertoirePdfSong {
  const headerHtml = typeof group.header?.content?.html === 'string' ? group.header.content.html : ''
  const cifraHtml = typeof group.cifra?.content?.html === 'string' ? group.cifra.content.html : ''
  const gridChords = chordsFromUnknown(group.grid?.render_data?.chords ?? group.grid?.content?.chords)
  const headerChords = pickMeta(headerHtml, 'Acordes')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  return {
    title: group.header?.title?.trim() || pickMeta(headerHtml, 'Título') || 'Sem título',
    artist: pickMeta(headerHtml, 'Artista'),
    key: pickMeta(headerHtml, 'Tom') || undefined,
    chords: gridChords.length > 0 ? gridChords : headerChords,
    cifraContent: isCifraHtml(cifraHtml) ? extractCifraPlainText(cifraHtml) : (group.cifra?.content?.text as string | undefined)?.trim() || null,
  }
}

export function songsFromSongbookBlocks(blocks: SharedPaginationBlock[]): RepertoirePdfSong[] {
  return groupSongbookSongs(blocks).songs.map(songFromSongbookGroup)
}
