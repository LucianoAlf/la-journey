import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FloatingElementLibraryPanel } from '../../components/editor/FloatingElementLibraryPanel'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
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

test('floating element quick library can render inside the top Elements picker', () => {
  const html = renderToStaticMarkup(
    <FloatingElementLibraryPanel
      title="Adicionar direto na pagina"
      layersLabel="Camadas"
      onAddIcon={() => undefined}
      onAddShape={() => undefined}
      onAddText={() => undefined}
      onOpenImagePicker={() => undefined}
      onToggleLayers={() => undefined}
    />,
  )

  assert(html.includes('Adicionar direto na pagina'), 'panel should accept the picker-specific title')
  assert(html.includes('Texto'), 'panel should expose text insertion')
  assert(html.includes('Forma'), 'panel should expose shape insertion')
  assert(html.includes('Iconify'), 'panel should expose icon insertion')
})
