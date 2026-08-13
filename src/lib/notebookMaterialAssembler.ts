import { adaptRepertoireItem, type PreparedMaterialBlock } from './contentBrowserAdapters'

export const COVER_TEMPLATES = [
  'modern',
  'elegant',
  'colorful',
  'bold',
  'classic',
  'minimal',
] as const

export type CoverTemplate = (typeof COVER_TEMPLATES)[number]

export interface NotebookSongInput {
  title?: string | null
  artist?: string | null
  key?: string | null
  chords?: string[] | null
  cifra_content?: string | null
}

export interface BuildNotebookMaterialBlocksInput {
  title: string
  songs: Array<NotebookSongInput | null | undefined>
  coverTemplate?: CoverTemplate
  coverImageUrl?: string | null
}

export interface BuildNotebookMaterialBlocksResult {
  blocks: PreparedMaterialBlock[]
  skippedMissingSongs: number
  includedSongs: number
}

function isPresentSong(song: NotebookSongInput | null | undefined): song is NotebookSongInput {
  if (!song) return false
  return Boolean(song.title?.trim() || song.artist?.trim() || song.cifra_content?.trim() || (song.chords?.length ?? 0) > 0)
}

export function buildNotebookMaterialBlocks(
  input: BuildNotebookMaterialBlocksInput
): BuildNotebookMaterialBlocksResult {
  const songs = input.songs.filter(isPresentSong)
  const skippedMissingSongs = input.songs.length - songs.length

  if (songs.length === 0) {
    return { blocks: [], skippedMissingSongs, includedSongs: 0 }
  }

  const template = input.coverTemplate ?? 'modern'
  const coverImageUrl = input.coverImageUrl?.trim() || null

  const blocks: PreparedMaterialBlock[] = [{
    blockType: 'cover',
    title: input.title,
    content: { text: input.title },
    renderData: {
      template,
      ...(coverImageUrl ? { cover_image_url: coverImageUrl } : {}),
    },
  }]

  for (const song of songs) {
    blocks.push({
      blockType: 'page_break',
      title: null,
      content: null,
      renderData: null,
    })
    blocks.push(...adaptRepertoireItem(song, { includeChordGrid: true }))
  }

  return {
    blocks,
    skippedMissingSongs,
    includedSongs: songs.length,
  }
}
