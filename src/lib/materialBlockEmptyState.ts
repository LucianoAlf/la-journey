type EmptyBlockKind = 'text' | 'notation' | 'tablature' | 'chord_diagram' | 'keyboard' | 'keyboard_grid'

export interface MaterialBlockEmptyStateInput {
  blockType: string
  title?: string | null
  content?: Record<string, unknown> | null
  renderData?: Record<string, unknown> | null
}

export interface MaterialBlockEmptyState {
  kind: EmptyBlockKind
  headline: string
  detail: string
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function htmlToReadableText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hasReadableBlockContent(content?: Record<string, unknown> | null) {
  if (!content) return false

  const text = textValue(content.text)
  if (text) return true

  const html = textValue(content.html)
  return html ? htmlToReadableText(html).length > 0 : false
}

export function hasNotationPreviewData(renderData?: Record<string, unknown> | null) {
  if (!renderData) return false

  const alphaTex = textValue(renderData.alphaTex)
  if (alphaTex) return true

  if (renderData.notation || renderData.notation_data) return true

  const notes = renderData.notes
  return Array.isArray(notes) && notes.length > 0
}

function hasFilledTabGrid(value: unknown) {
  if (!Array.isArray(value)) return false

  return value.some(row => {
    if (!Array.isArray(row)) return row != null && row !== ''
    return row.some(cell => cell != null && cell !== '')
  })
}

export function hasTablaturePreviewData(
  content?: Record<string, unknown> | null,
  renderData?: Record<string, unknown> | null,
) {
  if (hasReadableBlockContent(content)) return true
  if (!renderData) return false

  if (textValue(renderData.alphaTex)) return true
  if (textValue(renderData.tab)) return true

  const lines = renderData.lines
  if (Array.isArray(lines) && lines.length > 0) return true

  const notationData = renderData.notation_data
  if (notationData && typeof notationData === 'object' && 'grid' in notationData) {
    return hasFilledTabGrid((notationData as { grid?: unknown }).grid)
  }

  return false
}

export function hasChordDiagramPreviewData(
  title?: string | null,
  renderData?: Record<string, unknown> | null,
) {
  if (textValue(renderData?.chord_name) || textValue(title)) return true

  const fingers = renderData?.fingers
  if (Array.isArray(fingers) && fingers.length > 0) return true

  const barres = renderData?.barres
  if (Array.isArray(barres) && barres.length > 0) return true

  const muted = renderData?.muted
  return Array.isArray(muted) && muted.length > 0
}

function hasKeyboardEntryPreviewData(entry: unknown) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false

  const item = entry as Record<string, unknown>
  const rightKeys = item.keys
  const leftKeys = item.keys_lh
  return (Array.isArray(rightKeys) && rightKeys.length > 0)
    || (Array.isArray(leftKeys) && leftKeys.length > 0)
    || Boolean(String(item.chord_name ?? item.name ?? '').trim())
}

export function hasKeyboardPreviewData(renderData?: Record<string, unknown> | null) {
  if (!renderData) return false
  if (hasKeyboardEntryPreviewData(renderData)) return true

  const chords = renderData.chords
  return Array.isArray(chords) && chords.some(hasKeyboardEntryPreviewData)
}

export function hasKeyboardGridPreviewData(renderData?: Record<string, unknown> | null) {
  if (!renderData) return false

  const keyboards = renderData.keyboards
  return Array.isArray(keyboards) && keyboards.some(hasKeyboardEntryPreviewData)
}

export function getMaterialBlockEmptyState(input: MaterialBlockEmptyStateInput): MaterialBlockEmptyState | null {
  if (input.blockType === 'text') {
    const hasTitle = Boolean(textValue(input.title))
    const hasEmbeddedNotation = Boolean(input.renderData?.notation || input.renderData?.notation_data)

    if (!hasTitle && !hasReadableBlockContent(input.content) && !hasEmbeddedNotation) {
      return {
        kind: 'text',
        headline: 'Escreva seu texto aqui',
        detail: 'Clique duas vezes ou use a barra para começar a editar.',
      }
    }
  }

  if (input.blockType === 'notation' && !hasNotationPreviewData(input.renderData)) {
    return {
      kind: 'notation',
      headline: 'Pentagrama vazio',
      detail: 'Clique em Editar Notação para adicionar notas.',
    }
  }

  if (input.blockType === 'tablature' && !hasTablaturePreviewData(input.content, input.renderData)) {
    return {
      kind: 'tablature',
      headline: 'Tablatura vazia',
      detail: 'Clique em Editar tablatura para adicionar casas e ritmo.',
    }
  }

  if (input.blockType === 'chord_diagram' && !hasChordDiagramPreviewData(input.title, input.renderData)) {
    return {
      kind: 'chord_diagram',
      headline: 'Acorde vazio',
      detail: 'Clique em Editar acorde para escolher um acorde.',
    }
  }

  if (input.blockType === 'keyboard' && !hasKeyboardPreviewData(input.renderData)) {
    return {
      kind: 'keyboard',
      headline: 'Teclado vazio',
      detail: 'Clique em Editar teclado para configurar notas e mãos.',
    }
  }

  if (input.blockType === 'keyboard_grid' && !hasKeyboardGridPreviewData(input.renderData)) {
    return {
      kind: 'keyboard_grid',
      headline: 'Grade de teclados vazia',
      detail: 'Clique em Adicionar teclado para montar a grade.',
    }
  }

  return null
}
