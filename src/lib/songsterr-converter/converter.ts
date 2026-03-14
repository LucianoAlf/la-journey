import * as alphaTab from '@coderline/alphatab'
import { mapSongsterrDuration } from './duration-mapper'
import { mapSongsterrInstrumentToPlayback } from './instrument-map'

// ===== TYPES =====

export interface SongsterrTrackMeta {
  partId: number
  name: string
  title?: string
  instrument: string
  instrumentId: number
  isDrums?: boolean
  tuning?: number[]
}

export interface SongsterrBundle {
  version: number
  source: string
  songId: number
  revisionId: number
  title: string
  artist: string
  tracks: Array<{
    partId: number
    name: string
    instrument: string
    data: any
  }>
  fetchedAt: string
}

interface RevisionEntry {
  trackMeta: SongsterrTrackMeta
  revision: any
}

// ===== TUPLET RATIO =====

function getTupletRatio(tuplet: number): [number, number] {
  switch (tuplet) {
    case 3: return [3, 2]
    case 5: return [5, 4]
    case 6: return [6, 4]
    case 7: return [7, 4]
    case 9: return [9, 8]
    case 10: return [10, 8]
    case 12: return [12, 8]
    default:
      if (tuplet > 1) {
        const d = Math.pow(2, Math.floor(Math.log2(tuplet)))
        return [tuplet, d]
      }
      return [1, 1]
  }
}

// ===== PERCUSSION INDEX MAP =====

let percussionIndexMap: Map<number, number> | null = null

function buildPercussionIndexMap(): Map<number, number> {
  const score = new alphaTab.model.Score()
  const mb = new alphaTab.model.MasterBar()
  score.addMasterBar(mb)
  const track = new alphaTab.model.Track()
  track.playbackInfo.primaryChannel = 9
  track.playbackInfo.secondaryChannel = 9
  const staff = new alphaTab.model.Staff()
  staff.isPercussion = true
  track.addStaff(staff)
  const bar = new alphaTab.model.Bar()
  const voice = new alphaTab.model.Voice()
  const beat = new alphaTab.model.Beat()
  beat.isEmpty = true
  voice.addBeat(beat)
  bar.addVoice(voice)
  staff.addBar(bar)
  score.addTrack(track)
  const settings = new alphaTab.Settings()
  score.finish(settings)
  const exporter = new alphaTab.exporter.Gp7Exporter()
  const data = exporter.export(score, settings)
  const reimported = alphaTab.importer.ScoreLoader.loadScoreFromBytes(data, settings)
  const map = new Map<number, number>()
  const articulations = reimported.tracks[0].percussionArticulations
  for (let i = 0; i < articulations.length; i++) {
    const id = articulations[i].id
    if (!map.has(id)) map.set(id, i)
  }
  return map
}

function getPercussionIndex(midiNote: number): number {
  if (!percussionIndexMap) percussionIndexMap = buildPercussionIndexMap()
  return percussionIndexMap.get(midiNote) ?? midiNote
}

// ===== LOOKUP MAPS =====

const velocityMap: Record<string, alphaTab.model.DynamicValue> = {
  ppp: alphaTab.model.DynamicValue.PPP,
  pp: alphaTab.model.DynamicValue.PP,
  p: alphaTab.model.DynamicValue.P,
  mp: alphaTab.model.DynamicValue.MP,
  mf: alphaTab.model.DynamicValue.MF,
  f: alphaTab.model.DynamicValue.F,
  ff: alphaTab.model.DynamicValue.FF,
  fff: alphaTab.model.DynamicValue.FFF,
}

const harmonicMap: Record<string, alphaTab.model.HarmonicType> = {
  natural: alphaTab.model.HarmonicType.Natural,
  artificial: alphaTab.model.HarmonicType.Artificial,
  pinch: alphaTab.model.HarmonicType.Pinch,
  tap: alphaTab.model.HarmonicType.Tap,
  semi: alphaTab.model.HarmonicType.Semi,
  feedback: alphaTab.model.HarmonicType.Feedback,
}

// ===== NOTE MAPPER =====

function mapNote(
  nd: any,
  bd: any,
  isPerc: boolean,
  numStrings: number
): alphaTab.model.Note {
  const note = new alphaTab.model.Note()
  // Songsterr: string 0 = highest pitch, alphaTab: string 1 = lowest pitch
  note.string = isPerc ? -1 : numStrings - (nd.string ?? 0)
  note.fret = nd.fret ?? 0

  if (isPerc) note.percussionArticulation = getPercussionIndex(nd.fret ?? 0)
  if (nd.tie) note.isTieDestination = true
  if (nd.dead) note.isDead = true
  if (nd.ghost) note.isGhost = true
  if (nd.hp) note.isHammerPullOrigin = true
  if (nd.staccato) note.isStaccato = true
  if (nd.accentuated) note.accentuated = alphaTab.model.AccentuationType.Normal
  if (bd.palmMute) note.isPalmMute = true

  // Vibrato
  if (nd.wideVibrato) note.vibrato = alphaTab.model.VibratoType.Wide
  else if (nd.vibrato) note.vibrato = alphaTab.model.VibratoType.Slight

  // Slide
  if (typeof nd.slide === 'string') {
    const s = nd.slide.toLowerCase()
    if (s === 'shift') note.slideOutType = alphaTab.model.SlideOutType.Shift
    else if (s === 'legato') note.slideOutType = alphaTab.model.SlideOutType.Legato
    else if (s === 'into_from_below' || s === 'below') note.slideInType = alphaTab.model.SlideInType.IntoFromBelow
    else if (s === 'into_from_above') note.slideInType = alphaTab.model.SlideInType.IntoFromAbove
    else if (s === 'out_up') note.slideOutType = alphaTab.model.SlideOutType.OutUp
    else if (s === 'out_down' || s === 'downwards') note.slideOutType = alphaTab.model.SlideOutType.OutDown
  }

  // Harmonics
  if (typeof nd.harmonic === 'string') {
    const ht = harmonicMap[nd.harmonic.toLowerCase()]
    if (typeof ht === 'number') {
      note.harmonicType = ht
      if (typeof nd.harmonicFret === 'number') note.harmonicValue = nd.harmonicFret
    }
  }

  // Bend
  if (nd.bend?.points?.length > 0) {
    note.bendType = alphaTab.model.BendType.Custom
    for (const pt of nd.bend.points) {
      note.addBendPoint(
        new alphaTab.model.BendPoint(Math.round(pt.position), Math.round(pt.tone * 2))
      )
    }
  }

  return note
}

// ===== BEAT MAPPER =====

function mapBeat(
  bd: any,
  isPerc: boolean,
  numStrings: number
): alphaTab.model.Beat {
  const beat = new alphaTab.model.Beat()
  if (bd.rest) beat.isEmpty = true

  const md = mapSongsterrDuration(bd.duration)
  beat.duration = md.duration
  beat.dots = bd.dots ?? md.dots
  if (typeof bd.text === 'string' && bd.text.length > 0) {
    beat.text = bd.text
  }

  // Tuplet
  if (typeof bd.tuplet === 'number' && bd.tuplet > 1) {
    const [n, d] = getTupletRatio(bd.tuplet)
    beat.tupletNumerator = n
    beat.tupletDenominator = d
    if (typeof bd.type === 'number' && bd.type > 0) {
      const base = mapSongsterrDuration([1, bd.type])
      beat.duration = base.duration
      beat.dots = bd.dots ?? 0
    }
  }

  // Dynamics
  if (typeof bd.velocity === 'string') {
    const dyn = velocityMap[bd.velocity.toLowerCase()]
    if (typeof dyn === 'number') beat.dynamics = dyn
  }

  // Pick stroke
  if (typeof bd.pickStroke === 'string') {
    const ps = bd.pickStroke.toLowerCase()
    if (ps === 'down') beat.pickStroke = alphaTab.model.PickStroke.Down
    else if (ps === 'up') beat.pickStroke = alphaTab.model.PickStroke.Up
  }

  // Vibrato
  if (bd.wideVibrato || bd.vibratoWithTremoloBar) beat.vibrato = alphaTab.model.VibratoType.Wide
  else if (bd.vibrato) beat.vibrato = alphaTab.model.VibratoType.Slight

  // Notes
  for (const nd of (bd.notes || [])) {
    if (nd.rest) continue
    beat.addNote(mapNote(nd, bd, isPerc, numStrings))
  }

  return beat
}

// ===== REST VOICE FILLER =====

function fillRestVoice(voice: alphaTab.model.Voice, masterBar: alphaTab.model.MasterBar) {
  const den = masterBar.timeSignatureDenominator || 4
  const num = masterBar.timeSignatureNumerator || 4
  const md = mapSongsterrDuration([1, den])
  for (let i = 0; i < num; i++) {
    const b = new alphaTab.model.Beat()
    b.isEmpty = true
    b.duration = md.duration
    b.dots = md.dots
    voice.addBeat(b)
  }
}

// ===== MAIN CONVERTER =====

/**
 * Converte um bundle JSON do Songsterr (salvo pela Edge Function)
 * em um alphaTab.model.Score pronto para renderização.
 */
export function convertSongsterrToScore(bundle: SongsterrBundle): alphaTab.model.Score {
  // Adaptar tracks do bundle para o formato RevisionEntry
  const revisions: RevisionEntry[] = bundle.tracks.map((t) => ({
    trackMeta: {
      partId: t.partId,
      name: t.name,
      instrument: t.instrument,
      instrumentId: t.data?.instrumentId ?? 24,
      isDrums: t.data?.instrumentId === 1024,
      tuning: t.data?.tuning,
    },
    revision: t.data,
  }))

  const score = new alphaTab.model.Score()
  score.title = bundle.title
  score.artist = bundle.artist

  // Encontrar master track (mais compassos)
  const masterRev = revisions.reduce((longest, cur) =>
    (cur.revision?.measures?.length || 0) > (longest.revision?.measures?.length || 0) ? cur : longest
  ).revision

  const masterBarCount = Math.max(
    1,
    revisions.reduce((max, e) => Math.max(max, e.revision?.measures?.length || 0), 0)
  )

  // Construir master bars (fórmula de compasso, markers, repeats)
  let tsNum = 4, tsDen = 4
  for (let i = 0; i < masterBarCount; i++) {
    const measure = masterRev?.measures?.[i]
    const sig = measure?.signature
    if (Array.isArray(sig) && sig.length === 2 && sig[0] && sig[1]) {
      tsNum = sig[0]
      tsDen = sig[1]
    }
    const mb = new alphaTab.model.MasterBar()
    mb.timeSignatureNumerator = tsNum
    mb.timeSignatureDenominator = tsDen

    if (measure?.marker) {
      const s = new alphaTab.model.Section()
      const txt = typeof measure.marker === 'string'
        ? measure.marker
        : measure.marker?.text || ''
      s.marker = txt
      s.text = txt
      mb.section = s
    }
    if (measure?.repeatStart) mb.isRepeatStart = true
    if (typeof measure?.repeatCount === 'number' && measure.repeatCount > 0) {
      mb.repeatCount = measure.repeatCount
    }
    if (typeof measure?.alternateEnding === 'number' && measure.alternateEnding > 0) {
      mb.alternateEndings = measure.alternateEnding
    }
    score.addMasterBar(mb)
  }

  // Aplicar automações de tempo
  const tempoPoints = Array.isArray(masterRev?.automations?.tempo)
    ? masterRev.automations.tempo
    : []
  for (const pt of tempoPoints) {
    const mb = score.masterBars[pt.measure]
    if (!mb) continue
    const ratio = pt.position > 0
      ? Math.max(0, Math.min(1, pt.position / (pt.type || 4)))
      : 0
    const auto = alphaTab.model.Automation.buildTempoAutomation(false, ratio, pt.bpm, 2, true)
    mb.tempoAutomations.push(auto)
  }

  // Construir tracks
  let nextCh = 0
  for (const entry of revisions) {
    const { trackMeta, revision } = entry
    const instId = trackMeta.instrumentId ?? revision.instrumentId
    const mapping = mapSongsterrInstrumentToPlayback(instId)
    const isPerc = mapping.isPercussion || !!trackMeta.isDrums
    let ch: number
    if (isPerc) {
      ch = 9
    } else {
      if (nextCh === 9) nextCh++
      ch = nextCh
      nextCh++
    }

    const track = new alphaTab.model.Track()
    track.name = trackMeta.title || trackMeta.name || revision.name || 'Track'
    track.shortName = track.name.slice(0, 20)
    track.playbackInfo.program = mapping.program
    track.playbackInfo.primaryChannel = ch
    track.playbackInfo.secondaryChannel = ch

    const staff = new alphaTab.model.Staff()
    const tuning = revision.tuning || trackMeta.tuning
    if (Array.isArray(tuning) && tuning.length > 0) {
      staff.stringTuning = new alphaTab.model.Tuning('Custom', tuning, false)
    }
    staff.isPercussion = isPerc
    const numStrings = Array.isArray(tuning) ? tuning.length : 6

    // Pre-scan: max voice count
    let maxVoices = 1
    for (let i = 0; i < masterBarCount; i++) {
      maxVoices = Math.max(maxVoices, revision.measures?.[i]?.voices?.length || 0)
    }

    for (let mi = 0; mi < masterBarCount; mi++) {
      const bar = new alphaTab.model.Bar()
      const measure = revision.measures?.[mi]
      const voiceCount = measure?.voices?.length || 0

      if (voiceCount === 0) {
        const v = new alphaTab.model.Voice()
        fillRestVoice(v, score.masterBars[mi])
        bar.addVoice(v)
      } else {
        for (let vi = 0; vi < voiceCount; vi++) {
          const v = new alphaTab.model.Voice()
          const src = measure.voices[vi]
          const beats = src?.beats || []
          if (beats.length === 0 || src?.rest) {
            fillRestVoice(v, score.masterBars[mi])
          } else {
            for (const bd of beats) {
              v.addBeat(mapBeat(bd, isPerc, numStrings))
            }
            if (v.beats.length === 0) fillRestVoice(v, score.masterBars[mi])
          }
          bar.addVoice(v)
        }
      }

      // Padronizar quantidade de voices
      for (let vi = bar.voices.length; vi < maxVoices; vi++) {
        const rv = new alphaTab.model.Voice()
        fillRestVoice(rv, score.masterBars[mi])
        bar.addVoice(rv)
      }

      staff.addBar(bar)
    }

    track.addStaff(staff)
    score.addTrack(track)
  }

  // Finalizar score (obrigatório antes de renderizar)
  const settings = new alphaTab.Settings()
  score.finish(settings)

  return score
}
