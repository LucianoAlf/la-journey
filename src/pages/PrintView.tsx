import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { SpinnerGap } from '@phosphor-icons/react'
import { MaterialPreview } from '@/components/material/MaterialPreview'
import { supabase } from '@/lib/supabase'
import {
  paginatePrintBlocks,
  parsePrintMaterialRows,
  type PrintBlock,
} from '@/lib/printPagination'
import { getMaterialWithBlocks, type MaterialWithBlocks } from '@/services/materialService'

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

  if (!style?.margin) return {}

  return {
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
    <div className="a4-page-footer print-page-footer">
      <span>{schoolName}</span>
      <span>{pageIndex + 1} de {totalPages}</span>
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
          const { data: functionData, error: functionError } = await supabase.functions.invoke(
            'get-print-material',
            {
              body: { materialId: id, token },
            },
          )

          if (functionError) throw functionError

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

  useEffect(() => {
    const win = window as WindowWithPrintStatus
    win.status = 'loading-print'
  }, [id])

  useEffect(() => {
    if (loading || error || !material || pages.length === 0) return

    const win = window as WindowWithPrintStatus
    win.status = 'rendering-print'

    let readyTimer = 0
    let maxTimer = 0
    let cancelled = false
    const root = document.querySelector('[data-print-root]') ?? document.body

    const markReady = async () => {
      if (cancelled) return
      await document.fonts.ready
      await waitForImages(root)
      if (cancelled) return
      setPrintReadyMarker()
    }

    const scheduleReady = () => {
      window.clearTimeout(readyTimer)
      readyTimer = window.setTimeout(markReady, 1500)
    }

    const observer = new MutationObserver(scheduleReady)
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    })

    scheduleReady()
    maxTimer = window.setTimeout(markReady, 20000)

    return () => {
      cancelled = true
      observer.disconnect()
      window.clearTimeout(readyTimer)
      window.clearTimeout(maxTimer)
    }
  }, [error, loading, material, pages.length])

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
      {pages.map((pageBlocks, pageIndex) => {
        const isCoverPage = pageBlocks.some(block => block.block_type === 'cover')

        return (
          <section
            key={pageIndex}
            className={`a4-page print-page ${isCoverPage ? 'a4-page--cover print-page--cover' : ''}`}
            data-print-page={pageIndex + 1}
          >
            {!isCoverPage && (
              <Header schoolName={schoolName} materialTitle={material.title} />
            )}

            <div className="a4-page-content print-page-content">
              {pageBlocks.map(block => {
                if (block.block_type === 'page_break') return null
                return (
                  <div
                    key={block.id}
                    className="canvas-block print-block"
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
              <Footer pageIndex={pageIndex} totalPages={pages.length} schoolName={schoolName} />
            )}
          </section>
        )
      })}
    </main>
  )
}
