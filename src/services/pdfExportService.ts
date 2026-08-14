import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Converte todas as propriedades CSS com oklab()/oklch() para rgb()
 * dentro de um container. html2canvas não suporta esses formatos modernos.
 * Retorna uma função de cleanup que restaura tudo.
 */
function convertOklabColors(container: HTMLElement): () => void {
  const saved: { el: HTMLElement; prop: string; original: string }[] = []
  const colorProps = [
    'color', 'background-color', 'border-color',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'outline-color', 'text-decoration-color',
    'box-shadow', 'text-shadow',
  ]

  const allElements = [container, ...Array.from(container.querySelectorAll<HTMLElement>('*'))]

  for (const el of allElements) {
    const computed = getComputedStyle(el)
    for (const prop of colorProps) {
      const value = computed.getPropertyValue(prop)
      if (value && (value.includes('oklab') || value.includes('oklch'))) {
        // Guardar o valor inline original (pode ser '' se não tinha inline)
        saved.push({ el, prop, original: el.style.getPropertyValue(prop) })
        // Converter: o browser resolve oklab para rgb ao computar
        // Mas getComputedStyle pode retornar oklab se o browser suporta
        // Trick: forçar via canvas para obter rgb
        const temp = document.createElement('div')
        temp.style.setProperty('color', value)
        container.appendChild(temp)
        const resolved = getComputedStyle(temp).getPropertyValue('color')
        container.removeChild(temp)
        // Se resolveu para algo sem oklab, usar isso
        if (resolved && !resolved.includes('oklab') && !resolved.includes('oklch')) {
          el.style.setProperty(prop, resolved, 'important')
        } else {
          // Fallback: tentar extrair e converter manualmente
          // oklab(L a b) → aproximar para rgb
          el.style.setProperty(prop, fallbackOklabToHex(value), 'important')
        }
      }
    }
  }

  return () => {
    for (const { el, prop, original } of saved) {
      if (original) {
        el.style.setProperty(prop, original)
      } else {
        el.style.removeProperty(prop)
      }
    }
  }
}

/** Fallback: converter oklab(...) string para hex aproximado */
function fallbackOklabToHex(value: string): string {
  // Tenta parsear oklab(L a b / alpha)
  const match = value.match(/oklab\(\s*([\d.]+)\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/)
  if (!match) return value // Não é oklab, retornar como está

  const L = parseFloat(match[1])
  const a = parseFloat(match[2])
  const b = parseFloat(match[3])
  const alpha = match[4] !== undefined ? parseFloat(match[4]) : 1

  // oklab → linear sRGB (aproximação)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

  // Clamp e gamma
  const gammaCorrect = (c: number) => {
    c = Math.max(0, Math.min(1, c))
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  }

  const ri = Math.round(gammaCorrect(r) * 255)
  const gi = Math.round(gammaCorrect(g) * 255)
  const bi = Math.round(gammaCorrect(bl) * 255)

  if (alpha < 1) {
    return `rgba(${ri}, ${gi}, ${bi}, ${alpha})`
  }
  return `rgb(${ri}, ${gi}, ${bi})`
}

/**
 * Exporta o material completo como PDF pixel-perfect.
 * Captura cada .a4-page do editor como imagem via html2canvas
 * e monta o PDF página por página com jsPDF.
 *
 * Resultado: PDF idêntico à UI do editor — sem re-paginação do browser.
 */
export async function exportMaterialToPDF(
  filename: string = 'material.pdf',
  onProgress?: (status: string) => void,
): Promise<void> {
  const allPages = document.querySelectorAll<HTMLElement>('.a4-page')
  if (!allPages.length) throw new Error('Nenhuma página .a4-page encontrada')

  // Filtrar páginas fantasma (vazias, invisíveis, com altura zero)
  const pages = Array.from(allPages).filter((el) => {
    return el.offsetHeight > 50 && el.offsetWidth > 50 && el.children.length > 0
  })

  console.log(`[PDF Export] Encontradas ${allPages.length} .a4-page, ${pages.length} válidas`)
  pages.forEach((p, i) => {
    console.log(`  Página ${i}: ${p.offsetWidth}x${p.offsetHeight}, classes: ${p.className}, children: ${p.children.length}`)
  })

  if (!pages.length) throw new Error('Nenhuma página válida encontrada')

  onProgress?.('Preparando PDF...')

  // Aguardar fontes carregadas
  await document.fonts.ready

  // Forçar tema light temporariamente (SVGs de notação usam filter:invert no dark)
  const currentTheme = document.documentElement.getAttribute('data-theme')
  document.documentElement.setAttribute('data-theme', 'light')
  await new Promise(r => setTimeout(r, 300))

  // A4 em mm: 210 × 297 | proporção ~0.7071
  const pdf = new jsPDF('portrait', 'mm', 'a4')
  const pdfWidth = pdf.internal.pageSize.getWidth()   // 210
  const pdfHeight = pdf.internal.pageSize.getHeight()  // 297

  // Esconder elementos de edição temporariamente
  const hideSelectors = '.block-selection-border, .cover-snap-guide, .add-block-btn'
  const hiddenEls: { el: HTMLElement; prev: string }[] = []
  document.querySelectorAll<HTMLElement>(hideSelectors).forEach(el => {
    hiddenEls.push({ el, prev: el.style.display })
    el.style.display = 'none'
  })

  // Remover borda/seleção/rings temporariamente
  const selectedBlocks = document.querySelectorAll<HTMLElement>('.canvas-block.selected')
  selectedBlocks.forEach(el => el.classList.remove('selected'))

  const ringEls: { el: HTMLElement; cls: string }[] = []
  document.querySelectorAll<HTMLElement>('[class*="ring-"]').forEach(el => {
    const cls = el.getAttribute('class') || ''
    if (cls.includes('ring-')) {
      ringEls.push({ el, cls })
      el.setAttribute('class', cls.split(' ').filter(c => !c.startsWith('ring-') && c !== 'ring-offset-1').join(' '))
    }
  })

  try {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      onProgress?.(`Renderizando página ${i + 1} de ${pages.length}...`)

      // Detectar se é capa — o fundo real vem do .block-cover dentro
      const isCover = page.classList.contains('a4-page--cover')

      // 1) Aplicar .pdf-export-mode para forçar CSS variables para hex/rgba puras
      page.classList.add('pdf-export-mode')

      // 2) Converter propriedades computadas com oklab()/oklch() para rgb()
      //    (cobre classes Tailwind v4 que geram oklab inline)
      const restoreColors = convertOklabColors(page)

      // Usar SEMPRE offsetWidth/offsetHeight (área visível fixa: 794×1123)
      const captureWidth = page.offsetWidth
      const captureHeight = page.offsetHeight

      let canvas: HTMLCanvasElement
      try {
        canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: isCover ? null : '#ffffff',
          logging: false,
          width: captureWidth,
          height: captureHeight,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          windowWidth: captureWidth,
          windowHeight: captureHeight,
        })
      } finally {
        // SEMPRE restaurar, mesmo se html2canvas falhar
        restoreColors()
        page.classList.remove('pdf-export-mode')
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95)

      if (i > 0) pdf.addPage()

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
    }

    onProgress?.('Salvando PDF...')
    pdf.save(filename)
    onProgress?.('PDF exportado com sucesso!')
  } finally {
    // Restaurar tema original
    if (currentTheme) document.documentElement.setAttribute('data-theme', currentTheme)
    else document.documentElement.removeAttribute('data-theme')

    // Restaurar elementos ocultos
    hiddenEls.forEach(({ el, prev }) => { el.style.display = prev })

    // Restaurar seleção
    selectedBlocks.forEach(el => el.classList.add('selected'))

    // Restaurar rings
    ringEls.forEach(({ el, cls }) => { el.setAttribute('class', cls) })
  }
}
