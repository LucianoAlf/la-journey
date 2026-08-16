export function resolveModelBeatIndex(alphaTabBeatIdx: number, indexMap: number[]): number {
  if (alphaTabBeatIdx < 0 || alphaTabBeatIdx >= indexMap.length) return -1
  return indexMap[alphaTabBeatIdx]
}

export function resolveInsertAfterIndex(modelBeatIdx: number, _clickedExistingBeat: boolean): number {
  return modelBeatIdx
}

export type StaffClickAction =
  | { type: 'select'; index: number }
  | { type: 'insert'; afterIndex: number }
  | { type: 'clear' }

/**
 * Folha fluida (MuseScore/Finale): clique em cima de uma nota SEMPRE seleciona —
 * nunca substitui nem insere. Vazio da pauta insere (escrevendo) ou solta a seleção.
 */
export function resolveStaffClick(input: {
  armed: boolean
  noteHitIndex: number
  beatHitIndex?: number
  insertAfterIndex: number
}): StaffClickAction {
  const hitIndex = input.noteHitIndex >= 0 ? input.noteHitIndex : (input.beatHitIndex ?? -1)
  if (hitIndex >= 0) return { type: 'select', index: hitIndex }
  if (!input.armed) return { type: 'clear' }
  return { type: 'insert', afterIndex: input.insertAfterIndex }
}

/** Cabeça/haste fora da pauta (ex.: C5 com haste pra baixo) soma ~1 espaço de cada lado. */
const BEAT_X_SLACK = 22
/**
 * visualBounds do beat cobre só a altura da pauta: cabeça acima/abaixo (ex.: C5)
 * fica fora do rect. A banda vertical precisa cobrir linhas suplementares.
 */
const BEAT_Y_BAND = 36

function rowDistance(rect: { y: number; h: number }, atY: number): number {
  if (atY < rect.y) return rect.y - atY
  if (atY > rect.y + rect.h) return atY - (rect.y + rect.h)
  return 0
}

function columnDistance(rect: { x: number; w: number }, atX: number): number {
  if (atX < rect.x) return rect.x - atX
  if (atX > rect.x + rect.w) return atX - (rect.x + rect.w)
  return 0
}

/**
 * Coluna do beat com folga lateral e banda vertical — clicar na cabeça fora da
 * pauta também conta. Entre dois beats que "vêem" o clique, ganha o mais perto
 * (distância euclidiana ao rect), não o primeiro da lista.
 */
export function beatBodyHitIndex(
  rects: Array<{ x: number; y: number; w: number; h: number }>,
  indexMap: number[],
  atX: number,
  atY: number,
): number {
  let best = -1
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < rects.length; i += 1) {
    const rect = rects[i]
    const dx = columnDistance(rect, atX)
    if (dx > BEAT_X_SLACK) continue
    const dy = rowDistance(rect, atY)
    if (dy > BEAT_Y_BAND) continue
    const dist = Math.hypot(dx, dy)
    if (dist >= bestDist) continue
    bestDist = dist
    best = i
  }
  return best >= 0 ? resolveModelBeatIndex(best, indexMap) : -1
}

/**
 * "Depois de qual beat" para inserir. Compara X só dentro do sistema (linha) do
 * clique — senão um clique no sistema 1 acha "vizinhos" no sistema 2 (X menores)
 * e a nota cai no meio de outro compasso.
 */
export function insertAfterFromBeatRects(
  rects: Array<{ x: number; y: number; w: number; h: number }>,
  indexMap: number[],
  atX: number,
  atY: number,
): number {
  if (rects.length === 0) return -1
  let rowY = rects[0].y
  let bestDy = Number.POSITIVE_INFINITY
  for (const rect of rects) {
    const dy = rowDistance(rect, atY)
    if (dy < bestDy) {
      bestDy = dy
      rowY = rect.y
    }
  }
  let after = -1
  let rowStart = -1
  for (let i = 0; i < rects.length; i += 1) {
    if (Math.abs(rects[i].y - rowY) > 1) continue
    if (rowStart < 0) rowStart = i
    if (rects[i].x + rects[i].w / 2 <= atX) after = resolveModelBeatIndex(i, indexMap)
  }
  // Clique à esquerda do primeiro beat da linha: insere depois do último da linha anterior.
  if (after < 0 && rowStart > 0) return resolveModelBeatIndex(rowStart - 1, indexMap)
  return after
}

export type NoteHeadRect = { x: number; y: number; w: number; h: number }

/** Cabeças reais do AlphaTab (`includeNoteBounds`) — não a coluna da pauta. */
export function collectNoteHeadsFromBeat(beat: {
  notes?: Array<{ noteHeadBounds?: NoteHeadRect | null } | null> | null
}): NoteHeadRect[] {
  const heads: NoteHeadRect[] = []
  for (const note of beat.notes ?? []) {
    const bounds = note?.noteHeadBounds
    if (!bounds) continue
    heads.push({ x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h })
  }
  return heads
}

export type StyleableBeat = {
  notes: Array<{ style: unknown }>
  style: unknown
}

/**
 * Seleção = a própria gravura (MuseScore/Sibelius/Finale).
 * Pinta só o beat escolhido no modelo; o resto volta ao estilo padrão.
 */
export function applySelectionColor(
  beats: StyleableBeat[],
  selectedAlphaIdx: number,
  selectedStyle: { note: object; beat: object },
): void {
  for (let i = 0; i < beats.length; i += 1) {
    const selected = i === selectedAlphaIdx
    beats[i].style = selected ? selectedStyle.beat : null
    for (const note of beats[i].notes ?? []) {
      note.style = selected ? selectedStyle.note : null
    }
  }
}

/** Mesma caminhada de `collectBeatRects` — um beat do score por coluna gravada. */
export function collectScoreBeatsFromLookup(
  api: { boundsLookup?: any } | null,
  grandStaffMode = false,
): StyleableBeat[] {
  const beats: StyleableBeat[] = []
  const systems = api?.boundsLookup?.staffSystems ?? []
  for (const system of systems) {
    for (const masterBar of system.bars ?? []) {
      const bars = grandStaffMode
        ? masterBar.bars?.slice(0, 1) ?? []
        : masterBar.bars ?? []
      for (const bar of bars) {
        for (const beatBounds of bar.beats ?? []) {
          if (beatBounds?.beat) beats.push(beatBounds.beat)
        }
      }
    }
  }
  return beats
}

/**
 * Cabeça + haste da mesma nota. X apertado para não pintar a vizinha;
 * Y folgado porque a haste sobe/desce fora do noteHeadBounds.
 */
export function glyphHitsNoteHead(glyph: NoteHeadRect, heads: NoteHeadRect[]): boolean {
  const cx = glyph.x + glyph.w / 2
  const cy = glyph.y + glyph.h / 2
  return heads.some(head => (
    cx >= head.x - 4
    && cx <= head.x + head.w + 4
    && cy >= head.y - 28
    && cy <= head.y + head.h + 28
  ))
}
