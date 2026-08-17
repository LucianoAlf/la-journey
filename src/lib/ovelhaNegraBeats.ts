import type { Beat } from './beatsToAlphaTex'

/**
 * Ovelha Negra (Rita Lee) — grade rítmica dos 45 compassos do vídeo
 * Escola de Música Rafael Bastos (4 telas, 05:46). Fonte: frames lidos em 16/08.
 * BPM e armadura não conferidos no vídeo; armadura D é a da sonda.
 */

const B: Beat['pitches'] = [{ pitch: 'B/4', accidental: null }]

export function slashBeat(over: Partial<Beat> = {}): Beat {
  return {
    pitches: B,
    duration: 'q',
    tie: false,
    isRest: false,
    dotted: false,
    cifra: null,
    annotation: null,
    lyric: null,
    slash: true,
    ...over,
  }
}

/** Quatro semínimas. Cifra nos tempos 1 e 3. */
function twoAndTwo(a: string, b: string, first: Partial<Beat> = {}, last: Partial<Beat> = {}): Beat[] {
  return [
    slashBeat({ cifra: a, ...first }),
    slashBeat(),
    slashBeat({ cifra: b }),
    slashBeat({ barAfter: true, ...last }),
  ]
}

/** Semínima pontuada + colcheia + semínima ligada + semínima (levada da tela 1). */
function levada(cifra: string, first: Partial<Beat> = {}, last: Partial<Beat> = {}): Beat[] {
  return [
    slashBeat({ cifra, dotted: true, ...first }),
    slashBeat({ duration: '8' }),
    slashBeat({ tie: true }),
    slashBeat({ barAfter: true, ...last }),
  ]
}

function twoFour(cifra: string, first: Partial<Beat> = {}, last: Partial<Beat> = {}): Beat[] {
  return [
    slashBeat({ cifra, timeSignature: '2/4', ...first }),
    slashBeat({ barAfter: true, ...last }),
  ]
}

function fourEven(cifra: string | null, first: Partial<Beat> = {}, last: Partial<Beat> = {}): Beat[] {
  return [
    slashBeat({ cifra, ...first }),
    slashBeat(),
    slashBeat(),
    slashBeat({ barAfter: true, ...last }),
  ]
}

function simileBar(first: Partial<Beat> = {}): Beat[] {
  return [slashBeat({ simile: 'simple', barAfter: true, ...first })]
}

/** Refrão [B] / Solo: G Bm | Bb F | C G | A Asus A */
function refrain(first: Partial<Beat> = {}, last: Partial<Beat> = {}): Beat[] {
  return [
    ...twoAndTwo('G', 'Bm', first),
    ...twoAndTwo('Bb', 'F'),
    ...twoAndTwo('C', 'G'),
    slashBeat({ cifra: 'A' }),
    slashBeat(),
    slashBeat({ cifra: 'Asus' }),
    slashBeat({ cifra: 'A', barAfter: true, ...last }),
  ]
}

/** Interlúdio: A Asus A Aadd9 (colcheias) + mínima A. */
function vocalize(first: Partial<Beat> = {}, last: Partial<Beat> = {}): Beat[] {
  return [
    slashBeat({ cifra: 'A', duration: '8', ...first }),
    slashBeat({ cifra: 'Asus', duration: '8' }),
    slashBeat({ cifra: 'A', duration: '8' }),
    slashBeat({ cifra: 'Aadd9', duration: '8' }),
    slashBeat({ cifra: 'A', duration: 'h', barAfter: true, ...last }),
  ]
}

export function countBars(beats: Beat[]): number {
  let count = 0
  for (const beat of beats) {
    if (beat.barAfter) count += 1
  }
  if (beats.length > 0 && !beats[beats.length - 1].barAfter) count += 1
  return count
}

export const ovelhaNegraBeats: Beat[] = [
  // Tela 1 — [A] compassos 1–8
  ...twoAndTwo('D', 'G', { sectionStart: { marker: 'A', text: 'Violao, piano e vocal' }, timeSignature: '4/4' }),
  ...levada('D'),
  ...twoAndTwo('D', 'G'),
  ...levada('G'),
  ...twoAndTwo('D', 'G'),
  ...twoFour('A'),
  ...fourEven('A', { timeSignature: '4/4' }),
  ...fourEven(null),

  // Tela 2 — [A'] Banda 9–16
  ...twoAndTwo('D', 'G', { sectionStart: { marker: "A'", text: 'Banda' } }),
  ...simileBar(),
  ...simileBar(),
  ...simileBar(),
  ...twoAndTwo('D', 'G'),
  ...twoFour('A'),
  ...levada('A', { timeSignature: '4/4' }),
  ...fourEven(null),

  // Tela 2 — [B] 17–20
  ...refrain({ sectionStart: { marker: 'B', text: '' }, repeatOpen: true }, { repeatClose: 2 }),

  // Tela 3 — Interlúdio 21–24
  ...vocalize({ sectionStart: { marker: 'Interlúdio', text: 'Vocalize' }, repeatOpen: true }),
  ...simileBar(),
  ...simileBar(),
  ...simileBar({ repeatClose: 2 }),

  // Tela 3 — [A'] 25–32
  ...twoAndTwo('D', 'G', { sectionStart: { marker: "A'", text: 'Banda' }, repeatOpen: true }),
  ...simileBar(),
  ...simileBar(),
  ...simileBar(),
  ...twoAndTwo('D', 'G'),
  ...twoFour('A'),
  ...fourEven('A', { timeSignature: '4/4' }),
  ...fourEven(null, {}, { repeatClose: 2 }),

  // Tela 4 — [B] 33–36
  ...refrain({ sectionStart: { marker: 'B', text: '' }, repeatOpen: true }, { repeatClose: 2 }),

  // Tela 4 — Interlúdio 37–40
  ...vocalize({ sectionStart: { marker: 'Interlúdio', text: 'Vocalize' }, repeatOpen: true }),
  ...simileBar(),
  ...simileBar(),
  ...simileBar({ repeatClose: 2 }),

  // Tela 4 — [Solo] 41–44 + Fine 45
  ...refrain({ sectionStart: { marker: 'Solo', text: '' }, repeatOpen: true }, { repeatClose: 7 }),
  slashBeat({ cifra: 'D', duration: 'w', jump: 'fine', barAfter: true }),
]
