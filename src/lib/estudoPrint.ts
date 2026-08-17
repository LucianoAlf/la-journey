import { parseEstudo, type EstudoConfig } from './estudoConfig'
import { studyTexFromBlock } from './studyNotationTex'

export type EstudoPrintBlock = {
  block_type?: string | null
  content?: unknown
  render_data?: unknown
}

export type EstudoPrintMaterial = {
  title: string
  schoolName: string | null
  schoolLogoUrl?: string | null
  pageConfig: Record<string, unknown>
}

export type EstudoPrintModel = {
  title: string
  schoolName: string
  schoolLogoUrl: string | null
  curatorName: string | null
  estudo: EstudoConfig
  tex: string
  barsPerSystem: number
  indexMap: number[]
}

export function estudoPrintModel(
  material: EstudoPrintMaterial | null | undefined,
  blocks: EstudoPrintBlock[],
): EstudoPrintModel | null {
  if (!material) return null
  const estudo = parseEstudo(material.pageConfig?.estudo)
  if (!estudo) return null
  const notation = blocks.find((block) => block.block_type === 'notation')
  if (!notation) return null
  const study = studyTexFromBlock(
    { content: notation.content, render_data: notation.render_data },
    estudo.displayMode,
  )
  if (!study) return null
  return {
    title: material.title,
    schoolName: material.schoolName ?? '',
    schoolLogoUrl: material.schoolLogoUrl ?? null,
    curatorName: estudo.curatorName,
    estudo,
    tex: study.tex,
    barsPerSystem: study.barsPerSystem,
    indexMap: study.indexMap,
  }
}
