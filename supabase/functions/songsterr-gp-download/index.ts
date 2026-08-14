import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const SONGSTERR_BASE = 'https://www.songsterr.com'
const CDN_BASE_URL = 'https://dqsljvtekg760.cloudfront.net'
const CDN_BASE_URL_2 = 'https://d3d3l6a6rcgkaf.cloudfront.net'

interface SongsterrTrackMeta {
  partId: number
  name: string
  title?: string
  instrument?: string
  instrumentId?: number
  isDrums?: boolean
  tuning?: number[]
}

interface StateMeta {
  songId: number
  revisionId: number
  image?: string
  title: string
  artist: string
  tracks: SongsterrTrackMeta[]
}

interface SongsterrBundle {
  version: number
  source: string
  songId: number
  revisionId: number
  image?: string
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractStateFromHtml(html: string): StateMeta | null {
  // 1. Tentar tag <script id="state">
  const stateMatch = html.match(/<script\s+id=["']state["'][^>]*>([\s\S]*?)<\/script>/i)
  if (stateMatch?.[1]) {
    try {
      const parsed = JSON.parse(stateMatch[1].trim())
      const c = parsed?.meta?.current || parsed?.state?.meta?.current || parsed?.current
      if (c?.songId && c?.revisionId) {
        return {
          songId: c.songId,
          revisionId: c.revisionId,
          image: c.image || undefined,
          title: c.title || 'Song',
          artist: c.artist || 'Unknown',
          tracks: Array.isArray(c.tracks) ? c.tracks : [],
        }
      }
    } catch {
      // continua para fallback
    }
  }

  // 2. Fallback: buscar scripts grandes com JSON
  const scripts = html.match(/<script[^>]*>([^<]{10000,})<\/script>/g)
  if (scripts) {
    for (const script of scripts) {
      const content = script.replace(/<\/?script[^>]*>/g, '').trim()
      try {
        const parsed = JSON.parse(content)
        const c = parsed?.meta?.current || parsed?.state?.meta?.current || parsed?.current
        if (c?.songId && c?.revisionId) {
          return {
            songId: c.songId,
            revisionId: c.revisionId,
            image: c.image || undefined,
            title: c.title || 'Song',
            artist: c.artist || 'Unknown',
            tracks: Array.isArray(c.tracks) ? c.tracks : [],
          }
        }
      } catch {
        continue
      }
    }
  }

  return null
}

async function fetchTrackRevisions(
  songId: number,
  revisionId: number,
  image: string | undefined,
  tracks: SongsterrTrackMeta[]
): Promise<Array<{ partId: number; name: string; instrument: string; data: any }>> {
  const results: Array<{ partId: number; name: string; instrument: string; data: any }> = []

  for (const track of tracks) {
    // Formato moderno: ${CDN}/${songId}/${revisionId}/${image}/${partId}.json
    const candidateUrls: string[] = []
    if (image) {
      candidateUrls.push(`${CDN_BASE_URL}/${songId}/${revisionId}/${image}/${track.partId}.json`)
      candidateUrls.push(`${CDN_BASE_URL_2}/${songId}/${revisionId}/${image}/${track.partId}.json`)
    }
    // Formatos legados
    candidateUrls.push(`${CDN_BASE_URL}/songsterr/${track.partId}@${revisionId}.json`)
    candidateUrls.push(`${CDN_BASE_URL_2}/songsterr/${track.partId}@${revisionId}.json`)

    let data: any = null
    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
        })
        if (res.ok) {
          data = await res.json()
          console.log(`[gp-download] Track ${track.partId} obtida com sucesso via ${url}`)
          break
        }
      } catch (err) {
        console.warn(`[gp-download] Falha na URL ${url}:`, err)
      }
    }

    if (data) {
      results.push({
        partId: track.partId,
        name: track.name || track.title || `Track ${track.partId}`,
        instrument: track.instrument || 'Guitar',
        data,
      })
    } else {
      console.warn(`[gp-download] Não foi possível obter dados para a track ${track.partId} (${track.name})`)
    }
  }

  return results
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { songId, repertoireId } = await req.json()

    if (!songId || typeof songId !== 'number') {
      return new Response(
        JSON.stringify({ error: 'songId (number) e obrigatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[gp-download] Processando songId=${songId}, repertoireId=${repertoireId || 'nenhum'}`)

    // 1. Buscar HTML do Songsterr
    const tabUrl = `${SONGSTERR_BASE}/a/wsa/tab-s${songId}`
    console.log(`[gp-download] Buscando: ${tabUrl}`)
    const pageRes = await fetch(tabUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7',
      },
    })

    if (!pageRes.ok) {
      return new Response(
        JSON.stringify({ error: `Songsterr retornou ${pageRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const html = await pageRes.text()
    const meta = extractStateFromHtml(html)

    if (!meta) {
      return new Response(
        JSON.stringify({ error: 'Nao foi possivel extrair metadados do Songsterr' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[gp-download] "${meta.title}" - "${meta.artist}" (rev ${meta.revisionId}, image ${meta.image || 'none'}), ${meta.tracks.length} tracks`)

    // 2. Baixar revisões de cada track
    const trackDataList = await fetchTrackRevisions(meta.songId, meta.revisionId, meta.image, meta.tracks)

    if (trackDataList.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma track pode ser baixada do Songsterr' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[gp-download] ${trackDataList.length}/${meta.tracks.length} tracks baixadas com sucesso`)

    // 3. Montar o bundle Songsterr JSON
    const bundle: SongsterrBundle = {
      version: 1,
      source: 'songsterr',
      songId: meta.songId,
      revisionId: meta.revisionId,
      image: meta.image,
      title: meta.title,
      artist: meta.artist,
      tracks: trackDataList,
      fetchedAt: new Date().toISOString(),
    }

    const bundleJson = JSON.stringify(bundle)

    // 4. Salvar no Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuracao Supabase incompleta na Edge Function' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const artistSlug = slugify(meta.artist)
    const titleSlug = slugify(meta.title)
    const filename = `${artistSlug}-${titleSlug}.songsterr.json`
    const storagePath = `songsterr/${songId}/${filename}`

    console.log(`[gp-download] Salvando em storage: gp-files/${storagePath} (${bundleJson.length} bytes)`)

    const { error: uploadError } = await supabase.storage
      .from('gp-files')
      .upload(storagePath, bundleJson, {
        contentType: 'application/json',
        upsert: true,
      })

    if (uploadError) {
      console.error('[gp-download] Erro no upload:', uploadError)
      return new Response(
        JSON.stringify({ error: `Erro no upload: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Obter URL publica
    const { data: urlData } = supabase.storage
      .from('gp-files')
      .getPublicUrl(storagePath)

    const publicUrl = urlData.publicUrl
    console.log(`[gp-download] URL publica: ${publicUrl}`)

    const extractedBpmRaw = trackDataList[0]?.data?.automations?.tempo?.[0]?.bpm || trackDataList[0]?.data?.tempo || null
    const extractedBpm = typeof extractedBpmRaw === 'number' && extractedBpmRaw > 0 ? Math.round(extractedBpmRaw) : null

    const updatePayload: Record<string, any> = {
      gp_file_url: publicUrl,
      updated_at: new Date().toISOString(),
    }
    if (extractedBpm) {
      updatePayload.bpm = extractedBpm
    }

    // 6. Atualizar registro no banco se informado
    if (repertoireId) {
      console.log(`[gp-download] Atualizando repertoire ID: ${repertoireId}`, updatePayload)
      const { error: dbError } = await supabase
        .from('repertoire')
        .update(updatePayload)
        .eq('id', repertoireId)

      if (dbError) {
        console.error('[gp-download] Erro ao atualizar repertoire:', dbError)
      } else {
        console.log('[gp-download] Repertoire atualizado com sucesso!')
      }
    } else {
      // Se não passou repertoireId, tenta atualizar qualquer linha que tenha esse songsterr_id
      const { error: dbError } = await supabase
        .from('repertoire')
        .update(updatePayload)
        .eq('songsterr_id', songId)
        .is('gp_file_url', null)

      if (dbError) {
        console.warn('[gp-download] Tentativa de atualizar por songsterr_id falhou:', dbError)
      }
    }

    return new Response(
      JSON.stringify({
        publicUrl,
        songsterrJsonUrl: publicUrl,
        tracksCount: trackDataList.length,
        bpm: extractedBpm,
        title: meta.title,
        artist: meta.artist,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[gp-download] Erro inesperado:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
