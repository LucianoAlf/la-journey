export function svguitarFretOffset(
  position: number,
  fingers: Array<[number, number, (string | undefined)?] | unknown>,
  barres: Array<{ fret?: number } | unknown>,
) {
  if (position <= 1) return 0

  const frets: number[] = []
  for (const finger of fingers ?? []) {
    const fret = Array.isArray(finger) ? finger[1] : undefined
    if (typeof fret === 'number' && fret > 0) frets.push(fret)
  }
  for (const barre of barres ?? []) {
    const fret = barre && typeof barre === 'object' ? (barre as { fret?: number }).fret : undefined
    if (typeof fret === 'number' && fret > 0) frets.push(fret)
  }
  if (frets.length === 0) return 0

  const minFret = Math.min(...frets)
  // Absolute voicings live entirely at/above the starting fret. Relative ones already have a fret 1–2 in the window.
  return minFret >= position ? position - 1 : 0
}
