import { createRoot, type Root } from 'react-dom/client'
import { createElement, createRef, type RefObject } from 'react'
import { jsPDF } from 'jspdf'
import { PrintableCifra } from '@/components/repertoire/PrintableCifra'
import type { NotebookPrintRecipe } from '@/lib/notebookPrintRecipe'
import type { RepertoirePdfSong } from '@/lib/repertoirePdfSongs'
import { addRepertoirePages } from '@/services/pdfService'
import { resolveGuitarChordFromLibrary, resolvePianoChordFromLibrary } from '@/services/chordLibraryResolver'
import type { Chord } from '@/services/libraryService'

export interface RepertoireBookPdfInput {
  songs: RepertoirePdfSong[]
  recipe: NotebookPrintRecipe
  filename: string
  guitarChordMap?: Map<string, Chord>
  pianoChordMap?: Map<string, Chord>
}

function asChord(name: string, positions: Record<string, unknown>): Chord {
  return { name, positions } as Chord
}

export async function buildPdfChordMaps(
  chords: string[],
  recipe: NotebookPrintRecipe,
  existing?: { guitar?: Map<string, Chord>; piano?: Map<string, Chord> },
): Promise<{ guitar: Map<string, Chord>; piano: Map<string, Chord> }> {
  const guitar = new Map(existing?.guitar ?? [])
  const piano = new Map(existing?.piano ?? [])
  const unique = [...new Set(chords.filter(Boolean))]

  await Promise.all(unique.map(async (name) => {
    if ((recipe.guitar || recipe.ukulele) && !guitar.has(name)) {
      const resolved = await resolveGuitarChordFromLibrary(name)
      if (resolved) {
        guitar.set(name, asChord(name, {
          fingers: resolved.fingers,
          barres: resolved.barres,
          muted: resolved.muted,
          position: resolved.position,
        }))
      }
    }
    if (recipe.piano && !piano.has(name)) {
      const resolved = await resolvePianoChordFromLibrary(name)
      if (resolved) {
        piano.set(name, asChord(name, {
          keys: resolved.keys,
          fingering_rh: resolved.fingering_rh,
        }))
      }
    }
  }))

  return { guitar, piano }
}

function waitForPaint(ms = 1000) {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => window.setTimeout(resolve, ms))
  })
}

export async function generateRepertoireBookPdf(input: RepertoireBookPdfInput): Promise<void> {
  const songs = input.songs.filter((song) => song.title || song.cifraContent || song.chords.length)
  if (songs.length === 0) throw new Error('Nenhuma música para gerar o PDF.')

  const allChords = songs.flatMap((song) => song.chords)
  const maps = await buildPdfChordMaps(allChords, input.recipe, {
    guitar: input.guitarChordMap,
    piano: input.pianoChordMap,
  })

  const host = document.createElement('div')
  host.setAttribute('data-repertoire-pdf-host', 'true')
  host.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;'
  document.body.appendChild(host)

  const refs = songs.map(() => createRef<HTMLDivElement>())
  const root: Root = createRoot(host)

  try {
    root.render(
      createElement(
        'div',
        null,
        ...songs.map((song, index) => createElement(PrintableCifra, {
          key: `${song.title}-${index}`,
          ref: refs[index] as RefObject<HTMLDivElement>,
          title: song.title,
          artist: song.artist,
          tom: song.key,
          chords: song.chords,
          guitarChordMap: maps.guitar,
          pianoChordMap: maps.piano,
          cifraContent: song.cifraContent,
          showGuitar: input.recipe.guitar || input.recipe.ukulele,
          showPiano: input.recipe.piano,
          showTab: input.recipe.tab,
        })),
      ),
    )

    await waitForPaint(1100)

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    let started = false

    for (let index = 0; index < songs.length; index += 1) {
      const element = refs[index].current
      if (!element) throw new Error(`Não foi possível renderizar ${songs[index].title}`)
      await addRepertoirePages(pdf, element, {
        title: songs[index].title,
        subtitle: songs[index].artist || undefined,
        margin: 12,
        startOnNewPage: started,
      })
      started = true
    }

    const filename = input.filename.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9À-ÿ\s\-_]/g, '').trim() || 'repertorio'
    pdf.save(`${filename}.pdf`)
  } finally {
    root.unmount()
    host.remove()
  }
}
