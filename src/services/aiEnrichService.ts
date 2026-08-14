import { generateText } from './aiService'
import { AI_CONFIG } from '@/lib/ai-config'
import type { Tables } from '@/lib/database.types'

type Repertoire = Tables<'repertoire'>

// ─── Tipos ───────────────────────────────────────────────

export interface EnrichmentResult {
  key?: string | null
  genre?: string | null
  difficulty?: number | null
  chords?: string[]
  lyrics?: string | null
  cifra_content?: string | null
  bpm?: number | null
  youtube_url?: string | null
  spotify_url?: string | null
  time_signature?: string | null
  country?: string | null
}

export interface EnrichmentPreview {
  field: string
  label: string
  before: string
  after: string
  changed: boolean
}

// ─── Detectar campos faltantes ──────────────────────────

function detectMissingFields(song: Repertoire): string[] {
  const missing: string[] = []

  if (!song.key) missing.push('key')
  if (!song.genre) missing.push('genre')
  if (!song.chords || song.chords.length === 0) missing.push('chords')
  if (!song.lyrics || song.lyrics.length < 20) missing.push('lyrics')
  if (!song.cifra_content || song.cifra_content.length < 30) missing.push('cifra_content')
  if (!song.bpm) missing.push('bpm')
  if (!song.youtube_url) missing.push('youtube_url')
  if (!song.spotify_url) missing.push('spotify_url')
  if (!song.difficulty || song.difficulty === 1) missing.push('difficulty')
  if (!song.time_signature || song.time_signature === '4/4') missing.push('time_signature')
  if (!song.country) missing.push('country')

  return missing
}

// ─── Prompt builder ─────────────────────────────────────

function buildEnrichPrompt(song: Repertoire, missingFields: string[]): string {
  const existingInfo: string[] = []
  if (song.title) existingInfo.push(`Título: "${song.title}"`)
  if (song.artist) existingInfo.push(`Artista: ${song.artist}`)
  if (song.key) existingInfo.push(`Tom: ${song.key}`)
  if (song.genre) existingInfo.push(`Gênero: ${song.genre}`)
  if (song.bpm) existingInfo.push(`BPM: ${song.bpm}`)
  if (song.chords && song.chords.length > 0) existingInfo.push(`Acordes existentes: ${song.chords.join(', ')}`)
  if (song.time_signature && song.time_signature !== '4/4') existingInfo.push(`Compasso: ${song.time_signature}`)

  const fieldInstructions: Record<string, string> = {
    key: '"key": tom principal (ex: "Am", "G", "E")',
    genre: '"genre": gênero musical (ex: "Rock", "Pop", "Folk", "Blues", "Jazz", "MPB", "Country", "Alternative")',
    difficulty: '"difficulty": dificuldade 1-5 (1=iniciante, 5=virtuoso) baseado na complexidade harmônica e técnica',
    chords: '"chords": array com os acordes principais da música em ordem de aparição (ex: ["Am", "C", "G", "F"])',
    lyrics: '"lyrics": letra COMPLETA da música (sem acordes, apenas texto)',
    cifra_content: '"cifra_content": cifra completa no formato ChordsOverWords (acordes na linha de cima, letra na linha de baixo)',
    bpm: '"bpm": tempo em batidas por minuto (número inteiro)',
    youtube_url: '"youtube_url": URL do YouTube do vídeo oficial ou versão mais popular (formato https://www.youtube.com/watch?v=XXXXX)',
    spotify_url: '"spotify_url": URL do Spotify da faixa oficial (formato https://open.spotify.com/track/XXXXX). Não use link de busca.',
    time_signature: '"time_signature": compasso (ex: "4/4", "3/4", "6/8")',
    country: '"country": "BR" se o artista é brasileiro, "INT" se internacional. BR = artista brasileiro ou banda brasileira. INT = qualquer artista que NÃO seja brasileiro.',
  }

  const requestedFields = missingFields
    .filter(f => fieldInstructions[f])
    .map(f => `  - ${fieldInstructions[f]}`)
    .join('\n')

  return `Você é um especialista em música. Preencha os campos faltantes para esta música.

INFORMAÇÕES EXISTENTES:
${existingInfo.join('\n')}

CAMPOS PARA PREENCHER (retorne APENAS estes campos em JSON):
${requestedFields}

REGRAS IMPORTANTES:
- Para "cifra_content": use o formato ChordsOverWords onde os acordes ficam na linha ACIMA da letra correspondente
- Para "lyrics": apenas a letra sem acordes
- Para "youtube_url": use a URL do vídeo OFICIAL ou o mais popular no YouTube
- Para "spotify_url": use a URL da faixa OFICIAL no Spotify (open.spotify.com/track/...). Se não tiver certeza, omita
- Para "chords": liste TODOS os acordes da música, não apenas os principais
- Retorne APENAS um objeto JSON válido, sem markdown, sem explicação
- Se não souber um campo com certeza, omita-o do JSON (não invente)`
}

// ─── Parse robusto de JSON da IA ─────────────────────────

function parseAIJson(text: string): EnrichmentResult {
  // Limpar markdown wrapping
  let cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim()

  // Tentar parse direto
  try {
    return JSON.parse(cleaned)
  } catch {
    // Fallback: extrair o JSON entre { e } (ignorar lixo antes/depois)
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      cleaned = cleaned.slice(start, end + 1)
      try {
        return JSON.parse(cleaned)
      } catch {
        // Último recurso: tentar corrigir newlines literais em strings
        const fixed = cleaned.replace(/(?<="[^"]*)\n(?=[^"]*")/g, '\\n')
        return JSON.parse(fixed)
      }
    }
    throw new Error(`Resposta da IA não é JSON válido: ${text.slice(0, 200)}`)
  }
}

// ─── Enriquecer música com IA ───────────────────────────

export async function enrichSongWithAI(song: Repertoire): Promise<{
  result: EnrichmentResult
  preview: EnrichmentPreview[]
  missingFields: string[]
  latencyMs: number
  tokensUsed?: number
}> {
  const missingFields = detectMissingFields(song)

  if (missingFields.length === 0) {
    return {
      result: {},
      preview: [],
      missingFields: [],
      latencyMs: 0,
    }
  }

  // Separar campos curtos (metadata) e longos (lyrics/cifra) para evitar JSON quebrado
  const shortFields = missingFields.filter(f => f !== 'lyrics' && f !== 'cifra_content')
  const longFields = missingFields.filter(f => f === 'lyrics' || f === 'cifra_content')

  let parsed: EnrichmentResult = {}
  let totalLatency = 0
  let totalTokens = 0

  // Fase 1: campos curtos (sempre)
  if (shortFields.length > 0) {
    const prompt = buildEnrichPrompt(song, shortFields)
    const aiResult = await generateText(
      prompt,
      AI_CONFIG.musicalCode,
      'Você é um especialista em música. Responda SOMENTE com JSON válido, sem markdown.'
    )
    totalLatency += aiResult.latencyMs
    totalTokens += aiResult.tokensUsed ?? 0
    parsed = parseAIJson(aiResult.text)
  }

  // Fase 2: campos longos (lyrics/cifra) em chamada separada
  if (longFields.length > 0) {
    const prompt = buildEnrichPrompt(song, longFields)
    const aiResult = await generateText(
      prompt,
      AI_CONFIG.musicalCode,
      'Você é um especialista em música. Responda SOMENTE com JSON válido. Para lyrics e cifra_content, use \\n para quebras de linha dentro das strings JSON.'
    )
    totalLatency += aiResult.latencyMs
    totalTokens += aiResult.tokensUsed ?? 0
    try {
      const longParsed = parseAIJson(aiResult.text)
      parsed = { ...parsed, ...longParsed }
    } catch {
      // Se falhar os campos longos, continua com os curtos que já parsearam
      console.warn('[Enrich] Falha ao parsear campos longos, seguindo com campos curtos')
    }
  }

  // Gerar preview antes/depois
  const preview: EnrichmentPreview[] = []

  const fieldLabels: Record<string, string> = {
    key: 'Tom',
    genre: 'Gênero',
    difficulty: 'Dificuldade',
    chords: 'Acordes',
    lyrics: 'Letra',
    cifra_content: 'Cifra Completa',
    bpm: 'BPM',
    youtube_url: 'YouTube',
    spotify_url: 'Spotify',
    time_signature: 'Compasso',
    country: 'País',
  }

  for (const field of missingFields) {
    const newVal = parsed[field as keyof EnrichmentResult]
    if (newVal === undefined || newVal === null) continue

    const oldVal = song[field as keyof Repertoire]
    let beforeStr = ''
    let afterStr = ''

    if (field === 'chords' && Array.isArray(newVal)) {
      beforeStr = (oldVal as string[] | null)?.join(', ') || '—'
      afterStr = newVal.join(', ')
    } else if (field === 'lyrics' || field === 'cifra_content') {
      const oldStr = (oldVal as string) || ''
      beforeStr = oldStr ? `${oldStr.slice(0, 80)}...` : '(vazio)'
      afterStr = String(newVal).slice(0, 80) + '...'
    } else {
      beforeStr = oldVal != null ? String(oldVal) : '—'
      afterStr = String(newVal)
    }

    preview.push({
      field,
      label: fieldLabels[field] || field,
      before: beforeStr,
      after: afterStr,
      changed: beforeStr !== afterStr,
    })
  }

  return {
    result: parsed,
    preview: preview.filter(p => p.changed),
    missingFields,
    latencyMs: totalLatency,
    tokensUsed: totalTokens,
  }
}

// ─── Aplicar resultado ao banco ─────────────────────────

export function enrichmentToUpdates(
  result: EnrichmentResult,
  selectedFields: string[]
): Record<string, unknown> {
  const updates: Record<string, unknown> = {}

  for (const field of selectedFields) {
    const val = result[field as keyof EnrichmentResult]
    if (val !== undefined && val !== null) {
      updates[field] = val
    }
  }

  return updates
}
