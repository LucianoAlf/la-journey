import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'

export interface PdfOptions {
  /** Nome do arquivo (sem extensão) */
  filename: string
  /** Margem em mm */
  margin?: number
}

/**
 * Gera um PDF a partir de um elemento HTML.
 * O elemento deve ter fundo branco e estar visível no DOM no momento da captura.
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  options: PdfOptions
): Promise<void> {
  const { filename, margin = 10 } = options

  // Capturar o elemento como canvas
  const canvas = await html2canvas(element, {
    scale: 1.5, // Boa qualidade sem arquivo gigante
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  const imgData = canvas.toDataURL('image/jpeg', 0.85)
  const imgWidth = canvas.width
  const imgHeight = canvas.height

  // Criar PDF A4 portrait
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const printableWidth = pageWidth - margin * 2
  const printableHeight = pageHeight - margin * 2

  // Calcular proporção para caber na largura da página
  const ratio = printableWidth / imgWidth
  const scaledHeight = imgHeight * ratio

  // Se o conteúdo cabe em uma página
  if (scaledHeight <= printableHeight) {
    pdf.addImage(imgData, 'JPEG', margin, margin, printableWidth, scaledHeight)
  } else {
    // Múltiplas páginas: fatiar o canvas
    const sliceHeight = printableHeight / ratio // altura em pixels do canvas por página
    let yOffset = 0
    let pageNum = 0

    while (yOffset < imgHeight) {
      if (pageNum > 0) pdf.addPage()

      const currentSliceHeight = Math.min(sliceHeight, imgHeight - yOffset)

      // Criar canvas parcial para esta fatia
      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = imgWidth
      sliceCanvas.height = currentSliceHeight
      const ctx = sliceCanvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, yOffset, imgWidth, currentSliceHeight,
          0, 0, imgWidth, currentSliceHeight
        )
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.85)
        const scaledSliceHeight = currentSliceHeight * ratio
        pdf.addImage(sliceData, 'JPEG', margin, margin, printableWidth, scaledSliceHeight)
      }

      yOffset += currentSliceHeight
      pageNum++
    }
  }

  pdf.save(`${filename}.pdf`)
}
