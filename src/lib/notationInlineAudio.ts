import * as Tone from 'tone'

let synth: Tone.PolySynth | null = null

/** Pitch no formato que `playNotePreview` espera (`C/4`, `C#/4`, `Cb/4`). `n` é natural e some. */
export function soundingPitch(pitch: string, accidental?: string | null): string {
  const [note, octave] = pitch.split('/')
  if (!note || !octave) return pitch
  if (accidental === '#' || accidental === 'b') return `${note}${accidental}/${octave}`
  return pitch
}

/** Nota curta de confirmação ao escrever/selecionar. Fire-and-forget. */
export async function playNotePreview(pitches: string[]) {
  if (pitches.length === 0) return
  try {
    await Tone.start()
    if (!synth) {
      synth = new Tone.PolySynth(Tone.Synth, { volume: -10 }).toDestination()
    }
    synth.triggerAttackRelease(pitches.map(pitch => pitch.replace('/', '')), 0.18, Tone.immediate())
  } catch {
    // Sem áudio disponível — a escrita continua muda, nunca quebra.
  }
}
