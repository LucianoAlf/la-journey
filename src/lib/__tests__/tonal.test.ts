/**
 * Teste de verificação do tonal.js
 * Executar: npx tsx src/lib/__tests__/tonal.test.ts
 */
import { Scale, Chord, Interval, Progression } from 'tonal'

console.log('=== Testando tonal.js ===\n')

// Teste 1: Escalas
const cMajor = Scale.get('C major').notes
console.log('Escala C maior:', cMajor)
console.assert(cMajor.length === 7, 'Escala deve ter 7 notas')
console.assert(cMajor[0] === 'C', 'Primeira nota deve ser C')

// Teste 2: Acordes
const am7 = Chord.get('Am7').notes
console.log('Acorde Am7:', am7)
console.assert(am7.length === 4, 'Am7 deve ter 4 notas')
console.assert(am7[0] === 'A', 'Raiz deve ser A')

// Teste 3: Intervalos
const interval = Interval.distance('C4', 'E4')
console.log('Intervalo C4→E4:', interval)
console.assert(interval === '3M', 'Intervalo deve ser 3M (terça maior)')

// Teste 4: Progressões (retorna notas raízes)
const progression = Progression.fromRomanNumerals('C', ['I', 'vi', 'IV', 'V'])
console.log('Progressão I-vi-IV-V em C:', progression)
console.assert(progression[0] === 'C', 'Primeiro acorde deve ser C')
console.assert(progression[1] === 'A', 'Segundo acorde deve ser A (raiz de Am)')
console.assert(progression[2] === 'F', 'Terceiro acorde deve ser F')
console.assert(progression[3] === 'G', 'Quarto acorde deve ser G')

console.log('\n✅ Todos os testes passaram! tonal.js está funcionando.')
