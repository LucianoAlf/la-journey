import { normalizeTimeSignature } from './timeSignature'

// ─── beatsToAlphaTex.ts ───────────────────────────────────────────────────────
// Converte Beat[] (modelo do NotationEditor) → string AlphaTex
// para renderização via AlphaTab.
//
// IMPORTANTE: Grace notes geram beats extras no AlphaTab!
// Use beatsToAlphaTexWithMap() para obter o mapa de índice
// alphaTabBeatIdx → ourBeatIdx para interação correta.
//
// Referência de sintaxe AlphaTex:
// - Notas pitched: c4 d4 e4 (lowercase + oitava)
// - Durações: :1 (semibreve), :2 (mínima), :4 (semínima), :8, :16, :32, :64
// - Ponto: {d}, duplo ponto: {dd}
// - Pausas: r
// - Acordes: (c4 e4 g4)
// - Acidentes: c#4, db4, cn4 (bequadro)
// - Tie: - ou {t} ou {-}
// - Staccato: {st}
// - Fermata: {fermata}
// - Grace: {gr} (before beat) ou {gr ob} (on beat)
// - Tuplet: {tu 3}, {tu 5}, {tu 6}
// - Dinâmicas: {dy ppp}, {dy mf}, {dy ff}
// - Crescendo/Decrescendo: {cre}, {dec}
// - Trill: {tr <fret> <dur>} — para pitched: verificar se funciona
// - Barline: |
// ─────────────────────────────────────────────────────────────────────

// ─── Tipos (espelhados do NotationEditor — para não criar dependência circular) ───

export interface PitchData {
  pitch: string       // formato: 'C/4', 'D/5', 'F#/3'
  accidental: string | null  // '#' | 'b' | 'n' | null
}

export interface OffsetXY {
  x: number
  y: number
}

export interface Beat {
  pitches: PitchData[]
  duration: string     // 'w' | 'h' | 'q' | '8' | '16' | '32' | '64'
  tie: boolean
  isRest: boolean
  dotted: boolean
  doubleDotted?: boolean
  articulations?: string[]
  tuplet?: { numNotes: number; notesOccupied: number; groupId: string }
  notehead?: 'normal' | 'x'
  barAfter?: boolean
  pedagogical_separator?: boolean
  stemDirection?: 'up' | 'down'
  cifra: string | null
  cifra_offset?: OffsetXY
  annotation: string | null
  annotation_offset?: OffsetXY
  lyric: string | null
  lyric_offset?: OffsetXY
  dynamic?: string
  hairpinStart?: 'crescendo' | 'decrescendo'
  hairpinEnd?: boolean
  graceNotes?: {
    pitches: PitchData[]
    type: 'acciaccatura' | 'appoggiatura'
    duration?: string
  }
  ornament?: string
  slurStart?: boolean
  slurEnd?: boolean
  volta?: { number: number; isStart: boolean; isEnd: boolean }
  pedalStart?: boolean
  pedalEnd?: boolean
  // Campos para grande pauta (piano)
  staff?: 'treble' | 'bass'
  timeSlot?: number  // Posição temporal para sincronização entre pautas
}

// ─── Opções de conversão ───

export interface BeatsToAlphaTexOptions {
  clef: string                    // 'treble' | 'bass' | 'alto' | 'percussion'
  keySignature: string            // 'C' | 'G' | 'D' | 'F' | 'Bb' | etc.
  timeSignature: string | null    // '4/4' | '3/4' | null (livre)
  timeSignatureMode?: 'free' | 'free-with-separators' | 'metered' | 'tablature'
  grandStaff?: boolean            // true = piano (treble + bass)
  octaveOffset?: number           // ajuste fino da oitava ao exportar para AlphaTex
  instrument?: string             // nome General MIDI
  bpm?: number
  title?: string
  includeLyrics?: boolean         // incluir sílabas/lyrics no AlphaTex (default: true)
}

// ─── Mapa de durações: nosso formato → AlphaTex ───

const DURATION_MAP: Record<string, string> = {
  'w': '1',    // semibreve
  'h': '2',    // mínima
  'q': '4',    // semínima
  '8': '8',    // colcheia
  '16': '16',  // semicolcheia
  '32': '32',  // fusa
  '64': '64',  // semifusa
  '1': '1',
  '2': '2',
  '4': '4',
}

// ─── Mapa de armaduras: nosso formato → AlphaTex ───

const KEY_SIG_MAP: Record<string, string> = {
  'C': 'Cmajor',
  'G': 'Gmajor',
  'D': 'Dmajor',
  'A': 'Amajor',
  'E': 'Emajor',
  'B': 'Bmajor',
  'F#': 'F#major',
  'C#': 'C#major',
  'F': 'Fmajor',
  'Bb': 'Bbmajor',
  'Eb': 'Ebmajor',
  'Ab': 'Abmajor',
  'Db': 'Dbmajor',
  'Gb': 'Gbmajor',
  'Cb': 'Cbmajor',
}

// ─── Mapa de claves: nosso formato → AlphaTex ───

const CLEF_MAP: Record<string, string> = {
  'treble': 'G2',
  'bass': 'F4',
  'alto': 'C3',
  'percussion': 'neutral',
}

// ─── Converter PitchData → string AlphaTex ───

function pitchToAlphaTex(pd: PitchData, octaveOffset = -1): string {
  // pd.pitch = 'C/4', 'F#/3', 'Bb/5' etc.
  const parts = pd.pitch.split('/')
  const rawName = parts[0]  // 'C', 'F#', 'Bb'
  const octave = parts[1] || '4'

  // Extrair apenas a primeira letra como nome da nota (a-g)
  const noteLetter = rawName.charAt(0).toLowerCase()

  // Acidental: usar o campo accidental se presente
  let acc = ''
  if (pd.accidental === '#') acc = '#'
  else if (pd.accidental === 'b') acc = 'b'
  else if (pd.accidental === 'n') acc = 'n'  // bequadro (natural)

  const parsedOctave = Number.parseInt(octave, 10)
  const alphaTexOctave = Number.isFinite(parsedOctave) ? parsedOctave + octaveOffset : octave

  return `${noteLetter}${acc}${alphaTexOctave}`
}

// ─── Tipo de retorno com mapa de índice ───

export interface AlphaTexNotesResult {
  tex: string
  // Mapa: alphaTabBeatIndex → ourBeatIndex
  // Grace notes apontam para o mesmo ourBeatIndex do beat principal
  indexMap: number[]
}

// ─── Converter array de beats em notas AlphaTex ───

function beatsToAlphaTexNotes(
  beats: Beat[],
  octaveOffset = -1,
  options: { includeBarlines?: boolean } = {},
): AlphaTexNotesResult {
  const parts: string[] = []
  const indexMap: number[] = []  // alphaTabBeatIdx → ourBeatIdx
  let lastDuration = ''
  let activeTupletGroupId: string | null = null
  const includeBarlines = options.includeBarlines ?? true

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const noteParts: string[] = []

    // Duração — só emitir se mudou
    const dur = DURATION_MAP[beat.duration] || '4'
    if (dur !== lastDuration) {
      noteParts.push(`:${dur}`)
      lastDuration = dur
    }

    // Grace notes (antes do beat principal)
    // AlphaTex: grace notes são aplicadas ao beat seguinte
    // Sintaxe: {gr} = before beat, {gr ob} = on beat
    // Precisamos emitir grace notes como beats separados ANTES deste beat
    // IMPORTANTE: cada grace note conta como um beat AlphaTab separado!
    if (beat.graceNotes && beat.graceNotes.pitches.length > 0) {
      const graceDur = DURATION_MAP[beat.graceNotes.duration || '8'] || '8'
      const graceEffect = beat.graceNotes.type === 'appoggiatura' ? '{gr ob}' : '{gr}'
      for (const gp of beat.graceNotes.pitches) {
        parts.push(`:${graceDur} ${pitchToAlphaTex(gp)}${graceEffect}`)
        // Grace note aponta para o mesmo ourBeatIdx do beat principal
        indexMap.push(i)
      }
      // Resetar duração pois grace note mudou
      noteParts.push(`:${dur}`)
      lastDuration = dur
    }

    // Nota ou pausa
    if (beat.isRest) {
      noteParts.push('r')
    } else if (beat.pitches.length === 1) {
      noteParts.push(pitchToAlphaTex(beat.pitches[0], octaveOffset))
    } else if (beat.pitches.length > 1) {
      // Acorde
      const chord = beat.pitches.map(p => pitchToAlphaTex(p, octaveOffset)).join(' ')
      noteParts.push(`(${chord})`)
    }

    // Efeitos do beat (dentro de { })
    const effects: string[] = []

    // Ponto de aumento
    if (beat.doubleDotted) effects.push('dd')
    else if (beat.dotted) effects.push('d')

    // Tie
    if (beat.tie) effects.push('-')

    // Articulações — sintaxe AlphaTab validada
    if (beat.articulations) {
      for (const art of beat.articulations) {
        if (art === 'a.') effects.push('st')         // staccato
        if (art === 'a>') effects.push('ac')         // acento (accent)
        if (art === 'a-') effects.push('ten')        // tenuto
        if (art === 'a^') effects.push('hac')        // marcato (heavy accent)
        if (art === 'a@a') effects.push('fermata medium 4')  // fermata (requer tipo + duração)
      }
    }

    // Tuplet — só na primeira nota do grupo
    if (beat.tuplet) {
      if (beat.tuplet.groupId !== activeTupletGroupId) {
        activeTupletGroupId = beat.tuplet.groupId
        effects.push(`tu ${beat.tuplet.numNotes}`)
      } else {
        effects.push(`tu ${beat.tuplet.numNotes}`)
      }
    } else {
      activeTupletGroupId = null
    }

    // Dinâmicas
    if (beat.dynamic) {
      effects.push(`dy ${beat.dynamic}`)
    }

    // Hairpins (crescendo / decrescendo)
    if (beat.hairpinStart === 'crescendo') effects.push('cre')
    if (beat.hairpinStart === 'decrescendo') effects.push('dec')

    // Ornamentos — trill, mordente, etc.
    if (beat.ornament === 'tr') effects.push('trill')
    // mordent, turn — verificar sintaxe AlphaTab

    // Cifra (chord name)
    if (beat.cifra) {
      effects.push(`ch "${beat.cifra}"`)
    }

    // Lyrics — NÃO vai dentro de {} (AlphaTab usa \lyrics como metadado de track)
    // Removido: {ly "..."} não é sintaxe válida

    // Montar string do beat
    let beatStr = noteParts.join(' ')
    if (effects.length > 0) {
      beatStr += `{${effects.join(' ')}}`
    }

    parts.push(beatStr)
    // Mapear este beat AlphaTab ao nosso índice
    indexMap.push(i)

    // Barline após o beat (não conta como beat no AlphaTab)
    if (includeBarlines && beat.barAfter) {
      parts.push('|')
    }
  }

  return { tex: parts.join(' '), indexMap }
}

// ─── Função principal de conversão ───

export function beatsToAlphaTex(
  beats: Beat[],
  options: BeatsToAlphaTexOptions,
): string {
  const lines: string[] = []
  const normalizedTimeSignature = normalizeTimeSignature(options.timeSignature)
  const timeSignatureMode = options.timeSignatureMode ??
    (normalizedTimeSignature ? 'metered' : 'free')
  const shouldEmitMeter = timeSignatureMode === 'metered' && Boolean(normalizedTimeSignature)
  const shouldEmitFreeTime = !shouldEmitMeter
  const includeBarlines = timeSignatureMode === 'metered' || beats.some(beat => beat.barAfter)

  // Header global
  if (options.title) lines.push(`\\title "${options.title}"`)
  if (options.bpm) lines.push(`\\tempo ${options.bpm}`)

  if (options.grandStaff) {
    // ── Grande pauta (piano) ──
    // Agrupar staves com brace (chave de sistema)
    lines.push(`\\bracketextendmode GroupStaves`)
    lines.push(`.`)
    lines.push(`\\track "Piano" "pno."`)

    // Separar beats por pauta
    const trebleBeats = beats.filter(b => (b.staff || 'treble') === 'treble')
    const bassBeats = beats.filter(b => b.staff === 'bass')

    // Coletar todos os timeSlots únicos e ordenar
    const allTimeSlots = new Set<number>()
    trebleBeats.forEach((b, i) => allTimeSlots.add(b.timeSlot ?? i))
    bassBeats.forEach((b, i) => allTimeSlots.add(b.timeSlot ?? i))
    const sortedTimeSlots = Array.from(allTimeSlots).sort((a, b) => a - b)

    // Criar mapas de timeSlot → beat para cada pauta
    const trebleBySlot = new Map<number, Beat>()
    trebleBeats.forEach((b, i) => trebleBySlot.set(b.timeSlot ?? i, b))
    const bassBySlot = new Map<number, Beat>()
    bassBeats.forEach((b, i) => bassBySlot.set(b.timeSlot ?? i, b))

    // Gerar beats sincronizados para treble (com pausas onde não há nota)
    const syncedTrebleBeats: Beat[] = []
    const syncedBassBeats: Beat[] = []

    for (const slot of sortedTimeSlots) {
      const trebleBeat = trebleBySlot.get(slot)
      const bassBeat = bassBySlot.get(slot)
      const slotBarAfter = Boolean(trebleBeat?.barAfter || bassBeat?.barAfter)

      // Determinar a duração do slot (usar a maior duração entre as duas pautas)
      let slotDuration = 'q'
      if (trebleBeat) slotDuration = trebleBeat.duration
      if (bassBeat) {
        const bassDur = bassBeat.duration
        // Comparar durações (w > h > q > 8 > 16 > 32 > 64)
        const durOrder: Record<string, number> = { 'w': 7, 'h': 6, 'q': 5, '8': 4, '16': 3, '32': 2, '64': 1 }
        if ((durOrder[bassDur] || 5) > (durOrder[slotDuration] || 5)) {
          slotDuration = bassDur
        }
      }

      // Treble: usar beat existente ou criar pausa
      if (trebleBeat) {
        syncedTrebleBeats.push({
          ...trebleBeat,
          barAfter: slotBarAfter,
        })
      } else {
        syncedTrebleBeats.push({
          pitches: [],
          duration: slotDuration,
          tie: false,
          isRest: true,
          dotted: false,
          cifra: null,
          annotation: null,
          lyric: null,
          barAfter: slotBarAfter,
        })
      }

      // Bass: usar beat existente ou criar pausa
      if (bassBeat) {
        syncedBassBeats.push({
          ...bassBeat,
          barAfter: slotBarAfter,
        })
      } else {
        syncedBassBeats.push({
          pitches: [],
          duration: slotDuration,
          tie: false,
          isRest: true,
          dotted: false,
          cifra: null,
          annotation: null,
          lyric: null,
          barAfter: slotBarAfter,
        })
      }
    }

    // Staff 1: mão direita (treble)
    lines.push(`\\staff{score} \\tuning piano \\instrument acousticgrandpiano`)
    lines.push(`\\clef G2`)
    if (options.keySignature && options.keySignature !== 'C') {
      lines.push(`\\ks ${KEY_SIG_MAP[options.keySignature] || options.keySignature}`)
    }
    if (shouldEmitMeter && normalizedTimeSignature) {
      const [n, d] = normalizedTimeSignature.split('/')
      lines.push(`\\ts ${n} ${d}`)
    } else if (shouldEmitFreeTime) {
      lines.push('\\ft')
    }

    if (syncedTrebleBeats.length > 0) {
      lines.push(beatsToAlphaTexNotes(syncedTrebleBeats, options.octaveOffset ?? 0, { includeBarlines }).tex)
    } else {
      lines.push(':1 r')
    }

    // Staff 2: mão esquerda (bass)
    lines.push(`\\staff{score} \\tuning piano`)
    lines.push(`\\clef F4`)
    if (options.keySignature && options.keySignature !== 'C') {
      lines.push(`\\ks ${KEY_SIG_MAP[options.keySignature] || options.keySignature}`)
    }
    if (shouldEmitMeter && normalizedTimeSignature) {
      const [n, d] = normalizedTimeSignature.split('/')
      lines.push(`\\ts ${n} ${d}`)
    } else if (shouldEmitFreeTime) {
      lines.push('\\ft')
    }

    if (syncedBassBeats.length > 0) {
      lines.push(beatsToAlphaTexNotes(syncedBassBeats, options.octaveOffset ?? 0, { includeBarlines }).tex)
    } else {
      lines.push(':1 r')
    }
  } else {
    // ── Instrumento único ──
    lines.push(`\\track`)
    lines.push(`\\staff{score}`)

    // Tuning para instrumentos não-tabulatura
    if (options.clef !== 'percussion') {
      lines.push(`\\tuning piano`)
    }

    // Instrumento
    if (options.instrument) {
      lines.push(`\\instrument ${options.instrument}`)
    }

    // Clave
    const clef = CLEF_MAP[options.clef] || 'G2'
    if (clef !== 'G2') {
      lines.push(`\\clef ${clef}`)
    }

    // Armadura
    if (options.keySignature && options.keySignature !== 'C') {
      lines.push(`\\ks ${KEY_SIG_MAP[options.keySignature] || options.keySignature}`)
    }

    // Fórmula de compasso
    if (shouldEmitMeter && normalizedTimeSignature) {
      const [n, d] = normalizedTimeSignature.split('/')
      lines.push(`\\ts ${n} ${d}`)
    } else if (shouldEmitFreeTime) {
      lines.push('\\ft')
    }

    // Lyrics — metadado de track (sintaxe: \lyrics "sílaba1 sílaba2 ...")
    // Só incluir se includeLyrics !== false (default: true para compatibilidade)
    if (options.includeLyrics !== false) {
      const hasLyrics = beats.some(b => b.lyric)
      if (hasLyrics) {
        // Sílabas separadas por espaço; beats sem lyric usam espaço em branco
        // Espaços dentro de sílabas são substituídos por + (convenção AlphaTab)
        const syllables = beats.map(b => b.lyric ? b.lyric.replace(/ /g, '+') : '-')
        lines.push(`\\lyrics "${syllables.join(' ')}"`)
      }
    }

    // Separador de metadados
    lines.push('.')

    // Notas
    lines.push(beatsToAlphaTexNotes(beats, options.octaveOffset ?? -1, { includeBarlines }).tex)
  }

  return lines.join('\n')
}

// ─── Resultado com mapa de índice ───

export interface BeatsToAlphaTexResult {
  tex: string
  // Mapa: alphaTabBeatIndex → ourBeatIndex
  // Grace notes geram beats extras que apontam para o mesmo ourBeatIndex
  indexMap: number[]
}

/**
 * Converte beats para AlphaTex e retorna também o mapa de índice.
 * Use esta função quando precisar mapear eventos do AlphaTab de volta
 * para o array de beats original (ex: seleção via beatMouseDown).
 */
export function beatsToAlphaTexWithMap(
  beats: Beat[],
  options: BeatsToAlphaTexOptions,
): BeatsToAlphaTexResult {
  const lines: string[] = []
  let indexMap: number[] = []
  const normalizedTimeSignature = normalizeTimeSignature(options.timeSignature)
  const timeSignatureMode = options.timeSignatureMode ??
    (normalizedTimeSignature ? 'metered' : 'free')
  const shouldEmitMeter = timeSignatureMode === 'metered' && Boolean(normalizedTimeSignature)
  const shouldEmitFreeTime = !shouldEmitMeter
  const includeBarlines = timeSignatureMode === 'metered' || beats.some(beat => beat.barAfter)

  // Header global
  if (options.title) lines.push(`\\title "${options.title}"`)
  if (options.bpm) lines.push(`\\tempo ${options.bpm}`)

  if (options.grandStaff) {
    // Grande pauta não suporta mapa de índice por enquanto
    // (seria necessário mesclar mapas de treble e bass)
    const tex = beatsToAlphaTex(beats, options)
    return { tex, indexMap: beats.map((_, i) => i) }
  }

  // ── Instrumento único ──
  lines.push(`\\track`)
  lines.push(`\\staff{score}`)

  if (options.clef !== 'percussion') {
    lines.push(`\\tuning piano`)
  }

  if (options.instrument) {
    lines.push(`\\instrument ${options.instrument}`)
  }

  const clef = CLEF_MAP[options.clef] || 'G2'
  if (clef !== 'G2') {
    lines.push(`\\clef ${clef}`)
  }

  if (options.keySignature && options.keySignature !== 'C') {
    lines.push(`\\ks ${KEY_SIG_MAP[options.keySignature] || options.keySignature}`)
  }

  if (shouldEmitMeter && normalizedTimeSignature) {
    const [n, d] = normalizedTimeSignature.split('/')
    lines.push(`\\ts ${n} ${d}`)
  } else if (shouldEmitFreeTime) {
    lines.push('\\ft')
  }

  // Lyrics — só incluir se includeLyrics !== false
  if (options.includeLyrics !== false) {
    const hasLyrics = beats.some(b => b.lyric)
    if (hasLyrics) {
      const syllables = beats.map(b => b.lyric ? b.lyric.replace(/ /g, '+') : '-')
      lines.push(`\\lyrics "${syllables.join(' ')}"`)
    }
  }

  lines.push('.')

  // Notas com mapa de índice
  const notesResult = beatsToAlphaTexNotes(beats, options.octaveOffset ?? -1, { includeBarlines })
  lines.push(notesResult.tex)
  indexMap = notesResult.indexMap

  return { tex: lines.join('\n'), indexMap }
}

// ─── Exportar helpers para testes ───

export { pitchToAlphaTex, beatsToAlphaTexNotes, DURATION_MAP, KEY_SIG_MAP, CLEF_MAP }
