import { applyCifraQuality } from './notationCifra'

export const ESTUDO_CIFRA_CHIPS = [
  { id: '7', label: '7', quality: '7' },
  { id: 'maj7', label: 'maj7', quality: 'maj7' },
  { id: 'm7', label: 'm7', quality: 'm7' },
  { id: 'm', label: 'm', quality: 'm' },
  { id: 'sus', label: 'sus', quality: 'sus4' },
  { id: 'tri', label: '△', quality: 'maj7' },
] as const

export type EstudoCifraChipId = (typeof ESTUDO_CIFRA_CHIPS)[number]['id']

export function applyEstudoCifraChip(current: string, chipId: EstudoCifraChipId): string {
  const chip = ESTUDO_CIFRA_CHIPS.find((item) => item.id === chipId)
  if (!chip) return current
  return applyCifraQuality(current || 'C', chip.quality)
}

export function nextCifraBeatIndex(
  beats: Array<{ cifra?: string | null }>,
  fromIndex: number,
): number {
  const indices = beats
    .map((beat, index) => (beat.cifra && beat.cifra.trim() ? index : -1))
    .filter((index) => index >= 0)
  if (indices.length === 0) return fromIndex
  const pos = indices.findIndex((index) => index > fromIndex)
  return pos >= 0 ? indices[pos] : indices[0]
}
