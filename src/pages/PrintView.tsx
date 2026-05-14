import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { SpinnerGap } from '@phosphor-icons/react'
import { MaterialPreview } from '@/components/material/MaterialPreview'
import {
  applyCanvasLayoutPageOffsets,
  canvasBlockLayoutToCSS,
  canvasPageLayerToCSS,
  hasCanvasBlockLayoutOffset,
} from '@/lib/canvasBlockLayout'
import {
  paginatePrintBlocks,
  parsePrintMaterialRows,
  type PrintBlock,
} from '@/lib/printPagination'
import { collectUsedGoogleFontFamilies, waitForGoogleFonts } from '@/lib/fontLoader'
import { getMaterialWithBlocks, type MaterialWithBlocks } from '@/services/materialService'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rkfszavfqplhorvfpkcq.supabase.co'
const GET_PRINT_MATERIAL_URL = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/get-print-material`

type WindowWithPrintStatus = Window & typeof globalThis & {
  status: string
}

function setPrintReadyMarker() {
  const win = window as WindowWithPrintStatus
  win.status = 'ready-for-pdf'

  if (!document.querySelector('.print-ready')) {
    const marker = document.createElement('div')
    marker.className = 'print-ready'
    marker.setAttribute('aria-hidden', 'true')
    document.body.appendChild(marker)
  }
}

function blockPrintStyle(block: PrintBlock): CSSProperties {
  const style = block.render_data?.style as {
    margin?: { top?: number; right?: number; bottom?: number; left?: number }
  } | undefined

  const layoutStyle = canvasBlockLayoutToCSS(block.render_data)
  if (!style?.margin) return layoutStyle

  return {
    ...layoutStyle,
    marginTop: style.margin.top,
    marginRight: style.margin.right,
    marginBottom: style.margin.bottom,
    marginLeft: style.margin.left,
  }
}

function waitForImages(root: ParentNode) {
  const images = Array.from(root.querySelectorAll('img'))
  return Promise.all(images.map(image => {
    if (image.complete) return Promise.resolve()
    return new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })
  }))
}

function Header({ schoolName, materialTitle }: { schoolName: string; materialTitle: string }) {
  return (
    <div className="a4-page-header print-page-header">
      <span>{schoolName}</span>
      <span>{materialTitle}</span>
      <span />
    </div>
  )
}

function Footer({ pageIndex, totalPages, schoolName }: { pageIndex: number; totalPages: number; schoolName: string }) {
  return (
    <div className="a4-page-footer print-page-footer print-footer">
      <span className="print-footer-left">{schoolName}</span>
      <span className="print-footer-center" aria-hidden="true" />
      <span className="print-footer-right">{pageIndex + 1} de {totalPages}</span>
    </div>
  )
}

export function PrintView() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const token = useMemo(
    () => new URLSearchParams(location.search).get('token'),
    [location.search],
  )
  const [data, setData] = useState<MaterialWithBlocks[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadPrintMaterial() {
      setLoading(true)
      setError(null)
      setData(null)

      try {
        if (!id) {
          throw new Error('Material nao informado.')
        }

        if (token) {
          const response = await fetch(GET_PRINT_MATERIAL_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ materialId: id, token }),
          })

          if (!response.ok) {
            const errorBody = await response.text()
            throw new Error(errorBody || `Erro ao buscar material para impressao (${response.status}).`)
          }

          const functionData = await response.json()
          const rows = (functionData as { rows?: MaterialWithBlocks[] } | null)?.rows
          if (!rows) {
            throw new Error('A Edge Function nao retornou o material para impressao.')
          }

          if (!cancelled) setData(rows)
          return
        }

        const rows = await getMaterialWithBlocks(id)
        if (!cancelled) setData(rows)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar material.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPrintMaterial()

    return () => {
      cancelled = true
    }
  }, [id, token])

  const { material, blocks, pages } = useMemo(() => {
    const parsed = parsePrintMaterialRows(data ?? [])
    return {
      ...parsed,
      pages: paginatePrintBlocks(parsed.blocks),
    }
  }, [data])
  const canvasPages = useMemo(() => applyCanvasLayoutPageOffsets(pages), [pages])
  const printFontSources = useMemo(
    () => material ? [...blocks, { render_data: material.pageConfig }] : blocks,
    [blocks, material],
  )
  const usedFontFamilies = useMemo(() => collectUsedGoogleFontFamilies(printFontSources), [printFontSources])
  const usedFontKey = usedFontFamilies.join('|')

  useEffect(() => {
    const win = window as WindowWithPrintStatus
    win.status = 'loading-print'
  }, [id])

  useEffect(() => {
    if (loading || error || !material || canvasPages.length === 0) return

    const win = window as WindowWithPrintStatus
    win.status = 'rendering-print'

    let readyTimer = 0
    let maxTimer = 0
    let cancelled = false
    const root = document.querySelector('[data-print-root]') ?? document.body

    const markReady = async () => {
      if (cancelled) return
      await waitForGoogleFonts(usedFontFamilies)
      await waitForImages(root)
      await new Promise(resolve => window.setTimeout(resolve, 2000))
      if (cancelled) return
      setPrintReadyMarker()
    }

    const scheduleReady = () => {
      window.clearTimeout(readyTimer)
      readyTimer = window.setTimeout(markReady, 800)
    }

    const observer = new MutationObserver(scheduleReady)
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    })

    scheduleReady()
    maxTimer = window.setTimeout(markReady, 8000)

    return () => {
      cancelled = true
      observer.disconnect()
      window.clearTimeout(readyTimer)
      window.clearTimeout(maxTimer)
    }
  }, [canvasPages.length, error, loading, material, usedFontFamilies, usedFontKey])

  if (loading) {
    return (
      <div className="print-view-loading">
        <SpinnerGap size={28} className="animate-spin" />
        <span>Carregando material para PDF...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="print-view-loading text-vermelho">
        Erro ao carregar material: {String(error)}
      </div>
    )
  }

  if (!material || blocks.length === 0) {
    return (
      <div className="print-view-loading">
        Material nao encontrado.
      </div>
    )
  }

  const schoolName = material.schoolName || 'LA Music School'

  return (
    <main className="print-view" data-print-root>
      {canvasPages.map((pageBlocks, pageIndex) => {
        const isCoverPage = pageBlocks.some(block => block.block_type === 'cover')
        const pageHasShiftedBlock = pageBlocks.some(block => hasCanvasBlockLayoutOffset(block.render_data))
        const pageLayerStyle = canvasPageLayerToCSS({
          hasSelectedBlock: false,
          hasShiftedBlock: pageHasShiftedBlock,
        })

        return (
          <section
            key={pageIndex}
            className={`a4-page print-page ${isCoverPage ? 'a4-page--cover print-page--cover' : ''}`}
            data-print-page={pageIndex + 1}
            style={pageLayerStyle}
          >
            {!isCoverPage && (
              <Header schoolName={schoolName} materialTitle={material.title} />
            )}

            <div
              className="a4-page-content print-page-content"
              style={pageHasShiftedBlock ? { overflow: 'visible' } : undefined}
            >
              {pageBlocks.map(block => {
                if (block.block_type === 'page_break') return null
                const printBlockTypeClass = `print-block--${block.block_type.replace(/_/g, '-')}`
                return (
                  <div
                    key={block.id}
                    className={`canvas-block print-block ${printBlockTypeClass}`}
                    data-block-type={block.block_type}
                    data-print-block-id={block.id}
                    style={blockPrintStyle(block)}
                  >
                    <MaterialPreview blocks={[block]} />
                  </div>
                )
              })}
            </div>

            {!isCoverPage && (
              <Footer pageIndex={pageIndex} totalPages={canvasPages.length} schoolName={schoolName} />
            )}
          </section>
        )
      })}
    </main>
  )
}
