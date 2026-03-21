// ─── beatsToAlphaTex.ts ──────────────────────────────────────────────
// Converte Beat[] (modelo do NotationEditor) → string AlphaTex
// para renderização via AlphaTab.
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
  // Campo opcional para grande pauta (piano)
  staff?: 'treble' | 'bass'
}

// ─── Opções de conversão ───

export interface BeatsToAlphaTexOptions {
  clef: string                    // 'treble' | 'bass' | 'alto' | 'percussion'
  keySignature: string            // 'C' | 'G' | 'D' | 'F' | 'Bb' | etc.
  timeSignature: string | null    // '4/4' | '3/4' | null (livre)
  grandStaff?: boolean            // true = piano (treble + bass)
  instrument?: string             // nome General MIDI
  bpm?: number
  title?: string
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

function pitchToAlphaTex(pd: PitchData): string {
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

  return `${noteLetter}${acc}${octave}`
}

// ─── Converter array de beats em notas AlphaTex ───

function beatsToAlphaTexNotes(beats: Beat[]): string {
  const parts: string[] = []
  let lastDuration = ''
  let activeTupletGroupId: string | null = null

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
    if (beat.graceNotes && beat.graceNotes.pitches.length > 0) {
      const graceDur = DURATION_MAP[beat.graceNotes.duration || '8'] || '8'
      const graceEffect = beat.graceNotes.type === 'appoggiatura' ? '{gr ob}' : '{gr}'
      for (const gp of beat.graceNotes.pitches) {
        parts.push(`:${graceDur} ${pitchToAlphaTex(gp)}${graceEffect}`)
      }
      // Resetar duração pois grace note mudou
      noteParts.push(`:${dur}`)
      lastDuration = dur
    }

    // Nota ou pausa
    if (beat.isRest) {
      noteParts.push('r')
    } else if (beat.pitches.length === 1) {
      noteParts.push(pitchToAlphaTex(beat.pitches[0]))
    } else if (beat.pitches.length > 1) {
      // Acorde
      const chord = beat.pitches.map(p => pitchToAlphaTex(p)).join(' ')
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

    // Lyrics
    if (beat.lyric) {
      effects.push(`ly "${beat.lyric}"`)
    }

    // Montar string do beat
    let beatStr = noteParts.join(' ')
    if (effects.length > 0) {
      beatStr += `{${effects.join(' ')}}`
    }

    parts.push(beatStr)

    // Barline após o beat
    if (beat.barAfter) {
      parts.push('|')
    }
  }

  return parts.join(' ')
}

// ─── Função principal de conversão ───

export function beatsToAlphaTex(
  beats: Beat[],
  options: BeatsToAlphaTexOptions,
): string {
  const lines: string[] = []

  // Header global
  if (options.title) lines.push(`\\title "${options.title}"`)
  if (options.bpm) lines.push(`\\tempo ${options.bpm}`)

  if (options.grandStaff) {
    // ── Grande pauta (piano) ──
    lines.push(`\\track "Piano" "pno."`)

    // Staff 1: mão direita (treble)
    lines.push(`\\staff{score} \\tuning piano \\instrument acousticgrandpiano`)
    lines.push(`\\clef G2`)
    if (options.keySignature && options.keySignature !== 'C') {
      lines.push(`\\ks ${KEY_SIG_MAP[options.keySignature] || options.keySignature}`)
    }
    if (options.timeSignature) {
      const [n, d] = options.timeSignature.split('/')
      lines.push(`\\ts ${n} ${d}`)
    }

    const trebleBeats = beats.filter(b => (b.staff || 'treble') === 'treble')
    lines.push(beatsToAlphaTexNotes(trebleBeats))

    // Staff 2: mão esquerda (bass)
    lines.push(`\\staff{score} \\tuning piano`)
    lines.push(`\\clef F4`)
    if (options.keySignature && options.keySignature !== 'C') {
      lines.push(`\\ks ${KEY_SIG_MAP[options.keySignature] || options.keySignature}`)
    }
    if (options.timeSignature) {
      const [n, d] = options.timeSignature.split('/')
      lines.push(`\\ts ${n} ${d}`)
    }

    const bassBeats = beats.filter(b => b.staff === 'bass')
    if (bassBeats.length > 0) {
      lines.push(beatsToAlphaTexNotes(bassBeats))
    } else {
      // Staff vazia — pelo menos uma pausa
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
    if (options.timeSignature) {
      const [n, d] = options.timeSignature.split('/')
      lines.push(`\\ts ${n} ${d}`)
    }

    // Separador de metadados
    lines.push('.')

    // Notas
    lines.push(beatsToAlphaTexNotes(beats))
  }

  return lines.join('\n')
}

// ─── Exportar helpers para testes ───

export { pitchToAlphaTex, beatsToAlphaTexNotes, DURATION_MAP, KEY_SIG_MAP, CLEF_MAP }
