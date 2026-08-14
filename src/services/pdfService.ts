import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'
import { collectPdfBreaks, collectPdfHeaderEnd, computePdfSlices } from '@/lib/pdfPageSlices'

export interface PdfOptions {
  filename: string
  margin?: number
  scale?: number
  title?: string
  subtitle?: string
}

export function drawFooter(
  pdf: jsPDF,
  options: {
    margin: number
    pageWidth: number
    pageHeight: number
    pageIndex: number
    pageCount: number
  },
) {
  const { margin, pageWidth, pageHeight, pageIndex, pageCount } = options
  const footerY = pageHeight - 7

  pdf.setDrawColor(210)
  pdf.setLineWidth(0.2)
  pdf.line(margin, footerY - 4, pageWidth - margin, footerY - 4)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(140)
  pdf.text('LA Music', margin, footerY)
  pdf.text(`${pageIndex + 1} / ${pageCount}`, pageWidth - margin, footerY, { align: 'right' })
}

export function drawRunningHeader(
  pdf: jsPDF,
  options: {
    margin: number
    pageWidth: number
    title?: string
  },
) {
  const { margin, pageWidth, title } = options
  const headerY = margin + 3.5

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(160)
  pdf.text(title || '', margin, headerY)
  pdf.text('Repertório', pageWidth - margin, headerY, { align: 'right' })

  pdf.setDrawColor(220)
  pdf.setLineWidth(0.15)
  pdf.line(margin, headerY + 2.5, pageWidth - margin, headerY + 2.5)
}

export async function addCoverPage(
  pdf: jsPDF,
  element: HTMLElement,
  options: { startOnNewPage?: boolean; scale?: number } = {},
): Promise<void> {
  const { startOnNewPage = false, scale = 3 } = options
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: element.offsetWidth || 794,
    height: element.offsetHeight || 1123,
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  if (startOnNewPage) pdf.addPage()
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageWidth, pageHeight)
}

export async function addRepertoirePages(
  pdf: jsPDF,
  element: HTMLElement,
  options: Omit<PdfOptions, 'filename'> & { startOnNewPage?: boolean },
): Promise<void> {
  const { margin = 12, scale = 3, title, startOnNewPage = false } = options
  const useChrome = Boolean(title)

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  const imgWidth = canvas.width
  const imgHeight = canvas.height
  const scaleY = element.offsetHeight > 0 ? imgHeight / element.offsetHeight : scale

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const printableWidth = pageWidth - margin * 2
  const ratio = printableWidth / imgWidth

  const capturedHeaderEnd = useChrome ? collectPdfHeaderEnd(element, scaleY) : 0
  const runningHeaderBand = 16
  const footerBand = useChrome ? 14 : 0
  const coverHeaderMm = capturedHeaderEnd > 0 ? capturedHeaderEnd * ratio : 0

  const firstPageBudget = (pageHeight - margin * 2 - coverHeaderMm - footerBand) / ratio
  const restPageBudget = (pageHeight - margin * 2 - (useChrome ? runningHeaderBand : 0) - footerBand) / ratio

  const slices = computePdfSlices({
    contentHeight: imgHeight,
    pageBudget: restPageBudget,
    firstPageBudget,
    origin: capturedHeaderEnd,
    breaks: collectPdfBreaks(element, scaleY),
  })

  const pages = slices.length > 0 ? slices : [{ start: capturedHeaderEnd, end: imgHeight }]

  pages.forEach((slice, pageIndex) => {
    if (pageIndex > 0 || startOnNewPage) pdf.addPage()

    const isCover = pageIndex === 0
    const headerMm = isCover ? coverHeaderMm : useChrome ? runningHeaderBand : 0

    if (isCover && capturedHeaderEnd > 0) {
      const headerCanvas = document.createElement('canvas')
      headerCanvas.width = imgWidth
      headerCanvas.height = Math.max(1, capturedHeaderEnd)
      const headerCtx = headerCanvas.getContext('2d')
      if (headerCtx) {
        headerCtx.fillStyle = '#ffffff'
        headerCtx.fillRect(0, 0, imgWidth, headerCanvas.height)
        headerCtx.drawImage(
          canvas,
          0, 0, imgWidth, capturedHeaderEnd,
          0, 0, imgWidth, capturedHeaderEnd,
        )
        pdf.addImage(
          headerCanvas.toDataURL('image/png'),
          'PNG',
          margin,
          margin,
          printableWidth,
          headerMm,
        )
      }
    } else if (useChrome) {
      drawRunningHeader(pdf, { margin, pageWidth, title })
    }

    const contentTop = margin + headerMm
    const sliceHeight = Math.max(1, slice.end - slice.start)
    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width = imgWidth
    sliceCanvas.height = sliceHeight
    const ctx = sliceCanvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, imgWidth, sliceHeight)
    ctx.drawImage(
      canvas,
      0, slice.start, imgWidth, sliceHeight,
      0, 0, imgWidth, sliceHeight,
    )

    pdf.addImage(
      sliceCanvas.toDataURL('image/png'),
      'PNG',
      margin,
      contentTop,
      printableWidth,
      sliceHeight * ratio,
    )

    if (useChrome) {
      drawFooter(pdf, {
        margin,
        pageWidth,
        pageHeight,
        pageIndex,
        pageCount: pages.length,
      })
    }
  })
}

export async function generatePdfFromElement(
  element: HTMLElement,
  options: PdfOptions
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })
  await addRepertoirePages(pdf, element, options)
  pdf.save(`${options.filename}.pdf`)
}
