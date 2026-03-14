export interface InstrumentMapping {
  program: number
  isPercussion: boolean
}

export function mapSongsterrInstrumentToPlayback(
  instrumentId: number | undefined
): InstrumentMapping {
  if (instrumentId === 1024) {
    return { program: 0, isPercussion: true }
  }
  const normalizedProgram =
    typeof instrumentId === 'number'
      ? Math.min(Math.max(instrumentId, 0), 127)
      : 24
  return { program: normalizedProgram, isPercussion: false }
}
