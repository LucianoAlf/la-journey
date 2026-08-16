const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const

const CLEF_TOP: Record<'treble' | 'bass', { nameIdx: number; octave: number }> = {
  treble: { nameIdx: 3, octave: 5 }, // F5
  bass: { nameIdx: 5, octave: 3 },   // A3
}

const CLEF_TEX: Record<string, string> = {
  treble: 'G2',
  bass: 'F4',
  alto: 'C3',
  percussion: 'N',
}

export function pitchFromStaffY(
  y: number,
  staffTop: number,
  staffBottom: number,
  clef: 'treble' | 'bass',
): string {
  const span = staffBottom - staffTop
  const half = span === 0 ? 1 : span / 8
  const stepsFromTop = Math.round((y - staffTop) / half)
  const top = CLEF_TOP[clef]
  let nameIdx = top.nameIdx - stepsFromTop
  let octave = top.octave
  while (nameIdx < 0) {
    nameIdx += 7
    octave -= 1
  }
  while (nameIdx > 6) {
    nameIdx -= 7
    octave += 1
  }
  return `${NOTE_NAMES[nameIdx]}/${octave}`
}

/** AlphaTab score + guitar display: written pitch is sounding + 12. */
export function shiftPitchOctave(pitch: string, delta: number): string {
  const match = pitch.match(/^([A-G][#bn]?)\/(\d+)$/)
  if (!match) return pitch
  return `${match[1]}/${Number(match[2]) + delta}`
}

export function modelPitchFromStaffY(
  y: number,
  staffTop: number,
  staffBottom: number,
  clef: 'treble' | 'bass',
): string {
  return shiftPitchOctave(pitchFromStaffY(y, staffTop, staffBottom, clef), -1)
}

export function emptyStaffAlphaTex(options: {
  clef: string
  keySignature: string
  timeSignature: string | null
}): string {
  const clefTex = CLEF_TEX[options.clef] ?? 'G2'
  const lines = [
    '\\track',
    '\\staff {score}',
    `\\clef ${clefTex}`,
  ]
  if (options.timeSignature) {
    const [beats, beatType] = options.timeSignature.split('/')
    if (beats && beatType) lines.push(`\\ts ${beats} ${beatType}`)
  }
  lines.push('.')
  lines.push('r.4')
  return lines.join('\n')
}

export function staffYFromPitch(
  pitch: string,
  staffTop: number,
  staffBottom: number,
  clef: 'treble' | 'bass',
): number {
  const match = pitch.match(/^([A-G])[#bn]?\/(\d+)$/)
  if (!match) return staffTop
  const span = staffBottom - staffTop
  const half = span === 0 ? 1 : span / 8
  const top = CLEF_TOP[clef]
  const nameIdx = NOTE_NAMES.indexOf(match[1] as (typeof NOTE_NAMES)[number])
  const octave = Number(match[2])
  const steps = (top.octave - octave) * 7 + (top.nameIdx - nameIdx)
  return staffTop + steps * half
}

export function staffBoxesFromLineYs(ys: number[], epsilon = 1.5): Array<{ top: number; bottom: number }> {
  const unique: number[] = []
  for (const y of [...ys].sort((a, b) => a - b)) {
    if (unique.every(seen => Math.abs(seen - y) > epsilon)) unique.push(y)
  }
  const boxes: Array<{ top: number; bottom: number }> = []
  for (let i = 0; i + 4 < unique.length; ) {
    const five = unique.slice(i, i + 5)
    const gaps = [five[1] - five[0], five[2] - five[1], five[3] - five[2], five[4] - five[3]]
    const mean = gaps.reduce((sum, gap) => sum + gap, 0) / 4
    const even = mean > 2 && gaps.every(gap => Math.abs(gap - mean) < mean * 0.35 + epsilon)
    if (even) {
      boxes.push({ top: five[0], bottom: five[4] })
      i += 5
    } else {
      i += 1
    }
  }
  return boxes
}

export function pickStaffBox(
  boxes: Array<{ top: number; bottom: number }>,
  y: number,
): { top: number; bottom: number } | null {
  if (boxes.length === 0) return null
  return boxes.reduce((best, box) => {
    const mid = (box.top + box.bottom) / 2
    const bestMid = (best.top + best.bottom) / 2
    return Math.abs(y - mid) < Math.abs(y - bestMid) ? box : best
  })
}

/** Sem nenhuma cifra medida, a faixa cai meia pauta acima da 1ª linha. */
export const CHORD_ROW_RATIO = 0.55

/**
 * Altura em que a cifra é gravada. Prefere a fileira medida das cifras já
 * escritas (o campo tem de nascer alinhado com elas, não num offset chutado) e
 * só cai no palpite quando a pauta ainda não tem nenhuma.
 */
export function chordRowY(rows: number[], staffTop: number, staffHeight: number): number {
  let best = staffTop - staffHeight * CHORD_ROW_RATIO
  let bestGap = Infinity
  for (const y of rows) {
    const gap = staffTop - y
    // Acima da pauta e dentro do sistema: fileira de outra linha não serve.
    if (gap <= 0 || gap > staffHeight * 1.6) continue
    if (gap < bestGap) {
      bestGap = gap
      best = y
    }
  }
  return best
}

export function ledgerLineYs(noteY: number, staffTop: number, staffBottom: number): number[] {
  const span = staffBottom - staffTop
  const lineGap = span === 0 ? 2 : span / 4
  const ys: number[] = []
  for (let y = staffTop - lineGap; y >= noteY - lineGap / 4; y -= lineGap) ys.push(y)
  for (let y = staffBottom + lineGap; y <= noteY + lineGap / 4; y += lineGap) ys.push(y)
  return ys
}
