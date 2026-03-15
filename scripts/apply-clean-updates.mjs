#!/usr/bin/env node

/**
 * Aplica os updates limpos no banco:
 * 1. Todos os BPMs direto (confiáveis)
 * 2. YouTube URLs validadas via oEmbed
 */

import { readFileSync, writeFileSync } from 'fs'
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
  } catch {}
}
loadEnv()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltam variáveis de ambiente')
  process.exit(1)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── Supabase REST helpers ───────────────────────────────
async function supabasePatch(id, updates) {
  const url = `${SUPABASE_URL}/rest/v1/repertoire?id=eq.${id}`
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
  return res.ok
}

// ─── Validar YouTube URL ─────────────────────────────────
async function validateYouTubeUrl(url) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(6000) })
    return res.status === 200
  } catch {
    return false
  }
}

// ─── Filtro de URLs obviamente falsas ────────────────────
function isObviouslyFake(url) {
  if (!url) return true
  const vid = url.match(/v=([a-zA-Z0-9_-]{11})/)?.[1] || ''
  if (!vid) return true
  // Padrões de alucinação
  if (/^abcdefg/i.test(vid)) return true
  if (/^XXXXX/i.test(vid)) return true
  if (/^example/i.test(vid)) return true
  if (/^(.)\1{6,}/.test(vid)) return true       // Caractere repetido 7+ vezes
  if (/^U8U8U8/.test(vid)) return true
  if (/^0{5,}/.test(vid)) return true
  if (/^1{5,}/.test(vid)) return true
  return false
}

// ─── Main ────────────────────────────────────────────────
async function main() {
  const data = JSON.parse(readFileSync('scripts/enrich-updates.json', 'utf-8'))
  
  console.log('═══════════════════════════════════════════')
  console.log('  Aplicar updates limpos no banco          ')
  console.log('═══════════════════════════════════════════\n')
  console.log(`   Total registros: ${data.length}\n`)

  // Separar BPMs e YouTubes
  const bpmUpdates = data.filter(u => u.bpm != null)
  const ytCandidates = data.filter(u => u.youtube_url && !isObviouslyFake(u.youtube_url))
  const ytFake = data.filter(u => u.youtube_url && isObviouslyFake(u.youtube_url))

  console.log(`   BPMs a aplicar:     ${bpmUpdates.length}`)
  console.log(`   YouTube candidatos: ${ytCandidates.length}`)
  console.log(`   YouTube fake (desc): ${ytFake.length}\n`)

  // Fase 1: Aplicar BPMs via SQL gerado para MCP
  console.log('📝 Gerando SQL para BPMs...')
  const bpmSql = bpmUpdates.map(u =>
    `UPDATE repertoire SET bpm = ${u.bpm} WHERE id = '${u.id}';`
  )
  writeFileSync('scripts/bpm-only.sql', bpmSql.join('\n'), 'utf-8')
  console.log(`   📄 scripts/bpm-only.sql (${bpmSql.length} statements)\n`)

  // Fase 2: Validar YouTube URLs via oEmbed
  console.log('🔍 Validando YouTube URLs via oEmbed...')
  const validYt = []
  const invalidYt = []

  for (let i = 0; i < ytCandidates.length; i++) {
    const u = ytCandidates[i]
    const isValid = await validateYouTubeUrl(u.youtube_url)
    if (isValid) {
      validYt.push(u)
    } else {
      invalidYt.push(u)
    }
    process.stdout.write(`\r   ${i + 1}/${ytCandidates.length} (✅ ${validYt.length} | ❌ ${invalidYt.length})`)
    if (i % 8 === 0) await sleep(100)
  }
  console.log('\n')

  // Gerar SQL para YouTube válidos
  const ytSql = validYt.map(u =>
    `UPDATE repertoire SET youtube_url = '${u.youtube_url.replace(/'/g, "''")}' WHERE id = '${u.id}';`
  )
  writeFileSync('scripts/youtube-valid.sql', ytSql.join('\n'), 'utf-8')
  console.log(`   📄 scripts/youtube-valid.sql (${ytSql.length} statements)\n`)

  // Relatório
  console.log('═══════════════════════════════════════════')
  console.log('  RELATÓRIO')
  console.log('═══════════════════════════════════════════')
  console.log(`   BPMs para aplicar:    ${bpmSql.length}`)
  console.log(`   YouTube válidos:      ${validYt.length}`)
  console.log(`   YouTube inválidos:    ${invalidYt.length}`)
  console.log(`   YouTube fake desc:    ${ytFake.length}`)
  console.log(`   Taxa validação:       ${ytCandidates.length > 0 ? ((validYt.length / ytCandidates.length) * 100).toFixed(1) : 0}%`)
  console.log('═══════════════════════════════════════════\n')
  console.log('   Agora aplique os SQL via MCP Supabase.')
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
