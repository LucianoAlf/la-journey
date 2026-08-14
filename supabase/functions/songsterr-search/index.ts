import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SongsterrSearchResult {
  songId: number
  artistId: number
  title: string
  artist: string
  tracks: Array<{
    partId: number
    name: string
    tuning?: number[]
    instrumentId: number
    views: number
    difficulty?: number
  }>
  hasChords: boolean
  defaultTrack: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query e obrigatoria' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = `https://www.songsterr.com/api/songs?pattern=${encodeURIComponent(query.trim())}`

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

    const rawResults: any[] = await response.json()

    const results: SongsterrSearchResult[] = rawResults.map((item) => ({
      songId: item.songId,
      artistId: item.artistId,
      title: item.title,
      artist: item.artist,
      tracks: (item.tracks || []).map((t: any) => ({
        partId: t.partId,
        name: t.name || 'Track',
        tuning: t.tuning,
        instrumentId: t.instrumentId,
        views: t.views || 0,
        difficulty: t.difficulty,
      })),
      hasChords: item.hasChords ?? false,
      defaultTrack: item.defaultTrack ?? 0,
    }))

    return new Response(
      JSON.stringify({ results, total: results.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
