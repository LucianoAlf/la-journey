/**
 * Templates CAGED — 5 shapes (posições) para escalas e arpejos
 *
 * Definidos manualmente em Dó (C) baseados no material didático.
 * Para outras tonalidades: deslocar frets por semitones com wrap-around.
 *
 * Convenção:
 * - string: 1=e(agudo) … 6=E(grave) — padrão fretboard.js
 * - fret: traste absoluto em Dó (C)
 * - isRoot: true se é tônica (1)
 * - degree: grau na escala (1=fundamental, 2, 3, 4, 5, 6, 7)
 *
 * Cada tipo tem 5 shapes. A ordem dos shapes segue o ciclo CAGED:
 * Shape 1 → Shape 2 → Shape 3 → Shape 4 → Shape 5
 *
 * Ao transpor para outra tonalidade, cada fret é deslocado:
 *   novaFret = fretOriginal + semitonesFromC(root)
 * Se novaFret > fretCount, faz wrap-around (volta para o início).
 */

// ── Tipos ──────────────────────────────────────────────────────────────

export interface CagedShapeNote {
  string: number   // 1-6 (1=e agudo, 6=E grave)
  fret: number     // traste absoluto em Dó
  isRoot: boolean  // é tônica?
  degree: number   // grau (1, 2, 3, 4, 5, 6, 7)
}

export interface CagedTemplateSet {
  /** Identificador do tipo (deve casar com PRESETS key) */
  type: string
  /** Nome legível */
  label: string
  /** Intervalos em semitons (para referência) */
  intervals: number[]
  /** 5 shapes, indexados de 0 a 4 (posição 1ª a 5ª) */
  shapes: CagedShapeNote[][]
}

// ── Helpers ────────────────────────────────────────────────────────────

const ROOT = true
const NOTE = false

/** Helper para criar nota de shape */
function n(string: number, fret: number, isRoot: boolean, degree: number): CagedShapeNote {
  return { string, fret, isRoot, degree }
}

// ═══════════════════════════════════════════════════════════════════════
// ESCALAS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Escala Maior em Dó (C) — 5 shapes
 * Ref: Imagem 4 (1.1 Escala maior)
 *
 * Intervalos: 1, 2, 3, 4, 5, 6, 7
 * Semitons:   0, 2, 4, 5, 7, 9, 11
 *
 * Shape 1 (pos I ~ casas 0–3):
 *   6ª corda: E(0)=3, F(1)=1, G(3)=5    → frets 0, 1, 3
 *   5ª corda: A(0)=6, B(2)=7, C(3)=1    → frets 0, 2, 3
 *   4ª corda: D(0)=2, E(2)=3, F(3)=4    → frets 0, 2, 3
 *   3ª corda: G(0)=5, A(2)=6, B(4)...   → frets 0, 2
 *   (shape 1 cobre da 6ª à 3ª corda, conforme anotação)
 *
 * Nota: Os diagramas do livro mostram shapes verticais compactos
 * que cobrem ~3-4 casas e normalmente todas as 6 cordas.
 */

export const MAJOR_SCALE_CAGED: CagedTemplateSet = {
  type: 'major_scale',
  label: 'Escala Maior',
  intervals: [0, 2, 4, 5, 7, 9, 11],
  shapes: [
    // Shape 1 (pos I) — casas 0–3
    // Padrão formato "C" — começa na 5ª (G) na 6ª corda
    [
      n(6, 0, NOTE, 3),  // E — 3ª (Mi)
      n(6, 1, NOTE, 4),  // F — 4ª (Fá)
      n(6, 3, ROOT, 5),  // G — 5ª (Sol)
      n(5, 0, NOTE, 6),  // A — 6ª (Lá)
      n(5, 2, NOTE, 7),  // B — 7ª (Si)
      n(5, 3, ROOT, 1),  // C — 1ª (Dó) ★ tônica
      n(4, 0, NOTE, 2),  // D — 2ª (Ré)
      n(4, 2, NOTE, 3),  // E — 3ª (Mi)
      n(4, 3, NOTE, 4),  // F — 4ª (Fá)
      n(3, 0, NOTE, 5),  // G — 5ª (Sol)
      n(3, 2, NOTE, 6),  // A — 6ª (Lá)
      n(2, 0, NOTE, 7),  // B — 7ª (Si)
      n(2, 1, ROOT, 1),  // C — 1ª (Dó) ★ tônica
      n(1, 0, NOTE, 3),  // E — 3ª (Mi)
      n(1, 1, NOTE, 4),  // F — 4ª (Fá)
      n(1, 3, NOTE, 5),  // G — 5ª (Sol)  
    ],

    // Shape 2 (pos II) — casas 2–5
    // Padrão formato "A"
    [
      n(6, 3, NOTE, 5),  // G
      n(6, 5, NOTE, 6),  // A
      n(5, 2, NOTE, 7),  // B
      n(5, 3, ROOT, 1),  // C ★
      n(5, 5, NOTE, 2),  // D
      n(4, 2, NOTE, 3),  // E
      n(4, 3, NOTE, 4),  // F
      n(4, 5, NOTE, 5),  // G
      n(3, 2, NOTE, 6),  // A
      n(3, 4, NOTE, 7),  // B
      n(3, 5, ROOT, 1),  // C ★
      n(2, 3, NOTE, 2),  // D
      n(2, 5, NOTE, 3),  // E
      n(2, 6, NOTE, 4),  // F
      n(1, 3, NOTE, 5),  // G
      n(1, 5, NOTE, 6),  // A
    ],

    // Shape 3 (pos III) — casas 5–8 (referência: "V")
    // Padrão formato "G"
    [
      n(6, 5, NOTE, 6),  // A
      n(6, 7, NOTE, 7),  // B
      n(6, 8, ROOT, 1),  // C ★
      n(5, 5, NOTE, 2),  // D
      n(5, 7, NOTE, 3),  // E
      n(5, 8, NOTE, 4),  // F
      n(4, 5, NOTE, 5),  // G
      n(4, 7, NOTE, 6),  // A
      n(3, 4, NOTE, 7),  // B
      n(3, 5, ROOT, 1),  // C ★
      n(3, 7, NOTE, 2),  // D
      n(2, 5, NOTE, 3),  // E
      n(2, 6, NOTE, 4),  // F
      n(2, 8, NOTE, 5),  // G
      n(1, 5, NOTE, 6),  // A
      n(1, 7, NOTE, 7),  // B
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 7–10 (referência: "VIII")
    // Padrão formato "E"
    [
      n(6, 7, NOTE, 7),  // B
      n(6, 8, ROOT, 1),  // C ★
      n(6, 10, NOTE, 2), // D
      n(5, 7, NOTE, 3),  // E
      n(5, 8, NOTE, 4),  // F
      n(5, 10, NOTE, 5), // G
      n(4, 7, NOTE, 6),  // A
      n(4, 9, NOTE, 7),  // B
      n(4, 10, ROOT, 1), // C ★
      n(3, 7, NOTE, 2),  // D
      n(3, 9, NOTE, 3),  // E
      n(3, 10, NOTE, 4), // F
      n(2, 8, NOTE, 5),  // G
      n(2, 10, NOTE, 6), // A
      n(1, 7, NOTE, 7),  // B
      n(1, 8, ROOT, 1),  // C ★
      n(1, 10, NOTE, 2), // D
    ],

    // Shape 5 (pos V) — casas 10–13 (referência: "X")
    // Padrão formato "D"
    [
      n(6, 10, NOTE, 2), // D
      n(6, 12, NOTE, 3), // E
      n(6, 13, NOTE, 4), // F
      n(5, 10, NOTE, 5), // G
      n(5, 12, NOTE, 6), // A
      n(4, 9, NOTE, 7),  // B
      n(4, 10, ROOT, 1), // C ★
      n(4, 12, NOTE, 2), // D
      n(3, 9, NOTE, 3),  // E
      n(3, 10, NOTE, 4), // F
      n(3, 12, NOTE, 5), // G
      n(2, 10, NOTE, 6), // A
      n(2, 12, NOTE, 7), // B
      n(2, 13, ROOT, 1), // C ★
      n(1, 10, NOTE, 2), // D
      n(1, 12, NOTE, 3), // E
      n(1, 13, NOTE, 4), // F
    ],
  ],
}

/**
 * Escala Menor Natural em Dó (C) — 5 shapes
 * Ref: Imagem 5 (1.2 Escala menor natural)
 *
 * Intervalos: 1, 2, b3, 4, 5, b6, b7
 * Semitons:   0, 2, 3, 5, 7, 8, 10
 */
export const MINOR_SCALE_CAGED: CagedTemplateSet = {
  type: 'minor_scale',
  label: 'Escala Menor Natural',
  intervals: [0, 2, 3, 5, 7, 8, 10],
  shapes: [
    // Shape 1 (pos I) — casas 0–3
    [
      n(6, 0, NOTE, 3),  // Eb — b3
      n(6, 1, NOTE, 4),  // F — 4
      n(6, 3, NOTE, 5),  // G — 5
      n(5, 0, NOTE, 6),  // Ab — b6
      n(5, 1, NOTE, 7),  // Bb — b7
      n(5, 3, ROOT, 1),  // C — 1 ★
      n(4, 0, NOTE, 2),  // D — 2
      n(4, 1, NOTE, 3),  // Eb — b3
      n(4, 3, NOTE, 4),  // F — 4
      n(3, 0, NOTE, 5),  // G — 5
      n(3, 1, NOTE, 6),  // Ab — b6
      n(3, 3, NOTE, 7),  // Bb — b7
      n(2, 1, ROOT, 1),  // C — 1 ★
      n(2, 3, NOTE, 2),  // D — 2
      n(1, 0, NOTE, 3),  // Eb — b3
      n(1, 1, NOTE, 4),  // F — 4
      n(1, 3, NOTE, 5),  // G — 5
    ],

    // Shape 2 (pos II) — casas 3–6
    [
      n(6, 3, NOTE, 5),  // G
      n(6, 4, NOTE, 6),  // Ab
      n(6, 6, NOTE, 7),  // Bb
      n(5, 3, ROOT, 1),  // C ★
      n(5, 5, NOTE, 2),  // D
      n(5, 6, NOTE, 3),  // Eb
      n(4, 3, NOTE, 4),  // F
      n(4, 5, NOTE, 5),  // G
      n(4, 6, NOTE, 6),  // Ab
      n(3, 3, NOTE, 7),  // Bb
      n(3, 5, ROOT, 1),  // C ★
      n(2, 3, NOTE, 2),  // D
      n(2, 4, NOTE, 3),  // Eb
      n(2, 6, NOTE, 4),  // F
      n(1, 3, NOTE, 5),  // G
      n(1, 4, NOTE, 6),  // Ab
      n(1, 6, NOTE, 7),  // Bb
    ],

    // Shape 3 (pos III) — casas 5–8
    [
      n(6, 5, NOTE, 6),  // Ab
      n(6, 6, NOTE, 7),  // Bb
      n(6, 8, ROOT, 1),  // C ★
      n(5, 5, NOTE, 2),  // D
      n(5, 6, NOTE, 3),  // Eb
      n(5, 8, NOTE, 4),  // F
      n(4, 5, NOTE, 5),  // G
      n(4, 6, NOTE, 6),  // Ab
      n(4, 8, NOTE, 7),  // Bb
      n(3, 5, ROOT, 1),  // C ★
      n(3, 7, NOTE, 2),  // D
      n(3, 8, NOTE, 3),  // Eb
      n(2, 6, NOTE, 4),  // F
      n(2, 8, NOTE, 5),  // G
      n(1, 6, NOTE, 7),  // Bb
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–11
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 10, NOTE, 2), // D
      n(6, 11, NOTE, 3), // Eb
      n(5, 8, NOTE, 4),  // F
      n(5, 10, NOTE, 5), // G
      n(5, 11, NOTE, 6), // Ab
      n(4, 8, NOTE, 7),  // Bb
      n(4, 10, ROOT, 1), // C ★
      n(3, 7, NOTE, 2),  // D
      n(3, 8, NOTE, 3),  // Eb
      n(3, 10, NOTE, 4), // F
      n(2, 8, NOTE, 5),  // G
      n(2, 9, NOTE, 6),  // Ab
      n(2, 11, NOTE, 7), // Bb
      n(1, 8, ROOT, 1),  // C ★
      n(1, 10, NOTE, 2), // D
      n(1, 11, NOTE, 3), // Eb
    ],

    // Shape 5 (pos V) — casas 10–13
    [
      n(6, 10, NOTE, 2), // D
      n(6, 11, NOTE, 3), // Eb
      n(6, 13, NOTE, 4), // F
      n(5, 10, NOTE, 5), // G
      n(5, 11, NOTE, 6), // Ab
      n(5, 13, NOTE, 7), // Bb
      n(4, 10, ROOT, 1), // C ★
      n(4, 12, NOTE, 2), // D
      n(4, 13, NOTE, 3), // Eb
      n(3, 10, NOTE, 4), // F
      n(3, 12, NOTE, 5), // G
      n(3, 13, NOTE, 6), // Ab
      n(2, 11, NOTE, 7), // Bb
      n(2, 13, ROOT, 1), // C ★
      n(1, 11, NOTE, 3), // Eb
      n(1, 13, NOTE, 4), // F
    ],
  ],
}

/**
 * Escala Menor Harmônica em Dó (C) — 5 shapes
 * Ref: Imagem 6 (1.3 Escala menor harmônica)
 *
 * Intervalos: 1, 2, b3, 4, 5, b6, 7
 * Semitons:   0, 2, 3, 5, 7, 8, 11
 */
export const HARMONIC_MINOR_SCALE_CAGED: CagedTemplateSet = {
  type: 'harmonic_minor_scale',
  label: 'Escala Menor Harmônica',
  intervals: [0, 2, 3, 5, 7, 8, 11],
  shapes: [
    // Shape 1 (pos I) — casas 0–4
    [
      n(6, 0, NOTE, 3),  // Eb
      n(6, 1, NOTE, 4),  // F
      n(6, 3, NOTE, 5),  // G
      n(6, 4, NOTE, 6),  // Ab
      n(5, 0, NOTE, 7),  // B (7ª maior)
      n(5, 3, ROOT, 1),  // C ★
      n(4, 0, NOTE, 2),  // D
      n(4, 1, NOTE, 3),  // Eb
      n(4, 3, NOTE, 4),  // F
      n(3, 0, NOTE, 5),  // G
      n(3, 1, NOTE, 6),  // Ab
      n(3, 4, NOTE, 7),  // B
      n(2, 1, ROOT, 1),  // C ★
      n(2, 3, NOTE, 2),  // D
      n(1, 0, NOTE, 3),  // Eb
      n(1, 1, NOTE, 4),  // F
      n(1, 3, NOTE, 5),  // G
      n(1, 4, NOTE, 6),  // Ab
    ],

    // Shape 2 (pos II) — casas 3–7
    [
      n(6, 3, NOTE, 5),  // G
      n(6, 4, NOTE, 6),  // Ab
      n(6, 7, NOTE, 7),  // B
      n(5, 3, ROOT, 1),  // C ★
      n(5, 5, NOTE, 2),  // D
      n(5, 6, NOTE, 3),  // Eb
      n(4, 3, NOTE, 4),  // F
      n(4, 5, NOTE, 5),  // G
      n(4, 6, NOTE, 6),  // Ab
      n(3, 4, NOTE, 7),  // B
      n(3, 5, ROOT, 1),  // C ★
      n(2, 3, NOTE, 2),  // D
      n(2, 4, NOTE, 3),  // Eb
      n(2, 6, NOTE, 4),  // F
      n(1, 3, NOTE, 5),  // G
      n(1, 4, NOTE, 6),  // Ab
      n(1, 7, NOTE, 7),  // B
    ],

    // Shape 3 (pos III) — casas 5–9
    [
      n(6, 5, NOTE, 6),  // Ab
      n(6, 7, NOTE, 7),  // B
      n(6, 8, ROOT, 1),  // C ★
      n(5, 5, NOTE, 2),  // D
      n(5, 6, NOTE, 3),  // Eb
      n(5, 8, NOTE, 4),  // F
      n(4, 5, NOTE, 5),  // G
      n(4, 6, NOTE, 6),  // Ab
      n(4, 9, NOTE, 7),  // B
      n(3, 5, ROOT, 1),  // C ★
      n(3, 7, NOTE, 2),  // D
      n(3, 8, NOTE, 3),  // Eb
      n(2, 6, NOTE, 4),  // F
      n(2, 8, NOTE, 5),  // G
      n(2, 9, NOTE, 6),  // Ab
      n(1, 7, NOTE, 7),  // B
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–11
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 10, NOTE, 2), // D
      n(6, 11, NOTE, 3), // Eb
      n(5, 8, NOTE, 4),  // F
      n(5, 10, NOTE, 5), // G
      n(5, 11, NOTE, 6), // Ab
      n(4, 9, NOTE, 7),  // B
      n(4, 10, ROOT, 1), // C ★
      n(3, 7, NOTE, 2),  // D
      n(3, 8, NOTE, 3),  // Eb
      n(3, 10, NOTE, 4), // F
      n(2, 8, NOTE, 5),  // G
      n(2, 9, NOTE, 6),  // Ab
      n(2, 11, NOTE, 7), // B  (7M, não b7)
      n(1, 8, ROOT, 1),  // C ★
      n(1, 10, NOTE, 2), // D
      n(1, 11, NOTE, 3), // Eb
    ],

    // Shape 5 (pos V) — casas 10–14
    [
      n(6, 10, NOTE, 2), // D
      n(6, 11, NOTE, 3), // Eb
      n(6, 13, NOTE, 4), // F
      n(5, 10, NOTE, 5), // G
      n(5, 11, NOTE, 6), // Ab
      n(5, 14, NOTE, 7), // B
      n(4, 10, ROOT, 1), // C ★
      n(4, 12, NOTE, 2), // D
      n(4, 13, NOTE, 3), // Eb
      n(3, 10, NOTE, 4), // F
      n(3, 12, NOTE, 5), // G
      n(3, 13, NOTE, 6), // Ab
      n(2, 12, NOTE, 7), // B
      n(2, 13, ROOT, 1), // C ★
      n(1, 11, NOTE, 3), // Eb
      n(1, 13, NOTE, 4), // F
    ],
  ],
}

/**
 * Escala Menor Melódica em Dó (C) — 5 shapes
 * Ref: Imagem 7 (1.4 Escala menor melódica real)
 *
 * Intervalos: 1, 2, b3, 4, 5, 6, 7
 * Semitons:   0, 2, 3, 5, 7, 9, 11
 */
export const MELODIC_MINOR_SCALE_CAGED: CagedTemplateSet = {
  type: 'melodic_minor_scale',
  label: 'Escala Menor Melódica',
  intervals: [0, 2, 3, 5, 7, 9, 11],
  shapes: [
    // Shape 1 (pos I) — casas 0–4
    [
      n(6, 0, NOTE, 3),  // Eb
      n(6, 1, NOTE, 4),  // F
      n(6, 3, NOTE, 5),  // G
      n(5, 0, NOTE, 6),  // A
      n(5, 2, NOTE, 7),  // B
      n(5, 3, ROOT, 1),  // C ★
      n(4, 0, NOTE, 2),  // D
      n(4, 1, NOTE, 3),  // Eb
      n(4, 3, NOTE, 4),  // F
      n(3, 0, NOTE, 5),  // G
      n(3, 2, NOTE, 6),  // A
      n(3, 4, NOTE, 7),  // B
      n(2, 1, ROOT, 1),  // C ★
      n(2, 3, NOTE, 2),  // D
      n(1, 0, NOTE, 3),  // Eb
      n(1, 1, NOTE, 4),  // F
      n(1, 3, NOTE, 5),  // G
    ],

    // Shape 2 (pos II) — casas 3–6
    [
      n(6, 3, NOTE, 5),  // G
      n(6, 5, NOTE, 6),  // A
      n(6, 7, NOTE, 7),  // B
      n(5, 3, ROOT, 1),  // C ★
      n(5, 5, NOTE, 2),  // D
      n(5, 6, NOTE, 3),  // Eb
      n(4, 3, NOTE, 4),  // F
      n(4, 5, NOTE, 5),  // G
      n(4, 7, NOTE, 6),  // A
      n(3, 4, NOTE, 7),  // B
      n(3, 5, ROOT, 1),  // C ★
      n(2, 3, NOTE, 2),  // D
      n(2, 4, NOTE, 3),  // Eb
      n(2, 6, NOTE, 4),  // F
      n(1, 3, NOTE, 5),  // G
      n(1, 5, NOTE, 6),  // A
      n(1, 7, NOTE, 7),  // B
    ],

    // Shape 3 (pos III) — casas 5–9
    [
      n(6, 5, NOTE, 6),  // A
      n(6, 7, NOTE, 7),  // B
      n(6, 8, ROOT, 1),  // C ★
      n(5, 5, NOTE, 2),  // D
      n(5, 6, NOTE, 3),  // Eb
      n(5, 8, NOTE, 4),  // F
      n(4, 5, NOTE, 5),  // G
      n(4, 7, NOTE, 6),  // A
      n(4, 9, NOTE, 7),  // B
      n(3, 5, ROOT, 1),  // C ★
      n(3, 7, NOTE, 2),  // D
      n(3, 8, NOTE, 3),  // Eb
      n(2, 6, NOTE, 4),  // F
      n(2, 8, NOTE, 5),  // G
      n(2, 9, NOTE, 6),  // A
      n(1, 7, NOTE, 7),  // B
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–11
    [
      n(6, 7, NOTE, 7),  // B
      n(6, 8, ROOT, 1),  // C ★
      n(6, 10, NOTE, 2), // D
      n(6, 11, NOTE, 3), // Eb
      n(5, 8, NOTE, 4),  // F
      n(5, 10, NOTE, 5), // G
      n(5, 12, NOTE, 6), // A
      n(4, 9, NOTE, 7),  // B
      n(4, 10, ROOT, 1), // C ★
      n(3, 7, NOTE, 2),  // D
      n(3, 8, NOTE, 3),  // Eb
      n(3, 10, NOTE, 4), // F
      n(2, 8, NOTE, 5),  // G
      n(2, 9, NOTE, 6),  // A
      n(2, 11, NOTE, 7), // B
      n(1, 8, ROOT, 1),  // C ★
      n(1, 10, NOTE, 2), // D
      n(1, 11, NOTE, 3), // Eb
    ],

    // Shape 5 (pos V) — casas 10–14
    [
      n(6, 10, NOTE, 2), // D
      n(6, 11, NOTE, 3), // Eb
      n(6, 13, NOTE, 4), // F
      n(5, 10, NOTE, 5), // G
      n(5, 12, NOTE, 6), // A
      n(5, 14, NOTE, 7), // B
      n(4, 10, ROOT, 1), // C ★
      n(4, 12, NOTE, 2), // D
      n(4, 13, NOTE, 3), // Eb
      n(3, 10, NOTE, 4), // F
      n(3, 12, NOTE, 5), // G
      n(3, 14, NOTE, 6), // A
      n(2, 11, NOTE, 7), // B
      n(2, 13, ROOT, 1), // C ★
      n(1, 10, NOTE, 2), // D
      n(1, 11, NOTE, 3), // Eb
      n(1, 13, NOTE, 4), // F
    ],
  ],
}

// ═══════════════════════════════════════════════════════════════════════
// ARPEJOS (TRÍADES)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Tríade Maior em Dó (C) — 5 shapes
 * Ref: Imagem 1 (Tríade maior)
 *
 * Intervalos: 1, 3, 5
 * Semitons:   0, 4, 7
 */
export const MAJOR_TRIAD_CAGED: CagedTemplateSet = {
  type: 'major',
  label: 'Tríade Maior',
  intervals: [0, 4, 7],
  shapes: [
    // Shape 1 (pos I) — casas 0–3
    [
      n(6, 0, NOTE, 3),  // E — 3ª
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 2, NOTE, 3),  // E — 3ª
      n(3, 0, NOTE, 5),  // G — 5ª
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(1, 0, NOTE, 3),  // E — 3ª
      n(1, 3, NOTE, 5),  // G — 5ª
    ],

    // Shape 2 (pos II) — casas 2–5
    [
      n(6, 3, NOTE, 5),  // G
      n(5, 3, ROOT, 1),  // C ★
      n(4, 2, NOTE, 3),  // E
      n(4, 5, NOTE, 5),  // G
      n(3, 5, ROOT, 1),  // C ★
      n(2, 5, NOTE, 3),  // E
      n(1, 3, NOTE, 5),  // G
      n(1, 7, NOTE, 7),  // (próxima oitava: B→E)
    ],

    // Shape 3 (pos III) — casas 5–10
    [
      n(6, 7, NOTE, 5),  // (projeção)
      n(6, 8, ROOT, 1),  // C ★
      n(5, 7, NOTE, 3),  // E
      n(4, 5, NOTE, 5),  // G
      n(3, 5, ROOT, 1),  // C ★
      n(3, 9, NOTE, 3),  // E
      n(2, 8, NOTE, 5),  // G
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–12
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 12, NOTE, 3), // E
      n(5, 10, NOTE, 5), // G
      n(4, 10, ROOT, 1), // C ★
      n(3, 9, NOTE, 3),  // E
      n(2, 8, NOTE, 5),  // G
      n(2, 12, NOTE, 7), // (projeção)
      n(1, 8, ROOT, 1),  // C ★
      n(1, 12, NOTE, 3), // E
    ],

    // Shape 5 (pos V) — casas 10–14
    [
      n(6, 12, NOTE, 3), // E — 3ª
      n(5, 10, NOTE, 5), // G — 5ª
      n(4, 10, ROOT, 1), // C — 1ª ★
      n(4, 14, NOTE, 3), // E — 3ª
      n(3, 12, NOTE, 5), // G — 5ª
      n(2, 13, ROOT, 1), // C — 1ª ★
      n(1, 12, NOTE, 3), // E — 3ª
    ],
  ],
}

/**
 * Tríade Menor em Dó (C) — 5 shapes
 * Ref: Imagem 2 (Tríade menor)
 *
 * Intervalos: 1, b3, 5
 * Semitons:   0, 3, 7
 */
export const MINOR_TRIAD_CAGED: CagedTemplateSet = {
  type: 'minor',
  label: 'Tríade Menor',
  intervals: [0, 3, 7],
  shapes: [
    // Shape 1 (pos I) — casas 0–4
    [
      n(6, 0, NOTE, 3),  // Eb — b3
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 1, NOTE, 3),  // Eb — b3
      n(3, 0, NOTE, 5),  // G — 5ª
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(2, 4, NOTE, 3),  // Eb — b3
      n(1, 3, NOTE, 5),  // G — 5ª
    ],

    // Shape 2 (pos II) — casas 3–6
    [
      n(6, 3, NOTE, 5),  // G
      n(5, 3, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(4, 5, NOTE, 5),  // G
      n(3, 5, ROOT, 1),  // C ★
      n(2, 4, NOTE, 3),  // Eb
      n(1, 3, NOTE, 5),  // G
      n(1, 6, NOTE, 3),  // Eb (oitava acima)
    ],

    // Shape 3 (pos III) — casas 5–8
    [
      n(6, 8, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(4, 5, NOTE, 5),  // G
      n(3, 5, ROOT, 1),  // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(2, 8, NOTE, 5),  // G
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–11
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 11, NOTE, 3), // Eb
      n(5, 10, NOTE, 5), // G
      n(4, 10, ROOT, 1), // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(2, 8, NOTE, 5),  // G
      n(2, 11, NOTE, 7), // (projeção)
      n(1, 8, ROOT, 1),  // C ★
      n(1, 11, NOTE, 3), // Eb
    ],

    // Shape 5 (pos V) — casas 10–15
    [
      n(6, 11, NOTE, 3), // Eb
      n(5, 10, NOTE, 5), // G
      n(4, 10, ROOT, 1), // C ★
      n(4, 13, NOTE, 3), // Eb
      n(3, 12, NOTE, 5), // G
      n(2, 13, ROOT, 1), // C ★
      n(1, 11, NOTE, 3), // Eb
      n(1, 15, NOTE, 5), // G
    ],
  ],
}

/**
 * Tríade Diminuta em Dó (C) — 5 shapes
 *
 * Intervalos: 1, b3, b5
 * Semitons:   0, 3, 6
 * Notas em C: C, Eb, Gb
 *
 * Mapa de trastes por corda (afinação padrão):
 *   6ª(E): Gb=2, C=8, Eb=11
 *   5ª(A): C=3, Eb=6, Gb=9
 *   4ª(D): Eb=1, Gb=4, C=10
 *   3ª(G): C=5, Eb=8, Gb=11
 *   2ª(B): Eb=4, Gb=7, C=1,13
 *   1ª(E): Gb=2, C=8, Eb=11
 */
export const DIM_TRIAD_CAGED: CagedTemplateSet = {
  type: 'dim',
  label: 'Tríade Diminuta',
  intervals: [0, 3, 6],
  shapes: [
    // Shape 1 (pos I) — casas 1–5 — formato "C"
    [
      n(6, 2, NOTE, 5),  // Gb — b5
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 1, NOTE, 3),  // Eb — b3
      n(4, 4, NOTE, 5),  // Gb — b5
      n(3, 5, ROOT, 1),  // C — 1ª ★
      n(2, 4, NOTE, 3),  // Eb — b3
      n(1, 2, NOTE, 5),  // Gb — b5
    ],

    // Shape 2 (pos II) — casas 2–8 — formato "A"
    [
      n(6, 2, NOTE, 5),  // Gb — b5
      n(5, 3, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(4, 4, NOTE, 5),  // Gb
      n(3, 5, ROOT, 1),  // C ★
      n(2, 4, NOTE, 3),  // Eb
      n(2, 7, NOTE, 5),  // Gb
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 3 (pos III) — casas 5–9 — formato "G"
    [
      n(6, 8, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(5, 9, NOTE, 5),  // Gb
      n(4, 10, ROOT, 1), // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(2, 7, NOTE, 5),  // Gb
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–11 — formato "E"
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 11, NOTE, 3), // Eb
      n(5, 9, NOTE, 5),  // Gb
      n(4, 10, ROOT, 1), // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(3, 11, NOTE, 5), // Gb
      n(2, 13, ROOT, 1), // C ★
      n(1, 11, NOTE, 3), // Eb
    ],

    // Shape 5 (pos V) — casas 10–14 — formato "D"
    [
      n(6, 11, NOTE, 3), // Eb
      n(6, 14, NOTE, 5), // Gb
      n(5, 15, ROOT, 1), // C ★
      n(4, 13, NOTE, 3), // Eb
      n(3, 11, NOTE, 5), // Gb
      n(2, 13, ROOT, 1), // C ★
      n(1, 11, NOTE, 3), // Eb
      n(1, 14, NOTE, 5), // Gb
    ],
  ],
}

/**
 * Tríade Aumentada em Dó (C) — 5 shapes
 *
 * Intervalos: 1, 3, #5
 * Semitons:   0, 4, 8
 * Notas em C: C, E, G#
 *
 * Mapa de trastes por corda (afinação padrão):
 *   6ª(E): E=0,12  G#=4  C=8
 *   5ª(A): C=3  E=7  G#=11
 *   4ª(D): E=2,14  G#=6  C=10
 *   3ª(G): G#=1,13  C=5  E=9
 *   2ª(B): C=1,13  E=5  G#=9
 *   1ª(E): E=0,12  G#=4  C=8
 */
export const AUG_TRIAD_CAGED: CagedTemplateSet = {
  type: 'aug',
  label: 'Tríade Aumentada',
  intervals: [0, 4, 8],
  shapes: [
    // Shape 1 (pos I) — casas 0–5 — formato "C"
    [
      n(6, 0, NOTE, 3),  // E — 3ª
      n(6, 4, NOTE, 5),  // G# — #5
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 2, NOTE, 3),  // E — 3ª
      n(3, 1, NOTE, 5),  // G# — #5
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(1, 0, NOTE, 3),  // E — 3ª
    ],

    // Shape 2 (pos II) — casas 3–7 — formato "A"
    [
      n(6, 4, NOTE, 5),  // G# — #5
      n(5, 3, ROOT, 1),  // C ★
      n(5, 7, NOTE, 3),  // E — 3ª
      n(4, 6, NOTE, 5),  // G# — #5
      n(3, 5, ROOT, 1),  // C ★
      n(2, 5, NOTE, 3),  // E — 3ª
      n(1, 4, NOTE, 5),  // G# — #5
    ],

    // Shape 3 (pos III) — casas 5–9 — formato "G"
    [
      n(6, 8, ROOT, 1),  // C ★
      n(5, 7, NOTE, 3),  // E — 3ª
      n(4, 6, NOTE, 5),  // G# — #5
      n(3, 5, ROOT, 1),  // C ★
      n(3, 9, NOTE, 3),  // E — 3ª
      n(2, 9, NOTE, 5),  // G# — #5
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–13 — formato "E"
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 12, NOTE, 3), // E — 3ª
      n(5, 11, NOTE, 5), // G# — #5
      n(4, 10, ROOT, 1), // C ★
      n(3, 9, NOTE, 3),  // E — 3ª
      n(2, 9, NOTE, 5),  // G# — #5
      n(2, 13, ROOT, 1), // C ★
      n(1, 12, NOTE, 3), // E — 3ª
    ],

    // Shape 5 (pos V) — casas 10–15 — formato "D"
    [
      n(6, 12, NOTE, 3), // E — 3ª
      n(5, 11, NOTE, 5), // G# — #5
      n(5, 15, ROOT, 1), // C ★
      n(4, 14, NOTE, 3), // E — 3ª
      n(3, 13, NOTE, 5), // G# — #5
      n(2, 13, ROOT, 1), // C ★
      n(1, 12, NOTE, 3), // E — 3ª
    ],
  ],
}

/**
 * Tríade sus2 em Dó (C) — 5 shapes
 *
 * Intervalos: 1, 2, 5
 * Semitons:   0, 2, 7
 * Notas em C: C, D, G
 *
 * Mapa de trastes por corda (afinação padrão):
 *   6ª(E): G=3,15  C=8  D=10
 *   5ª(A): C=3,15  D=5  G=10
 *   4ª(D): D=0,12  G=5  C=10
 *   3ª(G): G=0,12  C=5  D=7
 *   2ª(B): C=1,13  D=3,15  G=8
 *   1ª(E): G=3,15  C=8  D=10
 */
export const SUS2_TRIAD_CAGED: CagedTemplateSet = {
  type: 'sus2',
  label: 'Tríade sus2',
  intervals: [0, 2, 7],
  shapes: [
    // Shape 1 (pos I) — casas 0–5 — formato "C"
    [
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(5, 5, NOTE, 2),  // D — 2ª
      n(4, 5, NOTE, 5),  // G — 5ª
      n(3, 5, ROOT, 1),  // C — 1ª ★
      n(2, 3, NOTE, 2),  // D — 2ª
      n(1, 3, NOTE, 5),  // G — 5ª
    ],

    // Shape 2 (pos II) — casas 3–8 — formato "A"
    [
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 3, ROOT, 1),  // C ★
      n(5, 5, NOTE, 2),  // D — 2ª
      n(4, 5, NOTE, 5),  // G — 5ª
      n(3, 5, ROOT, 1),  // C ★
      n(3, 7, NOTE, 2),  // D — 2ª
      n(2, 8, NOTE, 5),  // G — 5ª
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 3 (pos III) — casas 5–10 — formato "G"
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 10, NOTE, 2), // D — 2ª
      n(5, 10, NOTE, 5), // G — 5ª
      n(4, 10, ROOT, 1), // C ★
      n(3, 7, NOTE, 2),  // D — 2ª
      n(2, 8, NOTE, 5),  // G — 5ª
      n(1, 8, ROOT, 1),  // C ★
      n(1, 10, NOTE, 2), // D — 2ª
    ],

    // Shape 4 (pos IV) — casas 8–13 — formato "E"
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 10, NOTE, 2), // D — 2ª
      n(5, 10, NOTE, 5), // G — 5ª
      n(4, 10, ROOT, 1), // C ★
      n(4, 12, NOTE, 2), // D — 2ª
      n(3, 12, NOTE, 5), // G — 5ª
      n(2, 13, ROOT, 1), // C ★
      n(1, 10, NOTE, 2), // D — 2ª
    ],

    // Shape 5 (pos V) — casas 10–15 — formato "D"
    [
      n(6, 10, NOTE, 2), // D — 2ª
      n(6, 15, NOTE, 5), // G — 5ª
      n(5, 10, NOTE, 5), // G — 5ª
      n(5, 15, ROOT, 1), // C ★
      n(4, 12, NOTE, 2), // D — 2ª
      n(3, 12, NOTE, 5), // G — 5ª
      n(2, 13, ROOT, 1), // C ★
      n(2, 15, NOTE, 2), // D — 2ª
      n(1, 15, NOTE, 5), // G — 5ª
    ],
  ],
}

/**
 * Tríade sus4 em Dó (C) — 5 shapes
 *
 * Intervalos: 1, 4, 5
 * Semitons:   0, 5, 7
 * Notas em C: C, F, G
 *
 * Mapa de trastes por corda (afinação padrão):
 *   6ª(E): F=1,13  G=3,15  C=8
 *   5ª(A): C=3,15  F=8  G=10
 *   4ª(D): F=3,15  G=5  C=10
 *   3ª(G): G=0,12  C=5  F=10
 *   2ª(B): C=1,13  F=6  G=8
 *   1ª(E): F=1,13  G=3,15  C=8
 */
export const SUS4_TRIAD_CAGED: CagedTemplateSet = {
  type: 'sus4',
  label: 'Tríade sus4',
  intervals: [0, 5, 7],
  shapes: [
    // Shape 1 (pos I) — casas 0–5 — formato "C"
    [
      n(6, 1, NOTE, 4),  // F — 4ª
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 3, NOTE, 4),  // F — 4ª
      n(3, 0, NOTE, 5),  // G — 5ª
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(1, 1, NOTE, 4),  // F — 4ª
      n(1, 3, NOTE, 5),  // G — 5ª
    ],

    // Shape 2 (pos II) — casas 3–8 — formato "A"
    [
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 3, ROOT, 1),  // C ★
      n(5, 8, NOTE, 4),  // F — 4ª
      n(4, 5, NOTE, 5),  // G — 5ª
      n(3, 5, ROOT, 1),  // C ★
      n(2, 6, NOTE, 4),  // F — 4ª
      n(2, 8, NOTE, 5),  // G — 5ª
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 3 (pos III) — casas 5–10 — formato "G"
    [
      n(6, 8, ROOT, 1),  // C ★
      n(5, 8, NOTE, 4),  // F — 4ª
      n(5, 10, NOTE, 5), // G — 5ª
      n(4, 10, ROOT, 1), // C ★
      n(3, 10, NOTE, 4), // F — 4ª
      n(2, 8, NOTE, 5),  // G — 5ª
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–13 — formato "E"
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 13, NOTE, 4), // F — 4ª
      n(5, 10, NOTE, 5), // G — 5ª
      n(4, 10, ROOT, 1), // C ★
      n(3, 10, NOTE, 4), // F — 4ª
      n(3, 12, NOTE, 5), // G — 5ª
      n(2, 13, ROOT, 1), // C ★
      n(1, 13, NOTE, 4), // F — 4ª
    ],

    // Shape 5 (pos V) — casas 10–15 — formato "D"
    [
      n(6, 13, NOTE, 4), // F — 4ª
      n(6, 15, NOTE, 5), // G — 5ª
      n(5, 15, ROOT, 1), // C ★
      n(4, 15, NOTE, 4), // F — 4ª
      n(3, 12, NOTE, 5), // G — 5ª
      n(2, 13, ROOT, 1), // C ★
      n(1, 13, NOTE, 4), // F — 4ª
      n(1, 15, NOTE, 5), // G — 5ª
    ],
  ],
}

/**
 * Acorde add9 em Dó (C) — 5 shapes
 *
 * Intervalos: 1, 2(9), 3, 5
 * Semitons:   0, 2, 4, 7
 * Notas em C: C, D, E, G
 *
 * Mapa de trastes por corda (afinação padrão):
 *   6ª(E): E=0,12  G=3,15  C=8  D=10
 *   5ª(A): C=3,15  D=5  E=7  G=10
 *   4ª(D): D=0,12  E=2,14  G=5  C=10
 *   3ª(G): G=0,12  C=5  D=7  E=9
 *   2ª(B): C=1,13  D=3,15  E=5  G=8
 *   1ª(E): E=0,12  G=3,15  C=8  D=10
 */
export const ADD9_TRIAD_CAGED: CagedTemplateSet = {
  type: 'add9',
  label: 'Acorde add9',
  intervals: [0, 2, 4, 7],
  shapes: [
    // Shape 1 (pos I) — casas 0–3 — formato "C"
    [
      n(6, 0, NOTE, 3),  // E — 3ª
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 0, NOTE, 2),  // D — 9ª(2ª) (corda solta)
      n(4, 2, NOTE, 3),  // E — 3ª
      n(3, 0, NOTE, 5),  // G — 5ª (corda solta)
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(2, 3, NOTE, 2),  // D — 9ª(2ª)
      n(1, 0, NOTE, 3),  // E — 3ª
      n(1, 3, NOTE, 5),  // G — 5ª
    ],

    // Shape 2 (pos II) — casas 3–8 — formato "A"
    [
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 3, ROOT, 1),  // C ★
      n(5, 5, NOTE, 2),  // D — 9ª(2ª)
      n(5, 7, NOTE, 3),  // E — 3ª
      n(4, 5, NOTE, 5),  // G — 5ª
      n(3, 5, ROOT, 1),  // C ★
      n(3, 7, NOTE, 2),  // D — 9ª(2ª)
      n(2, 5, NOTE, 3),  // E — 3ª
      n(2, 8, NOTE, 5),  // G — 5ª
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 3 (pos III) — casas 5–10 — formato "G"
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 10, NOTE, 2), // D — 9ª(2ª)
      n(5, 7, NOTE, 3),  // E — 3ª
      n(5, 10, NOTE, 5), // G — 5ª
      n(4, 10, ROOT, 1), // C ★
      n(3, 7, NOTE, 2),  // D — 9ª(2ª)
      n(3, 9, NOTE, 3),  // E — 3ª
      n(2, 8, NOTE, 5),  // G — 5ª
      n(1, 8, ROOT, 1),  // C ★
      n(1, 10, NOTE, 2), // D — 9ª(2ª)
    ],

    // Shape 4 (pos IV) — casas 8–12 — formato "E"
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 10, NOTE, 2), // D — 9ª(2ª)
      n(6, 12, NOTE, 3), // E — 3ª
      n(5, 10, NOTE, 5), // G — 5ª
      n(4, 10, ROOT, 1), // C ★
      n(4, 12, NOTE, 2), // D — 9ª(2ª)
      n(3, 9, NOTE, 3),  // E — 3ª
      n(3, 12, NOTE, 5), // G — 5ª
      n(2, 13, ROOT, 1), // C ★
      n(1, 10, NOTE, 2), // D — 9ª(2ª)
      n(1, 12, NOTE, 3), // E — 3ª
    ],

    // Shape 5 (pos V) — casas 10–15 — formato "D"
    [
      n(6, 12, NOTE, 3), // E — 3ª
      n(6, 15, NOTE, 5), // G — 5ª
      n(5, 15, ROOT, 1), // C ★
      n(4, 12, NOTE, 2), // D — 9ª(2ª)
      n(4, 14, NOTE, 3), // E — 3ª
      n(3, 12, NOTE, 5), // G — 5ª
      n(2, 13, ROOT, 1), // C ★
      n(2, 15, NOTE, 2), // D — 9ª(2ª)
      n(1, 12, NOTE, 3), // E — 3ª
      n(1, 15, NOTE, 5), // G — 5ª
    ],
  ],
}

// ═══════════════════════════════════════════════════════════════════════
// ARPEJOS (TÉTRADES)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Tétrade Maior (Maj7) em Dó (C) — 5 shapes
 * Ref: Imagem 3 (1.2 Tétrades — Tétrade maior)
 *
 * Intervalos: 1, 3, 5, 7
 * Semitons:   0, 4, 7, 11
 */
export const MAJ7_TETRAD_CAGED: CagedTemplateSet = {
  type: 'maj7',
  label: 'Tétrade Maior (Maj7)',
  intervals: [0, 4, 7, 11],
  shapes: [
    // Shape 1 (pos I) — casas 0–3
    [
      n(6, 0, NOTE, 3),  // E — 3ª
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 2, NOTE, 7),  // B — 7ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 2, NOTE, 3),  // E — 3ª
      n(3, 0, NOTE, 5),  // G — 5ª
      n(2, 0, NOTE, 7),  // B — 7ª (corda solta)
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(1, 0, NOTE, 3),  // E — 3ª
      n(1, 3, NOTE, 5),  // G — 5ª
    ],

    // Shape 2 (pos II) — casas 2–5
    [
      n(6, 3, NOTE, 5),  // G
      n(5, 2, NOTE, 7),  // B
      n(5, 3, ROOT, 1),  // C ★
      n(4, 2, NOTE, 3),  // E
      n(4, 5, NOTE, 5),  // G
      n(3, 4, NOTE, 7),  // B
      n(3, 5, ROOT, 1),  // C ★
      n(2, 5, NOTE, 3),  // E
      n(1, 3, NOTE, 5),  // G
      n(1, 7, NOTE, 7),  // B
    ],

    // Shape 3 (pos III) — casas 5–9
    [
      n(6, 7, NOTE, 7),  // B
      n(6, 8, ROOT, 1),  // C ★
      n(5, 7, NOTE, 3),  // E
      n(4, 5, NOTE, 5),  // G
      n(4, 9, NOTE, 7),  // B
      n(3, 5, ROOT, 1),  // C ★
      n(3, 9, NOTE, 3),  // E
      n(2, 8, NOTE, 5),  // G
      n(1, 7, NOTE, 7),  // B
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 7–10
    [
      n(6, 8, ROOT, 1),  // C ★
      n(5, 7, NOTE, 3),  // E
      n(5, 10, NOTE, 5), // G
      n(4, 9, NOTE, 7),  // B
      n(4, 10, ROOT, 1), // C ★
      n(3, 9, NOTE, 3),  // E
      n(2, 8, NOTE, 5),  // G
      n(1, 7, NOTE, 7),  // B
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 5 (pos V) — casas 10–14
    [
      n(6, 12, NOTE, 3), // E
      n(5, 10, NOTE, 5), // G
      n(5, 14, NOTE, 7), // B
      n(4, 10, ROOT, 1), // C ★
      n(4, 14, NOTE, 3), // E
      n(3, 12, NOTE, 5), // G
      n(2, 12, NOTE, 7), // B
      n(2, 13, ROOT, 1), // C ★
      n(1, 12, NOTE, 3), // E
    ],
  ],
}

/**
 * Tétrade Dominante (C7) em Dó — 5 shapes
 * Base: tríade Maior + b7 (Bb)
 *
 * Intervalos: 1, 3, 5, b7
 * Semitons:   0, 4, 7, 10
 * Notas em C: C, E, G, Bb
 *
 * Bb por corda: 6ª=6  5ª=1,13  4ª=8  3ª=3,15  2ª=11  1ª=6
 */
export const DOM7_TETRAD_CAGED: CagedTemplateSet = {
  type: '7',
  label: 'Tétrade Dominante (7)',
  intervals: [0, 4, 7, 10],
  shapes: [
    // Shape 1 (pos I) — casas 0–3 — base: major shape 1
    [
      n(6, 0, NOTE, 3),  // E — 3ª
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 1, NOTE, 7),  // Bb — b7
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 2, NOTE, 3),  // E — 3ª
      n(3, 0, NOTE, 5),  // G — 5ª
      n(3, 3, NOTE, 7),  // Bb — b7
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(1, 0, NOTE, 3),  // E — 3ª
      n(1, 3, NOTE, 5),  // G — 5ª
    ],

    // Shape 2 (pos II) — casas 3–7 — base: major shape 2
    [
      n(6, 3, NOTE, 5),  // G
      n(6, 6, NOTE, 7),  // Bb
      n(5, 3, ROOT, 1),  // C ★
      n(5, 7, NOTE, 3),  // E
      n(4, 5, NOTE, 5),  // G
      n(3, 3, NOTE, 7),  // Bb
      n(3, 5, ROOT, 1),  // C ★
      n(2, 5, NOTE, 3),  // E
      n(1, 3, NOTE, 5),  // G
      n(1, 6, NOTE, 7),  // Bb
    ],

    // Shape 3 (pos III) — casas 5–9 — base: major shape 3
    [
      n(6, 6, NOTE, 7),  // Bb
      n(6, 8, ROOT, 1),  // C ★
      n(5, 7, NOTE, 3),  // E
      n(4, 5, NOTE, 5),  // G
      n(4, 8, NOTE, 7),  // Bb
      n(3, 5, ROOT, 1),  // C ★
      n(3, 9, NOTE, 3),  // E
      n(2, 8, NOTE, 5),  // G
      n(1, 6, NOTE, 7),  // Bb
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–12 — base: major shape 4
    [
      n(6, 8, ROOT, 1),  // C ★
      n(5, 7, NOTE, 3),  // E
      n(5, 10, NOTE, 5), // G
      n(4, 8, NOTE, 7),  // Bb
      n(4, 10, ROOT, 1), // C ★
      n(3, 9, NOTE, 3),  // E
      n(2, 8, NOTE, 5),  // G
      n(2, 11, NOTE, 7), // Bb
      n(1, 8, ROOT, 1),  // C ★
      n(1, 12, NOTE, 3), // E
    ],

    // Shape 5 (pos V) — casas 10–15 — base: major shape 5
    [
      n(6, 12, NOTE, 3), // E
      n(6, 15, NOTE, 5), // G
      n(5, 13, NOTE, 7), // Bb
      n(5, 15, ROOT, 1), // C ★
      n(4, 14, NOTE, 3), // E
      n(3, 12, NOTE, 5), // G
      n(3, 15, NOTE, 7), // Bb
      n(2, 13, ROOT, 1), // C ★
      n(1, 12, NOTE, 3), // E
      n(1, 15, NOTE, 5), // G
    ],
  ],
}

/**
 * Tétrade Menor com Sétima (Cm7) em Dó — 5 shapes
 * Base: tríade Menor + b7 (Bb)
 *
 * Intervalos: 1, b3, 5, b7
 * Semitons:   0, 3, 7, 10
 * Notas em C: C, Eb, G, Bb
 */
export const MIN7_TETRAD_CAGED: CagedTemplateSet = {
  type: 'm7',
  label: 'Tétrade Menor (m7)',
  intervals: [0, 3, 7, 10],
  shapes: [
    // Shape 1 (pos I) — casas 0–4 — base: minor shape 1
    [
      n(6, 0, NOTE, 3),  // Eb — b3
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 1, NOTE, 7),  // Bb — b7
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 1, NOTE, 3),  // Eb — b3
      n(3, 0, NOTE, 5),  // G — 5ª
      n(3, 3, NOTE, 7),  // Bb — b7
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(2, 4, NOTE, 3),  // Eb — b3
      n(1, 3, NOTE, 5),  // G — 5ª
    ],

    // Shape 2 (pos II) — casas 3–6 — base: minor shape 2
    [
      n(6, 3, NOTE, 5),  // G
      n(6, 6, NOTE, 7),  // Bb
      n(5, 3, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(4, 5, NOTE, 5),  // G
      n(3, 3, NOTE, 7),  // Bb
      n(3, 5, ROOT, 1),  // C ★
      n(2, 4, NOTE, 3),  // Eb
      n(1, 3, NOTE, 5),  // G
      n(1, 6, NOTE, 7),  // Bb
    ],

    // Shape 3 (pos III) — casas 5–8 — base: minor shape 3
    [
      n(6, 6, NOTE, 7),  // Bb
      n(6, 8, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(4, 5, NOTE, 5),  // G
      n(4, 8, NOTE, 7),  // Bb
      n(3, 5, ROOT, 1),  // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(2, 8, NOTE, 5),  // G
      n(1, 6, NOTE, 7),  // Bb
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–11 — base: minor shape 4
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 11, NOTE, 3), // Eb
      n(5, 10, NOTE, 5), // G
      n(5, 13, NOTE, 7), // Bb
      n(4, 10, ROOT, 1), // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(2, 8, NOTE, 5),  // G
      n(2, 11, NOTE, 7), // Bb
      n(1, 8, ROOT, 1),  // C ★
      n(1, 11, NOTE, 3), // Eb
    ],

    // Shape 5 (pos V) — casas 10–15 — base: minor shape 5
    [
      n(6, 11, NOTE, 3), // Eb
      n(6, 15, NOTE, 5), // G
      n(5, 13, NOTE, 7), // Bb
      n(5, 15, ROOT, 1), // C ★
      n(4, 13, NOTE, 3), // Eb
      n(3, 12, NOTE, 5), // G
      n(3, 15, NOTE, 7), // Bb
      n(2, 13, ROOT, 1), // C ★
      n(1, 11, NOTE, 3), // Eb
      n(1, 15, NOTE, 5), // G
    ],
  ],
}

/**
 * Tétrade Diminuta (Cdim7) em Dó — 5 shapes
 * Base: tríade Dim + bb7 (A = Bbb)
 *
 * Intervalos: 1, b3, b5, bb7
 * Semitons:   0, 3, 6, 9
 * Notas em C: C, Eb, Gb, A(Bbb)
 *
 * A por corda: 6ª=5  5ª=0,12  4ª=7  3ª=2,14  2ª=10  1ª=5
 */
export const DIM7_TETRAD_CAGED: CagedTemplateSet = {
  type: 'dim7',
  label: 'Tétrade Diminuta (dim7)',
  intervals: [0, 3, 6, 9],
  shapes: [
    // Shape 1 (pos I) — casas 1–5 — base: dim shape 1
    [
      n(6, 2, NOTE, 5),  // Gb — b5
      n(6, 5, NOTE, 7),  // A — bb7
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 1, NOTE, 3),  // Eb — b3
      n(4, 4, NOTE, 5),  // Gb — b5 (vizinho)
      n(3, 2, NOTE, 7),  // A — bb7
      n(2, 4, NOTE, 3),  // Eb — b3
      n(1, 2, NOTE, 5),  // Gb — b5
      n(1, 5, NOTE, 7),  // A — bb7
    ],

    // Shape 2 (pos II) — casas 2–8 — base: dim shape 2
    [
      n(6, 2, NOTE, 5),  // Gb
      n(6, 5, NOTE, 7),  // A
      n(5, 3, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(4, 4, NOTE, 5),  // Gb
      n(4, 7, NOTE, 7),  // A
      n(3, 8, NOTE, 3),  // Eb
      n(2, 7, NOTE, 5),  // Gb
      n(2, 10, NOTE, 7), // A
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 3 (pos III) — casas 5–10 — base: dim shape 3
    [
      n(6, 5, NOTE, 7),  // A
      n(6, 8, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(5, 9, NOTE, 5),  // Gb
      n(4, 7, NOTE, 7),  // A
      n(4, 10, ROOT, 1), // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(2, 7, NOTE, 5),  // Gb
      n(2, 10, NOTE, 7), // A
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–13 — base: dim shape 4
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 11, NOTE, 3), // Eb
      n(5, 9, NOTE, 5),  // Gb
      n(5, 12, NOTE, 7), // A
      n(4, 10, ROOT, 1), // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(3, 11, NOTE, 5), // Gb
      n(2, 10, NOTE, 7), // A
      n(2, 13, ROOT, 1), // C ★
      n(1, 11, NOTE, 3), // Eb
    ],

    // Shape 5 (pos V) — casas 10–14 — base: dim shape 5
    [
      n(6, 11, NOTE, 3), // Eb
      n(6, 14, NOTE, 5), // Gb
      n(5, 12, NOTE, 7), // A
      n(5, 15, ROOT, 1), // C ★
      n(4, 13, NOTE, 3), // Eb
      n(3, 11, NOTE, 5), // Gb
      n(3, 14, NOTE, 7), // A
      n(2, 13, ROOT, 1), // C ★
      n(1, 11, NOTE, 3), // Eb
      n(1, 14, NOTE, 5), // Gb
    ],
  ],
}

/**
 * Tétrade Meio-diminuta (Cm7b5) em Dó — 5 shapes
 * Base: tríade Dim + b7 (Bb)
 *
 * Intervalos: 1, b3, b5, b7
 * Semitons:   0, 3, 6, 10
 * Notas em C: C, Eb, Gb, Bb
 *
 * Bb por corda: 6ª=6  5ª=1,13  4ª=8  3ª=3,15  2ª=11  1ª=6
 */
export const M7B5_TETRAD_CAGED: CagedTemplateSet = {
  type: 'm7b5',
  label: 'Tétrade Meio-diminuta (m7b5)',
  intervals: [0, 3, 6, 10],
  shapes: [
    // Shape 1 (pos I) — casas 1–4 — base: dim shape 1
    [
      n(6, 2, NOTE, 5),  // Gb — b5
      n(5, 1, NOTE, 7),  // Bb — b7
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 1, NOTE, 3),  // Eb — b3
      n(4, 4, NOTE, 5),  // Gb — b5
      n(3, 3, NOTE, 7),  // Bb — b7
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(2, 4, NOTE, 3),  // Eb — b3
      n(1, 2, NOTE, 5),  // Gb — b5
    ],

    // Shape 2 (pos II) — casas 2–8 — base: dim shape 2
    [
      n(6, 2, NOTE, 5),  // Gb
      n(6, 6, NOTE, 7),  // Bb
      n(5, 3, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(4, 4, NOTE, 5),  // Gb
      n(3, 3, NOTE, 7),  // Bb
      n(3, 5, ROOT, 1),  // C ★
      n(2, 4, NOTE, 3),  // Eb
      n(1, 2, NOTE, 5),  // Gb
      n(1, 6, NOTE, 7),  // Bb
    ],

    // Shape 3 (pos III) — casas 5–10 — base: dim shape 3
    [
      n(6, 6, NOTE, 7),  // Bb
      n(6, 8, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(5, 9, NOTE, 5),  // Gb
      n(4, 8, NOTE, 7),  // Bb
      n(4, 10, ROOT, 1), // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(2, 7, NOTE, 5),  // Gb
      n(1, 6, NOTE, 7),  // Bb
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–13 — base: dim shape 4
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 11, NOTE, 3), // Eb
      n(5, 9, NOTE, 5),  // Gb
      n(4, 8, NOTE, 7),  // Bb
      n(4, 10, ROOT, 1), // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(3, 11, NOTE, 5), // Gb
      n(2, 11, NOTE, 7), // Bb
      n(1, 8, NOTE, 7),  // Bb
      n(1, 11, NOTE, 3), // Eb
    ],

    // Shape 5 (pos V) — casas 10–14 — base: dim shape 5
    [
      n(6, 11, NOTE, 3), // Eb
      n(6, 14, NOTE, 5), // Gb
      n(5, 13, NOTE, 7), // Bb
      n(4, 10, ROOT, 1), // C ★
      n(4, 13, NOTE, 3), // Eb
      n(3, 11, NOTE, 5), // Gb
      n(2, 11, NOTE, 7), // Bb
      n(2, 13, ROOT, 1), // C ★
      n(1, 11, NOTE, 3), // Eb
      n(1, 14, NOTE, 5), // Gb
    ],
  ],
}

/**
 * Acorde com Sexta (C6) em Dó — 5 shapes
 * Base: tríade Maior + 6 (A)
 *
 * Intervalos: 1, 3, 5, 6
 * Semitons:   0, 4, 7, 9
 * Notas em C: C, E, G, A
 *
 * A por corda: 6ª=5  5ª=0,12  4ª=7  3ª=2,14  2ª=10  1ª=5
 */
export const SIXTH_TETRAD_CAGED: CagedTemplateSet = {
  type: '6',
  label: 'Acorde com Sexta (6)',
  intervals: [0, 4, 7, 9],
  shapes: [
    // Shape 1 (pos I) — casas 0–5 — base: major shape 1
    [
      n(6, 0, NOTE, 3),  // E — 3ª
      n(6, 3, NOTE, 5),  // G — 5ª
      n(6, 5, NOTE, 7),  // A — 6ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 2, NOTE, 3),  // E — 3ª
      n(3, 0, NOTE, 5),  // G — 5ª
      n(3, 2, NOTE, 7),  // A — 6ª
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(1, 0, NOTE, 3),  // E — 3ª
      n(1, 3, NOTE, 5),  // G — 5ª
      n(1, 5, NOTE, 7),  // A — 6ª
    ],

    // Shape 2 (pos II) — casas 3–7 — base: major shape 2
    [
      n(6, 3, NOTE, 5),  // G
      n(6, 5, NOTE, 7),  // A
      n(5, 3, ROOT, 1),  // C ★
      n(5, 7, NOTE, 3),  // E
      n(4, 5, NOTE, 5),  // G
      n(4, 7, NOTE, 7),  // A
      n(3, 5, ROOT, 1),  // C ★
      n(2, 5, NOTE, 3),  // E
      n(1, 3, NOTE, 5),  // G
      n(1, 5, NOTE, 7),  // A
    ],

    // Shape 3 (pos III) — casas 5–9 — base: major shape 3
    [
      n(6, 5, NOTE, 7),  // A
      n(6, 8, ROOT, 1),  // C ★
      n(5, 7, NOTE, 3),  // E
      n(4, 5, NOTE, 5),  // G
      n(4, 7, NOTE, 7),  // A
      n(3, 5, ROOT, 1),  // C ★
      n(3, 9, NOTE, 3),  // E
      n(2, 8, NOTE, 5),  // G
      n(2, 10, NOTE, 7), // A
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–12 — base: major shape 4
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 12, NOTE, 3), // E
      n(5, 10, NOTE, 5), // G
      n(5, 12, NOTE, 7), // A
      n(4, 10, ROOT, 1), // C ★
      n(3, 9, NOTE, 3),  // E
      n(2, 8, NOTE, 5),  // G
      n(2, 10, NOTE, 7), // A
      n(1, 8, ROOT, 1),  // C ★
      n(1, 12, NOTE, 3), // E
    ],

    // Shape 5 (pos V) — casas 10–15 — base: major shape 5
    [
      n(6, 12, NOTE, 3), // E
      n(5, 10, NOTE, 5), // G
      n(5, 12, NOTE, 7), // A
      n(5, 15, ROOT, 1), // C ★
      n(4, 14, NOTE, 3), // E
      n(3, 12, NOTE, 5), // G
      n(3, 14, NOTE, 7), // A
      n(2, 13, ROOT, 1), // C ★
      n(1, 12, NOTE, 3), // E
    ],
  ],
}

/**
 * Acorde Menor com Sexta (Cm6) em Dó — 5 shapes
 * Base: tríade Menor + 6 (A)
 *
 * Intervalos: 1, b3, 5, 6
 * Semitons:   0, 3, 7, 9
 * Notas em C: C, Eb, G, A
 *
 * A por corda: 6ª=5  5ª=0,12  4ª=7  3ª=2,14  2ª=10  1ª=5
 */
export const MIN6_TETRAD_CAGED: CagedTemplateSet = {
  type: 'm6',
  label: 'Acorde Menor com Sexta (m6)',
  intervals: [0, 3, 7, 9],
  shapes: [
    // Shape 1 (pos I) — casas 0–4 — base: minor shape 1
    [
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 1, NOTE, 3),  // Eb — b3
      n(3, 0, NOTE, 5),  // G — 5ª
      n(3, 2, NOTE, 7),  // A — 6ª
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(2, 4, NOTE, 3),  // Eb — b3
      n(1, 3, NOTE, 5),  // G — 5ª
    ],

    // Shape 2 (pos II) — casas 3–6 — base: minor shape 2
    [
      n(6, 3, NOTE, 5),  // G
      n(6, 5, NOTE, 7),  // A
      n(5, 3, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(4, 5, NOTE, 5),  // G
      n(4, 7, NOTE, 7),  // A
      n(3, 5, ROOT, 1),  // C ★
      n(2, 4, NOTE, 3),  // Eb
      n(1, 3, NOTE, 5),  // G
      n(1, 5, NOTE, 7),  // A
    ],

    // Shape 3 (pos III) — casas 5–8 — base: minor shape 3
    [
      n(6, 5, NOTE, 7),  // A
      n(6, 8, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(4, 5, NOTE, 5),  // G
      n(4, 7, NOTE, 7),  // A
      n(3, 5, ROOT, 1),  // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(2, 8, NOTE, 5),  // G
      n(2, 10, NOTE, 7), // A
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–11 — base: minor shape 4
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 11, NOTE, 3), // Eb
      n(5, 10, NOTE, 5), // G
      n(5, 12, NOTE, 7), // A
      n(4, 10, ROOT, 1), // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(2, 8, NOTE, 5),  // G
      n(2, 10, NOTE, 7), // A
      n(1, 8, ROOT, 1),  // C ★
      n(1, 11, NOTE, 3), // Eb
    ],

    // Shape 5 (pos V) — casas 10–15 — base: minor shape 5
    [
      n(6, 11, NOTE, 3), // Eb
      n(6, 15, NOTE, 5), // G
      n(5, 12, NOTE, 7), // A
      n(5, 15, ROOT, 1), // C ★
      n(4, 13, NOTE, 3), // Eb
      n(3, 12, NOTE, 5), // G
      n(3, 14, NOTE, 7), // A
      n(2, 13, ROOT, 1), // C ★
      n(1, 11, NOTE, 3), // Eb
      n(1, 15, NOTE, 5), // G
    ],
  ],
}

/**
 * Acorde Menor com Sétima Maior (CmMaj7) em Dó — 5 shapes
 * Base: tríade Menor + 7 (B)
 *
 * Intervalos: 1, b3, 5, 7
 * Semitons:   0, 3, 7, 11
 * Notas em C: C, Eb, G, B
 *
 * B por corda: 6ª=7  5ª=2,14  4ª=9  3ª=4  2ª=0,12  1ª=7
 */
export const MMAJ7_TETRAD_CAGED: CagedTemplateSet = {
  type: 'mmaj7',
  label: 'Menor com 7ª Maior (mMaj7)',
  intervals: [0, 3, 7, 11],
  shapes: [
    // Shape 1 (pos I) — casas 0–4 — base: minor shape 1
    [
      n(6, 0, NOTE, 3),  // Eb — b3
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 2, NOTE, 7),  // B — 7ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 1, NOTE, 3),  // Eb — b3
      n(3, 0, NOTE, 5),  // G — 5ª
      n(3, 4, NOTE, 7),  // B — 7ª
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(2, 4, NOTE, 3),  // Eb — b3
      n(1, 3, NOTE, 5),  // G — 5ª
    ],

    // Shape 2 (pos II) — casas 3–7 — base: minor shape 2
    [
      n(6, 3, NOTE, 5),  // G
      n(6, 7, NOTE, 7),  // B
      n(5, 3, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(4, 5, NOTE, 5),  // G
      n(3, 4, NOTE, 7),  // B
      n(3, 5, ROOT, 1),  // C ★
      n(2, 4, NOTE, 3),  // Eb
      n(1, 3, NOTE, 5),  // G
      n(1, 7, NOTE, 7),  // B
    ],

    // Shape 3 (pos III) — casas 5–9 — base: minor shape 3
    [
      n(6, 7, NOTE, 7),  // B
      n(6, 8, ROOT, 1),  // C ★
      n(5, 6, NOTE, 3),  // Eb
      n(4, 5, NOTE, 5),  // G
      n(4, 9, NOTE, 7),  // B
      n(3, 5, ROOT, 1),  // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(2, 8, NOTE, 5),  // G
      n(1, 7, NOTE, 7),  // B
      n(1, 8, ROOT, 1),  // C ★
    ],

    // Shape 4 (pos IV) — casas 8–12 — base: minor shape 4
    [
      n(6, 8, ROOT, 1),  // C ★
      n(6, 11, NOTE, 3), // Eb
      n(5, 10, NOTE, 5), // G
      n(4, 9, NOTE, 7),  // B
      n(4, 10, ROOT, 1), // C ★
      n(3, 8, NOTE, 3),  // Eb
      n(2, 8, NOTE, 5),  // G
      n(2, 12, NOTE, 7), // B
      n(1, 8, ROOT, 1),  // C ★
      n(1, 11, NOTE, 3), // Eb
    ],

    // Shape 5 (pos V) — casas 10–15 — base: minor shape 5
    [
      n(6, 11, NOTE, 3), // Eb
      n(6, 15, NOTE, 5), // G
      n(5, 14, NOTE, 7), // B
      n(5, 15, ROOT, 1), // C ★
      n(4, 13, NOTE, 3), // Eb
      n(3, 12, NOTE, 5), // G
      n(2, 12, NOTE, 7), // B
      n(2, 13, ROOT, 1), // C ★
      n(1, 11, NOTE, 3), // Eb
      n(1, 15, NOTE, 5), // G
    ],
  ],
}

// ═══════════════════════════════════════════════════════════════════════
// PENTATÔNICAS E BLUES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Pentatônica Maior em Dó (C) — 5 shapes
 *
 * Graus: 1, 2, 3, 5, 6
 * Semitons: 0, 2, 4, 7, 9
 *
 * É a escala maior sem 4ª (F) e 7ª (B).
 * Os 5 shapes cobrem todo o braço em posições sobrepostas.
 */
export const PENTA_MAJOR_CAGED: CagedTemplateSet = {
  type: 'penta_major',
  label: 'Pentatônica Maior',
  intervals: [0, 2, 4, 7, 9],
  shapes: [
    // Shape 1 (pos I) — casas 0–3
    [
      n(6, 0, NOTE, 3),  // E — 3ª
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 0, NOTE, 6),  // A — 6ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 0, NOTE, 2),  // D — 2ª
      n(4, 2, NOTE, 3),  // E — 3ª
      n(3, 0, NOTE, 5),  // G — 5ª
      n(3, 2, NOTE, 6),  // A — 6ª
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(2, 3, NOTE, 2),  // D — 2ª
      n(1, 0, NOTE, 3),  // E — 3ª
      n(1, 3, NOTE, 5),  // G — 5ª
    ],

    // Shape 2 (pos II) — casas 2–5
    [
      n(6, 3, NOTE, 5),  // G — 5ª
      n(6, 5, NOTE, 6),  // A — 6ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(5, 5, NOTE, 2),  // D — 2ª
      n(4, 2, NOTE, 3),  // E — 3ª
      n(4, 5, NOTE, 5),  // G — 5ª
      n(3, 2, NOTE, 6),  // A — 6ª
      n(3, 5, ROOT, 1),  // C — 1ª ★
      n(2, 3, NOTE, 2),  // D — 2ª
      n(2, 5, NOTE, 3),  // E — 3ª
      n(1, 3, NOTE, 5),  // G — 5ª
      n(1, 5, NOTE, 6),  // A — 6ª
    ],

    // Shape 3 (pos III) — casas 5–8
    [
      n(6, 5, NOTE, 6),  // A — 6ª
      n(6, 8, ROOT, 1),  // C — 1ª ★
      n(5, 5, NOTE, 2),  // D — 2ª
      n(5, 7, NOTE, 3),  // E — 3ª
      n(4, 5, NOTE, 5),  // G — 5ª
      n(4, 7, NOTE, 6),  // A — 6ª
      n(3, 5, ROOT, 1),  // C — 1ª ★
      n(3, 7, NOTE, 2),  // D — 2ª
      n(2, 5, NOTE, 3),  // E — 3ª
      n(2, 8, NOTE, 5),  // G — 5ª
      n(1, 5, NOTE, 6),  // A — 6ª
      n(1, 8, ROOT, 1),  // C — 1ª ★
    ],

    // Shape 4 (pos IV) — casas 7–10
    [
      n(6, 8, ROOT, 1),  // C — 1ª ★
      n(6, 10, NOTE, 2), // D — 2ª
      n(5, 7, NOTE, 3),  // E — 3ª
      n(5, 10, NOTE, 5), // G — 5ª
      n(4, 7, NOTE, 6),  // A — 6ª
      n(4, 10, ROOT, 1), // C — 1ª ★
      n(3, 7, NOTE, 2),  // D — 2ª
      n(3, 9, NOTE, 3),  // E — 3ª
      n(2, 8, NOTE, 5),  // G — 5ª
      n(2, 10, NOTE, 6), // A — 6ª
      n(1, 8, ROOT, 1),  // C — 1ª ★
      n(1, 10, NOTE, 2), // D — 2ª
    ],

    // Shape 5 (pos V) — casas 10–13
    [
      n(6, 10, NOTE, 2), // D — 2ª
      n(6, 12, NOTE, 3), // E — 3ª
      n(5, 10, NOTE, 5), // G — 5ª
      n(5, 12, NOTE, 6), // A — 6ª
      n(4, 10, ROOT, 1), // C — 1ª ★
      n(4, 12, NOTE, 2), // D — 2ª
      n(3, 9, NOTE, 3),  // E — 3ª
      n(3, 12, NOTE, 5), // G — 5ª
      n(2, 10, NOTE, 6), // A — 6ª
      n(2, 13, ROOT, 1), // C — 1ª ★
      n(1, 10, NOTE, 2), // D — 2ª
      n(1, 12, NOTE, 3), // E — 3ª
    ],
  ],
}

/**
 * Pentatônica Menor em Dó (C) — 5 shapes
 *
 * Graus: 1, b3, 4, 5, b7
 * Semitons: 0, 3, 5, 7, 10
 *
 * Notas em C: C, Eb, F, G, Bb
 *
 * Mapa de trastes por corda (afinação padrão):
 *   6ª(E): F=1, G=3, Bb=6, C=8, Eb=11
 *   5ª(A): Bb=1, C=3, Eb=6, F=8, G=10
 *   4ª(D): Eb=1, F=3, G=5, Bb=8, C=10
 *   3ª(G): Bb=3, C=5, Eb=8, F=10, G=12
 *   2ª(B): C=1, Eb=4, F=6, G=8, Bb=11
 *   1ª(E): F=1, G=3, Bb=6, C=8, Eb=11
 */
export const PENTA_MINOR_CAGED: CagedTemplateSet = {
  type: 'penta_minor',
  label: 'Pentatônica Menor',
  intervals: [0, 3, 5, 7, 10],
  shapes: [
    // Shape 1 (pos I) — casas 1–3
    // Box pattern clássico ("shape Am")
    [
      n(6, 1, NOTE, 4),  // F — 4ª
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 1, NOTE, 7),  // Bb — b7ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 1, NOTE, 3),  // Eb — b3ª
      n(4, 3, NOTE, 4),  // F — 4ª
      n(3, 0, NOTE, 5),  // G — 5ª (corda aberta)
      n(3, 3, NOTE, 7),  // Bb — b7ª
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(2, 4, NOTE, 3),  // Eb — b3ª
      n(1, 1, NOTE, 4),  // F — 4ª
      n(1, 3, NOTE, 5),  // G — 5ª
    ],

    // Shape 2 (pos II) — casas 3–6
    [
      n(6, 3, NOTE, 5),  // G — 5ª
      n(6, 6, NOTE, 7),  // Bb — b7ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(5, 6, NOTE, 3),  // Eb — b3ª
      n(4, 3, NOTE, 4),  // F — 4ª
      n(4, 5, NOTE, 5),  // G — 5ª
      n(3, 3, NOTE, 7),  // Bb — b7ª
      n(3, 5, ROOT, 1),  // C — 1ª ★
      n(2, 4, NOTE, 3),  // Eb — b3ª
      n(2, 6, NOTE, 4),  // F — 4ª
      n(1, 3, NOTE, 5),  // G — 5ª
      n(1, 6, NOTE, 7),  // Bb — b7ª
    ],

    // Shape 3 (pos III) — casas 6–8
    [
      n(6, 6, NOTE, 7),  // Bb — b7ª
      n(6, 8, ROOT, 1),  // C — 1ª ★
      n(5, 6, NOTE, 3),  // Eb — b3ª
      n(5, 8, NOTE, 4),  // F — 4ª
      n(4, 5, NOTE, 5),  // G — 5ª
      n(4, 8, NOTE, 7),  // Bb — b7ª
      n(3, 5, ROOT, 1),  // C — 1ª ★
      n(3, 8, NOTE, 3),  // Eb — b3ª
      n(2, 6, NOTE, 4),  // F — 4ª
      n(2, 8, NOTE, 5),  // G — 5ª
      n(1, 6, NOTE, 7),  // Bb — b7ª
      n(1, 8, ROOT, 1),  // C — 1ª ★
    ],

    // Shape 4 (pos IV) — casas 8–11
    [
      n(6, 8, ROOT, 1),  // C — 1ª ★
      n(6, 11, NOTE, 3), // Eb — b3ª
      n(5, 8, NOTE, 4),  // F — 4ª
      n(5, 10, NOTE, 5), // G — 5ª
      n(4, 8, NOTE, 7),  // Bb — b7ª
      n(4, 10, ROOT, 1), // C — 1ª ★
      n(3, 8, NOTE, 3),  // Eb — b3ª
      n(3, 10, NOTE, 4), // F — 4ª
      n(2, 8, NOTE, 5),  // G — 5ª
      n(2, 11, NOTE, 7), // Bb — b7ª
      n(1, 8, ROOT, 1),  // C — 1ª ★
      n(1, 11, NOTE, 3), // Eb — b3ª
    ],

    // Shape 5 (pos V) — casas 10–13
    [
      n(6, 11, NOTE, 3), // Eb — b3ª
      n(6, 13, NOTE, 4), // F — 4ª
      n(5, 10, NOTE, 5), // G — 5ª
      n(5, 13, NOTE, 7), // Bb — b7ª
      n(4, 10, ROOT, 1), // C — 1ª ★
      n(4, 13, NOTE, 3), // Eb — b3ª
      n(3, 10, NOTE, 4), // F — 4ª
      n(3, 12, NOTE, 5), // G — 5ª
      n(2, 11, NOTE, 7), // Bb — b7ª
      n(2, 13, ROOT, 1), // C — 1ª ★
      n(1, 11, NOTE, 3), // Eb — b3ª
      n(1, 13, NOTE, 4), // F — 4ª
    ],
  ],
}

/**
 * Blues em Dó (C) — 5 shapes
 *
 * Graus: 1, b3, 4, b5, 5, b7
 * Semitons: 0, 3, 5, 6, 7, 10
 *
 * É a pentatônica menor + blue note (b5 = Gb/F#).
 * Notas em C: C, Eb, F, Gb, G, Bb
 *
 * Mapa de trastes por corda (afinação padrão):
 *   6ª(E): F=1, Gb=2, G=3, Bb=6, C=8, Eb=11
 *   5ª(A): Bb=1, C=3, Eb=6, F=8, Gb=9, G=10
 *   4ª(D): Eb=1, F=3, Gb=4, G=5, Bb=8, C=10
 *   3ª(G): Bb=3, C=5, Eb=8, F=10, Gb=11, G=12
 *   2ª(B): C=1, Eb=4, F=6, Gb=7, G=8, Bb=11
 *   1ª(E): F=1, Gb=2, G=3, Bb=6, C=8, Eb=11
 */
export const BLUES_CAGED: CagedTemplateSet = {
  type: 'blues',
  label: 'Blues',
  intervals: [0, 3, 5, 6, 7, 10],
  shapes: [
    // Shape 1 (pos I) — casas 1–3 (penta menor shape 1 + blue note)
    [
      n(6, 1, NOTE, 4),  // F — 4ª
      n(6, 2, NOTE, 5),  // Gb — b5ª (blue note)
      n(6, 3, NOTE, 5),  // G — 5ª
      n(5, 1, NOTE, 7),  // Bb — b7ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(4, 1, NOTE, 3),  // Eb — b3ª
      n(4, 3, NOTE, 4),  // F — 4ª
      n(4, 4, NOTE, 5),  // Gb — b5ª (blue note)
      n(4, 5, NOTE, 5),  // G — 5ª
      n(3, 0, NOTE, 5),  // G — 5ª (aberta — extremo)
      n(3, 3, NOTE, 7),  // Bb — b7ª
      n(2, 1, ROOT, 1),  // C — 1ª ★
      n(2, 4, NOTE, 3),  // Eb — b3ª
      n(1, 1, NOTE, 4),  // F — 4ª
      n(1, 2, NOTE, 5),  // Gb — b5ª (blue note)
      n(1, 3, NOTE, 5),  // G — 5ª
    ],

    // Shape 2 (pos II) — casas 3–6 (penta menor shape 2 + blue note)
    [
      n(6, 3, NOTE, 5),  // G — 5ª
      n(6, 6, NOTE, 7),  // Bb — b7ª
      n(5, 3, ROOT, 1),  // C — 1ª ★
      n(5, 6, NOTE, 3),  // Eb — b3ª
      n(4, 3, NOTE, 4),  // F — 4ª
      n(4, 4, NOTE, 5),  // Gb — b5ª (blue note)
      n(4, 5, NOTE, 5),  // G — 5ª
      n(3, 3, NOTE, 7),  // Bb — b7ª
      n(3, 5, ROOT, 1),  // C — 1ª ★
      n(2, 4, NOTE, 3),  // Eb — b3ª
      n(2, 6, NOTE, 4),  // F — 4ª
      n(2, 7, NOTE, 5),  // Gb — b5ª (blue note)
      n(1, 3, NOTE, 5),  // G — 5ª
      n(1, 6, NOTE, 7),  // Bb — b7ª
    ],

    // Shape 3 (pos III) — casas 6–8 (penta menor shape 3 + blue note)
    [
      n(6, 6, NOTE, 7),  // Bb — b7ª
      n(6, 8, ROOT, 1),  // C — 1ª ★
      n(5, 6, NOTE, 3),  // Eb — b3ª
      n(5, 8, NOTE, 4),  // F — 4ª
      n(5, 9, NOTE, 5),  // Gb — b5ª (blue note)
      n(4, 5, NOTE, 5),  // G — 5ª
      n(4, 8, NOTE, 7),  // Bb — b7ª
      n(3, 5, ROOT, 1),  // C — 1ª ★
      n(3, 8, NOTE, 3),  // Eb — b3ª
      n(2, 6, NOTE, 4),  // F — 4ª
      n(2, 7, NOTE, 5),  // Gb — b5ª (blue note)
      n(2, 8, NOTE, 5),  // G — 5ª
      n(1, 6, NOTE, 7),  // Bb — b7ª
      n(1, 8, ROOT, 1),  // C — 1ª ★
    ],

    // Shape 4 (pos IV) — casas 8–11 (penta menor shape 4 + blue note)
    [
      n(6, 8, ROOT, 1),  // C — 1ª ★
      n(6, 11, NOTE, 3), // Eb — b3ª
      n(5, 8, NOTE, 4),  // F — 4ª
      n(5, 9, NOTE, 5),  // Gb — b5ª (blue note)
      n(5, 10, NOTE, 5), // G — 5ª
      n(4, 8, NOTE, 7),  // Bb — b7ª
      n(4, 10, ROOT, 1), // C — 1ª ★
      n(3, 8, NOTE, 3),  // Eb — b3ª
      n(3, 10, NOTE, 4), // F — 4ª
      n(3, 11, NOTE, 5), // Gb — b5ª (blue note)
      n(2, 8, NOTE, 5),  // G — 5ª
      n(2, 11, NOTE, 7), // Bb — b7ª
      n(1, 8, ROOT, 1),  // C — 1ª ★
      n(1, 11, NOTE, 3), // Eb — b3ª
    ],

    // Shape 5 (pos V) — casas 10–13 (penta menor shape 5 + blue note)
    [
      n(6, 11, NOTE, 3), // Eb — b3ª
      n(6, 13, NOTE, 4), // F — 4ª
      n(5, 10, NOTE, 5), // G — 5ª
      n(5, 13, NOTE, 7), // Bb — b7ª
      n(4, 10, ROOT, 1), // C — 1ª ★
      n(4, 13, NOTE, 3), // Eb — b3ª
      n(3, 10, NOTE, 4), // F — 4ª
      n(3, 11, NOTE, 5), // Gb — b5ª (blue note)
      n(3, 12, NOTE, 5), // G — 5ª
      n(2, 11, NOTE, 7), // Bb — b7ª
      n(2, 13, ROOT, 1), // C — 1ª ★
      n(1, 11, NOTE, 3), // Eb — b3ª
      n(1, 13, NOTE, 4), // F — 4ª
    ],
  ],
}

// ═══════════════════════════════════════════════════════════════════════
// REGISTRO CENTRAL — mapa tipo → template
// ═══════════════════════════════════════════════════════════════════════

/** Mapa de todos os templates CAGED disponíveis, indexado pelo tipo do preset */
export const CAGED_TEMPLATES: Record<string, CagedTemplateSet> = {
  // Escalas
  major_scale: MAJOR_SCALE_CAGED,
  minor_scale: MINOR_SCALE_CAGED,
  harmonic_minor_scale: HARMONIC_MINOR_SCALE_CAGED,
  melodic_minor_scale: MELODIC_MINOR_SCALE_CAGED,
  // Pentatônicas e Blues
  penta_major: PENTA_MAJOR_CAGED,
  penta_minor: PENTA_MINOR_CAGED,
  blues: BLUES_CAGED,
  // Tríades
  major: MAJOR_TRIAD_CAGED,
  minor: MINOR_TRIAD_CAGED,
  dim: DIM_TRIAD_CAGED,
  aug: AUG_TRIAD_CAGED,
  sus2: SUS2_TRIAD_CAGED,
  sus4: SUS4_TRIAD_CAGED,
  add9: ADD9_TRIAD_CAGED,
  // Tétrades
  maj7: MAJ7_TETRAD_CAGED,
  '7': DOM7_TETRAD_CAGED,
  m7: MIN7_TETRAD_CAGED,
  dim7: DIM7_TETRAD_CAGED,
  m7b5: M7B5_TETRAD_CAGED,
  '6': SIXTH_TETRAD_CAGED,
  m6: MIN6_TETRAD_CAGED,
  mmaj7: MMAJ7_TETRAD_CAGED,
}

/** Labels das 5 posições CAGED (ciclo) */
export const CAGED_POSITION_LABELS = ['C', 'A', 'G', 'E', 'D'] as const
export type CagedPositionLabel = typeof CAGED_POSITION_LABELS[number]

/** Nomes semânticos das posições */
export const CAGED_POSITION_NAMES = ['1ª', '2ª', '3ª', '4ª', '5ª'] as const
