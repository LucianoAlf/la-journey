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
