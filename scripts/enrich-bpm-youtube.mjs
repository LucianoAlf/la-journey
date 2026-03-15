#!/usr/bin/env node

/**
 * Enriquecimento em lote — BPM + YouTube URL
 * 
 * Busca todas as músicas sem BPM e/ou sem YouTube, agrupa por artista,
 * envia batches ao GPT-4.1-nano e atualiza no Supabase.
 * 
 * Uso:
 *   node scripts/enrich-bpm-youtube.mjs
 * 
 * Requer .env.local com:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_OPENAI_API_KEY
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ─── Carregar env ────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx < 0) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* .env.local opcional */ }
}
loadEnv()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY
const OPENAI_KEY = process.env.VITE_OPENAI_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('❌ Faltam variáveis de ambiente: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_OPENAI_API_KEY')
  process.exit(1)
}

// ─── Config ──────────────────────────────────────────────
const BATCH_SIZE = 25          // artistas por chamada AI
const DELAY_MS = 600           // delay entre chamadas
const MAX_RETRIES = 3          // retries por batch
const MODEL = 'gpt-4.1-nano'

// ─── Supabase REST helpers ───────────────────────────────
async function supabaseGet(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Accept': 'application/json',
    }
  })
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

// Acumular updates para aplicar via SQL (RLS bloqueia PATCH com anon key)
const pendingUpdates = []

// ─── Buscar todas as músicas paginado ────────────────────
async function fetchAllSongs() {
  const PAGE_SIZE = 1000
  const all = []
  let from = 0
  while (true) {
    const batch = await supabaseGet('repertoire', `select=id,title,artist,bpm,youtube_url&order=title&offset=${from}&limit=${PAGE_SIZE}`)
    all.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

// ─── Agrupar por artista ─────────────────────────────────
function groupByArtist(songs) {
  const map = new Map()
  for (const s of songs) {
    const artist = (s.artist || 'Unknown').trim()
    if (!map.has(artist)) map.set(artist, [])
    map.get(artist).push(s)
  }
  return map
}

// ─── Chamar OpenAI ───────────────────────────────────────
async function classifyBatch(artistBatch) {
  const artistList = artistBatch.map((a, i) => {
    const songs = a.songs.slice(0, 4).map(s => `"${s.title}"`).join(', ')
    return `${i + 1}. "${a.artist}" (músicas: ${songs})`
  }).join('\n')

  const prompt = `Para cada artista e suas músicas abaixo, informe o BPM aproximado e a URL do YouTube do vídeo oficial (ou mais popular) de CADA música listada.

Responda APENAS com um JSON array onde cada item tem:
- "index": número do artista (1-based)
- "songs": array de objetos com "title" (string), "bpm" (number, BPM aproximado) e "youtube_url" (string, URL completa do YouTube)

IMPORTANTE:
- BPM deve ser um número inteiro razoável (ex: 72, 120, 140)
- YouTube URL deve ser formato https://www.youtube.com/watch?v=XXXXXXXXXXX (11 caracteres)
- Se não souber o BPM ou YouTube com certeza para uma música, omita aquele campo (não invente)
- NÃO invente URLs de YouTube — só inclua se tiver certeza que o vídeo existe

Artistas:
${artistList}

Responda APENAS o JSON array, sem markdown, sem explicação.`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Você é um especialista em música. Responda SOMENTE com JSON válido.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content ?? ''

  // Parse robusto
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('[')
    const end = cleaned.lastIndexOf(']')
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1))
    }
    throw new Error(`JSON inválido: ${text.slice(0, 200)}`)
  }
}

// ─── Delay helper ────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── Main ────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  Enriquecimento em lote — BPM + YouTube   ')
  console.log('═══════════════════════════════════════════\n')

  // 1. Buscar músicas sem BPM OU sem YouTube
  console.log('📥 Buscando músicas...')
  const allSongs = await fetchAllSongs()
  const needsEnrich = allSongs.filter(s => s.bpm == null || !s.youtube_url)
  console.log(`   Total no banco:     ${allSongs.length}`)
  console.log(`   Precisam enriquecer: ${needsEnrich.length}\n`)

  if (needsEnrich.length === 0) {
    console.log('✅ Tudo já preenchido!')
    return
  }

  // 2. Agrupar por artista
  const artistMap = groupByArtist(needsEnrich)
  const artists = [...artistMap.entries()].map(([artist, songs]) => ({ artist, songs }))
  console.log(`   Artistas únicos:    ${artists.length}\n`)

  // 3. Processar em batches
  const batches = []
  for (let i = 0; i < artists.length; i += BATCH_SIZE) {
    batches.push(artists.slice(i, i + BATCH_SIZE))
  }
  console.log(`   Batches a processar: ${batches.length}\n`)

  let totalUpdated = 0
  let totalBpm = 0
  let totalYoutube = 0
  let totalErrors = 0

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    const batch = batches[bIdx]
    const batchArtists = batch.map(a => a.artist).join(', ').slice(0, 80)
    process.stdout.write(`   [${bIdx + 1}/${batches.length}] ${batchArtists}... `)

    let result = null
    for (let retry = 0; retry < MAX_RETRIES; retry++) {
      try {
        result = await classifyBatch(batch)
        break
      } catch (err) {
        if (retry < MAX_RETRIES - 1) {
          process.stdout.write(`⚠️ retry ${retry + 1}... `)
          await sleep(2000 * (retry + 1))
        } else {
          console.log(`❌ ${err.message}`)
          totalErrors++
        }
      }
    }

    if (!result) continue

    // 4. Aplicar resultados
    let batchBpm = 0, batchYt = 0
    for (const item of result) {
      const artistData = batch[item.index - 1]
      if (!artistData || !item.songs) continue

      for (const songResult of item.songs) {
        // Encontrar a música correspondente
        const match = artistData.songs.find(s =>
          s.title.toLowerCase() === songResult.title?.toLowerCase()
        )
        if (!match) continue

        const updates = {}
        if (songResult.bpm && match.bpm == null) {
          const bpm = parseInt(songResult.bpm)
          if (bpm >= 30 && bpm <= 300) {
            updates.bpm = bpm
            batchBpm++
          }
        }
        if (songResult.youtube_url && !match.youtube_url) {
          // Validar formato básico da URL
          const ytMatch = songResult.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
          if (ytMatch) {
            updates.youtube_url = `https://www.youtube.com/watch?v=${ytMatch[1]}`
            batchYt++
          }
        }

        if (Object.keys(updates).length > 0) {
          pendingUpdates.push({ id: match.id, ...updates })
          totalUpdated++
        }
      }
    }

    console.log(`✅ BPM: +${batchBpm} | YT: +${batchYt}`)
    totalBpm += batchBpm
    totalYoutube += batchYt

    if (bIdx < batches.length - 1) await sleep(DELAY_MS)
  }

  // 5. Gerar arquivo SQL para aplicar via MCP/psql
  if (pendingUpdates.length > 0) {
    const { writeFileSync } = await import('fs')
    
    // Gerar SQL
    const sqlLines = pendingUpdates.map(u => {
      const sets = []
      if (u.bpm != null) sets.push(`bpm = ${u.bpm}`)
      if (u.youtube_url) sets.push(`youtube_url = '${u.youtube_url.replace(/'/g, "''")}'`)
      return `UPDATE repertoire SET ${sets.join(', ')} WHERE id = '${u.id}';`
    })
    const sqlPath = resolve(process.cwd(), 'scripts/enrich-updates.sql')
    writeFileSync(sqlPath, sqlLines.join('\n'), 'utf-8')
    console.log(`\n   📄 SQL gerado: ${sqlPath} (${sqlLines.length} statements)`)
    
    // Gerar JSON também
    const jsonPath = resolve(process.cwd(), 'scripts/enrich-updates.json')
    writeFileSync(jsonPath, JSON.stringify(pendingUpdates, null, 2), 'utf-8')
    console.log(`   📄 JSON gerado: ${jsonPath}`)
  }

  // 6. Relatório
  console.log('\n═══════════════════════════════════════════')
  console.log('  RELATÓRIO FINAL')
  console.log('═══════════════════════════════════════════')
  console.log(`   Músicas processadas: ${needsEnrich.length}`)
  console.log(`   Registros atualizados: ${totalUpdated}`)
  console.log(`   🎵 BPMs preenchidos:   ${totalBpm}`)
  console.log(`   📺 YouTubes preenchidos: ${totalYoutube}`)
  console.log(`   ❌ Erros de batch:     ${totalErrors}`)
  console.log('═══════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message)
  process.exit(1)
})
