/**
 * Converte formato de acorde retornado pela IA para formato SVGuitar
 * compatível com ChordDiagram.tsx
 */

import type { ChordPositions } from '@/components/music/ChordDiagram'

/**
 * Formato esperado da IA para chord_diagram
 */
export interface AiChordData {
  chord_name: string
  /** Posição inicial (casa) do diagrama. Default: 1 */
  position?: number
  /** Array de notas: [[corda, casa, dedo?], ...] - corda 1=E grave, 6=E agudo */
  fingers: Array<[number, number, string?]>
  /** Pestanas: [{fromString, toString, fret}, ...] */
  barres?: Array<{ fromString: number; toString: number; fret: number }>
  /** Cordas mudas (não tocadas) */
  muted?: number[]
}

/**
 * Formato esperado da IA para chord_chart (progressão de acordes)
 */
export interface AiChordChartData {
  title?: string
  chords: AiChordData[]
}

/**
 * Converte dados de acorde da IA para formato SVGuitar
 */
export function aiChordToSvguitar(aiChord: AiChordData): {
  name: string
  positions: ChordPositions
  position: number
} {
  // Normalizar fingers - garantir que são arrays [corda, casa, label?]
  const fingers: Array<[number, number, string?]> = (aiChord.fingers || []).map(f => {
    if (Array.isArray(f)) {
      const [string, fret, label] = f
      return [
        typeof string === 'number' ? string : parseInt(String(string), 10) || 1,
        typeof fret === 'number' ? fret : parseInt(String(fret), 10) || 0,
        label,
      ]
    }
    return [1, 0, undefined]
  })

  // Normalizar barres
  const barres = (aiChord.barres || []).map(b => ({
    fromString: typeof b.fromString === 'number' ? b.fromString : parseInt(String(b.fromString), 10) || 1,
    toString: typeof b.toString === 'number' ? b.toString : parseInt(String(b.toString), 10) || 6,
    fret: typeof b.fret === 'number' ? b.fret : parseInt(String(b.fret), 10) || 1,
  }))

  // Normalizar muted
  const muted = (aiChord.muted || []).map(m =>
    typeof m === 'number' ? m : parseInt(String(m), 10) || 0
  ).filter(m => m > 0)

  return {
    name: aiChord.chord_name || 'Acorde',
    positions: { fingers, barres, muted },
    position: aiChord.position || 1,
  }
}

/**
 * Converte chord_chart (múltiplos acordes) da IA
 */
export function aiChordChartToSvguitar(aiChart: AiChordChartData): Array<{
  name: string
  positions: ChordPositions
  position: number
}> {
  return (aiChart.chords || []).map(chord => aiChordToSvguitar(chord))
}

/**
 * Valida se os dados de acorde da IA são válidos
 */
export function validateAiChordData(data: unknown): data is AiChordData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>

  // Deve ter chord_name
  if (typeof d.chord_name !== 'string' || !d.chord_name.trim()) return false

  // Deve ter fingers como array
  if (!Array.isArray(d.fingers)) return false

  // Cada finger deve ser array com pelo menos 2 elementos
  for (const f of d.fingers) {
    if (!Array.isArray(f) || f.length < 2) return false
    if (typeof f[0] !== 'number' || typeof f[1] !== 'number') return false
  }

  return true
}

/**
 * Exemplo de formato esperado da IA:
 *
 * {
 *   "chord_name": "Am",
 *   "position": 1,
 *   "fingers": [
 *     [2, 1],      // corda 2 (B), casa 1
 *     [3, 2],      // corda 3 (G), casa 2
 *     [4, 2]       // corda 4 (D), casa 2
 *   ],
 *   "muted": [6],  // corda 6 (E grave) não toca
 *   "barres": []
 * }
 *
 * Para pestana (ex: Fm na 1ª casa):
 * {
 *   "chord_name": "Fm",
 *   "position": 1,
 *   "fingers": [
 *     [4, 3],
 *     [5, 3]
 *   ],
 *   "barres": [{ "fromString": 1, "toString": 6, "fret": 1 }],
 *   "muted": []
 * }
 */
