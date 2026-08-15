export function isStaffLineRect(height: number, width: number): boolean {
  return height > 0.3 && height < 2 && width > 30
}

export function extendedStaffLineWidth(x: number, width: number, targetWidth: number): number {
  const rightInset = x
  const next = targetWidth - rightInset - x
  return next > 0 ? next : width
}

export function resolveStaffTargetWidth(containerWidth: number, svgWidth: number): number {
  return Math.max(containerWidth, svgWidth)
}

function setAttrIfChanged(el: Element, name: string, value: string) {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value)
}

export function extendAlphaTabStaffLines(container: ParentNode, containerWidth: number): void {
  const target = containerWidth > 0 ? containerWidth : 0
  const svgs = container.querySelectorAll('svg')
  svgs.forEach((svg) => {
    const svgWidth = parseFloat(svg.getAttribute('width') || '0')
    const width = resolveStaffTargetWidth(target, svgWidth)
    if (width <= 0) return

    const widthPx = `${Math.round(width)}px`
    setAttrIfChanged(svg, 'width', widthPx)
    const parent = svg.parentElement
    if (parent && parent.style.width !== widthPx) {
      parent.style.width = widthPx
    }

    svg.querySelectorAll('rect').forEach((rect) => {
      const x = parseFloat(rect.getAttribute('x') || '0')
      const w = parseFloat(rect.getAttribute('width') || '0')
      const h = parseFloat(rect.getAttribute('height') || '0')
      if (!isStaffLineRect(h, w)) return
      setAttrIfChanged(rect, 'width', String(extendedStaffLineWidth(x, w, width)))
    })
  })
}
