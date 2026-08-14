import assert from 'node:assert/strict'
import { coverAssetUrls, coverFromNotebook, coverFromSongbookBlocks } from '../repertoirePdfCover'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('coverFromNotebook fills title, template, school and professor', () => {
  const cover = coverFromNotebook({
    name: 'Caderno do Chiquinho',
    tags: ['cover-template:bold'],
    cover_image_url: 'https://cdn.example/capa.jpg',
    instrument: 'violão',
    difficulty_level: 'grow',
  }, {
    schoolName: 'LA Music',
    professorName: 'Alf',
    logoUrl: 'https://cdn.example/logo.png',
  })

  assert.equal(cover.title, 'Caderno do Chiquinho')
  assert.equal(cover.renderData.template, 'bold')
  assert.equal(cover.renderData.titulo, 'Caderno do Chiquinho')
  assert.equal(cover.renderData.instrumento, 'violão')
  assert.equal(cover.renderData.nivel, 'Grow')
  assert.equal(cover.renderData.escola, 'LA Music')
  assert.equal(cover.renderData.professor, 'Alf')
  assert.equal(cover.renderData.cover_image_url, 'https://cdn.example/capa.jpg')
  assert.deepEqual(coverAssetUrls(cover), [
    'https://cdn.example/capa.jpg',
    'https://cdn.example/logo.png',
  ])
})

test('coverFromSongbookBlocks reads the cover block and fills missing title', () => {
  const cover = coverFromSongbookBlocks([
    {
      id: 'c',
      block_type: 'cover',
      render_data: { template: 'elegant', cover_image_url: 'https://cdn.example/x.jpg' },
    },
    { id: 't', block_type: 'text', title: 'Song' },
  ], 'Caderno do Chiquinho')

  assert.equal(cover?.title, 'Caderno do Chiquinho')
  assert.equal(cover?.renderData.template, 'elegant')
  assert.equal(cover?.renderData.titulo, 'Caderno do Chiquinho')
})

test('coverFromSongbookBlocks returns null without a cover block', () => {
  assert.equal(coverFromSongbookBlocks([{ id: 't', block_type: 'text', title: 'Song' }]), null)
})
