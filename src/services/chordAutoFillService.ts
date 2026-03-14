/**
 * Serviço de preenchimento automático de acordes
 * 
 * Usa a biblioteca chords-db (tombatossals) para buscar posições de acordes de violão
 * e fórmulas de teoria musical para gerar acordes de piano.
 * 
 * O mapeamento converte nomes de acordes em pt-BR (ex: "C7M", "Am7", "E5")
 * para o formato key+suffix do chords-db (ex: key="C", suffix="maj7").
 */

import guitarDb from '@tombatossals/chords-db/lib/guitar.json'
import type { ChordPositions } from '@/components/music/ChordDiagram'

// ── Tipos ───────────────────────────────────────────────────────────────

interface ChordsDbPosition {
  frets: number[]
  fingers: number[]
  baseFret: number
  barres: number[]
  capo?: boolean
  midi?: number[]
}

interface ChordsDbChord {
  key: string
  suffix: string
  positions: ChordsDbPosition[]
}

export interface AutoFillResult {
  chordName: string
  instrument: 'guitar' | 'piano'
  positions: ChordPositions | PianoPositions
  baseFret?: number
  found: boolean
  source: 'chords-db' | 'teoria-musical' | 'nao-encontrado'
}

export interface PianoPositions {
  keys: string[]
  root: string
  octave: number
  fingering_rh: number[]
  fingering_lh: number[]
  type: string
  quality: string
  octave_start: number
  octave_count: number
}

// ── Mapeamento de nomes pt-BR → key + suffix ────────────────────────────

/** Notas base: mapeia variações para a chave do chords-db */
const NOTE_MAP: Record<string, string> = {
  'C': 'C', 'Dó': 'C',
  'C#': 'C#', 'Dó#': 'C#',
  'Db': 'C#', 'Réb': 'C#',
  'D': 'D', 'Ré': 'D',
  'D#': 'Eb', 'Ré#': 'Eb',
  'Eb': 'Eb', 'Mib': 'Eb',
  'E': 'E', 'Mi': 'E',
  'F': 'F', 'Fá': 'F',
  'F#': 'F#', 'Fá#': 'F#',
  'Gb': 'F#', 'Solb': 'F#',
  'G': 'G', 'Sol': 'G',
  'G#': 'Ab', 'Sol#': 'Ab',
  'Ab': 'Ab', 'Láb': 'Ab',
  'A': 'A', 'Lá': 'A',
  'A#': 'Bb', 'Lá#': 'Bb',
  'Bb': 'Bb', 'Sib': 'Bb',
  'B': 'B', 'Si': 'B',
}

/** 
 * Sufixos de acordes: mapeia variações comuns → suffix do chords-db
 * 
 * O chords-db (@tombatossals) contém 529 acordes / 2069 posições com 63 suffixes:
 * - Normais: major, minor, dim, dim7, sus2, sus4, 7sus4, alt, aug, 6, 69, 7, 7b5,
 *   aug7, 9, 9b5, aug9, 7b9, 7#9, 11, 9#11, 13, maj7, maj7b5, maj7#5, maj9,
 *   maj11, maj13, m6, m7, m7b5, m9, m69, m11, mmaj7, mmaj7b5, mmaj9, mmaj11,
 *   add9, madd9, 7sg, 5 (gerado programaticamente)
 * - Slash chords: /A, /B, /Bb, /C, /C#, /D, /D#, /E, /F, /F#, /G, /G#
 * - Slash menores: m/B, m/C, m/C#, m/D, m/D#, m/E, m/F, m/F#, m/G, m/G#
 */
const SUFFIX_MAP: Record<string, string> = {
  // Maiores
  '': 'major',
  'M': 'major',
  'maj': 'major',
  'major': 'major',

  // Menores
  'm': 'minor',
  'min': 'minor',
  'minor': 'minor',

  // Sétimas
  '7': '7',
  '7M': 'maj7',
  '7m': 'm7',
  '7+': 'maj7',
  'maj7': 'maj7',
  'M7': 'maj7',
  '7sg': '7sg',

  // Menores com sétima
  'm7': 'm7',
  'min7': 'm7',
  'm7b5': 'm7b5',
  'ø': 'm7b5',

  // Diminutos
  'dim': 'dim',
  'º': 'dim',
  '°': 'dim',
  'dim7': 'dim7',
  'º7': 'dim7',
  '°7': 'dim7',

  // Aumentados
  'aug': 'aug',
  '+': 'aug',
  'aug7': 'aug7',
  '+7': 'aug7',

  // Suspensas
  'sus': 'sus4',
  'sus2': 'sus2',
  'sus4': 'sus4',
  '7sus4': '7sus4',
  '7sus': '7sus4',
  '7sus2': '7sus4',

  // Atalhos numéricos brasileiros (B4 = Bsus4, C2 = Csus2)
  '4': 'sus4',
  '2': 'sus2',

  // Power chords
  '5': '5',

  // Sextas
  '6': '6',
  'm6': 'm6',
  '69': '69',
  '6/9': '69',
  'm69': 'm69',

  // Nonas
  '9': '9',
  'm9': 'm9',
  'maj9': 'maj9',
  '9M': 'maj9',
  'add9': 'add9',
  'madd9': 'madd9',

  // Décima primeira
  '11': '11',
  'm11': 'm11',
  'maj11': 'maj11',

  // Décima terceira
  '13': '13',
  'maj13': 'maj13',

  // Outras variações
  '7b5': '7b5',
  '7b9': '7b9',
  '7#9': '7#9',
  '9b5': '9b5',
  'aug9': 'aug9',
  '9#11': '9#11',
  'mmaj7': 'mmaj7',
  'mmaj7b5': 'mmaj7b5',
  'mmaj9': 'mmaj9',
  'mmaj11': 'mmaj11',
  'maj7b5': 'maj7b5',
  'maj7#5': 'maj7#5',
  'alt': 'alt',
  'add11': 'add11',
}

/**
 * Extrai nota base e sufixo de um nome de acorde.
 * 
 * Suporta:
 * - Acordes simples: "C", "Am7", "F#m", "Bm7b5"
 * - Cifras brasileiras: "C7M" → maj7, "B4" → sus4, "C2" → sus2
 * - Slash chords (inversões): "E/G#" → key=E, suffix="/G#"
 * - Slash menores: "Am/C" → key=A, suffix="m/C"
 * - Extensões entre parênteses: "Fm7(11)" → Fm7, "A7(#9)" → A7#9
 * 
 * Fontes de dados:
 * - Violão: @tombatossals/chords-db (529 acordes, 2069 posições, 63 suffixes)
 * - Piano: fórmulas de teoria musical (PIANO_INTERVALS)
 */
export function parseChordName(name: string): { key: string; suffix: string } | null {
  let trimmed = name.trim()
  if (!trimmed) return null

  // Remover parênteses — mesclar extensão: "Fm7(11)" → "Fm711", "A7(#9)" → "A7#9"
  trimmed = trimmed.replace(/\(([^)]*)\)/, '$1')

  // Tentar extrair a nota base (ordem importa: tentar notas longas primeiro)
  const noteKeys = Object.keys(NOTE_MAP).sort((a, b) => b.length - a.length)

  let dbKey = ''
  let rest = ''

  for (const nk of noteKeys) {
    if (trimmed.startsWith(nk)) {
      const after = trimmed.slice(nk.length)
      // Se a próxima letra é # ou b, a nota é mais longa — pular
      if (after.length > 0 && (after[0] === '#' || after[0] === 'b') && !nk.endsWith('#') && !nk.endsWith('b')) {
        continue
      }
      dbKey = NOTE_MAP[nk]
      rest = after
      break
    }
  }

  if (!dbKey) return null

  // Slash chords: "E/G#" → rest = "/G#"
  // O chords-db guarda como suffix "/G#" e "m/G#" etc.
  // Se rest contém "/", verificar se é um slash chord válido no chords-db
  if (rest.includes('/')) {
    // Pode ser "m/C#" (menor com baixo) ou "/G#" (maior com baixo) ou "sus4/F#"
    const slashIdx = rest.indexOf('/')
    const beforeSlash = rest.slice(0, slashIdx)
    const bassNote = rest.slice(slashIdx) // inclui a barra: "/G#"

    // Slash chord menor: "m/C" → suffix = "m/C"
    if (beforeSlash === 'm') {
      return { key: dbKey, suffix: `m${bassNote}` }
    }

    // Slash chord maior puro: "/G#" → suffix = "/G#"
    if (beforeSlash === '') {
      return { key: dbKey, suffix: bassNote }
    }

    // Slash chord com qualificador antes: "sus4/F#" → tratar como suffix composto
    // O chords-db não tem esses, então mapear o beforeSlash normalmente
    // e ignorar o baixo (usar o acorde base)
    const mappedBefore = SUFFIX_MAP[beforeSlash]
    if (mappedBefore) {
      return { key: dbKey, suffix: mappedBefore }
    }

    // Último recurso: tentar sem o baixo
    rest = beforeSlash
  }

  // Match exato no SUFFIX_MAP
  if (rest in SUFFIX_MAP) {
    return { key: dbKey, suffix: SUFFIX_MAP[rest] }
  }

  // Variações pt-BR
  if (rest === '7M' || rest === '7+') return { key: dbKey, suffix: 'maj7' }
  if (rest === '7m') return { key: dbKey, suffix: 'm7' }

  // Match parcial (sufixo mais longo primeiro)
  const suffixKeys = Object.keys(SUFFIX_MAP).sort((a, b) => b.length - a.length)
  for (const sk of suffixKeys) {
    if (sk && rest === sk) {
      return { key: dbKey, suffix: SUFFIX_MAP[sk] }
    }
  }
  for (const sk of suffixKeys) {
    if (sk && rest.startsWith(sk)) {
      return { key: dbKey, suffix: SUFFIX_MAP[sk] }
    }
  }

  // Sem sufixo = major
  if (rest === '') return { key: dbKey, suffix: 'major' }

  return null
}

// ── Busca no chords-db ──────────────────────────────────────────────────

/** Chave de acesso no JSON (C → C, C# → Csharp, etc.) */
function keyToJsonKey(key: string): string {
  const map: Record<string, string> = {
    'C': 'C', 'C#': 'Csharp',
    'D': 'D', 'Eb': 'Eb',
    'E': 'E', 'F': 'F',
    'F#': 'Fsharp', 'G': 'G',
    'Ab': 'Ab', 'A': 'A',
    'Bb': 'Bb', 'B': 'B',
  }
  return map[key] ?? key
}

/**
 * Busca um acorde no banco de dados chords-db
 * Retorna a primeira posição (mais comum/fácil) ou null
 * Para power chords (5), gera programaticamente já que o chords-db não inclui
 */
export function lookupGuitarChord(chordName: string): { positions: ChordPositions; baseFret: number } | null {
  const parsed = parseChordName(chordName)
  if (!parsed) return null

  // Power chords (suffix "5") — gerar programaticamente
  if (parsed.suffix === '5') {
    return generatePowerChord(parsed.key)
  }

  const jsonKey = keyToJsonKey(parsed.key)
  const chordsForKey = (guitarDb.chords as any)[jsonKey] as ChordsDbChord[] | undefined
  if (!chordsForKey) return null

  const match = chordsForKey.find(c => c.suffix === parsed.suffix)
  if (!match || !match.positions.length) return null

  // Pegar a primeira posição (geralmente a mais comum)
  const pos = match.positions[0]
  return convertChordsDbToOurFormat(pos)
}

/**
 * Gera um power chord (tônica + quinta) programaticamente
 * Power chords usam as 3 cordas graves: E(6), A(5), D(4)
 * Formato: tônica na corda E ou A, quinta na corda seguinte, oitava na próxima
 */
function generatePowerChord(key: string): { positions: ChordPositions; baseFret: number } | null {
  // Fret absoluto da nota na corda E (6ª corda)
  const E_STRING_NOTES: Record<string, number> = {
    'E': 0, 'F': 1, 'F#': 2, 'G': 3, 'Ab': 4, 'A': 5,
    'Bb': 6, 'B': 7, 'C': 8, 'C#': 9, 'D': 10, 'Eb': 11,
  }
  // Fret absoluto da nota na corda A (5ª corda)
  const A_STRING_NOTES: Record<string, number> = {
    'A': 0, 'Bb': 1, 'B': 2, 'C': 3, 'C#': 4, 'D': 5,
    'Eb': 6, 'E': 7, 'F': 8, 'F#': 9, 'G': 10, 'Ab': 11,
  }

  const fingers: ChordPositions['fingers'] = []
  const muted: number[] = []
  const barres: ChordPositions['barres'] = []

  // SVGuitar: string 1 = E agudo (mais fina, direita), string 6 = E grave (mais grossa, esquerda)
  // Corda E grave=6, A=5, D=4, G=3, B=2, e agudo=1
  // Os frets no fingers[] devem ser RELATIVOS ao baseFret (1-indexed dentro da janela visível)

  // Tentar na corda E primeiro (notas E-B, frets 0-7)
  const eFret = E_STRING_NOTES[key]
  if (eFret !== undefined && eFret <= 7) {
    const baseFret = eFret === 0 ? 1 : eFret

    if (eFret === 0) {
      fingers.push([6, 0]) // E grave corda aberta
      fingers.push([5, 2, '3']) // Quinta na corda A: fret 2
      fingers.push([4, 2, '4']) // Oitava na corda D: fret 2
    } else {
      fingers.push([6, 1, '1']) // Tônica na corda E grave: fret 1 relativo
      fingers.push([5, 3, '3']) // Quinta na corda A: +2 = fret 3 relativo
      fingers.push([4, 3, '4']) // Oitava na corda D: mesmo fret
    }

    muted.push(1, 2, 3) // Mutar cordas agudas: e, B, G
    return { positions: { fingers, barres, muted }, baseFret }
  }

  // Tentar na corda A (notas A-Eb, frets 0-11)
  const aFret = A_STRING_NOTES[key]
  if (aFret !== undefined) {
    const baseFret = aFret === 0 ? 1 : aFret

    muted.push(6) // Mutar corda E grave

    if (aFret === 0) {
      fingers.push([5, 0]) // A corda aberta
      fingers.push([4, 2, '3']) // Quinta na corda D: fret 2
      fingers.push([3, 2, '4']) // Oitava na corda G: fret 2
    } else {
      fingers.push([5, 1, '1']) // Tônica na corda A: fret 1 relativo
      fingers.push([4, 3, '3']) // Quinta na corda D: +2 = fret 3 relativo
      fingers.push([3, 3, '4']) // Oitava na corda G: mesmo fret
    }

    muted.push(1, 2) // Mutar cordas agudas: e, B
    return { positions: { fingers, barres, muted }, baseFret }
  }

  return null
}

/**
 * Converte o formato do chords-db para o nosso formato ChordPositions
 */
function convertChordsDbToOurFormat(pos: ChordsDbPosition): { positions: ChordPositions; baseFret: number } {
  const fingers: ChordPositions['fingers'] = []
  const muted: number[] = []
  const barresOut: ChordPositions['barres'] = []

  // frets array: índice 0 = corda 6 (E grave), índice 5 = corda 1 (E agudo)
  // No SVGuitar: string 1 = E grave (mais grossa), string 6 = E agudo
  pos.frets.forEach((fret, idx) => {
    const svgString = 6 - idx // idx 0 → string 6, idx 5 → string 1

    if (fret === -1) {
      muted.push(svgString)
    } else if (fret === 0) {
      fingers.push([svgString, 0])
    } else {
      const fingerNum = pos.fingers[idx]
      if (fingerNum > 0) {
        fingers.push([svgString, fret, String(fingerNum)])
      } else {
        fingers.push([svgString, fret])
      }
    }
  })

  // Barres: o chords-db lista os frets com barre
  // Precisamos descobrir fromString e toString
  if (pos.barres && pos.barres.length > 0) {
    for (const barreFret of pos.barres) {
      // Encontrar quais cordas são cobertas pela barre neste fret
      const coveredStrings: number[] = []
      pos.frets.forEach((fret, idx) => {
        if (fret === barreFret) {
          coveredStrings.push(6 - idx)
        }
      })

      if (coveredStrings.length >= 2) {
        const minString = Math.min(...coveredStrings)
        const maxString = Math.max(...coveredStrings)
        barresOut.push({
          fromString: maxString,
          toString: minString,
          fret: barreFret,
        })
      }
    }
  }

  return {
    positions: { fingers, barres: barresOut, muted },
    baseFret: pos.baseFret,
  }
}

// ── Geração de acordes de piano ─────────────────────────────────────────

/** Intervalos em semitons para cada tipo de acorde */
const PIANO_INTERVALS: Record<string, number[]> = {
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  'dim': [0, 3, 6],
  'dim7': [0, 3, 6, 9],
  'aug': [0, 4, 8],
  '5': [0, 7],
  '7': [0, 4, 7, 10],
  'm7': [0, 3, 7, 10],
  'maj7': [0, 4, 7, 11],
  'mmaj7': [0, 3, 7, 11],
  'm7b5': [0, 3, 6, 10],
  'aug7': [0, 4, 8, 10],
  '6': [0, 4, 7, 9],
  'm6': [0, 3, 7, 9],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  '7sus4': [0, 5, 7, 10],
  '9': [0, 4, 7, 10, 14],
  'm9': [0, 3, 7, 10, 14],
  'maj9': [0, 4, 7, 11, 14],
  'add9': [0, 4, 7, 14],
  'madd9': [0, 3, 7, 14],
  '11': [0, 4, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 21],
  '69': [0, 4, 7, 9, 14],
  'alt': [0, 4, 6, 10],
  '7b5': [0, 4, 6, 10],
  '7b9': [0, 4, 7, 10, 13],
  '7#9': [0, 4, 7, 10, 15],
  '9b5': [0, 4, 6, 10, 14],
  'aug9': [0, 4, 8, 10, 14],
}

/** MIDI da nota base (oitava 4) */
const NOTE_TO_MIDI: Record<string, number> = {
  'C': 60, 'C#': 61, 'Db': 61,
  'D': 62, 'D#': 63, 'Eb': 63,
  'E': 64, 'F': 65, 'F#': 66,
  'Gb': 66, 'G': 67, 'G#': 68,
  'Ab': 68, 'A': 69, 'A#': 70,
  'Bb': 70, 'B': 71,
}

/** Converte MIDI para nome de nota (ex: 60 → "C4") */
function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  const noteIdx = midi % 12
  return `${noteNames[noteIdx]}${octave}`
}

/** Dedilhado automático para mão direita */
function autoFingeringRH(noteCount: number): number[] {
  if (noteCount <= 0) return []
  if (noteCount === 1) return [1]
  if (noteCount === 2) return [1, 5]
  if (noteCount === 3) return [1, 3, 5]
  if (noteCount === 4) return [1, 2, 3, 5]
  if (noteCount === 5) return [1, 2, 3, 4, 5]
  // 6+ notas
  return Array.from({ length: noteCount }, (_, i) => (i % 5) + 1)
}

/**
 * Gera um acorde de piano usando teoria musical.
 * 
 * Suporta slash chords (E/G#): gera o acorde base (E major) e adiciona
 * a nota do baixo (G#) uma oitava abaixo se necessário.
 */
export function generatePianoChord(chordName: string): PianoPositions | null {
  const parsed = parseChordName(chordName)
  if (!parsed) return null

  // Slash chords: suffix pode ser "/G#" ou "m/C"
  // Separar acorde base do baixo
  let baseSuffix = parsed.suffix
  let bassNoteKey: string | null = null

  const slashMatch = parsed.suffix.match(/^(m?)\/(.+)$/)
  if (slashMatch) {
    baseSuffix = slashMatch[1] === 'm' ? 'minor' : 'major'
    // Normalizar a nota do baixo para o formato do NOTE_TO_MIDI
    const rawBass = slashMatch[2]
    // Mapear nota do baixo (pode ser C#, Bb, etc.)
    bassNoteKey = NOTE_MAP[rawBass] ?? rawBass
  }

  const intervals = PIANO_INTERVALS[baseSuffix]
  if (!intervals) return null

  const baseMidi = NOTE_TO_MIDI[parsed.key]
  if (baseMidi === undefined) return null

  // Gerar notas na oitava 4 (MIDI 60-71 base)
  const midiNotes = intervals.map(interval => baseMidi + interval)

  // Se é slash chord, adicionar a nota do baixo uma oitava abaixo
  if (bassNoteKey) {
    const bassMidi = NOTE_TO_MIDI[bassNoteKey]
    if (bassMidi !== undefined) {
      // Baixo na oitava 3 (uma oitava abaixo do acorde)
      const bassInOctave3 = bassMidi - 12
      // Inserir no início se não estiver já
      if (!midiNotes.includes(bassInOctave3)) {
        midiNotes.unshift(bassInOctave3)
      }
    }
  }

  const keys = midiNotes.map(midiToNoteName)
  const fingeringRh = autoFingeringRH(keys.length)

  // Determinar tipo e qualidade para metadados
  const type = 'acorde'
  const quality = baseSuffix === 'major' ? 'maior' :
    baseSuffix === 'minor' ? 'menor' :
    baseSuffix

  return {
    keys,
    root: midiToNoteName(baseMidi),
    octave: 4,
    fingering_rh: fingeringRh,
    fingering_lh: [],
    type,
    quality,
    octave_start: bassNoteKey ? 3 : 4,
    octave_count: bassNoteKey ? 3 : 2,
  }
}

// ── Função principal de auto-preenchimento ──────────────────────────────

/**
 * Para uma lista de nomes de acordes faltantes, retorna os que conseguiu
 * encontrar/gerar automaticamente
 */
export function autoFillChords(
  chordNames: string[],
  instruments: ('guitar' | 'piano')[] = ['guitar', 'piano']
): AutoFillResult[] {
  const results: AutoFillResult[] = []

  for (const name of chordNames) {
    // Violão
    if (instruments.includes('guitar')) {
      const guitarResult = lookupGuitarChord(name)
      if (guitarResult) {
        results.push({
          chordName: name,
          instrument: 'guitar',
          positions: guitarResult.positions,
          baseFret: guitarResult.baseFret,
          found: true,
          source: 'chords-db',
        })
      } else {
        results.push({
          chordName: name,
          instrument: 'guitar',
          positions: { fingers: [], barres: [], muted: [] },
          found: false,
          source: 'nao-encontrado',
        })
      }
    }

    // Piano
    if (instruments.includes('piano')) {
      const pianoResult = generatePianoChord(name)
      if (pianoResult) {
        results.push({
          chordName: name,
          instrument: 'piano',
          positions: pianoResult,
          found: true,
          source: 'teoria-musical',
        })
      } else {
        results.push({
          chordName: name,
          instrument: 'piano',
          positions: {
            keys: [], root: '', octave: 4,
            fingering_rh: [], fingering_lh: [],
            type: '', quality: '',
            octave_start: 4, octave_count: 2,
          },
          found: false,
          source: 'nao-encontrado',
        })
      }
    }
  }

  return results
}

/**
 * Retorna apenas os acordes que foram encontrados com sucesso
 */
export function autoFillChordsFound(
  chordNames: string[],
  instruments: ('guitar' | 'piano')[] = ['guitar', 'piano']
): AutoFillResult[] {
  return autoFillChords(chordNames, instruments).filter(r => r.found)
}
