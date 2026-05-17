import {
  buildSvgElementPrompt,
  buildCuratedMusicSymbolSvg,
  buildCuratedInstrumentSvg,
  convertSvgColorsToCurrentColor,
  createFloatingImageFromElementAsset,
  extractSvgFromAiText,
  filterElementAssets,
  getElementPickerVisibleAssets,
  getCuratedMusicElementAssets,
  mapElementTypeToImageCategory,
  resolveCuratedMusicSvgCode,
  sanitizeSvg,
  type ElementLibraryAsset,
} from '../elementPicker'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nExpected: ${expectedJson}\nActual:   ${actualJson}`)
  }
}

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

const assets: ElementLibraryAsset[] = [
  {
    id: 'asset-1',
    label: 'Clave de sol',
    image_url: 'https://example.com/clave.png',
    svg_code: null,
    image_format: 'png',
    category: 'notation',
    element_type: 'musica',
    tags: ['clave', 'partitura'],
  },
  {
    id: 'asset-2',
    label: 'Violao acustico',
    image_url: 'https://example.com/violao.png',
    svg_code: null,
    image_format: 'png',
    category: 'instrument',
    element_type: 'instrumento',
    tags: ['cordas'],
  },
]

test('filters element assets by text, tags and element type', () => {
  assertEqual(
    filterElementAssets(assets, { search: 'partitura', elementType: 'todos' }).map(asset => asset.id),
    ['asset-1'],
    'search should match tags',
  )

  assertEqual(
    filterElementAssets(assets, { search: '', elementType: 'instrumento' }).map(asset => asset.id),
    ['asset-2'],
    'element type filter should narrow results',
  )
})

test('provides a production curated library of musical SVG elements', () => {
  const curated = getCuratedMusicElementAssets()

  assert(curated.length >= 24, 'curated music library should cover common production symbols')
  assert(curated.some(asset => asset.label === 'Clave de sol'), 'library should include treble clef')
  assert(curated.some(asset => asset.label === 'Clave de fa'), 'library should include bass clef')
  assert(curated.some(asset => asset.label === 'Pentagrama'), 'library should include staff/pentagram')
  assert(curated.some(asset => asset.label === 'Tablatura'), 'library should include tablature')

  for (const asset of curated) {
    assert(asset.id.startsWith('curated-music-'), 'curated ids should be namespaced')
    assertEqual(asset.element_type, 'musica', 'curated assets should use the musica filter')
    assertEqual(asset.image_format, 'svg', 'curated assets should be SVG')
    assert(asset.image_url?.startsWith('data:image/svg+xml;charset=utf-8,'), 'curated SVGs should have a data URL fallback')
    assert(asset.svg_code?.includes('<svg'), 'curated assets should include inline SVG code')
    assert(asset.svg_code?.includes('currentColor'), 'curated SVGs should be recolorable')
    assert(!asset.svg_code?.includes('<script'), 'curated SVGs should not contain scripts')
    assert(!asset.svg_code?.includes('<foreignObject'), 'curated SVGs should not contain foreignObject')
    assert((asset.tags?.length ?? 0) > 0, 'curated assets should be searchable by tags')
  }

  const searchResults = filterElementAssets(curated, { search: 'clave fa', elementType: 'musica' })
  assert(searchResults.some(asset => asset.label === 'Clave de fa'), 'curated assets should be searchable by label/tags')
})

test('combines curated musical assets with uploaded picker assets', () => {
  const visibleMusic = getElementPickerVisibleAssets([], { search: 'pentagrama', elementType: 'musica' })
  assertEqual(visibleMusic.map(asset => asset.label), ['Pentagrama'], 'music filter should include curated elements even when remote library is empty')

  const visibleInstruments = getElementPickerVisibleAssets(assets, { search: '', elementType: 'instrumento' })
  assertEqual(visibleInstruments.map(asset => asset.id), ['asset-2'], 'non-music filters should keep remote assets without curated music')

  const visibleAll = getElementPickerVisibleAssets(assets, { search: 'partitura', elementType: 'todos' })
  assert(visibleAll.some(asset => asset.id === 'asset-1'), 'all filter should keep matching remote assets')
  assert(visibleAll.some(asset => asset.id.startsWith('curated-music-')), 'all filter should also include matching curated assets')
})

test('inserts curated square SVG assets without the default A4 crop box', () => {
  const curated = getCuratedMusicElementAssets()
  const treble = curated.find(asset => asset.label === 'Clave de sol')
  assert(Boolean(treble), 'treble clef should exist')

  const floating = createFloatingImageFromElementAsset(treble!, {
    id: 'floating-curated',
    pageIndex: 0,
    zIndex: 10,
  })

  assertEqual(floating.svgCode, treble!.svg_code, 'curated inline SVG should travel to the floating element')
  assertEqual(floating.width, 24, 'curated music SVGs should enter with a compact square width')
  assertEqual(floating.height, 24, 'curated music SVGs should enter with a square box so the icon is not cropped')
  assertEqual(floating.color, '#111827', 'curated music SVGs should be recolorable')
})

test('creates a floating image using the existing page_config floating element model', () => {
  const floating = createFloatingImageFromElementAsset(assets[0], {
    id: 'floating-1',
    pageIndex: 3,
    zIndex: 70,
  })

  assertEqual(floating.type, 'floating_image', 'element picker should reuse floating_image')
  assertEqual(floating.imageUrl, 'https://example.com/clave.png', 'image_url should become imageUrl')
  assertEqual(floating.pageIndex, 3, 'current page should be preserved')
  assertEqual(floating.x, 50, 'initial x should be centered in page percent')
  assertEqual(floating.y, 50, 'initial y should be centered in page percent')
  assertEqual(floating.width, 30, 'initial width should use existing percent sizing')
  assertEqual(floating.height, 21.2, 'initial height should create a real clickable image box on A4')
  assertEqual(floating.zIndex, 70, 'z-index should be supplied by caller')
  assertEqual(floating.name, 'Clave de sol', 'label should become layer name')
  assert(floating.visible && !floating.locked, 'new element should be visible and unlocked')
})

test('creates recolorable floating images for SVG assets with inline code', () => {
  const svgAsset: ElementLibraryAsset = {
    id: 'asset-svg',
    label: 'Bateria SVG',
    image_url: 'https://example.com/bateria.svg',
    svg_code: '<svg viewBox="0 0 10 10"><path fill="currentColor" d="M0 0H10V10Z" /></svg>',
    image_format: 'svg',
    category: 'notation',
    element_type: 'musica',
    tags: ['bateria'],
  }

  const floating = createFloatingImageFromElementAsset(svgAsset, {
    id: 'floating-svg',
    pageIndex: 1,
    zIndex: 80,
  })

  assertEqual(floating.imageUrl, 'https://example.com/bateria.svg', 'SVG fallback URL should still be used')
  assertEqual(floating.svgCode, svgAsset.svg_code, 'sanitized svg_code should travel into the floating element')
  assertEqual(floating.color, '#111827', 'SVG elements should receive a default recolor value')
})

test('rejects assets without image url because insertion uses floating_image', () => {
  const svgOnly: ElementLibraryAsset = {
    id: 'asset-3',
    label: 'Clave svg',
    image_url: null,
    svg_code: '<svg />',
    image_format: 'svg',
    category: 'notation',
    element_type: 'musica',
    tags: [],
  }

  let errorMessage = ''
  try {
    createFloatingImageFromElementAsset(svgOnly, {
      id: 'floating-2',
      pageIndex: 0,
      zIndex: 10,
    })
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error)
  }

  assert(errorMessage.includes('image_url'), 'SVG-only assets should wait for the future inline SVG pass')
})

test('sanitizes SVG uploads before storing svg_code', () => {
  const sanitized = sanitizeSvg(`
    <svg viewBox="0 0 10 10" onload="alert(1)" xmlns="http://www.w3.org/2000/svg">
      <defs><path id="stick" d="M0 0H10" /></defs>
      <script>alert(1)</script>
      <use href="https://evil.test/icon.svg#x"></use>
      <use href="#stick" x="1" y="2" />
      <a href="https://evil.test"><circle cx="5" cy="5" r="4" onclick="alert(2)" /></a>
      <path href="#local" d="M0 0H10" />
    </svg>
  `)

  assert(sanitized !== null, 'valid SVG should survive sanitization')
  assert(!sanitized!.includes('<script'), 'script tags should be removed')
  assert(!sanitized!.includes('https://evil.test/icon.svg'), 'external use href should be removed')
  assert(sanitized!.includes('href="#stick"'), 'local use href should be preserved')
  assert(!sanitized!.includes('onload'), 'event handlers should be removed')
  assert(!sanitized!.includes('onclick'), 'event handlers inside children should be removed')
  assert(!sanitized!.includes('https://evil.test'), 'external href values should be removed')
  assert(sanitized!.includes('href="#local"'), 'local fragment href should be preserved')
})

test('converts dark SVG fills and strokes to currentColor', () => {
  const converted = convertSvgColorsToCurrentColor(`
    <svg viewBox="0 0 10 10">
      <path fill="#111111" d="M0 0H10" />
      <path stroke="#222" d="M0 1H10" />
      <path fill="black" stroke="#333333" d="M0 2H10" />
      <path fill="none" stroke="#f43f5e" d="M0 3H10" />
    </svg>
  `)

  assert(converted.includes('fill="currentColor"'), 'dark fill should become currentColor')
  assert(converted.includes('stroke="currentColor"'), 'dark stroke should become currentColor')
  assert(converted.includes('fill="none"'), 'fill none should be preserved')
  assert(converted.includes('stroke="#f43f5e"'), 'bright brand colors should be preserved')
})

test('builds a strict prompt for generated SVG elements', () => {
  const prompt = buildSvgElementPrompt({
    label: 'Caixa de bateria',
    description: 'caixa de bateria com duas baquetas cruzadas',
    elementType: 'musica',
  })

  assert(prompt.includes('inline SVG'), 'prompt should request inline SVG')
  assert(prompt.includes('currentColor'), 'prompt should request recolorable currentColor shapes')
  assert(prompt.includes('at most 12 SVG elements'), 'prompt should keep generated SVG compact')
  assert(prompt.includes('at most 1200 characters'), 'prompt should avoid truncated SVG output')
  assert(prompt.includes('Do not include markdown'), 'prompt should forbid markdown wrappers')
  assert(prompt.includes('Caixa de bateria'), 'prompt should include label context')
  assert(prompt.includes('caixa de bateria'), 'prompt should include user description')
})

test('extracts SVG code from model text', () => {
  assertEqual(
    extractSvgFromAiText('```svg\n<svg viewBox="0 0 10 10"><path /></svg>\n```'),
    '<svg viewBox="0 0 10 10"><path /></svg>',
    'fenced SVG should be extracted',
  )

  assertEqual(
    extractSvgFromAiText('before <svg viewBox="0 0 10 10"><circle /></svg> after'),
    '<svg viewBox="0 0 10 10"><circle /></svg>',
    'inline SVG should be extracted from surrounding prose',
  )
})

test('uses curated Bravura SVG for standard music symbols', () => {
  const trebleClef = buildCuratedMusicSymbolSvg({
    label: 'Clave de sol',
    description: 'simbolo musical para notacao',
    elementType: 'musica',
  })

  assert(trebleClef !== null, 'known music symbols should use curated SVG')
  assert(trebleClef!.includes('<path'), 'treble clef should use the fitted Bravura outline path')
  assert(trebleClef!.includes('scale(0.0535 -0.0535)'), 'treble clef should be scaled to fit inside its viewBox')
  assert(trebleClef!.includes('currentColor'), 'curated symbols should stay recolorable')

  const freeRequest = buildCuratedMusicSymbolSvg({
    label: 'Mascote guitarrista',
    description: 'personagem segurando guitarra',
    elementType: 'decorativo',
  })
  assertEqual(freeRequest, null, 'non-musical/free requests should still use the AI generator')
})

test('repairs legacy Bravura text SVGs for treble clef elements', () => {
  const legacySvg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
    '<text x="50" y="55" font-family="Bravura, \'Noto Music\', serif" font-size="84" fill="currentColor" text-anchor="middle" dominant-baseline="middle">&#xE050;</text>',
    '</svg>',
  ].join('')

  const repaired = resolveCuratedMusicSvgCode({
    label: 'clave de sol',
    description: 'simbolo musical',
    elementType: 'musica',
    svgCode: legacySvg,
  })

  assert(repaired !== legacySvg, 'legacy text glyph should be replaced by the fitted outline path')
  assert(repaired!.includes('<path'), 'repaired treble clef should render as an SVG path')
  assert(repaired!.includes('scale(0.0535 -0.0535)'), 'repaired treble clef should use the fitted Bravura transform')
  assert(!repaired!.includes('<text'), 'repaired treble clef should not depend on browser font glyph metrics')
})

test('maps element type to image library category', () => {
  assertEqual(mapElementTypeToImageCategory('musica'), 'notation', 'musical elements should be notation')
  assertEqual(mapElementTypeToImageCategory('instrumento'), 'instrument', 'instrument elements should be instruments')
  assertEqual(mapElementTypeToImageCategory('forma'), 'diagram', 'shape elements should be diagrams')
  assertEqual(mapElementTypeToImageCategory('decorativo'), 'other', 'decorative elements should be generic image assets')
})

test('keeps unknown instrument SVG requests as SVG generation work', () => {
  const saxCuratedSvg = buildCuratedInstrumentSvg({
    label: 'saxofone',
    description: 'Cria um elemento monocromatico saxofone',
    elementType: 'instrumento',
  })

  assertEqual(saxCuratedSvg, null, 'saxophone is not curated yet')

  const prompt = buildSvgElementPrompt({
    label: 'saxofone',
    description: 'Cria um elemento monocromatico saxofone',
    elementType: 'instrumento',
  })

  assert(prompt.includes('detailed but clean monochrome SVG illustration'), 'instrument SVG prompt should allow real illustration detail')
  assert(prompt.includes('curves, paths, groups, defs, clipPath'), 'instrument SVG prompt should allow complex vector construction')
  assert(!prompt.includes('at most 12 SVG elements'), 'instrument SVG prompt must not use the tiny-icon hard limit')
})

test('keeps known curated instrument SVG requests as editable SVG', () => {
  const guitarCuratedSvg = buildCuratedInstrumentSvg({
    label: 'violao',
    description: 'violao monocromatico',
    elementType: 'instrumento',
  })

  assert(guitarCuratedSvg != null, 'guitar should be curated')
  assert(guitarCuratedSvg!.includes('<svg'), 'curated instruments should remain editable SVG')
})

test('rejects invalid SVG text', () => {
  assertEqual(sanitizeSvg('<div>not svg</div>'), null, 'non-svg root should be rejected')
  assertEqual(sanitizeSvg('<svg><path></svg'), null, 'malformed SVG should be rejected')
})
