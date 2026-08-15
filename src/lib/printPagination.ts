import type { MaterialBlock } from '@/components/material/MaterialPreview'
import type { MaterialWithBlocks } from '@/services/materialService'
import {
  paginateBlocks,
  type SharedPaginationBlock,
} from '@/lib/sharedPagination'
import { isSongbookMaterial, paginateSongbookBlocks } from '@/lib/songbookPagination'

export interface PrintBlock extends SharedPaginationBlock {
  id: string
  block_type: MaterialBlock['block_type']
  content?: MaterialBlock['content']
  sort_order: number
  is_edited?: boolean
  original_content?: Record<string, unknown> | null
}

export interface PrintMaterial {
  id: string
  title: string
  type: string | null
  schoolName: string | null
  schoolPrimaryColor?: string | null
  schoolSecondaryColor?: string | null
  pageConfig: Record<string, unknown>
}

export function parsePrintMaterialRows(rows: MaterialWithBlocks[]): {
  material: PrintMaterial | null
  blocks: PrintBlock[]
} {
  const first = rows[0]
  if (!first) return { material: null, blocks: [] }

  const blocks = rows
    .filter(row => row.block_id != null)
    .map(row => ({
      id: row.block_id!,
      block_type: (row.block_type ?? 'text') as MaterialBlock['block_type'],
      title: row.block_title ?? undefined,
      content: row.block_content as MaterialBlock['content'],
      render_data: row.block_render_data,
      sort_order: row.block_sort_order ?? 0,
      is_edited: row.block_is_edited ?? false,
      original_content: row.block_original_content,
    }))
    .sort((a, b) => a.sort_order - b.sort_order)

  return {
    material: {
      id: first.material_id,
      title: first.material_title,
      type: first.material_type ?? null,
      schoolName: first.school_name,
      schoolPrimaryColor: first.school_primary_color ?? null,
      schoolSecondaryColor: first.school_secondary_color ?? null,
      pageConfig: first.page_config ?? {},
    },
    blocks,
  }
}

export function paginatePrintBlocks(blocks: PrintBlock[], materialType?: string | null) {
  if (isSongbookMaterial(materialType, blocks)) {
    return paginateSongbookBlocks(blocks).pages
  }
  return paginateBlocks(blocks).pages
}
