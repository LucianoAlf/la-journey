/**
 * Testes unitários para beatsToAlphaTex.
 * Sem vitest/jest — usa assertions manuais.
 * Executar via: npx tsx src/lib/__tests__/beatsToAlphaTex.test.ts
 */

import {
  beatsToAlphaTex,
  pitchToAlphaTex,
  beatsToAlphaTexNotes,
  isTieDestination,
  tieToNextFromDestination,
} from '../beatsToAlphaTex'
import type { Beat, BeatsToAlphaTexOptions, PitchData } from '../beatsToAlphaTex'

// ─── Helpers de teste ───

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++
    console.log(`  ✅ ${msg}`)
  } else {
    failed++
    console.error(`  ❌ ${msg}`)
  }
}

function assertContains(haystack: string, needle: string, msg: string) {
  assert(haystack.includes(needle), `${msg} — esperado conter "${needle}"`)
}

function assertNotContains(haystack: string, needle: string, msg: string) {
  assert(!haystack.includes(needle), `${msg} — esperado NÃO conter "${needle}"`)
}

// ─── Helper para criar Beat ───

function makeBeat(overrides: Partial<Beat> & { pitches?: PitchData[] }): Beat {
  return {
    pitches: [],
    duration: 'q',
    tie: false,
    isRest: false,
    dotted: false,
    cifra: null,
    annotation: null,
    lyric: null,
    ...overrides,
  }
}

function makeNote(pitch: string, accidental: string | null = null): PitchData {
  return { pitch, accidental }
}

const defaultOptions: BeatsToAlphaTexOptions = {
  clef: 'treble',
  keySignature: 'C',
  timeSignature: '4/4',
}

// ─── Testes ───

console.log('\n🎵 Testes beatsToAlphaTex\n')

// 1. pitchToAlphaTex
console.log('--- pitchToAlphaTex ---')
assert(pitchToAlphaTex(makeNote('C/4')) === 'c3', 'C/4 → c3')
assert(pitchToAlphaTex(makeNote('F/3', '#')) === 'f#2', 'F/3 com # → f#2')
assert(pitchToAlphaTex(makeNote('B/5', 'b')) === 'bb4', 'B/5 com b → bb4')
assert(pitchToAlphaTex(makeNote('E/4', 'n')) === 'en3', 'E/4 com n → en3')

// 2. Escala simples
console.log('\n--- Escala C Maior ---')
const scaleBeats: Beat[] = 'C/4 D/4 E/4 F/4 G/4 A/4 B/4 C/5'.split(' ').map((p, i) =>
  makeBeat({ pitches: [makeNote(p)], barAfter: i === 3 })
)
const scaleTex = beatsToAlphaTex(scaleBeats, { ...defaultOptions, timeSignature: '4/4' })
assertContains(scaleTex, ':4 c3', 'Primeira nota c3 com duração :4')
assertContains(scaleTex, '|', 'Tem barline')
assertContains(scaleTex, '\\ts 4 4', 'Tem time signature 4/4')
assertContains(scaleTex, '\\staff{score}', 'Tem staff score')

// 3. Durações variadas
console.log('\n--- Durações variadas ---')
const durBeats: Beat[] = [
  makeBeat({ pitches: [makeNote('C/4')], duration: 'w' }),
  makeBeat({ pitches: [makeNote('D/4')], duration: 'h' }),
  makeBeat({ pitches: [makeNote('E/4')], duration: 'q' }),
  makeBeat({ pitches: [makeNote('F/4')], duration: '8' }),
  makeBeat({ pitches: [makeNote('G/4')], duration: '16' }),
]
const durTex = beatsToAlphaTexNotes(durBeats).tex
assertContains(durTex, ':1 c3', 'Semibreve :1')
assertContains(durTex, ':2 d3', 'Mínima :2')
assertContains(durTex, ':4 e3', 'Semínima :4')
assertContains(durTex, ':8 f3', 'Colcheia :8')
assertContains(durTex, ':16 g3', 'Semicolcheia :16')

// 4. Ponto de aumento
console.log('\n--- Ponto de aumento ---')
const dotBeats: Beat[] = [
  makeBeat({ pitches: [makeNote('C/4')], dotted: true }),
  makeBeat({ pitches: [makeNote('D/4')], doubleDotted: true }),
]
const dotTex = beatsToAlphaTexNotes(dotBeats).tex
assertContains(dotTex, '{d}', 'Ponto simples {d}')
assertContains(dotTex, '{dd}', 'Ponto duplo {dd}')

// 5. Pausas
console.log('\n--- Pausas ---')
const restBeats: Beat[] = [
  makeBeat({ isRest: true, duration: 'q' }),
  makeBeat({ isRest: true, duration: 'h' }),
  makeBeat({ isRest: true, duration: 'w' }),
]
const restTex = beatsToAlphaTexNotes(restBeats).tex
assertContains(restTex, ':4 r', 'Pausa semínima')
assertContains(restTex, ':2 r', 'Pausa mínima')
assertContains(restTex, ':1 r', 'Pausa semibreve')

// 6. Acordes
console.log('\n--- Acordes ---')
const chordBeats: Beat[] = [
  makeBeat({ pitches: [makeNote('C/4'), makeNote('E/4'), makeNote('G/4')] }),
]
const chordTex = beatsToAlphaTexNotes(chordBeats).tex
assertContains(chordTex, '(c3 e3 g3)', 'Acorde C-E-G entre parênteses')

// 7. Acidentes
console.log('\n--- Acidentes ---')
const accBeats: Beat[] = [
  makeBeat({ pitches: [makeNote('C/4', '#')] }),
  makeBeat({ pitches: [makeNote('D/4', 'b')] }),
  makeBeat({ pitches: [makeNote('E/4', 'n')] }),
]
const accTex = beatsToAlphaTexNotes(accBeats).tex
assertContains(accTex, 'c#3', 'Sustenido c#3')
assertContains(accTex, 'db3', 'Bemol db3')
assertContains(accTex, 'en3', 'Bequadro en3')

// 8. Articulações
console.log('\n--- Articulações ---')
const artBeats: Beat[] = [
  makeBeat({ pitches: [makeNote('C/4')], articulations: ['a.'] }),
  makeBeat({ pitches: [makeNote('D/4')], articulations: ['a>'] }),
  makeBeat({ pitches: [makeNote('E/4')], articulations: ['a-'] }),
  makeBeat({ pitches: [makeNote('F/4')], articulations: ['a^'] }),
  makeBeat({ pitches: [makeNote('G/4')], articulations: ['a@a'] }),
]
const artTex = beatsToAlphaTexNotes(artBeats).tex
assertContains(artTex, '{st}', 'Staccato {st}')
assertContains(artTex, '{ac}', 'Acento {ac}')
assertContains(artTex, '{ten}', 'Tenuto {ten}')
assertContains(artTex, '{hac}', 'Marcato {hac}')
assertContains(artTex, 'fermata medium 4', 'Fermata {fermata medium 4}')

// 9. Dinâmicas
console.log('\n--- Dinâmicas ---')
const dynBeats: Beat[] = [
  makeBeat({ pitches: [makeNote('C/4')], dynamic: 'mf' }),
  makeBeat({ pitches: [makeNote('D/4')], dynamic: 'ff' }),
]
const dynTex = beatsToAlphaTexNotes(dynBeats).tex
assertContains(dynTex, '{dy mf}', 'Dinâmica mf')
assertContains(dynTex, '{dy ff}', 'Dinâmica ff')

// 10. Tie
console.log('\n--- Tie ---')
const tieBeats: Beat[] = [
  makeBeat({ pitches: [makeNote('C/4')] }),
  makeBeat({ pitches: [makeNote('C/4')], tie: true }),
]
const tieTex = beatsToAlphaTexNotes(tieBeats).tex
assertContains(tieTex, '{-}', 'Tie {-}')

// 11. Tuplets
console.log('\n--- Tuplets ---')
const tupBeats: Beat[] = [
  makeBeat({ pitches: [makeNote('C/4')], duration: '8', tuplet: { numNotes: 3, notesOccupied: 2, groupId: 'g1' } }),
  makeBeat({ pitches: [makeNote('D/4')], duration: '8', tuplet: { numNotes: 3, notesOccupied: 2, groupId: 'g1' } }),
  makeBeat({ pitches: [makeNote('E/4')], duration: '8', tuplet: { numNotes: 3, notesOccupied: 2, groupId: 'g1' } }),
]
const tupTex = beatsToAlphaTexNotes(tupBeats).tex
assertContains(tupTex, '{tu 3}', 'Tercina {tu 3}')

// 12. Grace notes
console.log('\n--- Grace notes ---')
const graceBeats: Beat[] = [
  makeBeat({
    pitches: [makeNote('D/4')],
    graceNotes: { pitches: [makeNote('C/4')], type: 'acciaccatura' },
  }),
]
const graceTex = beatsToAlphaTexNotes(graceBeats).tex
assertContains(graceTex, '{gr}', 'Grace note acciaccatura {gr}')

// 13. Barlines
console.log('\n--- Barlines ---')
const barBeats: Beat[] = [
  makeBeat({ pitches: [makeNote('C/4')], barAfter: true }),
  makeBeat({ pitches: [makeNote('D/4')] }),
]
const barTex = beatsToAlphaTexNotes(barBeats).tex
assertContains(barTex, '|', 'Barline |')

// 14. Grande pauta (piano)
console.log('\n--- Grande pauta ---')
const pianoBeats: Beat[] = [
  makeBeat({ pitches: [makeNote('C/4')], staff: 'treble' }),
  makeBeat({ pitches: [makeNote('E/4')], staff: 'treble' }),
  makeBeat({ pitches: [makeNote('C/3')], staff: 'bass' }),
  makeBeat({ pitches: [makeNote('G/3')], staff: 'bass' }),
]
const pianoTex = beatsToAlphaTex(pianoBeats, { ...defaultOptions, grandStaff: true })
assertContains(pianoTex, '\\track "Piano" "pno."', 'Track piano')
assertContains(pianoTex, '\\staff{score} \\tuning piano \\instrument acousticgrandpiano', 'Staff 1 treble')
assertContains(pianoTex, '\\clef F4', 'Staff 2 bass')
assertContains(pianoTex, 'c4', 'Nota treble c4')
assertContains(pianoTex, 'c3', 'Nota bass c3')

// 15. Cifras
console.log('\n--- Cifras ---')
const cifraBeats: Beat[] = [
  makeBeat({ pitches: [makeNote('C/4')], cifra: 'C' }),
  makeBeat({ pitches: [makeNote('G/4')], cifra: 'G7' }),
]
const cifraTex = beatsToAlphaTexNotes(cifraBeats).tex
assertContains(cifraTex, '{ch "C"}', 'Cifra C')
assertContains(cifraTex, '{ch "G7"}', 'Cifra G7')

// 16. Armadura de clave
console.log('\n--- Armadura ---')
const ksTex = beatsToAlphaTex(
  [makeBeat({ pitches: [makeNote('G/4')] })],
  { ...defaultOptions, keySignature: 'G' },
)
assertContains(ksTex, '\\ks Gmajor', 'Armadura G maior')

// 17. Clave de Fá
console.log('\n--- Clave de Fá ---')
const bassTex = beatsToAlphaTex(
  [makeBeat({ pitches: [makeNote('C/3')] })],
  { ...defaultOptions, clef: 'bass' },
)
assertContains(bassTex, '\\clef F4', 'Clave de Fá')

// 18. Hairpins
console.log('\n--- Hairpins ---')
const hairBeats: Beat[] = [
  makeBeat({ pitches: [makeNote('C/4')], hairpinStart: 'crescendo' }),
  makeBeat({ pitches: [makeNote('D/4')], hairpinStart: 'decrescendo' }),
]
const hairTex = beatsToAlphaTexNotes(hairBeats).tex
assertContains(hairTex, 'cre', 'Crescendo cre')
assertContains(hairTex, 'dec', 'Decrescendo dec')

// 19. Compasso livre
console.log('\n--- Compasso livre ---')
const freeTex = beatsToAlphaTex(
  [makeBeat({ pitches: [makeNote('C/4')] })],
  { ...defaultOptions, timeSignature: 'free' as any },
)
assertContains(freeTex, '\\ft', 'Emite marcador AlphaTab de tempo livre')
assertNotContains(freeTex, '\\ts', 'Nao emite formula de compasso para "free"')
assertNotContains(freeTex, 'undefined', 'Nao emite fragmento invalido com "free"')

const freeBarTex = beatsToAlphaTex(
  [
    makeBeat({ pitches: [makeNote('C/4')], duration: 'h', barAfter: true }),
    makeBeat({ pitches: [makeNote('D/4')], duration: 'h' }),
  ],
  { ...defaultOptions, timeSignature: 'free' as any },
)
assertContains(freeBarTex, '|', 'Preserva barra pedagogica em tempo livre')
assertContains(freeBarTex, ':2', 'Preserva minima vinda do modelo')

// 20. Compasso invalido
console.log('\n--- Compasso invalido ---')
const invalidTex = beatsToAlphaTex(
  [makeBeat({ pitches: [makeNote('C/4')] })],
  { ...defaultOptions, timeSignature: 'abc' as any },
)
assertNotContains(invalidTex, '\\ts', 'Ignora formula de compasso invalida')
assertNotContains(invalidTex, 'undefined', 'Nao emite fragmento invalido com compasso invalido')

// 21. Ligadura: origem (nosso modelo) ↔ destino (AlphaTex)
console.log('\n--- Ligadura: origem ↔ destino ---')

const tieModel = [{ tieToNext: true }, { tieToNext: false }, { tieToNext: false }]
const modelDestinations = tieModel.map((_, index) => isTieDestination(tieModel, index))
assert(
  modelDestinations.join(',') === 'false,true,false',
  'isTieDestination move a marca da origem para o beat seguinte',
)
assert(
  tieModel.map((_, index) => tieToNextFromDestination(modelDestinations, index)).join(',')
    === tieModel.map(beat => beat.tieToNext).join(','),
  'ida e volta entre os dois helpers recupera o tieToNext original',
)

// `tie` legado (gravado antes de tieToNext) tambem e semantica de origem
assert(isTieDestination([{ tie: true }, {}], 1), 'alias legado tie liga para o beat seguinte')
assert(!isTieDestination([{ tie: true }, {}], 0), 'alias legado nao marca o proprio beat')

// Round-trip contra o gerador de verdade: sincope = seminima pontuada ligada a colcheia
const syncopeModel = [{ tieToNext: true }, { tieToNext: false }]
const syncopeBeats: Beat[] = [
  makeBeat({ pitches: [makeNote('C/4')], dotted: true, tie: isTieDestination(syncopeModel, 0) }),
  makeBeat({ pitches: [makeNote('C/4')], duration: '8', tie: isTieDestination(syncopeModel, 1) }),
]
const syncopeTex = beatsToAlphaTexNotes(syncopeBeats).tex
// O parser de colagem le o {-} beat a beat; aqui reproduzimos so essa leitura.
const emittedDestinations = syncopeTex
  .split(/\s+/)
  .filter(token => !token.startsWith(':'))
  .map(token => token.includes('{-}'))
assert(emittedDestinations.join(',') === 'false,true', 'AlphaTex leva a marca no beat destino')
assert(
  emittedDestinations.map((_, index) => tieToNextFromDestination(emittedDestinations, index)).join(',')
    === syncopeModel.map(beat => beat.tieToNext).join(','),
  'colar o AlphaTex de volta devolve tieToNext no beat de origem',
)

// ─── Resultado ───

console.log(`\n${'─'.repeat(40)}`)
console.log(`🎵 Resultado: ${passed} passaram, ${failed} falharam de ${passed + failed} testes`)
if (failed > 0) {
  console.log('⚠️ Alguns testes falharam — revisar conversão')
  process.exit(1)
} else {
  console.log('✅ Todos os testes passaram!')
}
