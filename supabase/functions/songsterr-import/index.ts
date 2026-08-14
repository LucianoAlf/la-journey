import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SongsterrTrack {
  partId: number
  name: string
  tuning?: number[]
  instrumentId: number
  difficulty?: number
  views: number
}

interface SongsterrSongDetail {
  songId: number
  artistId: number
  title: string
  artist: string
  tracks: SongsterrTrack[]
  hasChords: boolean
  defaultTrack: number
  sourceUrl: string
  instruments: string[]
}

const INSTRUMENT_MAP: Record<number, string> = {
  // Guitars
  0: 'Guitarra',
  24: 'Violao Nylon',
  25: 'Violao Aco',
  26: 'Guitarra Jazz',
  27: 'Guitarra Clean',
  28: 'Guitarra Muted',
  29: 'Guitarra Overdrive',
  30: 'Guitarra Distortion',
  31: 'Guitarra Harmonics',
  // Bass
  32: 'Baixo Acustico',
  33: 'Baixo Finger',
  34: 'Baixo Pick',
  35: 'Baixo Fretless',
  36: 'Baixo Slap 1',
  37: 'Baixo Slap 2',
  38: 'Baixo Sintetizador 1',
  39: 'Baixo Sintetizador 2',
  // Drums
  100: 'Bateria',
  118: 'Bateria',
  // Keyboard/Piano
  1: 'Piano Acustico',
  2: 'Piano Eletrico',
  16: 'Orgao',
  19: 'Orgao Igreja',
  // Vocals
  52: 'Voz',
  53: 'Voz Oohs',
  54: 'Voz Sintetica',
}

function getInstrumentName(instrumentId: number, trackName: string): string {
  if (INSTRUMENT_MAP[instrumentId]) {
    return INSTRUMENT_MAP[instrumentId]
  }
  const nameLower = trackName.toLowerCase()
  if (nameLower.includes('drum') || nameLower.includes('bateria')) return 'Bateria'
  if (nameLower.includes('bass') || nameLower.includes('baixo')) return 'Baixo'
  if (nameLower.includes('vocal') || nameLower.includes('voice') || nameLower.includes('voz')) return 'Voz'
  if (nameLower.includes('piano') || nameLower.includes('key') || nameLower.includes('teclado')) return 'Teclado'
  if (nameLower.includes('guitar') || nameLower.includes('violao') || nameLower.includes('gtr')) return 'Guitarra'
  return trackName || 'Outro'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { songId } = await req.json()

    if (!songId || typeof songId !== 'number') {
      return new Response(
        JSON.stringify({ error: 'songId (number) e obrigatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = `https://www.songsterr.com/api/song/${songId}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Songsterr API retornou status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const raw: any = await response.json()

    const tracks: SongsterrTrack[] = (raw.tracks || []).map((t: any) => ({
      partId: t.partId,
      name: t.name || 'Track',
      tuning: t.tuning,
      instrumentId: t.instrumentId,
      difficulty: t.difficulty,
      views: t.views || 0,
    }))

    const instruments = [...new Set(tracks.map((t) => getInstrumentName(t.instrumentId, t.name)))]

    const detail: SongsterrSongDetail = {
      songId: raw.songId ?? songId,
      artistId: raw.artistId ?? 0,
      title: raw.title || 'Sem titulo',
      artist: raw.artist || 'Desconhecido',
      tracks,
      hasChords: raw.hasChords ?? false,
      defaultTrack: raw.defaultTrack ?? 0,
      sourceUrl: `https://www.songsterr.com/a/wsa/tab-s${songId}`,
      instruments,
    }

    return new Response(
      JSON.stringify(detail),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
