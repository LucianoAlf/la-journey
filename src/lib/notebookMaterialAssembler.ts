import { adaptRepertoireItem, type PreparedMaterialBlock } from './contentBrowserAdapters'
import { recipeFromNotebookInstrument, type NotebookPrintRecipe } from './notebookPrintRecipe'

export const COVER_TEMPLATES = [
  'modern',
  'elegant',
  'colorful',
  'bold',
  'classic',
  'minimal',
] as const

export type CoverTemplate = (typeof COVER_TEMPLATES)[number]

export const COVER_TEMPLATE_TAG_PREFIX = 'cover-template:'

export function coverTemplateFromTags(tags: string[] | null | undefined): CoverTemplate | undefined {
  const raw = (tags ?? []).find((tag) => tag.startsWith(COVER_TEMPLATE_TAG_PREFIX))
    ?.slice(COVER_TEMPLATE_TAG_PREFIX.length)
  return COVER_TEMPLATES.includes(raw as CoverTemplate) ? (raw as CoverTemplate) : undefined
}

export function withCoverTemplateTag(tags: string[] | null | undefined, template: CoverTemplate): string[] {
  const rest = (tags ?? []).filter((tag) => !tag.startsWith(COVER_TEMPLATE_TAG_PREFIX))
  return [...rest, `${COVER_TEMPLATE_TAG_PREFIX}${template}`]
}

export interface NotebookSongInput {
  title?: string | null
  artist?: string | null
  key?: string | null
  chords?: string[] | null
  cifra_content?: string | null
}

export const NOTEBOOK_LEVEL_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  grow: 'Grow',
  advance: 'Advance',
  master: 'Master',
}

export function notebookLevelLabel(level?: string | null): string {
  if (!level?.trim()) return ''
  return NOTEBOOK_LEVEL_LABELS[level] ?? level
}

export function buildCoverRenderData(input: {
  title: string
  coverTemplate?: CoverTemplate
  coverImageUrl?: string | null
  instrument?: string | null
  level?: string | null
  schoolName?: string | null
  professorName?: string | null
  logoUrl?: string | null
}): Record<string, unknown> {
  const coverImageUrl = input.coverImageUrl?.trim() || null
  const logoUrl = input.logoUrl?.trim() || null
  return {
    template: input.coverTemplate ?? 'modern',
    titulo: input.title,
    instrumento: input.instrument?.trim() || '',
    nivel: notebookLevelLabel(input.level),
    escola: input.schoolName?.trim() || '',
    professor: input.professorName?.trim() || '',
    ...(logoUrl ? { logo_url: logoUrl } : {}),
    ...(coverImageUrl ? { cover_image_url: coverImageUrl } : {}),
  }
}

export interface BuildNotebookMaterialBlocksInput {
  title: string
  songs: Array<NotebookSongInput | null | undefined>
  coverTemplate?: CoverTemplate
  coverImageUrl?: string | null
  recipe?: NotebookPrintRecipe
  instrument?: string | null
  level?: string | null
  schoolName?: string | null
  professorName?: string | null
  logoUrl?: string | null
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

  const blocks: PreparedMaterialBlock[] = [{
    blockType: 'cover',
    title: input.title,
    content: { text: input.title },
    renderData: buildCoverRenderData({
      title: input.title,
      coverTemplate: input.coverTemplate,
      coverImageUrl: input.coverImageUrl,
      instrument: input.instrument,
      level: input.level,
      schoolName: input.schoolName,
      professorName: input.professorName,
      logoUrl: input.logoUrl,
    }),
  }]

  for (const song of songs) {
    blocks.push({
      blockType: 'page_break',
      title: null,
      content: null,
      renderData: null,
    })
    blocks.push(...adaptRepertoireItem(song, {
      includeChordGrid: true,
      recipe: input.recipe ?? recipeFromNotebookInstrument(input.instrument),
    }))
  }

  return {
    blocks,
    skippedMissingSongs,
    includedSongs: songs.length,
  }
}
