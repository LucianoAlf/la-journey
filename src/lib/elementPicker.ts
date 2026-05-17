import {
  DEFAULT_FLOATING_IMAGE,
  getFloatingAspectLockedHeight,
  type FloatingImage,
} from './floatingElements'

export type ElementTypeFilter = 'todos' | 'musica' | 'instrumento' | 'forma' | 'decorativo' | 'moldura'
export type GeneratedElementType = Exclude<ElementTypeFilter, 'todos'>

export interface ElementLibraryAsset {
  id: string
  image_url: string | null
  svg_code: string | null
  label: string
  category: string | null
  image_format: string | null
  element_type: string | null
  tags: string[] | null
  source?: string | null
}

interface ElementAssetFilters {
  search: string
  elementType: ElementTypeFilter
}

interface CreateFloatingImageOptions {
  id: string
  pageIndex: number
  zIndex: number
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function mapElementTypeToImageCategory(elementType: GeneratedElementType): string {
  if (elementType === 'musica') return 'notation'
  if (elementType === 'instrumento') return 'instrument'
  if (elementType === 'forma') return 'diagram'
  return 'other'
}

function textMatchesKeywords(text: string, keywords: string[]): boolean {
  const normalized = normalize(text)
  return keywords.some(keyword => normalized.includes(normalize(keyword)))
}

const INSTRUMENT_QUERY_KEYWORDS = [
  'violao',
  'violão',
  'guitarra',
  'guitar',
  'piano',
  'teclado',
  'keyboard',
  'bateria',
  'tambor',
  'caixa',
  'drum',
  'drums',
  'snare',
  'baqueta',
  'baquetas',
  'microfone',
  'microphone',
  'mic',
]

export function inferGeneratedElementType({
  label,
  description,
  requestedType,
}: {
  label: string
  description: string
  requestedType: GeneratedElementType
}): GeneratedElementType {
  const query = `${label} ${description}`
  if (requestedType !== 'instrumento' && textMatchesKeywords(query, INSTRUMENT_QUERY_KEYWORDS)) {
    return 'instrumento'
  }
  return requestedType
}

export function buildSvgElementPrompt({
  label,
  description,
  elementType,
}: {
  label: string
  description: string
  elementType: GeneratedElementType
}): string {
  if (elementType === 'instrumento') {
    return [
      'Create a detailed but clean monochrome SVG illustration of a musical instrument for a music education material element.',
      'Return a real vector drawing, not an abstract placeholder, not a simple circle, not a generic icon unless the requested instrument is naturally simple.',
      'The instrument must be recognizable from the label and description, with accurate silhouette and important details.',
      'Use transparent background. Do not draw a white rectangle or any solid background.',
      'Use currentColor for visible fills and strokes whenever possible so the editor can recolor the illustration.',
      'You may use curves, paths, groups, defs, clipPath, circles, ellipses, rectangles, lines, polylines, and polygons.',
      'Keep the SVG self-contained: no external fonts, raster images, external links, scripts, animations, or foreignObject.',
      'Use an appropriate viewBox and preserveAspectRatio="xMidYMid meet".',
      'Prefer a centered full-instrument view with comfortable padding and complete visible geometry.',
      'Target a production-ready educational asset, similar to a clean vector icon library or a high-quality Gemini-generated SVG.',
      `Element type: ${elementType}.`,
      `Label: ${label.trim()}.`,
      `Description: ${description.trim()}.`,
      'Return only the <svg>...</svg> markup.',
    ].join('\n')
  }

  return [
    'Create a very small inline SVG icon for a music education material element.',
    'Do not include markdown, code fences, comments, explanations, raster images, external links, external fonts, scripts, animations, or foreignObject.',
    'Hard limits: at most 12 SVG elements total, at most 1200 characters, no complex path data, no decorative detail.',
    'Allowed tags only: svg, g, path, circle, rect, line, polyline, polygon, ellipse.',
    'Use a clean monochrome vector style with simple geometry.',
    'Use currentColor for the main fill and stroke so the editor can recolor the icon.',
    'Use transparent background, viewBox="0 0 100 100", width="100%", height="100%", and preserveAspectRatio="xMidYMid meet".',
    'Keep the icon centered with complete visible geometry and comfortable padding inside the viewBox.',
    `Element type: ${elementType}.`,
    `Label: ${label.trim()}.`,
    `Description: ${description.trim()}.`,
    'Return only the <svg>...</svg> markup.',
  ].join('\n')
}

export function extractSvgFromAiText(text: string): string | null {
  const fenced = text.match(/```(?:svg|xml)?\s*([\s\S]*?<svg[\s\S]*?<\/svg>)\s*```/i)
  if (fenced?.[1]) return fenced[1].trim()

  const raw = text.match(/<svg[\s\S]*?<\/svg>/i)
  return raw?.[0]?.trim() ?? null
}

const BRAVURA_FONT_STACK = "Bravura, 'Noto Music', serif"
const BRAVURA_TREBLE_CLEF_PATH = 'M364 -252c-245 0 -364 165 -364 339c0 202 153 345 297 464c12 10 11 12 9 24c-7 41 -14 106 -14 164c0 104 24 229 98 311c20 22 51 48 65 48c11 0 37 -28 52 -50c41 -60 65 -146 65 -233c0 -153 -82 -280 -190 -381c-6 -6 -8 -7 -6 -19l25 -145c3 -18 3 -18 29 -18c147 0 241 -113 241 -241c0 -113 -67 -198 -168 -238c-14 -6 -15 -5 -13 -17c11 -62 29 -157 29 -214c0 -170 -130 -200 -197 -200c-151 0 -190 98 -190 163c0 62 40 115 107 115c61 0 96 -47 96 -102c0 -58 -36 -85 -67 -94c-23 -7 -32 -10 -32 -17c0 -13 26 -29 80 -29c59 0 159 18 159 166c0 47 -15 134 -27 201c-2 12 -4 11 -15 9c-20 -4 -46 -6 -69 -6zM80 20c0 -139 113 -236 288 -236c20 0 40 2 56 5c15 3 16 3 14 14l-50 298c-2 11 -4 12 -20 8c-61 -17 -100 -60 -100 -117c0 -46 30 -89 72 -107c7 -3 15 -6 15 -13c0 -6 -4 -11 -12 -11c-7 0 -19 3 -27 6c-68 23 -115 87 -115 177c0 85 57 164 145 194c18 6 18 5 15 24l-21 128c-2 11 -4 12 -14 4c-47 -38 -93 -75 -153 -142c-83 -94 -93 -173 -93 -232zM470 943c-61 0 -133 -96 -133 -252c0 -32 2 -66 6 -92c2 -13 6 -14 13 -8c79 69 174 159 174 270c0 55 -27 82 -60 82zM441 117c-12 1 -13 -2 -11 -14l49 -285c2 -12 4 -12 16 -6c56 28 94 79 94 142c0 88 -67 156 -148 163z'

interface CuratedMusicSymbol {
  keywords: string[]
  glyph: string
  fontSize: number
  y: number
  path?: string
  pathTransform?: string
}

const CURATED_MUSIC_SYMBOLS: CuratedMusicSymbol[] = [
  {
    keywords: ['clave de sol', 'clave sol', 'treble clef', 'g clef'],
    glyph: '&#xE050;',
    fontSize: 84,
    y: 55,
    path: BRAVURA_TREBLE_CLEF_PATH,
    pathTransform: 'translate(32 63) scale(0.0535 -0.0535)',
  },
  { keywords: ['clave de fa', 'clave fa', 'bass clef', 'f clef'], glyph: '&#xE062;', fontSize: 78, y: 53 },
  { keywords: ['clave de do', 'clave do', 'alto clef', 'c clef'], glyph: '&#xE05C;', fontSize: 82, y: 53 },
  { keywords: ['sustenido', 'sharp'], glyph: '&#xE262;', fontSize: 76, y: 52 },
  { keywords: ['bemol', 'flat'], glyph: '&#xE260;', fontSize: 76, y: 52 },
  { keywords: ['bequadro', 'natural'], glyph: '&#xE261;', fontSize: 76, y: 52 },
  { keywords: ['seminima', 'quarter note'], glyph: '&#x2669;', fontSize: 82, y: 50 },
  { keywords: ['colcheia', 'eighth note'], glyph: '&#x266A;', fontSize: 82, y: 50 },
  { keywords: ['duas colcheias', 'beamed eighth', 'eighth notes'], glyph: '&#x266B;', fontSize: 82, y: 50 },
]

interface CuratedMusicElementDefinition {
  id: string
  label: string
  tags: string[]
  svg: string
}

function musicSvg(content: string, viewBox = '0 0 100 100'): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`,
    content,
    '</svg>',
  ].join('')
}

function bravuraTextSvg(glyph: string, fontSize = 68, y = 54): string {
  return musicSvg(
    `<text x="50" y="${y}" font-family="${BRAVURA_FONT_STACK}" font-size="${fontSize}" fill="currentColor" text-anchor="middle" dominant-baseline="middle">${glyph}</text>`,
  )
}

function staffLinesSvg(rows = 5, withTab = false): string {
  const start = withTab ? 24 : 26
  const gap = withTab ? 8 : 10
  const lines = Array.from({ length: rows }, (_, index) => {
    const y = start + index * gap
    return `<line x1="10" y1="${y}" x2="90" y2="${y}" stroke="currentColor" stroke-width="1.8" />`
  }).join('')

  return musicSvg(
    [
      `<g fill="none" stroke-linecap="round" opacity="0.9">${lines}</g>`,
      withTab ? '<text x="16" y="53" fill="currentColor" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" dominant-baseline="middle">TAB</text>' : '',
    ].join(''),
  )
}

function noteSvg({ filled = true, beam = false }: { filled?: boolean; beam?: boolean } = {}): string {
  if (beam) {
    return musicSvg([
      '<ellipse cx="30" cy="70" rx="11" ry="8" transform="rotate(-18 30 70)" fill="currentColor" />',
      '<ellipse cx="66" cy="62" rx="11" ry="8" transform="rotate(-18 66 62)" fill="currentColor" />',
      '<line x1="39" y1="68" x2="39" y2="25" stroke="currentColor" stroke-width="5" stroke-linecap="round" />',
      '<line x1="75" y1="60" x2="75" y2="17" stroke="currentColor" stroke-width="5" stroke-linecap="round" />',
      '<path d="M39 24L75 16L75 29L39 37Z" fill="currentColor" />',
    ].join(''))
  }

  return musicSvg([
    `<ellipse cx="40" cy="68" rx="14" ry="9" transform="rotate(-18 40 68)" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="5" />`,
    '<line x1="53" y1="65" x2="53" y2="20" stroke="currentColor" stroke-width="5" stroke-linecap="round" />',
  ].join(''))
}

function noteheadSvg(): string {
  return musicSvg('<ellipse cx="50" cy="52" rx="28" ry="16" transform="rotate(-18 50 52)" fill="none" stroke="currentColor" stroke-width="7" />')
}

function restSvg(kind: 'quarter' | 'eighth'): string {
  if (kind === 'eighth') {
    return musicSvg([
      '<circle cx="39" cy="34" r="10" fill="currentColor" />',
      '<path d="M47 35C56 40 64 41 73 36L54 82" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />',
    ].join(''))
  }

  return musicSvg('<path d="M48 14C62 25 54 36 42 43C58 49 61 61 47 70C59 77 62 85 52 93C48 84 39 78 29 73C45 66 46 58 32 51C45 43 47 34 36 24C41 21 45 18 48 14Z" fill="currentColor" />')
}

function barlineSvg(kind: 'single' | 'final' | 'repeat'): string {
  if (kind === 'repeat') {
    return musicSvg([
      staffLinesSvg(5).replace(/^<svg[^>]*>|<\/svg>$/g, ''),
      '<line x1="62" y1="22" x2="62" y2="70" stroke="currentColor" stroke-width="3" />',
      '<line x1="70" y1="22" x2="70" y2="70" stroke="currentColor" stroke-width="7" />',
      '<circle cx="50" cy="37" r="3.5" fill="currentColor" />',
      '<circle cx="50" cy="55" r="3.5" fill="currentColor" />',
    ].join(''))
  }

  return musicSvg([
    staffLinesSvg(5).replace(/^<svg[^>]*>|<\/svg>$/g, ''),
    kind === 'final'
      ? '<line x1="64" y1="22" x2="64" y2="70" stroke="currentColor" stroke-width="3" /><line x1="74" y1="22" x2="74" y2="70" stroke="currentColor" stroke-width="7" />'
      : '<line x1="50" y1="22" x2="50" y2="70" stroke="currentColor" stroke-width="4" />',
  ].join(''))
}

function articulationSvg(kind: 'staccato' | 'tenuto' | 'accent' | 'marcato' | 'fermata'): string {
  const content = {
    staccato: '<circle cx="50" cy="50" r="8" fill="currentColor" />',
    tenuto: '<line x1="28" y1="50" x2="72" y2="50" stroke="currentColor" stroke-width="8" stroke-linecap="round" />',
    accent: '<path d="M22 36L78 50L22 64" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />',
    marcato: '<path d="M28 70L50 28L72 70" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />',
    fermata: '<path d="M18 62C24 34 38 22 50 22C62 22 76 34 82 62" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" /><circle cx="50" cy="67" r="6" fill="currentColor" />',
  }[kind]

  return musicSvg(content)
}

function dynamicSvg(label: string): string {
  return musicSvg(
    `<text x="50" y="58" fill="currentColor" font-family="Georgia, 'Times New Roman', serif" font-size="42" font-style="italic" font-weight="700" text-anchor="middle" dominant-baseline="middle">${label}</text>`,
  )
}

function timeSignatureSvg(top: string, bottom?: string): string {
  const content = bottom
    ? `<text x="50" y="40" fill="currentColor" font-family="Georgia, serif" font-size="31" font-weight="700" text-anchor="middle" dominant-baseline="middle">${top}</text><text x="50" y="68" fill="currentColor" font-family="Georgia, serif" font-size="31" font-weight="700" text-anchor="middle" dominant-baseline="middle">${bottom}</text>`
    : `<text x="50" y="55" fill="currentColor" font-family="${BRAVURA_FONT_STACK}" font-size="62" text-anchor="middle" dominant-baseline="middle">${top}</text>`

  return musicSvg(content)
}

function hairpinSvg(direction: 'crescendo' | 'decrescendo'): string {
  return musicSvg(
    direction === 'crescendo'
      ? '<path d="M16 50L84 30M16 50L84 70" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" />'
      : '<path d="M16 30L84 50M16 70L84 50" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" />',
  )
}

function svgDataUrl(svgCode: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgCode)}`
}

const CURATED_MUSIC_ELEMENTS: CuratedMusicElementDefinition[] = [
  { id: 'treble-clef', label: 'Clave de sol', tags: ['clave', 'sol', 'g clef', 'partitura'], svg: buildCuratedMusicSymbolSvg({ label: 'Clave de sol', description: '', elementType: 'musica' })! },
  { id: 'bass-clef', label: 'Clave de fa', tags: ['clave', 'fa', 'f clef', 'partitura'], svg: buildCuratedMusicSymbolSvg({ label: 'Clave de fa', description: '', elementType: 'musica' })! },
  { id: 'alto-clef', label: 'Clave de do', tags: ['clave', 'do', 'c clef', 'alto'], svg: buildCuratedMusicSymbolSvg({ label: 'Clave de do', description: '', elementType: 'musica' })! },
  { id: 'sharp', label: 'Sustenido', tags: ['sustenido', 'acidente', 'sharp'], svg: buildCuratedMusicSymbolSvg({ label: 'Sustenido', description: '', elementType: 'musica' })! },
  { id: 'flat', label: 'Bemol', tags: ['bemol', 'acidente', 'flat'], svg: buildCuratedMusicSymbolSvg({ label: 'Bemol', description: '', elementType: 'musica' })! },
  { id: 'natural', label: 'Bequadro', tags: ['bequadro', 'natural', 'acidente'], svg: buildCuratedMusicSymbolSvg({ label: 'Bequadro', description: '', elementType: 'musica' })! },
  { id: 'double-sharp', label: 'Dobrado sustenido', tags: ['dobrado', 'sustenido', 'double sharp'], svg: bravuraTextSvg('&#xE263;', 66, 54) },
  { id: 'double-flat', label: 'Dobrado bemol', tags: ['dobrado', 'bemol', 'double flat'], svg: bravuraTextSvg('&#xE264;', 66, 54) },
  { id: 'whole-note', label: 'Semibreve', tags: ['nota', 'semibreve', 'whole note'], svg: noteheadSvg() },
  { id: 'half-note', label: 'Mínima', tags: ['nota', 'minima', 'half note'], svg: noteSvg({ filled: false }) },
  { id: 'quarter-note', label: 'Semínima', tags: ['nota', 'seminima', 'quarter note'], svg: noteSvg({ filled: true }) },
  { id: 'eighth-note', label: 'Colcheia', tags: ['nota', 'colcheia', 'eighth note'], svg: bravuraTextSvg('&#x266A;', 70, 52) },
  { id: 'beamed-eighth-notes', label: 'Duas colcheias', tags: ['nota', 'colcheia', 'beamed eighth'], svg: noteSvg({ beam: true }) },
  { id: 'quarter-rest', label: 'Pausa semínima', tags: ['pausa', 'seminima', 'rest'], svg: restSvg('quarter') },
  { id: 'eighth-rest', label: 'Pausa colcheia', tags: ['pausa', 'colcheia', 'rest'], svg: restSvg('eighth') },
  { id: 'staff', label: 'Pentagrama', tags: ['pauta', 'pentagrama', 'staff', 'partitura'], svg: staffLinesSvg(5) },
  { id: 'tablature', label: 'Tablatura', tags: ['tab', 'tablatura', 'violao', 'guitarra'], svg: staffLinesSvg(6, true) },
  { id: 'barline', label: 'Barra de compasso', tags: ['barra', 'compasso', 'barline'], svg: barlineSvg('single') },
  { id: 'final-barline', label: 'Barra final', tags: ['barra', 'final', 'compasso'], svg: barlineSvg('final') },
  { id: 'repeat-barline', label: 'Repetição', tags: ['repeticao', 'repeat', 'barra'], svg: barlineSvg('repeat') },
  { id: 'fermata', label: 'Fermata', tags: ['fermata', 'articulacao'], svg: articulationSvg('fermata') },
  { id: 'staccato', label: 'Staccato', tags: ['staccato', 'articulacao'], svg: articulationSvg('staccato') },
  { id: 'tenuto', label: 'Tenuto', tags: ['tenuto', 'articulacao'], svg: articulationSvg('tenuto') },
  { id: 'accent', label: 'Acento', tags: ['acento', 'accent', 'articulacao'], svg: articulationSvg('accent') },
  { id: 'marcato', label: 'Marcato', tags: ['marcato', 'articulacao'], svg: articulationSvg('marcato') },
  { id: 'crescendo', label: 'Crescendo', tags: ['crescendo', 'dinamica'], svg: hairpinSvg('crescendo') },
  { id: 'decrescendo', label: 'Decrescendo', tags: ['decrescendo', 'diminuendo', 'dinamica'], svg: hairpinSvg('decrescendo') },
  { id: 'forte', label: 'Forte', tags: ['forte', 'dinamica'], svg: dynamicSvg('f') },
  { id: 'piano', label: 'Piano', tags: ['piano', 'dinamica'], svg: dynamicSvg('p') },
  { id: 'mezzo-forte', label: 'Mezzo forte', tags: ['mezzo', 'forte', 'mf', 'dinamica'], svg: dynamicSvg('mf') },
  { id: 'time-44', label: 'Compasso 4/4', tags: ['compasso', 'formula', '4/4'], svg: timeSignatureSvg('4', '4') },
  { id: 'time-34', label: 'Compasso 3/4', tags: ['compasso', 'formula', '3/4'], svg: timeSignatureSvg('3', '4') },
  { id: 'common-time', label: 'Compasso comum', tags: ['compasso', 'common time', '4/4'], svg: timeSignatureSvg('&#xE08A;') },
]

export function getCuratedMusicElementAssets(): ElementLibraryAsset[] {
  return CURATED_MUSIC_ELEMENTS.map((element) => ({
    id: `curated-music-${element.id}`,
    image_url: svgDataUrl(element.svg),
    svg_code: element.svg,
    label: element.label,
    category: 'notation',
    image_format: 'svg',
    element_type: 'musica',
    tags: ['curado', 'bravura', 'smufl', ...element.tags],
  }))
}

export function buildCuratedMusicSymbolSvg({
  label,
  description,
  elementType,
}: {
  label: string
  description: string
  elementType: GeneratedElementType
}): string | null {
  if (elementType !== 'musica') return null

  const symbol = CURATED_MUSIC_SYMBOLS.find(item =>
    textMatchesKeywords(`${label} ${description}`, item.keywords),
  )

  if (!symbol) return null
  if (symbol.path) {
    return [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">',
      `<path d="${symbol.path}" transform="${symbol.pathTransform}" fill="currentColor" />`,
      '</svg>',
    ].join('')
  }

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">',
    `<text x="50" y="${symbol.y}" font-family="${BRAVURA_FONT_STACK}" font-size="${symbol.fontSize}" fill="currentColor" text-anchor="middle" dominant-baseline="middle">${symbol.glyph}</text>`,
    '</svg>',
  ].join('')
}

interface CuratedInstrumentSvgDefinition {
  keywords: string[]
  body: string
}

const CURATED_INSTRUMENT_SVGS: CuratedInstrumentSvgDefinition[] = [
  {
    keywords: ['violao', 'violão', 'guitarra', 'guitar', 'acoustic guitar', 'electric guitar'],
    body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m11.9 12.1l4.514-4.514M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4zM6 16l2 2m.23-8.15A3 3 0 0 1 11 8a5 5 0 0 1 5 5a3 3 0 0 1-1.85 2.77l-.92.38A2 2 0 0 0 12 18a4 4 0 0 1-4 4a6 6 0 0 1-6-6a4 4 0 0 1 4-4a2 2 0 0 0 1.85-1.23z"/>',
  },
  {
    keywords: ['piano', 'teclado', 'keyboard', 'teclas'],
    body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8M2 14h20M6 14v4m4-4v4m4-4v4m4-4v4"/>',
  },
  {
    keywords: ['bateria', 'tambor', 'caixa', 'drum', 'drums', 'snare'],
    body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m2 2l8 8m12-8l-8 8"/><ellipse cx="12" cy="9" rx="10" ry="5"/><path d="M7 13.4v7.9m5-7.3v8m5-8.6v7.9M2 9v8a10 5 0 0 0 20 0V9"/></g>',
  },
  {
    keywords: ['baqueta', 'baquetas', 'drumstick', 'drumsticks'],
    body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M15.4 15.63a7.875 6 135 1 1 6.23-6.23a4.5 3.43 135 0 0-6.23 6.23"/><path d="m8.29 12.71l-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59"/></g>',
  },
  {
    keywords: ['microfone', 'microphone', 'mic', 'voz', 'vocal'],
    body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 19v3m7-12v2a7 7 0 0 1-14 0v-2"/><rect width="6" height="13" x="9" y="2" rx="3"/></g>',
  },
]

export function buildCuratedInstrumentSvg({
  label,
  description,
  elementType,
}: {
  label: string
  description: string
  elementType: GeneratedElementType
}): string | null {
  if (elementType !== 'instrumento') return null

  const instrument = CURATED_INSTRUMENT_SVGS.find(item =>
    textMatchesKeywords(`${label} ${description}`, item.keywords),
  )

  if (!instrument) return null

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">',
    instrument.body,
    '</svg>',
  ].join('')
}

export function resolveCuratedElementSvgCode({
  label,
  description = '',
  elementType,
  svgCode,
  source,
}: {
  label: string
  description?: string
  elementType?: string | null
  svgCode?: string | null
  source?: string | null
}): string | null {
  if (!svgCode) return null
  const inferredType = inferGeneratedElementType({
    label,
    description,
    requestedType: elementType === 'instrumento' ? 'instrumento' : elementType === 'forma' ? 'forma' : elementType === 'decorativo' ? 'decorativo' : 'musica',
  })
  const shouldOverrideGeneratedInstrument =
    inferredType === 'instrumento' &&
    (source === 'ai-svg' || source === 'curated-svg' || /^gemini(?:-|_)?svg$/i.test(label.trim()))
  if (!shouldOverrideGeneratedInstrument) {
    return resolveCuratedMusicSvgCode({ label, description, elementType, svgCode })
  }

  const curatedInstrument = buildCuratedInstrumentSvg({
    label,
    description,
    elementType: inferredType,
  })
  if (curatedInstrument) return curatedInstrument

  return resolveCuratedMusicSvgCode({ label, description, elementType, svgCode })
}

export function resolveCuratedMusicSvgCode({
  label,
  description = '',
  svgCode,
}: {
  label: string
  description?: string
  elementType?: string | null
  svgCode?: string | null
}): string | null {
  if (!svgCode) return null
  const isLegacyBravuraText = /font-family\s*=\s*["']Bravura/i.test(svgCode)
  if (!isLegacyBravuraText) return svgCode

  const curated = buildCuratedMusicSymbolSvg({
    label,
    description,
    elementType: 'musica',
  })

  return curated ?? svgCode
}

const DANGEROUS_SVG_TAGS = ['script', 'iframe', 'object', 'embed', 'foreignObject']

function isLocalSvgReference(value: string | null): boolean {
  return Boolean(value?.startsWith('#'))
}

export function convertSvgColorsToCurrentColor(svgCode: string): string {
  const darkColor = '(?:#[0-3][0-9a-fA-F]{5}|#[0-3][0-9a-fA-F]{2}|#000|black|#111|#222|#333)'
  return svgCode
    .replace(new RegExp(`fill="${darkColor}"`, 'gi'), 'fill="currentColor"')
    .replace(new RegExp(`stroke="${darkColor}"`, 'gi'), 'stroke="currentColor"')
}

function sanitizeSvgWithFallback(raw: string): string | null {
  const trimmed = raw.trim()
  if (!/^<svg[\s>]/i.test(trimmed)) return null
  if (!/<\/svg>\s*$/i.test(trimmed) && !/^<svg[\s\S]*\/>\s*$/i.test(trimmed)) return null

  let sanitized = trimmed

  for (const tag of DANGEROUS_SVG_TAGS) {
    const paired = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'gi')
    const selfClosing = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi')
    sanitized = sanitized.replace(paired, '').replace(selfClosing, '')
  }

  sanitized = sanitized.replace(/<use\b[^>]*(?:\/>|>[\s\S]*?<\/use>)/gi, (tag) => {
    const hrefMatch = tag.match(/\s(?:href|xlink:href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i)
    const hrefValue = hrefMatch?.[1]?.replace(/^['"]|['"]$/g, '') ?? null
    return isLocalSvgReference(hrefValue) ? tag : ''
  })

  sanitized = sanitized
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(?:href|xlink:href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (match, value: string) => {
      const unquoted = value.replace(/^['"]|['"]$/g, '')
      return unquoted.startsWith('#') ? match : ''
    })

  return sanitized
}

export function sanitizeSvg(raw: string): string | null {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return sanitizeSvgWithFallback(raw)
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(raw, 'image/svg+xml')

  if (doc.querySelector('parsererror')) return null
  if (doc.documentElement.tagName.toLowerCase() !== 'svg') return null

  DANGEROUS_SVG_TAGS.forEach(tag => {
    doc.querySelectorAll(tag).forEach(el => el.remove())
  })

  doc.querySelectorAll('use').forEach(el => {
    const href = el.getAttribute('href') ?? el.getAttribute('xlink:href')
    if (!isLocalSvgReference(href)) el.remove()
  })

  doc.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on') || ((name === 'href' || name.endsWith(':href')) && !attr.value.startsWith('#'))) {
        el.removeAttribute(attr.name)
      }
    }
  })

  return new XMLSerializer().serializeToString(doc.documentElement)
}

export function filterElementAssets(
  assets: ElementLibraryAsset[],
  filters: ElementAssetFilters,
): ElementLibraryAsset[] {
  const search = normalize(filters.search.trim())

  return assets.filter((asset) => {
    const matchesType =
      filters.elementType === 'todos' ||
      asset.element_type === filters.elementType

    if (!matchesType) return false
    if (!search) return true

    const searchable = [
      asset.label,
      asset.category ?? '',
      asset.element_type ?? '',
      ...(asset.tags ?? []),
    ].map(normalize).join(' ')

    return searchable.includes(search)
  })
}

export function getElementPickerVisibleAssets(
  uploadedAssets: ElementLibraryAsset[],
  filters: ElementAssetFilters,
): ElementLibraryAsset[] {
  const curatedMusicAssets = filters.elementType === 'todos' || filters.elementType === 'musica'
    ? getCuratedMusicElementAssets()
    : []
  const uploadedIds = new Set(uploadedAssets.map(asset => asset.id))
  const curated = curatedMusicAssets.filter(asset => !uploadedIds.has(asset.id))

  return filterElementAssets([...curated, ...uploadedAssets], filters)
}

export function getElementAssetDisplaySvg(asset: ElementLibraryAsset): string | null {
  return resolveCuratedElementSvgCode({
    label: asset.label,
    description: (asset.tags ?? []).join(' '),
    elementType: asset.element_type,
    svgCode: asset.svg_code,
    source: asset.source,
  })
}

export function createFloatingImageFromElementAsset(
  asset: ElementLibraryAsset,
  options: CreateFloatingImageOptions,
): FloatingImage {
  if (!asset.image_url) {
    throw new Error('Element asset needs image_url before it can be inserted as floating_image.')
  }

  const isInlineSvg = Boolean(asset.svg_code)
  const initialWidth = isInlineSvg ? 24 : 30

  return {
    ...DEFAULT_FLOATING_IMAGE,
    id: options.id,
    imageUrl: asset.image_url,
    svgCode: getElementAssetDisplaySvg(asset),
    source: asset.source ?? null,
    color: asset.svg_code ? '#111827' : undefined,
    pageIndex: options.pageIndex,
    x: 50,
    y: 50,
    width: initialWidth,
    height: isInlineSvg ? initialWidth : getFloatingAspectLockedHeight(initialWidth),
    zIndex: options.zIndex,
    name: asset.label || 'Elemento',
  }
}
