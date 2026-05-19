import assert from 'node:assert/strict'
import { getPlaceholder } from '../../components/editor/blocks/types'

function run() {
  assert.equal(getPlaceholder('text'), 'Escreva seu texto aqui')
  assert.equal(getPlaceholder('tip'), 'Digite a dica...')
  assert.equal(getPlaceholder('exercise'), 'Digite o exercicio...')
}

run()
