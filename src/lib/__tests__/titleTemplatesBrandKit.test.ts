import { getTitleTemplateAccent, getTitleTemplateSecondary } from '../titleTemplates'

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${expected}, got ${actual}`)
  }
}

assertEqual(
  getTitleTemplateAccent({ title_accent_color: '#ff2d78', brand_primary_color: '#123456' }, '#0066cc'),
  '#0066cc',
  'Brand Kit color should override stale saved title accent by default',
)

assertEqual(
  getTitleTemplateSecondary({ title_secondary_color: '#ff2d78', brand_secondary_color: '#123456' }, '#00aa88'),
  '#00aa88',
  'Brand Kit color should override stale saved title secondary by default',
)

assertEqual(
  getTitleTemplateAccent({ title_color_mode: 'custom', title_accent_color: '#ff2d78' }, '#0066cc'),
  '#ff2d78',
  'Custom title color mode should preserve explicit accent color',
)

assertEqual(
  getTitleTemplateSecondary({ title_color_mode: 'custom', title_secondary_color: '#ff2d78' }, '#00aa88'),
  '#ff2d78',
  'Custom title color mode should preserve explicit secondary color',
)

assertEqual(
  getTitleTemplateAccent({ brand_primary_color: '#123456' }),
  '#123456',
  'Saved Brand Kit snapshot should be used when no live Brand Kit color is provided',
)

console.log('titleTemplatesBrandKit tests passed')
