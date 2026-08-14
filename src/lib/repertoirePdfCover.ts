import {
  buildCoverRenderData,
  coverTemplateFromTags,
  type CoverTemplate,
} from './notebookMaterialAssembler'
import type { SharedPaginationBlock } from './sharedPagination'

export interface RepertoirePdfCover {
  title: string
  renderData: Record<string, unknown>
}

interface NotebookCoverSource {
  name: string
  tags: string[]
  cover_image_url: string | null
  instrument: string
  difficulty_level: string
}

export function coverFromRenderData(
  title: string,
  renderData?: Record<string, unknown> | null,
): RepertoirePdfCover | null {
  if (!renderData && !title.trim()) return null
  const next: Record<string, unknown> = { ...(renderData ?? {}) }
  if (!String(next.titulo ?? '').trim()) next.titulo = title.trim() || 'Caderno'
  if (!next.template) next.template = 'modern'
  return {
    title: String(next.titulo),
    renderData: next,
  }
}

export function coverFromSongbookBlocks(
  blocks: SharedPaginationBlock[],
  fallbackTitle?: string,
): RepertoirePdfCover | null {
  const cover = blocks.find((block) => block.block_type === 'cover')
  if (!cover) return null
  return coverFromRenderData(
    cover.title?.trim() || fallbackTitle || 'Caderno',
    cover.render_data ?? null,
  )
}

export function coverFromNotebook(
  notebook: NotebookCoverSource,
  extras?: {
    coverTemplate?: CoverTemplate
    coverImageUrl?: string | null
    schoolName?: string | null
    professorName?: string | null
    logoUrl?: string | null
  },
): RepertoirePdfCover {
  return {
    title: notebook.name,
    renderData: buildCoverRenderData({
      title: notebook.name,
      coverTemplate: extras?.coverTemplate ?? coverTemplateFromTags(notebook.tags),
      coverImageUrl: extras?.coverImageUrl ?? notebook.cover_image_url,
      instrument: notebook.instrument,
      level: notebook.difficulty_level,
      schoolName: extras?.schoolName,
      professorName: extras?.professorName,
      logoUrl: extras?.logoUrl,
    }),
  }
}

export function coverAssetUrls(cover: RepertoirePdfCover): string[] {
  return [cover.renderData.cover_image_url, cover.renderData.logo_url]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
}
