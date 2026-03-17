/**
 * Utilitários CAGED — transposição, filtragem e mapeamento de shapes
 *
 * Funções para transpor templates de Dó para qualquer tonalidade,
 * filtrar notas por posição CAGED, e converter shapes em FretboardNote[].
 */

import {
  CAGED_TEMPLATES,
  CAGED_POSITION_LABELS,
  type CagedShapeNote,
  type CagedTemplateSet,
} from './caged-templates'
import type { FretboardNote } from '@/components/music/GuitarFretboardDiagram'
import { noteToChromatic, getNoteNameInKey, type ScaleType } from './music-theory'

// ── Constantes ─────────────────────────────────────────────────────────

/** Afinação padrão: string 6=E2(40) … string 1=E4(64) */
const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64] // E2, A2, D3, G3, B3, E4

// ── Helpers ────────────────────────────────────────────────────────────

/** Retorna quantos semitons a nota raiz está acima de Dó (C) */
export function semitonesFromC(root: string): number {
  return noteToChromatic(root)
}

// ── Rotação de shapes por tonalidade ─────────────────────────────────

/**
 * Retorna os índices dos shapes rotacionados para uma tonalidade.
 *
 * Os 5 shapes no template estão na ordem CAGED para Dó:
 *   [0]=C, [1]=A, [2]=G, [3]=E, [4]=D
 *
 * Para Ré (D), a 1ª posição usa o shape D (idx 4):
 *   [4, 0, 1, 2, 3]
 *
 * Usa a mesma lógica de rotação do getCagedLabelsForRoot.
 */
export function getShapeRotationForRoot(root: string): number[] {
  const cagedCycle = ['C', 'A', 'G', 'E', 'D']
  const baseNote = root.replace('#', '').replace('b', '')

  let startIdx = cagedCycle.indexOf(baseNote)
  if (startIdx < 0) {
    const fallbackMap: Record<string, number> = {
      'C': 0, 'D': 4, 'E': 3, 'F': 0, 'G': 2, 'A': 1, 'B': 3,
    }
    startIdx = fallbackMap[baseNote] ?? 0
  }

  // Rotacionar: mesma lógica que getCagedLabelsForRoot
  const indices = [0, 1, 2, 3, 4]
  return [...indices.slice(startIdx), ...indices.slice(0, startIdx)]
}

// ── Transposição ───────────────────────────────────────────────────────

/**
 * Transpõe um shape de Dó (C) para a tonalidade desejada.
 *
 * Notas que ultrapassam fretCount são descartadas.
 *
 * @param shape - Array de notas do shape em Dó
 * @param root - Nota raiz destino (ex: 'D', 'G', 'A')
 * @param fretCount - Número total de casas do braço (default: 15)
 * @returns Array de notas com frets transpostos
 */
export function transposeShape(
  shape: CagedShapeNote[],
  root: string,
  fretCount: number = 15,
): CagedShapeNote[] {
  const offset = semitonesFromC(root)
  if (offset === 0) return shape // Já está em Dó

  // Transpor todas as notas
  let transposed = shape.map(note => ({ ...note, fret: note.fret + offset }))

  // Se o fret máximo ultrapassa o braço, descer o shape inteiro uma oitava (−12)
  const maxFret = Math.max(...transposed.map(n => n.fret))
  if (maxFret > fretCount) {
    transposed = transposed.map(note => ({ ...note, fret: note.fret - 12 }))
  }

  // Filtrar notas que ficaram fora do braço (fret < 0 ou > fretCount)
  return transposed.filter(note => note.fret >= 0 && note.fret <= fretCount)
}

/**
 * Transpõe todos os 5 shapes de um template para a tonalidade desejada.
 */
export function transposeAllShapes(
  template: CagedTemplateSet,
  root: string,
  fretCount: number = 15,
): CagedShapeNote[][] {
  return template.shapes.map(shape => transposeShape(shape, root, fretCount))
}

// ── Conversão para FretboardNote[] ─────────────────────────────────────

/**
 * Converte um shape CAGED transposto em FretboardNote[] (formato do editor).
 *
 * Adiciona o campo `note` (nome da nota real, baseado na afinação padrão).
 */
export function shapeToFretboardNotes(
  shape: CagedShapeNote[],
  root: string = 'C',
  scaleType?: ScaleType,
): FretboardNote[] {
  return shape.map(s => {
    // Calcular o nome da nota real a partir de string + fret
    const openStringMidi = STANDARD_TUNING_MIDI[6 - s.string] // string 6=index 0 (E2), string 1=index 5 (E4)
    const noteMidi = openStringMidi + s.fret
    const chromaticIdx = ((noteMidi % 12) + 12) % 12
    const noteName = getNoteNameInKey(chromaticIdx, root, scaleType)

    return {
      string: s.string,
      fret: s.fret,
      isRoot: s.isRoot,
      note: noteName,
      degree: s.degree,
    }
  })
}

// ── Filtragem por posição ──────────────────────────────────────────────

/**
 * Dado o preset ativo e a nota raiz, retorna os 5 shapes transpostos
 * como FretboardNote[][] (um array por posição).
 *
 * Retorna null se o preset não tem template CAGED definido.
 */
export function getCagedPositions(
  presetKey: string,
  root: string,
  fretCount: number = 15,
): FretboardNote[][] | null {
  const template = CAGED_TEMPLATES[presetKey]
  if (!template) return null

  // Derivar scaleType se o preset é uma escala
  const scaleTypeMap: Record<string, ScaleType> = {
    major_scale: 'major_scale',
    minor_scale: 'minor_scale',
    harmonic_minor_scale: 'harmonic_minor_scale',
    melodic_minor_scale: 'melodic_minor_scale',
    penta_major: 'major_scale',
    penta_minor: 'minor_scale',
    blues: 'minor_scale',
    dim: 'minor_scale',
    minor: 'minor_scale',
    '7': 'minor_scale',
    m7: 'minor_scale',
    dim7: 'minor_scale',
    m7b5: 'minor_scale',
    m6: 'minor_scale',
    mmaj7: 'minor_scale',
  }
  const scaleType = scaleTypeMap[presetKey]

  // Rotacionar os shapes na mesma ordem que os labels CAGED para esta tonalidade
  const rotatedShapes = getShapeRotationForRoot(root).map(idx => template.shapes[idx])
  const rotatedTemplate = { ...template, shapes: rotatedShapes }

  const transposedShapes = transposeAllShapes(rotatedTemplate, root, fretCount)
  return transposedShapes.map(shape => shapeToFretboardNotes(shape, root, scaleType))
}

/**
 * Verifica se uma nota do braço pertence a um shape CAGED específico.
 * Compara por string + fret.
 */
export function isNoteInShape(
  note: FretboardNote,
  shapeNotes: FretboardNote[],
): boolean {
  return shapeNotes.some(sn => sn.string === note.string && sn.fret === note.fret)
}

/**
 * Filtra as notas do braço completo, retornando apenas as que pertencem
 * ao shape CAGED da posição selecionada.
 */
export function filterNotesByPosition(
  allNotes: FretboardNote[],
  shapeNotes: FretboardNote[],
): FretboardNote[] {
  return allNotes.filter(note => isNoteInShape(note, shapeNotes))
}

// ── Labels dinâmicos por tonalidade ────────────────────────────────────

/**
 * Retorna os labels CAGED rotacionados de acordo com a tonalidade.
 *
 * O ciclo CAGED para Dó é: C → A → G → E → D
 * Para Ré (D), a 1ª posição começa no shape D: D → C → A → G → E
 * Para Sol (G), começa no shape G: G → E → D → C → A
 *
 * A rotação é baseada no deslocamento em semitons da raiz.
 * O mapeamento root → shape inicial segue:
 *   C=C, D=D, E=E, G=G, A=A
 *   C#/Db → entre C e D, etc.
 *
 * Na prática, cada shape CAGED corresponde a uma nota do ciclo.
 * A ordem dos shapes no template já é fixa em C.
 * Ao transpor, os labels rotam para refletir qual shape "aberto" 
 * corresponde a cada posição.
 */
export function getCagedLabelsForRoot(root: string): string[] {
  // O ciclo CAGED padrão (para C): C, A, G, E, D
  // Cada shape corresponde à tônica de um acorde aberto.
  // Ao transpor, a relação entre posição e shape permanece a mesma,
  // mas o label de referência muda.
  //
  // Mapeamento simplificado:
  // Para C: shapes = [C, A, G, E, D] (nesta ordem)
  // Para D: shapes = [D, C, A, G, E] (rotação de 4)
  // Para E: shapes = [E, D, C, A, G] (rotação de 3)
  // Para G: shapes = [G, E, D, C, A] (rotação de 2)
  // Para A: shapes = [A, G, E, D, C] (rotação de 1)
  //
  // Para notas com # (sustenido), o shape mais próximo determina a posição.

  const cagedCycle = ['C', 'A', 'G', 'E', 'D']

  // Mapear nota raiz para o shape inicial (sem sustenido)
  const baseNote = root.replace('#', '').replace('b', '')

  const shapeIdx = cagedCycle.indexOf(baseNote)
  if (shapeIdx >= 0) {
    // Rotacionar para que o shape da raiz fique na posição 1
    return [...cagedCycle.slice(shapeIdx), ...cagedCycle.slice(0, shapeIdx)]
  }

  // Para notas que não fazem parte do CAGED (F, B, etc.),
  // usar o shape anterior mais próximo no ciclo de quintas
  const fallbackMap: Record<string, number> = {
    'C': 0, 'D': 4, 'E': 3, 'F': 0, 'G': 2, 'A': 1, 'B': 3,
  }
  const fallbackIdx = fallbackMap[baseNote] ?? 0
  return [...cagedCycle.slice(fallbackIdx), ...cagedCycle.slice(0, fallbackIdx)]
}

/**
 * Verifica se um preset tem templates CAGED disponíveis.
 */
export function hasCagedTemplate(presetKey: string | null): boolean {
  if (!presetKey) return false
  return presetKey in CAGED_TEMPLATES
}

/**
 * Retorna a faixa de casas (min, max) de um shape.
 * Útil para exibir informação contextual.
 */
export function getShapeFretRange(shape: FretboardNote[]): [number, number] {
  if (shape.length === 0) return [0, 0]
  const frets = shape.map(n => n.fret)
  return [Math.min(...frets), Math.max(...frets)]
}
