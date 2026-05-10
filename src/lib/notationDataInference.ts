export type InferredNotationMode = 'free' | 'free-with-separators' | 'metered'

export interface InferredNotationData {
  time_signature_mode: InferredNotationMode
  timeSignature: string | null
  legacy_alphaTex: string
}

export interface LegacyAlphaTexNotationData extends InferredNotationData {
  clef: 'treble' | 'bass'
  keySignature: string
  beats: Array<{
    pitches: Array<{ pitch: string; accidental: string | null }>
    duration: string
    tie: boolean
    isRest: boolean
    dotted: boolean
    doubleDotted?: boolean
    barAfter?: boolean
    pedagogical_separator?: boolean
    cifra: string | null
    annotation: string | null
    lyric: string | null
  }>
}

const DURATION_FROM_ALPHATEX: Record<string, string> = {
  '1': 'w',
  '2': 'h',
  '4': 'q',
  '8': '8',
  '16': '16',
  '32': '32',
  '64': '64',
}

const KEY_SIGNATURE_FROM_ALPHATEX: Record<string, string> = {
  Cmajor: 'C',
  Gmajor: 'G',
  Dmajor: 'D',
  Amajor: 'A',
  Emajor: 'E',
  Bmajor: 'B',
  'F#major': 'F#',
  'C#major': 'C#',
  Fmajor: 'F',
  Bbmajor: 'Bb',
  Ebmajor: 'Eb',
  Abmajor: 'Ab',
  Dbmajor: 'Db',
  Gbmajor: 'Gb',
  Cbmajor: 'Cb',
}

export function inferNotationDataFromAlphaTex(alphaTex: string): InferredNotationData {
  const normalized = alphaTex.trim()
  const timeSignatureMatch = normalized.match(/\\(?:ts|time)\s+(\d+)\s*(?:[\/xX]\s*)?(\d+)/)
  const timeSignature = timeSignatureMatch
    ? `${timeSignatureMatch[1]}/${timeSignatureMatch[2]}`
    : null

  return {
    time_signature_mode: timeSignature ? 'metered' : 'free',
    timeSignature,
    legacy_alphaTex: normalized,
  }
}

function parseBody(alphaTex: string) {
  const dotMatch = alphaTex.match(/\s\.\s/)
  if (!dotMatch || dotMatch.index === undefined) return alphaTex
  return alphaTex.slice(dotMatch.index + dotMatch[0].length)
}

function parsePitchToken(token: string) {
  const match = token.match(/^([a-gA-G])([#bn]?)(\d+)$/)
  if (!match) return null
  const [, note, accidental, rawOctave] = match
  const octave = Number.parseInt(rawOctave, 10)
  return {
    pitch: `${note.toUpperCase()}/${Number.isFinite(octave) ? octave + 1 : 4}`,
    accidental: accidental || null,
  }
}

function tokenizeBody(body: string) {
  const tokens: string[] = []
  const tokenPattern = /\([^)]+\)\{[^}]*\}|\([^)]+\)|[^\s]+/g
  let match: RegExpExecArray | null
  while ((match = tokenPattern.exec(body)) !== null) {
    tokens.push(match[0])
  }
  return tokens
}

function countRenderableTokens(group: string) {
  return tokenizeBody(group).filter((token) => token !== '|' && !/^:(\d+)(dd|d)?$/.test(token)).length
}

function shouldTreatLegacyBarlinesAsPedagogical(alphaTex: string) {
  const groups = parseBody(alphaTex).split('|')
  if (groups.length <= 1) return false
  return groups.some((group) => countRenderableTokens(group) > 1)
}

export function alphaTexToNotationData(alphaTex: string): LegacyAlphaTexNotationData {
  const inferred = inferNotationDataFromAlphaTex(alphaTex)
  const clef = /\\clef\s+F4/.test(alphaTex) ? 'bass' : 'treble'
  const keySignatureMatch = alphaTex.match(/\\ks\s+([A-G][b#]?major)/)
  const keySignature = keySignatureMatch
    ? KEY_SIGNATURE_FROM_ALPHATEX[keySignatureMatch[1]] ?? 'C'
    : 'C'
  const hasLegacyBarlines = shouldTreatLegacyBarlinesAsPedagogical(alphaTex)
  const timeSignatureMode = inferred.time_signature_mode === 'metered'
    ? 'metered'
    : hasLegacyBarlines
      ? 'free-with-separators'
      : 'free'

  let currentDuration = 'q'
  let currentDotted = false
  let currentDoubleDotted = false
  const beats: LegacyAlphaTexNotationData['beats'] = []
  for (const token of tokenizeBody(parseBody(alphaTex))) {
    if (token === '|') {
      const previous = beats[beats.length - 1]
      if (previous) {
        previous.barAfter = timeSignatureMode === 'metered'
        previous.pedagogical_separator = timeSignatureMode === 'free-with-separators'
      }
      continue
    }

    const durationMatch = token.match(/^:(\d+)(dd|d)?$/)
    if (durationMatch) {
      currentDuration = DURATION_FROM_ALPHATEX[durationMatch[1]] ?? 'q'
      currentDotted = durationMatch[2] === 'd'
      currentDoubleDotted = durationMatch[2] === 'dd'
      continue
    }

    const effectsMatch = token.match(/^(.*?)(\{[^}]*\})$/)
    const cleanToken = effectsMatch ? effectsMatch[1] : token
    const effects = effectsMatch?.[2] ?? ''
    const tie = effects.includes('-')
    const dotted = currentDotted || effects.includes('{d}') || /\bdd\b|\bd\b/.test(effects)
    const doubleDotted = currentDoubleDotted || effects.includes('dd')

    if (cleanToken.startsWith(':')) {
      const [durationPart, notePart] = cleanToken.split(/\s+/, 2)
      const duration = durationPart.match(/^:(\d+)(dd|d)?$/)
      if (duration) currentDuration = DURATION_FROM_ALPHATEX[duration[1]] ?? currentDuration
      if (!notePart) continue
    }

    const chordMatch = cleanToken.match(/^\(([^)]+)\)$/)
    const pitches = chordMatch
      ? chordMatch[1].split(/\s+/).map(parsePitchToken).filter((p): p is { pitch: string; accidental: string | null } => Boolean(p))
      : cleanToken === 'r'
        ? []
        : [parsePitchToken(cleanToken)].filter((p): p is { pitch: string; accidental: string | null } => Boolean(p))

    if (cleanToken !== 'r' && pitches.length === 0) continue

    beats.push({
      pitches,
      duration: currentDuration,
      tie,
      isRest: cleanToken === 'r',
      dotted,
      doubleDotted,
      cifra: null,
      annotation: null,
      lyric: null,
    })
  }

  return {
    ...inferred,
    time_signature_mode: timeSignatureMode,
    clef,
    keySignature,
    beats,
  }
}
