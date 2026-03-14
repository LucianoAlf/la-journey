/**
 * Script de ingestão de acordes do repositório szaza/guitar-chords-db-json
 * + tombatossals/chords-db (ukulele) para a tabela chord_library do Supabase.
 *
 * Estratégia:
 * - Para cada acorde (key + suffix), pega a PRIMEIRA posição (mais comum/fácil)
 * - Converte o formato szaza (hex frets/fingers) → formato SVGuitar (nosso banco)
 * - Usa upsert com onConflict: 'name,instrument' para não duplicar
 * - Insere em lotes de 500
 *
 * Uso: npx tsx scripts/ingest-chords.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

// ── Configuração Supabase ────────────────────────────────────────────
const SUPABASE_URL = 'https://rkfszavfqplhorvfpkcq.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_KEY) {
  console.error('❌ Defina SUPABASE_SERVICE_KEY como variável de ambiente.')
  console.error('   Ex: $env:SUPABASE_SERVICE_KEY="eyJ..." ; npx tsx scripts/ingest-chords.ts')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Constantes ───────────────────────────────────────────────────────
const BATCH_SIZE = 500
const SZAZA_DIR = path.join(__dirname, 'guitar-chords-db-json')

// ── Mapas de conversão ───────────────────────────────────────────────

/** Converte hex char do szaza para número de fret (0-24) ou -1 (muted) */
function hexToFret(ch: string): number {
  if (ch === 'x' || ch === 'X') return -1
  if (ch >= '0' && ch <= '9') return parseInt(ch)
  // a=10, b=11, ..., o=24 (hex estendido do szaza)
  const code = ch.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 10
  return code
}

/** Mapeia suffix do szaza → nome legível do acorde */
function suffixToName(key: string, suffix: string): string {
  // key: "C", "C#", "D", "Eb", etc.
  // suffix: "major", "minor", "dim7", "maj7/E", "sus4_a#", etc.

  // Normalizar key (szaza usa C# mas nunca Db — vamos manter como está)
  let name = key

  // Mapear sufixos para notação padrão
  const suffixMap: Record<string, string> = {
    'major': '',
    'minor': 'm',
    'dim': 'dim',
    'dim7': 'dim7',
    'sus2': 'sus2',
    'sus4': 'sus4',
    '7sus4': '7sus4',
    'alt': 'alt',
    'aug': 'aug',
    '6': '6',
    '69': '6/9',
    '7': '7',
    '7b5': '7b5',
    'aug7': 'aug7',
    '9': '9',
    '9b5': '9b5',
    'aug9': 'aug9',
    '7b9': '7b9',
    '7#9': '7#9',
    '11': '11',
    '9#11': '9#11',
    '13': '13',
    'maj7': 'maj7',
    'maj7b5': 'maj7b5',
    'maj7#5': 'maj7#5',
    'maj9': 'maj9',
    'maj11': 'maj11',
    'maj13': 'maj13',
    'm6': 'm6',
    'm69': 'm6/9',
    'm7': 'm7',
    'm7b5': 'm7b5',
    'mMaj7': 'mMaj7',
    'mMaj7b5': 'mMaj7b5',
    'm9': 'm9',
    'm11': 'm11',
    'mmaj9': 'mMaj9',
    'mmaj11': 'mMaj11',
    'add9': 'add9',
    'madd9': 'madd9',
    '/E': '/E',
    '/F': '/F',
    '/F#': '/F#',
    '/G': '/G',
    '/G#': '/G#',
    '/A': '/A',
    '/A#': '/A#',
    '/B': '/B',
    '/Bb': '/Bb',
    '/C': '/C',
    '/C#': '/C#',
    '/D': '/D',
    '/D#': '/D#',
    '/Eb': '/Eb',
    '5': '5',
    '7sus2': '7sus2',
    '7#11': '7#11',
    '13b9': '13b9',
    '13#9': '13#9',
  }

  // Se suffix contém "/" é acorde com baixo (ex: "maj7/E")
  if (suffix.includes('/')) {
    const parts = suffix.split('/')
    const mainSuffix = parts[0]
    const bassNote = parts.slice(1).join('/')
    const mapped = suffixMap[mainSuffix] ?? mainSuffix
    name += mapped + '/' + bassNote.charAt(0).toUpperCase() + bassNote.slice(1)
  } else {
    const mapped = suffixMap[suffix] ?? suffix
    name += mapped
  }

  return name
}

/** Converte uma posição do szaza para o formato positions do nosso banco (SVGuitar) */
function convertPosition(pos: { frets: string; fingers: string; barres?: string; capo?: string }) {
  const fretStr = pos.frets
  const fingerStr = pos.fingers

  if (!fretStr || fretStr.length !== 6) return null

  const fingers: Array<[number, number, string?]> = []
  const muted: number[] = []
  const barres: Array<{ fromString: number; toString: number; fret: number }> = []

  // Calcular baseFret (menor fret > 0 que não é muted)
  const fretValues: number[] = []
  for (let i = 0; i < 6; i++) {
    const f = hexToFret(fretStr[i])
    if (f > 0) fretValues.push(f)
  }
  const minFret = fretValues.length > 0 ? Math.min(...fretValues) : 1
  const baseFret = pos.barres ? parseInt(pos.barres) : (minFret > 5 ? minFret : 1)

  // Processar cada corda (index 0 = corda 6/E grave, index 5 = corda 1/E agudo)
  // SVGuitar: string 1 = E agudo (mais fina), string 6 = E grave (mais grossa)
  // No szaza: index 0 = corda 6 (E grave), index 5 = corda 1 (E agudo)
  for (let i = 0; i < 6; i++) {
    const svgString = 6 - i // Converter para numeração SVGuitar (6=grave, 1=agudo)
    const fret = hexToFret(fretStr[i])
    const finger = fingerStr ? fingerStr[i] : '0'

    if (fret === -1) {
      // Corda muda
      muted.push(svgString)
    } else if (fret === 0) {
      // Corda aberta
      fingers.push(finger !== '0' ? [svgString, 0, finger] : [svgString, 0])
    } else {
      // Corda pressionada
      fingers.push(finger !== '0' ? [svgString, fret, finger] : [svgString, fret])
    }
  }

  // Processar barres
  if (pos.barres) {
    const barreFret = parseInt(pos.barres)
    // Encontrar extensão da pestana: cordas que têm o mesmo fret
    const barreStrings: number[] = []
    for (let i = 0; i < 6; i++) {
      const f = hexToFret(fretStr[i])
      if (f === barreFret) barreStrings.push(6 - i)
    }
    if (barreStrings.length >= 2) {
      barres.push({
        fromString: Math.max(...barreStrings),
        toString: Math.min(...barreStrings),
        fret: barreFret,
      })
    }
  }

  return {
    fingers,
    barres,
    muted,
    position: baseFret,
  }
}

/** Calcula dificuldade estimada baseada no acorde */
function estimateDifficulty(name: string, positions: any): number {
  const hasBarres = positions.barres && positions.barres.length > 0
  const hasManyFingers = positions.fingers?.filter((f: any) => f[1] > 0).length >= 4
  const isSlash = name.includes('/')
  const isExtended = /\d{2}/.test(name) // 11, 13, etc.
  const isAltered = /#\d|b\d|alt|aug|dim/.test(name)

  if (isExtended && isSlash) return 5
  if (isExtended || (isAltered && hasBarres)) return 4
  if (hasBarres && hasManyFingers) return 3
  if (hasBarres || isAltered) return 2
  return 1
}

// ── Fonte 1: szaza/guitar-chords-db-json (99K posições → ~9K acordes únicos) ──

interface SzazaChord {
  key: string
  suffix: string
  positions: Array<{
    frets: string
    fingers: string
    barres?: string
    capo?: string
  }>
}

function loadSzazaChords(): Map<string, any> {
  const chords = new Map<string, any>()
  const noteDirs = fs.readdirSync(SZAZA_DIR).filter(d => {
    const full = path.join(SZAZA_DIR, d)
    return d !== '.git' && d !== 'LICENSE' && d !== 'README.MD' && fs.statSync(full).isDirectory()
  })

  let totalFiles = 0
  let totalPositions = 0

  for (const noteDir of noteDirs) {
    const dirPath = path.join(SZAZA_DIR, noteDir)
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'))

    for (const file of files) {
      try {
        const data: SzazaChord = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf8'))
        totalFiles++
        totalPositions += data.positions.length

        const name = suffixToName(data.key, data.suffix)

        // Se já existe, pular (mantém a primeira encontrada)
        if (chords.has(name)) continue

        // Pegar a primeira posição (geralmente a mais simples/comum)
        const pos = data.positions[0]
        if (!pos) continue

        const converted = convertPosition(pos)
        if (!converted) continue

        const difficulty = estimateDifficulty(name, converted)

        chords.set(name, {
          name,
          instrument: 'guitar' as const,
          positions: converted,
          svg_config: {},
          fingers: {},
          barre: null,
          difficulty,
          tags: ['open-source', 'szaza'],
        })
      } catch (e) {
        // Ignorar arquivos com erro de parse
      }
    }
  }

  console.log(`📂 szaza: ${totalFiles} arquivos, ${totalPositions} posições → ${chords.size} acordes únicos`)
  return chords
}

// ── Fonte 2: tombatossals/chords-db (ukulele) ──────────────────────

function loadTombatossalsUkulele(): Map<string, any> {
  const chords = new Map<string, any>()

  try {
    const ukeDb = require('@tombatossals/chords-db/lib/ukulele.json')
    let totalPositions = 0

    const keyMap: Record<string, string> = {
      'C': 'C', 'Csharp': 'C#', 'D': 'D', 'Eb': 'Eb',
      'E': 'E', 'F': 'F', 'Fsharp': 'F#', 'G': 'G',
      'Ab': 'Ab', 'A': 'A', 'Bb': 'Bb', 'B': 'B',
    }

    const suffixMap: Record<string, string> = {
      'major': '', 'minor': 'm', 'dim': 'dim', 'dim7': 'dim7',
      'sus2': 'sus2', 'sus4': 'sus4', '7sus4': '7sus4', 'alt': 'alt',
      'aug': 'aug', '6': '6', '69': '6/9', '7': '7', '7b5': '7b5',
      'aug7': 'aug7', '9': '9', '9b5': '9b5', 'aug9': 'aug9',
      '7b9': '7b9', '7#9': '7#9', '11': '11', '9#11': '9#11',
      '13': '13', 'maj7': 'maj7', 'maj7b5': 'maj7b5', 'maj7#5': 'maj7#5',
      'maj9': 'maj9', 'maj11': 'maj11', 'maj13': 'maj13',
      'm6': 'm6', 'm69': 'm6/9', 'm7': 'm7', 'm7b5': 'm7b5',
      'mMaj7': 'mMaj7', 'mMaj7b5': 'mMaj7b5', 'm9': 'm9', 'm11': 'm11',
      'mmaj9': 'mMaj9', 'mmaj11': 'mMaj11', 'add9': 'add9', 'madd9': 'madd9',
      '5': '5', '7sus2': '7sus2',
    }

    for (const [keyCode, chordArray] of Object.entries(ukeDb.chords) as [string, any[]][]) {
      const note = keyMap[keyCode] || keyCode
      for (const chord of chordArray) {
        const suffix = suffixMap[chord.suffix] ?? chord.suffix
        const name = note + suffix
        totalPositions += chord.positions.length

        if (chords.has(name)) continue

        // tombatossals usa formato diferente para ukulele: frets array, fingers array, barres array
        const pos = chord.positions[0]
        if (!pos) continue

        const fingers: Array<[number, number, string?]> = []
        const muted: number[] = []
        const barres: Array<{ fromString: number; toString: number; fret: number }> = []

        // Ukulele: 4 cordas (string 4=G mais grossa, string 1=A mais fina)
        for (let i = 0; i < 4; i++) {
          const svgString = 4 - i
          const fret = pos.frets[i]
          const finger = pos.fingers?.[i] ?? 0

          if (fret === -1) {
            muted.push(svgString)
          } else if (fret === 0) {
            fingers.push(finger ? [svgString, 0, String(finger)] : [svgString, 0])
          } else {
            fingers.push(finger ? [svgString, fret, String(finger)] : [svgString, fret])
          }
        }

        // Barres
        if (pos.barres && pos.barres.length > 0) {
          for (const barreFret of pos.barres) {
            const barreStrings: number[] = []
            for (let i = 0; i < 4; i++) {
              if (pos.frets[i] === barreFret) barreStrings.push(4 - i)
            }
            if (barreStrings.length >= 2) {
              barres.push({
                fromString: Math.max(...barreStrings),
                toString: Math.min(...barreStrings),
                fret: barreFret,
              })
            }
          }
        }

        chords.set(name, {
          name,
          instrument: 'ukulele' as const,
          positions: { fingers, barres, muted, position: pos.baseFret ?? 1 },
          svg_config: {},
          fingers: {},
          barre: null,
          difficulty: estimateDifficulty(name, { fingers, barres }),
          tags: ['open-source', 'tombatossals'],
        })
      }
    }

    console.log(`🪕 tombatossals ukulele: ${totalPositions} posições → ${chords.size} acordes únicos`)
  } catch (e) {
    console.warn('⚠️  Ukulele DB não encontrado, pulando...')
  }

  return chords
}

// ── Fonte 3: tombatossals/chords-db (guitar — complementar ao szaza) ──

function loadTombatossalsGuitar(): Map<string, any> {
  const chords = new Map<string, any>()

  try {
    const guitarDb = require('@tombatossals/chords-db/lib/guitar.json')
    let totalPositions = 0

    const keyMap: Record<string, string> = {
      'C': 'C', 'Csharp': 'C#', 'D': 'D', 'Eb': 'Eb',
      'E': 'E', 'F': 'F', 'Fsharp': 'F#', 'G': 'G',
      'Ab': 'Ab', 'A': 'A', 'Bb': 'Bb', 'B': 'B',
    }

    const suffixMap: Record<string, string> = {
      'major': '', 'minor': 'm', 'dim': 'dim', 'dim7': 'dim7',
      'sus2': 'sus2', 'sus4': 'sus4', '7sus4': '7sus4', '7sg': '7sg',
      'alt': 'alt', 'aug': 'aug', '6': '6', '69': '6/9',
      '7': '7', '7b5': '7b5', 'aug7': 'aug7', '9': '9',
      '9b5': '9b5', 'aug9': 'aug9', '7b9': '7b9', '7#9': '7#9',
      '11': '11', '9#11': '9#11', '13': '13', 'maj7': 'maj7',
      'maj7b5': 'maj7b5', 'maj7#5': 'maj7#5', 'maj9': 'maj9',
      'maj11': 'maj11', 'maj13': 'maj13', 'm6': 'm6', 'm69': 'm6/9',
      'm7': 'm7', 'm7b5': 'm7b5', 'mMaj7': 'mMaj7', 'mMaj7b5': 'mMaj7b5',
      'm9': 'm9', 'm11': 'm11', 'mmaj9': 'mMaj9', 'mmaj11': 'mMaj11',
      'add9': 'add9', 'madd9': 'madd9', '5': '5', '7sus2': '7sus2',
    }

    for (const [keyCode, chordArray] of Object.entries(guitarDb.chords) as [string, any[]][]) {
      const note = keyMap[keyCode] || keyCode
      for (const chord of chordArray) {
        const suffix = suffixMap[chord.suffix] ?? chord.suffix
        const name = note + suffix
        totalPositions += chord.positions.length

        if (chords.has(name)) continue

        const pos = chord.positions[0]
        if (!pos) continue

        const fingers: Array<[number, number, string?]> = []
        const muted: number[] = []
        const barres: Array<{ fromString: number; toString: number; fret: number }> = []

        for (let i = 0; i < 6; i++) {
          const svgString = 6 - i
          const fret = pos.frets[i]
          const finger = pos.fingers?.[i] ?? 0

          if (fret === -1) {
            muted.push(svgString)
          } else if (fret === 0) {
            fingers.push(finger ? [svgString, 0, String(finger)] : [svgString, 0])
          } else {
            fingers.push(finger ? [svgString, fret, String(finger)] : [svgString, fret])
          }
        }

        if (pos.barres && pos.barres.length > 0) {
          for (const barreFret of pos.barres) {
            const barreStrings: number[] = []
            for (let i = 0; i < 6; i++) {
              if (pos.frets[i] === barreFret) barreStrings.push(6 - i)
            }
            if (barreStrings.length >= 2) {
              barres.push({
                fromString: Math.max(...barreStrings),
                toString: Math.min(...barreStrings),
                fret: barreFret,
              })
            }
          }
        }

        chords.set(name, {
          name,
          instrument: 'guitar' as const,
          positions: { fingers, barres, muted, position: pos.baseFret ?? 1 },
          svg_config: {},
          fingers: {},
          barre: null,
          difficulty: estimateDifficulty(name, { fingers, barres }),
          tags: ['open-source', 'tombatossals'],
        })
      }
    }

    console.log(`🎸 tombatossals guitar: ${totalPositions} posições → ${chords.size} acordes únicos`)
  } catch (e) {
    console.warn('⚠️  Guitar DB (tombatossals) não encontrado, pulando...')
  }

  return chords
}

// ── Batch insert ────────────────────────────────────────────────────

async function batchUpsert(chords: any[], instrument: string) {
  let inserted = 0
  let skipped = 0
  const total = chords.length

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = chords.slice(i, i + BATCH_SIZE)
    const { data, error } = await supabase
      .from('chord_library')
      .upsert(batch, { onConflict: 'name,instrument', ignoreDuplicates: true })
      .select('id')

    if (error) {
      console.error(`  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      skipped += batch.length
      continue
    }

    inserted += data?.length ?? 0
    skipped += batch.length - (data?.length ?? 0)

    const progress = Math.min(100, Math.round(((i + batch.length) / total) * 100))
    process.stdout.write(`\r  📦 ${instrument}: ${progress}% (${inserted} inseridos, ${skipped} existentes)`)
  }

  console.log(`\n  ✅ ${instrument}: ${inserted} novos, ${skipped} já existiam`)
  return inserted
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('🎵 Ingestão de acordes para chord_library')
  console.log('═══════════════════════════════════════════\n')

  // Verificar estado atual
  const { count: before } = await supabase
    .from('chord_library')
    .select('id', { count: 'exact', head: true })
  console.log(`📊 Estado atual: ${before} acordes no banco\n`)

  // Carregar fontes
  console.log('📥 Carregando fontes de dados...')
  const szazaGuitar = loadSzazaChords()
  const tombGuitar = loadTombatossalsGuitar()
  const tombUkulele = loadTombatossalsUkulele()

  // Merge guitar: szaza tem prioridade (mais posições), tombatossals complementa
  const allGuitar = new Map<string, any>()

  // Primeiro tombatossals (será sobrescrito pelo szaza se existir)
  for (const [name, chord] of tombGuitar) {
    allGuitar.set(name, chord)
  }
  // Depois szaza (sobrescreve tombatossals — mais posições)
  for (const [name, chord] of szazaGuitar) {
    allGuitar.set(name, chord)
  }

  console.log(`\n🎸 Guitar total (merged): ${allGuitar.size} acordes únicos`)
  console.log(`🪕 Ukulele total: ${tombUkulele.size} acordes únicos`)
  console.log(`📊 Total a inserir: ${allGuitar.size + tombUkulele.size}\n`)

  // Inserir guitar
  console.log('⬆️  Inserindo guitar...')
  const guitarInserted = await batchUpsert(Array.from(allGuitar.values()), 'guitar')

  // Inserir ukulele
  console.log('⬆️  Inserindo ukulele...')
  const ukeInserted = await batchUpsert(Array.from(tombUkulele.values()), 'ukulele')

  // Resultado final
  const { count: after } = await supabase
    .from('chord_library')
    .select('id', { count: 'exact', head: true })

  console.log('\n═══════════════════════════════════════════')
  console.log(`✅ Ingestão completa!`)
  console.log(`   Antes: ${before} acordes`)
  console.log(`   Inseridos: ${guitarInserted + ukeInserted} novos`)
  console.log(`   Depois: ${after} acordes`)
  console.log(`   Guitar: ${allGuitar.size} | Ukulele: ${tombUkulele.size}`)
  console.log('═══════════════════════════════════════════')
}

main().catch(err => {
  console.error('❌ Erro fatal:', err)
  process.exit(1)
})
