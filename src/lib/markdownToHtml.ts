/**
 * Converte markdown simples (usado nos blocos legados) para HTML
 * Suporta: **negrito**, *itálico*, quebras de linha
 * Não é um parser completo — cobre apenas o subset usado pelo MaterialPreview
 */
export function markdownToHtml(md: string): string {
  if (!md) return ''

  return md
    .split('\n')
    .map(line => {
      if (!line.trim()) return ''
      // Negrito: **texto**
      let html = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Itálico: *texto*
      html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
      return `<p>${html}</p>`
    })
    .join('')
}

/**
 * Detecta se o conteúdo já é HTML (tem tags) ou é markdown puro
 */
export function isHtml(text: string): boolean {
  if (!text) return false
  return /<[a-z][\s\S]*>/i.test(text)
}

/**
 * Garante que o conteúdo esteja em HTML.
 * Se for markdown, converte. Se já for HTML, retorna como está.
 */
export function ensureHtml(text: string): string {
  if (!text) return ''
  if (isHtml(text)) return text
  return markdownToHtml(text)
}

/**
 * Converte HTML simples de volta para markdown (para salvar no content.text legado)
 * Mantém compatibilidade com o MaterialPreview existente
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''
  return html
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u>(.*?)<\/u>/gi, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<\/?p>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .trim()
}
