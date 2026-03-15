#!/usr/bin/env node

/**
 * Validação de YouTube URLs no repertório
 * 
 * Usa a API oEmbed do YouTube para verificar se cada URL é válida.
 * URLs inválidas são setadas como NULL no banco.
 * 
 * Uso:
 *   node scripts/validate-youtube.mjs
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltam variáveis de ambiente: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

// ─── Config ──────────────────────────────────────────────
const CONCURRENCY = 8        // requests paralelos
const DELAY_MS = 150         // delay entre grupos

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
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status}`)
  return res.json()
}

async function supabasePatch(table, id, updates) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(updates)
  })
  if (!res.ok) throw new Error(`Supabase PATCH ${id}: ${res.status}`)
}

// ─── Validar URL via oEmbed ──────────────────────────────
async function validateYouTubeUrl(url) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const res = await fetch(oembedUrl, { method: 'GET', signal: AbortSignal.timeout(8000) })
    return res.status === 200
  } catch {
    return false
  }
}

// ─── Buscar músicas com YouTube ──────────────────────────
async function fetchSongsWithYoutube() {
  const PAGE_SIZE = 1000
  const all = []
  let from = 0
  while (true) {
    const batch = await supabaseGet('repertoire',
      `select=id,title,artist,youtube_url&youtube_url=not.is.null&youtube_url=neq.&order=title&offset=${from}&limit=${PAGE_SIZE}`
    )
    all.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

// ─── Delay helper ────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── Main ────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  Validação de YouTube URLs                ')
  console.log('═══════════════════════════════════════════\n')

  // 1. Buscar músicas com YouTube URL
  console.log('📥 Buscando músicas com YouTube URL...')
  const songs = await fetchSongsWithYoutube()
  console.log(`   Total com YouTube: ${songs.length}\n`)

  if (songs.length === 0) {
    console.log('✅ Nenhuma URL para validar!')
    return
  }

  // 2. Validar em grupos paralelos
  let valid = 0
  let invalid = 0
  const invalidList = []

  for (let i = 0; i < songs.length; i += CONCURRENCY) {
    const group = songs.slice(i, i + CONCURRENCY)
    const results = await Promise.all(group.map(async (song) => {
      const isValid = await validateYouTubeUrl(song.youtube_url)
      return { song, isValid }
    }))

    for (const { song, isValid } of results) {
      if (isValid) {
        valid++
      } else {
        invalid++
        invalidList.push({ id: song.id, title: song.title, artist: song.artist, url: song.youtube_url })
      }
    }

    const progress = Math.min(i + CONCURRENCY, songs.length)
    process.stdout.write(`\r   Validando: ${progress}/${songs.length} (✅ ${valid} | ❌ ${invalid})`)

    if (i + CONCURRENCY < songs.length) await sleep(DELAY_MS)
  }
  console.log('\n')

  // 3. Limpar URLs inválidas
  if (invalidList.length > 0) {
    console.log(`🗑️  Limpando ${invalidList.length} URLs inválidas...\n`)
    for (const item of invalidList) {
      console.log(`   ❌ "${item.title}" — ${item.artist}`)
      console.log(`      ${item.url}`)
      try {
        await supabasePatch('repertoire', item.id, { youtube_url: null })
      } catch (err) {
        console.log(`      ⚠️ Erro ao limpar: ${err.message}`)
      }
    }
  }

  // 4. Relatório
  console.log('\n═══════════════════════════════════════════')
  console.log('  RELATÓRIO FINAL')
  console.log('═══════════════════════════════════════════')
  console.log(`   Total verificadas:  ${songs.length}`)
  console.log(`   ✅ Válidas:         ${valid}`)
  console.log(`   ❌ Inválidas:       ${invalid} (removidas do banco)`)
  console.log(`   Taxa de acerto IA:  ${songs.length > 0 ? ((valid / songs.length) * 100).toFixed(1) : 0}%`)
  console.log('═══════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message)
  process.exit(1)
})
