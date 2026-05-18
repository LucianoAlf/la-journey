export const CHORD_FAMILY_LABELS: Record<string, string> = {
  triad: 'tríade',
  tetrad: 'tétrade',
  suspended: 'suspensa',
  tension: 'tensão',
  power: 'power chord',
  other: 'outro',
}

export const CAGED_SHAPES = ['C', 'A', 'G', 'E', 'D'] as const
export type CagedShape = typeof CAGED_SHAPES[number]

export const CAGED_SHAPE_LABELS: Record<CagedShape, string> = {
  C: 'Formato C',
  A: 'Formato A',
  G: 'Formato G',
  E: 'Formato E',
  D: 'Formato D',
}

export const CAGED_SHAPE_DESCRIPTIONS: Record<CagedShape, string> = {
  C: 'Baixo na 5ª corda - escadinha descendente',
  A: 'Baixo na 5ª corda - mão compacta subindo',
  G: 'Baixo na 6ª corda - aranha, grande extensão',
  E: 'Baixo na 6ª corda - com pestana',
  D: 'Baixo na 4ª corda - cordas agudas',
}

export function chordFooterText(chord: { family?: string | null; difficulty?: number | null }) {
  const family = CHORD_FAMILY_LABELS[(chord.family ?? '')] ?? ''
  const level = chord.difficulty ? `nível ${chord.difficulty}` : ''
  return [family, level].filter(Boolean).join(' · ')
}

export function getChordPosition(positions: any): number {
  if (positions?.position) return positions.position
  const frets: number[] = [
    ...(positions?.fingers ?? []).map((f: any) => f[1]).filter((f: number) => typeof f === 'number' && f > 0),
    ...(positions?.barres ?? []).map((b: any) => b.fret).filter((f: number) => typeof f === 'number' && f > 0),
  ]
  if (frets.length === 0) return 1
  const minFret = Math.min(...frets)
  return minFret > 0 ? minFret : 1
}

export function isRenderableChordPositions(positions: any) {
  return Boolean(
    (Array.isArray(positions?.fingers) && positions.fingers.length > 0) ||
    (Array.isArray(positions?.barres) && positions.barres.length > 0) ||
    (Array.isArray(positions?.muted) && positions.muted.length > 0)
  )
}

export function groupChordsByCagedShape<TChord extends { caged_shape?: string | null }>(chords: TChord[]) {
  const groups: Array<{
    shape: CagedShape | '?'
    label: string
    description: string
    chords: TChord[]
  }> = CAGED_SHAPES.map(shape => ({
    shape,
    label: CAGED_SHAPE_LABELS[shape],
    description: CAGED_SHAPE_DESCRIPTIONS[shape],
    chords: chords.filter(chord => chord.caged_shape === shape),
  }))

  const unclassified = chords.filter(chord => !chord.caged_shape)
  if (unclassified.length > 0) {
    groups.push({
      shape: '?',
      label: 'Sem classificação CAGED',
      description: '',
      chords: unclassified,
    })
  }

  return groups
}
