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
  toTieDestinations,
  tieToNextFromDestination,
  parseAlphaTexEffects,
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
const modelDestinations = toTieDestinations(tieModel)
assert(
  modelDestinations.join(',') === 'false,true,false',
  'toTieDestinations move a marca da origem para o beat seguinte',
)
assert(
  tieModel.every((_, index) => isTieDestination(tieModel, index) === modelDestinations[index]),
  'isTieDestination bate com o array de destinos',
)

// Grande pauta: treble e bass intercalados. Ligadura fica na mesma pauta.
const interleaved = [
  { tieToNext: true, staff: 'treble' as const },
  { tieToNext: false, staff: 'bass' as const },
  { tieToNext: false, staff: 'treble' as const },
]
assert(
  toTieDestinations(interleaved).join(',') === 'false,false,true',
  'ligadura da treble cai no proximo treble, nao no bass do meio',
)
assert(
  tieModel.map((_, index) => tieToNextFromDestination(modelDestinations, index)).join(',')
    === tieModel.map(beat => beat.tieToNext).join(','),
  'ida e volta entre os dois helpers recupera o tieToNext original',
)

// ─── Leitura de volta ───
// O parser de colagem mora dentro do Editor.tsx e nao e importavel, entao nada aqui
// o chama. O que estes casos cobrem e a leitura de efeitos (parseAlphaTexEffects, a
// MESMA funcao que o parser usa) sobre o AlphaTex que o gerador realmente emitiu.
// A tokenizacao de beats do Editor.tsx segue sem cobertura.

/** Efeitos de cada beat do tex, na ordem. Tolera acorde: `(c3 e3){-}` e um beat so. */
function beatEffectsFromTex(tex: string): string[][] {
  const beatTokens = tex.match(/(?:\([^)]+\)|r|[a-gA-G][#bn]?\d)(?:\{[^}]+\})?/g) ?? []
  return beatTokens.map(token => parseAlphaTexEffects(token.match(/\{[^}]+\}$/)?.[0]))
}

function tieToNextFromTex(tex: string): boolean[] {
  const destinations = beatEffectsFromTex(tex).map(effects => effects.includes('-'))
  return destinations.map((_, index) => tieToNextFromDestination(destinations, index))
}

// Sincope da musica-alvo: seminima pontuada ligada a uma colcheia.
const syncopeModel = [{ tieToNext: true }, { tieToNext: false }]
const syncopeTex = beatsToAlphaTexNotes([
  makeBeat({ pitches: [makeNote('C/4')], dotted: true, tie: isTieDestination(syncopeModel, 0) }),
  makeBeat({ pitches: [makeNote('C/4')], duration: '8', tie: isTieDestination(syncopeModel, 1) }),
]).tex
assert(
  beatEffectsFromTex(syncopeTex).map(effects => effects.includes('-')).join(',') === 'false,true',
  'AlphaTex leva a marca no beat destino',
)
assert(
  tieToNextFromTex(syncopeTex).join(',') === syncopeModel.map(beat => beat.tieToNext).join(','),
  'reler o AlphaTex gerado devolve tieToNext no beat de origem',
)

// Casos que a leitura por substring errava: o destino tem mais de um efeito na chave.
const dottedDestinationTex = beatsToAlphaTexNotes([
  makeBeat({ pitches: [makeNote('C/4')], duration: '8' }),
  makeBeat({ pitches: [makeNote('C/4')], dotted: true, tie: true }),
]).tex
assertContains(dottedDestinationTex, '{d -}', 'Destino pontuado junta os dois efeitos numa chave so')
assert(
  tieToNextFromTex(dottedDestinationTex).join(',') === 'true,false',
  'Destino pontuado ({d -}) nao perde a ligadura na releitura',
)

const cifraDestinationTex = beatsToAlphaTexNotes([
  makeBeat({ pitches: [makeNote('D/4')], duration: '8' }),
  makeBeat({ pitches: [makeNote('D/4')], tie: true, cifra: 'D' }),
]).tex
assert(
  tieToNextFromTex(cifraDestinationTex).join(',') === 'true,false',
  'Destino com cifra ({- ch "D"}) nao perde a ligadura na releitura',
)
assert(
  !beatEffectsFromTex(cifraDestinationTex)[1].includes('d'),
  'O "D" da cifra nao e confundido com ponto de aumento',
)

const dottedCifraDestinationTex = beatsToAlphaTexNotes([
  makeBeat({ pitches: [makeNote('D/4')], duration: '8' }),
  makeBeat({ pitches: [makeNote('D/4')], dotted: true, tie: true, cifra: 'D' }),
]).tex
const dottedCifraEffects = beatEffectsFromTex(dottedCifraDestinationTex)[1]
assert(
  dottedCifraEffects.includes('d') && dottedCifraEffects.includes('-') && dottedCifraEffects.includes('ch'),
  'Chave com tres efeitos ({d - ch "D"}) e lida atomo a atomo',
)

// `dd` e um atomo proprio: ponto duplo nao pode virar ponto simples na releitura.
const doubleDottedEffects = beatEffectsFromTex(
  beatsToAlphaTexNotes([makeBeat({ pitches: [makeNote('C/4')], doubleDotted: true })]).tex,
)[0]
assert(
  doubleDottedEffects.includes('dd') && !doubleDottedEffects.includes('d'),
  'Ponto duplo e o atomo dd, nunca d',
)

// Acorde: a extracao por beat nao pode quebrar no espaco de dentro dos parenteses.
const chordTieTex = beatsToAlphaTexNotes([
  makeBeat({ pitches: [makeNote('C/4'), makeNote('E/4')] }),
  makeBeat({ pitches: [makeNote('C/4'), makeNote('E/4')], tie: true }),
]).tex
assert(
  tieToNextFromTex(chordTieTex).join(',') === 'true,false',
  'Acorde ligado conta como um beat so na releitura',
)

console.log('\n--- Barra ritmica (slash) ---')
const slashTex = beatsToAlphaTexNotes([
  makeBeat({ pitches: [makeNote('B/4')], slash: true }),
  makeBeat({ pitches: [makeNote('B/4')], slash: true, dotted: true }),
]).tex
assertContains(slashTex, '{slashed}', 'beat com slash emite {slashed}')
assertContains(slashTex, '{d slashed}', 'ponto e slash saem na mesma chave')
assertContains(slashTex, 'b3', 'B/4 do modelo sai como b3 no tex')

const semSlashTex = beatsToAlphaTexNotes([makeBeat({ pitches: [makeNote('B/4')] })]).tex
assertNotContains(semSlashTex, 'slashed', 'beat sem slash nao emite {slashed}')

const slashSemAlturaTex = beatsToAlphaTexNotes([makeBeat({ slash: true, isRest: false })]).tex
assertContains(slashSemAlturaTex, 'b3{slashed}', 'slash sem pitch cai na altura neutra b3')

const slashCifraTex = beatsToAlphaTexNotes([
  makeBeat({ pitches: [makeNote('B/4')], slash: true, cifra: 'D' }),
]).tex
assertContains(slashCifraTex, 'b3{slashed ch "D"}', 'slash e cifra saem na mesma chave')

console.log('\n--- Cabecalho de compasso ---')
const cabecalhoTex = beatsToAlphaTexNotes([
  makeBeat({
    pitches: [makeNote('B/4')], slash: true, cifra: 'D',
    sectionStart: { marker: 'A', text: 'Violao, piano e vocal' },
    repeatOpen: true, timeSignature: '4/4', barAfter: true,
  }),
  makeBeat({ pitches: [makeNote('B/4')], slash: true, timeSignature: '2/4', barAfter: true }),
  makeBeat({ pitches: [makeNote('B/4')], slash: true, repeatClose: 7, jump: 'fine' }),
]).tex

assertContains(cabecalhoTex, '\\section "A" ""', 'secao emite marcador em caixa, sem o texto longo')
assertNotContains(cabecalhoTex, 'Violao', 'texto longo da secao nao vai para a pauta')
assertContains(cabecalhoTex, '\\ts 4 4 \\section', 'metrica antes da secao')
assertContains(cabecalhoTex, '\\section "A" "" \\ro', 'secao antes do repeat open')
assertContains(cabecalhoTex, '\\ts 2 4', 'metrica muda no compasso do meio')
assertContains(cabecalhoTex, '\\rc 7', 'repeat close com numero de voltas')
assertContains(cabecalhoTex, '\\jump fine', 'Fine no ultimo compasso')
assert(cabecalhoTex.split('\\ts 2 4').length === 2, 'metrica nao repete no compasso seguinte')

const simileResult = beatsToAlphaTexNotes([
  makeBeat({ pitches: [makeNote('B/4')], slash: true, barAfter: true }),
  makeBeat({ pitches: [makeNote('B/4')], slash: true, simile: 'simple', barAfter: true }),
  makeBeat({ pitches: [makeNote('B/4')], slash: true }),
])
assertContains(simileResult.tex, '\\simile simple', 'compasso de simile emite a tag')
assert(
  (simileResult.tex.match(/slashed/g) ?? []).length === 2,
  `simile nao emite os beats do compasso, tex=${simileResult.tex}`,
)
assert(
  simileResult.indexMap.length === 3,
  `simile reserva um indice AlphaTab, mapa=${simileResult.indexMap.join(',')}`,
)

console.log('\n--- Material legado (melodia sem fatos de compasso) ---')
const legadoTex = beatsToAlphaTexNotes([
  makeBeat({ pitches: [makeNote('C/4')] }),
  makeBeat({ pitches: [makeNote('E/4')] }),
  makeBeat({ pitches: [makeNote('G/4')], barAfter: true }),
]).tex
assertNotContains(legadoTex, 'slashed', 'melodia nao emite {slashed}')
assertNotContains(legadoTex, '\\section', 'melodia nao emite secao')
assertNotContains(legadoTex, '\\ro', 'melodia nao emite repeat open')
assertNotContains(legadoTex, '\\simile', 'melodia nao emite simile')
assertNotContains(legadoTex, '\\jump', 'melodia nao emite Fine')
assertContains(legadoTex, ':4 c3 e3 g3 |', 'melodia continua com notas e barra pedagogica')

console.log('\n--- Forma (secao, repeat, simile, Fine) ---')
const formaTex = beatsToAlphaTexNotes([
  makeBeat({ pitches: [makeNote('B/4')], slash: true, sectionStart: { marker: "A'", text: 'Banda' }, barAfter: true }),
  makeBeat({ pitches: [makeNote('B/4')], slash: true, sectionStart: { marker: 'B', text: '' }, repeatOpen: true, barAfter: true }),
  makeBeat({ pitches: [makeNote('B/4')], slash: true, simile: 'simple', barAfter: true }),
  makeBeat({ pitches: [makeNote('B/4')], slash: true, repeatClose: 7, barAfter: true }),
  makeBeat({ pitches: [makeNote('B/4')], slash: true, duration: 'w', jump: 'fine', cifra: 'D' }),
]).tex
assertContains(formaTex, '\\section "A\'" ""', 'marcador A\' em caixa')
assertContains(formaTex, '\\section "B" "" \\ro', 'B abre repeticao')
assertContains(formaTex, '\\simile simple', 'interludio com %')
assertContains(formaTex, '\\rc 7', 'solo com 7 voltas')
assertContains(formaTex, '\\jump fine', 'Fine no ultimo')
assertContains(formaTex, ':1 b3{slashed ch "D"}', 'Fine em semibreve slashed (losango)')

// ─── Resultado ───

console.log(`\n${'─'.repeat(40)}`)
console.log(`🎵 Resultado: ${passed} passaram, ${failed} falharam de ${passed + failed} testes`)
if (failed > 0) {
  console.log('⚠️ Alguns testes falharam — revisar conversão')
  process.exit(1)
} else {
  console.log('✅ Todos os testes passaram!')
}
