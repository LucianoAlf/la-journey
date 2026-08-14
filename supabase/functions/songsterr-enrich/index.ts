import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const SONGSTERR_BASE = 'https://www.songsterr.com'

function extractReduxState(html: string): any | null {
  const scripts = html.match(/<script[^>]*>([^<]{10000,})<\/script>/g)
  if (!scripts) return null

  for (const script of scripts) {
    const content = script.replace(/<\/?script[^>]*>/g, '').trim()
    try {
      const parsed = JSON.parse(content)
      if (parsed?.meta?.current || parsed?.state) {
        return parsed
      }
    } catch {
      continue
    }
  }
  return null
}

function convertChordsToChordPro(chordsData: any): { chordPro: string; chordsList: string[] } {
  if (!chordsData) return { chordPro: '', chordsList: [] }

  const lines: string[] = []
  const chordsFound = new Set<string>()

  // Estrutura 1: sections com measures/lines
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

  // Estrutura 2: text puro com acordes inline
  if (lines.length === 0 && typeof chordsData.text === 'string') {
    return {
      chordPro: chordsData.text,
      chordsList: Array.from(chordsData.text.matchAll(/\[([A-G][^\]]*)\]/g)).map((m: any) => m[1]),
    }
  }

  // Estrutura 3: array de strings simples
  if (lines.length === 0 && Array.isArray(chordsData)) {
    for (const item of chordsData) {
      if (typeof item === 'string') lines.push(item)
      else if (item?.chord) {
        lines.push(`[${item.chord}] ${item.text || ''}`)
        chordsFound.add(item.chord)
      }
    }
  }

  return {
    chordPro: lines.join('\n').trim(),
    chordsList: Array.from(chordsFound),
  }
}

function extractChordsFromSongsterr(state: any): {
  chordPro: string
  chordsList: string[]
  meta: any
} {
  const current = state?.meta?.current || state?.current || {}
  const chordsData = current?.chords || state?.chords || null

  let result = convertChordsToChordPro(chordsData)

  // Se nao achou no chords estruturado, tenta extrair dos tracks
  if (!result.chordPro && current?.tracks) {
    const chordTrack = current.tracks.find((t: any) =>
      t.hasChords || t.name?.toLowerCase().includes('chord') || t.name?.toLowerCase().includes('acorde')
    )
    if (chordTrack?.chords) {
      result = convertChordsToChordPro(chordTrack.chords)
    }
  }

  // Extrair metadados uteis
  const meta = {
    songId: current.songId,
    title: current.title,
    artist: current.artist,
    tuning: current.tuning,
    difficulty: current.difficulty,
    bpm: current.tempo || state?.tempo?.tempo?.bpm || 72,
    key: current.key || (result.chordsList.length > 0 ? result.chordsList[0] : 'C'),
    capo: current.capo || 0,
    tracksCount: current.tracks?.length || 0,
    hasChords: !!result.chordPro,
    videos: current.videos || [],
  }

  return { ...result, meta }
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
      // URL direta pelo ID da cifra/tab
      url = `${SONGSTERR_BASE}/a/wsa/tab-s${songId}`
    } else {
      // Buscar pelo artist/title
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
      url = `${SONGSTERR_BASE}/a/wsa/tab-s${best.songId}`
    }

    // Buscar a pagina para extrair o Redux state com a cifra completa
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

    const { chordPro, chordsList, meta } = extractChordsFromSongsterr(state)

    return new Response(
      JSON.stringify({
        cifra_content: chordPro || null,
        chords: chordsList,
        key: meta.key,
        bpm: meta.bpm,
        capo: meta.capo,
        source_url: url,
        songsterr_id: meta.songId || songId,
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
