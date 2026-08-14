import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import {
  evaluateYouTubeVideo,
  extractYouTubeVideoId,
  type YoutubeVideoObject,
  type YoutubeVideoHit,
} from "../_shared/youtube.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const SONGSTERR_BASE = 'https://www.songsterr.com'
const CDN_BASE_1 = 'https://dqsljvtekg760.cloudfront.net'
const CDN_BASE_2 = 'https://d3d3l6a6rcgkaf.cloudfront.net'

const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11,
}

const MAJOR_DIATONIC = {
  chordTypes: ['', 'm', 'm', '', '', 'm', 'dim'],
  scaleSteps: [0, 2, 4, 5, 7, 9, 11],
}

const MINOR_DIATONIC = {
  chordTypes: ['m', 'dim', '', 'm', 'm', '', ''],
  scaleSteps: [0, 2, 3, 5, 7, 8, 10],
}

const ALL_KEYS = [
  { root: 'C', type: 'major', display: 'C' },
  { root: 'G', type: 'major', display: 'G' },
  { root: 'D', type: 'major', display: 'D' },
  { root: 'A', type: 'major', display: 'A' },
  { root: 'E', type: 'major', display: 'E' },
  { root: 'B', type: 'major', display: 'B' },
  { root: 'F#', type: 'major', display: 'F#' },
  { root: 'F', type: 'major', display: 'F' },
  { root: 'Bb', type: 'major', display: 'Bb' },
  { root: 'Eb', type: 'major', display: 'Eb' },
  { root: 'Ab', type: 'major', display: 'Ab' },
  { root: 'Db', type: 'major', display: 'Db' },
  // Menores
  { root: 'A', type: 'minor', display: 'Am' },
  { root: 'E', type: 'minor', display: 'Em' },
  { root: 'B', type: 'minor', display: 'Bm' },
  { root: 'F#', type: 'minor', display: 'F#m' },
  { root: 'C#', type: 'minor', display: 'C#m' },
  { root: 'D', type: 'minor', display: 'Dm' },
  { root: 'G', type: 'minor', display: 'Gm' },
  { root: 'C', type: 'minor', display: 'Cm' },
  { root: 'F', type: 'minor', display: 'Fm' },
  { root: 'Bb', type: 'minor', display: 'Bbm' },
  { root: 'Eb', type: 'minor', display: 'Ebm' },
]

function parseChord(raw: string) {
  if (!raw) return null
  const clean = raw.split('/')[0].trim()
  const m = clean.match(/^([A-G][#b]?)(.*)$/)
  if (!m) return null
  const root = m[1]
  const quality = m[2] || ''
  const isMinor = (quality.startsWith('m') && !quality.startsWith('maj')) || quality.startsWith('min')
  const isDim = quality.includes('dim') || quality.includes('°')
  return {
    root,
    semitone: NOTE_TO_SEMITONE[root] ?? 0,
    isMinor,
    isDim,
    original: clean,
  }
}

function detectKeyFromChords(chordList: string[]): string {
  if (!chordList || chordList.length === 0) return 'C'
  const parsed = chordList.map(parseChord).filter(Boolean) as Array<NonNullable<ReturnType<typeof parseChord>>>
  if (parsed.length === 0) return 'C'

  let bestKey = parsed[0].isMinor ? `${parsed[0].root}m` : parsed[0].root
  let maxScore = -999

  for (const candidate of ALL_KEYS) {
    const rootSemi = NOTE_TO_SEMITONE[candidate.root]
    const template = candidate.type === 'major' ? MAJOR_DIATONIC : MINOR_DIATONIC
    const scaleNotes = template.scaleSteps.map((step) => (rootSemi + step) % 12)
    const diatonicChords = template.scaleSteps.map((step, idx) => ({
      semitone: (rootSemi + step) % 12,
      type: template.chordTypes[idx],
    }))

    let score = 0

    for (let i = 0; i < parsed.length; i++) {
      const chord = parsed[i]
      const weight = (i === 0 || i === parsed.length - 1) ? 2.0 : 1.0

      if (scaleNotes.includes(chord.semitone)) {
        score += 1 * weight
      } else {
        score -= 2 * weight
      }

      const match = diatonicChords.find((dc) => dc.semitone === chord.semitone)
      if (match) {
        if (chord.isMinor && match.type === 'm') {
          score += 3 * weight
        } else if (!chord.isMinor && match.type === '') {
          score += 3 * weight
        } else {
          score += 1 * weight
        }
      }

      if (i === 0 && candidate.root === chord.root) {
        if ((candidate.type === 'minor' && chord.isMinor) || (candidate.type === 'major' && !chord.isMinor)) {
          score += 4
        }
      }
    }

    if (score > maxScore) {
      maxScore = score
      bestKey = candidate.display
    }
  }

  return bestKey
}

function extractReduxState(html: string): any | null {
  const stateMatch = html.match(/<script\s+id=["']state["'][^>]*>([\s\S]*?)<\/script>/i)
  if (stateMatch?.[1]) {
    try {
      const parsed = JSON.parse(stateMatch[1].trim())
      if (parsed?.meta?.current || parsed?.state || parsed?.current || parsed?.chordpro) {
        return parsed
      }
    } catch {
      // continuar para scripts genéricos
    }
  }

  const scripts = html.match(/<script[^>]*>([^<]{10000,})<\/script>/g)
  if (!scripts) return null

  for (const script of scripts) {
    const content = script.replace(/<\/?script[^>]*>/g, '').trim()
    try {
      const parsed = JSON.parse(content)
      if (parsed?.meta?.current || parsed?.state || parsed?.current || parsed?.chordpro) {
        return parsed
      }
    } catch {
      continue
    }
  }
  return null
}

function convertSongsterrChordpro(items: any[]): { chordPro: string; chordsList: string[]; capo: number; tuning: string } {
  if (!Array.isArray(items)) return { chordPro: '', chordsList: [], capo: 0, tuning: '' }
  const lines: string[] = []
  const chordsFound = new Set<string>()
  let capo = 0
  let tuning = ''

  for (const item of items) {
    if (item.type === 'capo') {
      capo = parseInt(item.text, 10) || 0
    } else if (item.type === 'tuning') {
      tuning = item.text || ''
    } else if (item.type === 'section') {
      lines.push(`\n{comment: ${item.text}}`)
    } else if (item.type === 'line' && Array.isArray(item.line)) {
      let lineStr = ''
      for (const seg of item.line) {
        if (seg.type === 'chord' && seg.chord?.baseNote?.name) {
          const chordName = `${seg.chord.baseNote.name}${seg.chord.chordType?.suffix || ''}`
          lineStr += `[${chordName}]`
          chordsFound.add(chordName)
        } else if (seg.text) {
          lineStr += seg.text
        }
      }
      lines.push(lineStr)
    }
  }

  return {
    chordPro: lines.join('\n').trim(),
    chordsList: Array.from(chordsFound),
    capo,
    tuning,
  }
}

function convertLegacyChords(chordsData: any): { chordPro: string; chordsList: string[] } {
  if (!chordsData) return { chordPro: '', chordsList: [] }

  const lines: string[] = []
  const chordsFound = new Set<string>()

  const sections = chordsData.sections || chordsData.parts || []
  if (Array.isArray(sections) && sections.length > 0) {
    for (const section of sections) {
      if (section.name || section.title) {
        lines.push(`\n{comment: ${section.name || section.title}}`)
      }
      const items = section.lines || section.measures || section.rows || []
      for (const item of items) {
        if (typeof item === 'string') {
          lines.push(item)
          continue
        }
        if (item.chords && item.lyrics) {
          let line = ''
          const pairs = item.chords.map((c: string, idx: number) => ({
            chord: c,
            text: item.lyrics[idx] || '',
          }))
          for (const p of pairs) {
            if (p.chord) {
              line += `[${p.chord}]`
              chordsFound.add(p.chord)
            }
            line += p.text
          }
          lines.push(line)
        } else if (item.text) {
          lines.push(item.text)
        }
      }
    }
  }

  if (lines.length === 0 && typeof chordsData.text === 'string') {
    return {
      chordPro: chordsData.text,
      chordsList: Array.from(chordsData.text.matchAll(/\[([A-G][^\]]*)\]/g)).map((m: any) => m[1]),
    }
  }

  return {
    chordPro: lines.join('\n').trim(),
    chordsList: Array.from(chordsFound),
  }
}

async function fetchRealBpmFromTrack(current: any): Promise<number | null> {
  const partId = current?.tracks?.[0]?.partId ?? 0
  if (!current?.songId || !current?.revisionId || !current?.image) {
    return null
  }

  const urls = [
    `${CDN_BASE_1}/${current.songId}/${current.revisionId}/${current.image}/${partId}.json`,
    `${CDN_BASE_2}/${current.songId}/${current.revisionId}/${current.image}/${partId}.json`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (!res.ok) continue
      const data = await res.json()
      const tempo = data?.automations?.tempo?.[0]?.bpm || data?.tempo
      if (typeof tempo === 'number' && tempo > 0) {
        return Math.round(tempo)
      }
    } catch {
      continue
    }
  }

  return null
}

async function resolveBestYoutubeVideo(
  videos: any[],
  artist: string,
  title: string
): Promise<YoutubeVideoHit | null> {
  const candidateIds: string[] = []
  for (const v of videos || []) {
    const rawId = typeof v === 'string' ? v : (v?.videoId || v?.id)
    const id = extractYouTubeVideoId(String(rawId || ''))
    if (id && !candidateIds.includes(id)) {
      candidateIds.push(id)
    }
    if (candidateIds.length >= 10) break
  }

  if (candidateIds.length === 0) return null

  const apiKey = Deno.env.get('YOUTUBE_API_KEY')
  if (!apiKey) {
    return {
      id: candidateIds[0],
      title: `${artist} - ${title}`,
      channel: artist,
      duration: '',
      duration_iso: '',
      thumbnail_url: `https://i.ytimg.com/vi/${candidateIds[0]}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${candidateIds[0]}`,
    }
  }

  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    searchUrl.searchParams.set('part', 'snippet,contentDetails,status')
    searchUrl.searchParams.set('id', candidateIds.join(','))
    searchUrl.searchParams.set('key', apiKey)

    const res = await fetch(searchUrl)
    if (!res.ok) {
      console.warn('[songsterr-enrich] Falha ao consultar YouTube batch API:', res.status)
      return {
        id: candidateIds[0],
        title: `${artist} - ${title}`,
        channel: artist,
        duration: '',
        duration_iso: '',
        thumbnail_url: `https://i.ytimg.com/vi/${candidateIds[0]}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${candidateIds[0]}`,
      }
    }

    const payload = (await res.json()) as { items?: YoutubeVideoObject[] }
    const items = payload.items || []

    const validHits: YoutubeVideoHit[] = []
    for (const item of items) {
      const evaluation = evaluateYouTubeVideo(item)
      if (evaluation.ok && evaluation.video) {
        validHits.push(evaluation.video)
      }
    }

    if (validHits.length === 0) return null

    const artistLower = artist.toLowerCase()
    const titleLower = title.toLowerCase()
    const bestOfficial = validHits.find((h) => {
      const t = h.title.toLowerCase()
      const c = h.channel.toLowerCase()
      const matchesArtist = t.includes(artistLower) || c.includes(artistLower)
      const matchesTitle = t.includes(titleLower)
      const isOfficial = t.includes('official') || t.includes('clipe') || c.includes('vevo') || c.includes(artistLower)
      return matchesArtist && matchesTitle && isOfficial
    })

    return bestOfficial || validHits[0]
  } catch (err) {
    console.warn('[songsterr-enrich] Erro na avaliação de vídeos YouTube:', err)
    return {
      id: candidateIds[0],
      title: `${artist} - ${title}`,
      channel: artist,
      duration: '',
      duration_iso: '',
      thumbnail_url: `https://i.ytimg.com/vi/${candidateIds[0]}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${candidateIds[0]}`,
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { songId, artist, title } = await req.json()

    if (!songId && (!artist || !title)) {
      return new Response(
        JSON.stringify({ error: 'Informe songId ou artist + title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let url: string

    if (songId) {
      url = `${SONGSTERR_BASE}/a/wsa/chords-s${songId}`
    } else {
      const searchRes = await fetch(
        `${SONGSTERR_BASE}/api/songs?pattern=${encodeURIComponent(`${artist} ${title}`)}`,
        {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
          },
        }
      )

      if (!searchRes.ok) {
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar musica no Songsterr' }),
          { status: searchRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const results = await searchRes.json()
      if (!results || results.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Musica nao encontrada no Songsterr' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const best = results[0]
      url = `${SONGSTERR_BASE}/a/wsa/chords-s${best.songId}`
    }

    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7',
      },
    })

    if (!pageRes.ok) {
      return new Response(
        JSON.stringify({ error: `Songsterr retornou status ${pageRes.status}` }),
        { status: pageRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const html = await pageRes.text()
    const state = extractReduxState(html)

    if (!state) {
      return new Response(
        JSON.stringify({
          error: 'Nao foi possivel extrair os dados da pagina do Songsterr',
          cifra_content: null,
          chords: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const current = state?.meta?.current || state?.current || {}
    let chordProResult = { chordPro: '', chordsList: [] as string[], capo: 0, tuning: '' }

    if (state.chordpro?.current) {
      chordProResult = convertSongsterrChordpro(state.chordpro.current)
    } else {
      const chordsData = current?.chords || state?.chords || null
      const legacy = convertLegacyChords(chordsData)
      chordProResult = {
        ...legacy,
        capo: state?.chordsCapo?.fret || current?.capo || 0,
        tuning: current?.tuning || '',
      }
    }

    const detectedKey = current.key || detectKeyFromChords(chordProResult.chordsList)
    const realBpm = await fetchRealBpmFromTrack(current)
    const finalBpm = realBpm || current.tempo || (state?.tempo?.tempo?.bpm !== 72 ? state?.tempo?.tempo?.bpm : null) || null

    const ytVideo = await resolveBestYoutubeVideo(
      current.videos || [],
      current.artist || artist || '',
      current.title || title || ''
    )

    const meta = {
      songId: current.songId || songId,
      title: current.title || title,
      artist: current.artist || artist,
      tuning: chordProResult.tuning || current.tuning,
      difficulty: current.difficulty,
      bpm: finalBpm,
      key: detectedKey,
      capo: chordProResult.capo || state?.chordsCapo?.fret || current.capo || 0,
      tracksCount: current.tracks?.length || 0,
      hasChords: !!chordProResult.chordPro,
      videos: current.videos || [],
      youtube: ytVideo,
    }

    return new Response(
      JSON.stringify({
        cifra_content: chordProResult.chordPro || null,
        chords: chordProResult.chordsList,
        key: meta.key,
        bpm: meta.bpm,
        capo: meta.capo,
        tuning: meta.tuning,
        source_url: pageRes.url || url,
        songsterr_id: meta.songId,
        youtube_url: ytVideo?.url || null,
        youtube_video_id: ytVideo?.id || null,
        youtube_title: ytVideo?.title || null,
        youtube_channel: ytVideo?.channel || null,
        youtube_duration: ytVideo?.duration || null,
        youtube_thumbnail_url: ytVideo?.thumbnail_url || null,
        metadata: meta,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
