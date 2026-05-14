import {
  createBrandKitHeaderFooterConfig,
  getBrandKitHeaderLogoUrl,
} from '../headerFooterBrandKit'

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

test('prefers horizontal logo for header and falls back to primary logo', () => {
  assertEqual(
    getBrandKitHeaderLogoUrl({
      logo_url: 'primary.png',
      logo_variants: {
        primary: 'primary-variant.png',
        horizontal: 'horizontal.png',
      },
    }),
    'horizontal.png',
    'horizontal brand logo should be used first for header/footer identity',
  )

  assertEqual(
    getBrandKitHeaderLogoUrl({
      logo_url: 'primary.png',
      logo_variants: {
        dark: 'dark.png',
      },
    }),
    'dark.png',
    'dark logo should be preferred before legacy primary logo when horizontal is missing',
  )
})

test('creates branded header and footer without requiring an existing page config', () => {
  const config = createBrandKitHeaderFooterConfig({
    school: {
      name: 'Escola Solar',
      logo_url: 'primary.png',
      logo_variants: {
        horizontal: 'horizontal.png',
      },
      primary_color: '#123456',
      secondary_color: '#ffcc00',
      default_body_font: 'Nunito Sans',
    },
  })

  assertEqual(config.header.left, {
    type: 'image',
    imageUrl: 'horizontal.png',
    imageHeight: 26,
  }, 'header left zone should use the school logo')

  assertEqual(config.header.center, {
    type: 'placeholder',
    placeholder: '{titulo}',
    fontSize: 10,
    fontWeight: 700,
    color: '#123456',
    fontFamily: 'Nunito Sans',
  }, 'header center should use material title with brand font/color')

  assertEqual(config.footer.right, {
    type: 'placeholder',
    placeholder: '{pagina_de_total}',
    fontSize: 9,
    fontWeight: 700,
    color: '#ffcc00',
    fontFamily: 'Nunito Sans',
  }, 'footer right should expose page numbering with secondary color')
})
