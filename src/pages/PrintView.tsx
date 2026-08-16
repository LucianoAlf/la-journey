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
import { parsePageOrientation, type PageOrientation } from '@/lib/a4Preview'
import {
  paginatePrintBlocks,
  parsePrintMaterialRows,
  type PrintBlock,
} from '@/lib/printPagination'
import { collectUsedGoogleFontFamilies, waitForGoogleFonts } from '@/lib/fontLoader'
import { getMaterialWithBlocks, type MaterialWithBlocks } from '@/services/materialService'
import { HeaderFooterBar } from '@/components/editor/HeaderFooterBar'
import { FloatingElementRenderer } from '@/components/editor/FloatingElementRenderer'
import {
  DEFAULT_FOOTER,
  DEFAULT_HEADER,
  isLegacyFormat,
  migrateLegacyFooter,
  migrateLegacyHeader,
  type HeaderFooterConfig,
  type PlaceholderContext,
} from '@/lib/headerFooter'
import type { FloatingElement } from '@/lib/floatingElements'

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

interface PrintPageConfig {
  header: HeaderFooterConfig
  footer: HeaderFooterConfig
  floatingElements: FloatingElement[]
  orientation: PageOrientation
}

function normalizePrintPageConfig(raw: Record<string, unknown> | null | undefined): PrintPageConfig {
  const pageConfig = (raw ?? {}) as Record<string, unknown>
  const header = pageConfig.header as Record<string, unknown> | undefined
  const footer = pageConfig.footer as Record<string, unknown> | undefined

  return {
    header: header && isLegacyFormat(header)
      ? migrateLegacyHeader(header as { enabled: boolean; leftText: string; centerText: string; rightText: string; showOnFirstPage: boolean })
      : (header as unknown as HeaderFooterConfig | undefined) ?? DEFAULT_HEADER,
    footer: footer && isLegacyFormat(footer)
      ? migrateLegacyFooter(footer as { enabled: boolean; leftText: string; centerText: string; rightText: string; showPageNumber: boolean; pageNumberPosition: 'left' | 'center' | 'right' })
      : (footer as unknown as HeaderFooterConfig | undefined) ?? DEFAULT_FOOTER,
    floatingElements: Array.isArray(pageConfig.floating_elements)
      ? pageConfig.floating_elements as FloatingElement[]
      : [],
    orientation: parsePageOrientation(pageConfig.orientation),
  }
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
    const root = document.documentElement
    const previousTheme = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    root.classList.remove('dark')
    return () => {
      if (previousTheme) root.setAttribute('data-theme', previousTheme)
    }
  }, [])

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
    const orientation = parsePageOrientation(parsed.material?.pageConfig?.orientation)
    return {
      ...parsed,
      pages: paginatePrintBlocks(parsed.blocks, parsed.material?.type, orientation),
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
  const pageConfig = normalizePrintPageConfig(material.pageConfig)
  const coverRenderData = (blocks.find((block) => block.block_type === 'cover')?.render_data ?? {}) as Record<string, unknown>

  return (
    <main className="print-view" data-print-root data-page-orientation={pageConfig.orientation}>
      {pageConfig.orientation === 'landscape' && (
        <style>{'@page { size: A4 landscape; margin: 0; }'}</style>
      )}
      {canvasPages.map((pageBlocks, pageIndex) => {
        const isCoverPage = pageBlocks.some(block => block.block_type === 'cover')
        const pageHasShiftedBlock = pageBlocks.some(block => hasCanvasBlockLayoutOffset(block.render_data))
        const hfContext: PlaceholderContext = {
          title: material.title,
          pageNumber: pageIndex + 1,
          totalPages: canvasPages.length,
          schoolName,
          professorName: String(coverRenderData.professor ?? ''),
          instrument: String(coverRenderData.instrumento ?? ''),
          level: String(coverRenderData.nivel ?? ''),
        }
        const pageLayerStyle = canvasPageLayerToCSS({
          hasSelectedBlock: false,
          hasShiftedBlock: pageHasShiftedBlock,
        })
        const pageFloatingElements = pageConfig.floatingElements
          .filter((element) => element.pageIndex === pageIndex && element.visible !== false)
          .sort((a, b) => a.zIndex - b.zIndex)

        return (
          <section
            key={pageIndex}
            className={`a4-page print-page ${pageConfig.orientation === 'landscape' ? 'a4-page--landscape' : ''} ${isCoverPage ? 'a4-page--cover print-page--cover' : ''}`}
            data-print-page={pageIndex + 1}
            style={pageLayerStyle}
          >
            {!isCoverPage && (
              <HeaderFooterBar
                config={pageConfig.header}
                type="header"
                context={hfContext}
                pageIndex={pageIndex}
                className="a4-page-header"
              />
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
                    <MaterialPreview
                      blocks={[block]}
                      brandKit={{
                        primaryColor: material.schoolPrimaryColor,
                        secondaryColor: material.schoolSecondaryColor,
                      }}
                    />
                  </div>
                )
              })}
            </div>

            {!isCoverPage && (
              <HeaderFooterBar
                config={pageConfig.footer}
                type="footer"
                context={hfContext}
                pageIndex={pageIndex}
                className="a4-page-footer"
              />
            )}

            {pageFloatingElements.map((element) => (
              <FloatingElementRenderer
                key={element.id}
                element={element}
                isSelected={false}
                isEditing={false}
                interactive={false}
                onSelect={() => undefined}
                onDoubleClick={() => undefined}
                onDragStart={() => undefined}
                onUpdate={() => undefined}
              />
            ))}
          </section>
        )
      })}
    </main>
  )
}
