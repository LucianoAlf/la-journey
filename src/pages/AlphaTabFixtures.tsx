import { AlphaTabViewer } from '@/components/music/AlphaTabViewer'
import { MaterialPreview, type MaterialBlock } from '@/components/material/MaterialPreview'
import { notationFixtures, tablatureFixture } from '@/lib/__fixtures__/notationFixtures'
import { beatsToAlphaTex } from '@/lib/beatsToAlphaTex'

function fixtureToAlphaTex(fixture: typeof notationFixtures[number]) {
  return beatsToAlphaTex(fixture.notation_data.beats, {
    clef: fixture.notation_data.clef ?? 'treble',
    keySignature: fixture.notation_data.keySignature ?? 'C',
    timeSignature: fixture.notation_data.timeSignature ?? null,
    timeSignatureMode: fixture.notation_data.time_signature_mode,
    includeLyrics: false,
  })
}

function fixtureToMaterialBlock(fixture: typeof notationFixtures[number]): MaterialBlock {
  return {
    block_type: 'notation',
    title: fixture.name,
    content: { text: fixture.name },
    render_data: {
      notation_data: fixture.notation_data,
      clef: fixture.notation_data.clef ?? 'treble',
      key_signature: fixture.notation_data.keySignature ?? 'C',
      time_signature: fixture.notation_data.timeSignature ?? null,
    },
  }
}

export function AlphaTabFixtures() {
  if (!import.meta.env.DEV) {
    return (
      <div className="p-8 text-sm text-text2">
        Pagina de fixtures disponivel apenas em desenvolvimento.
      </div>
    )
  }

  const notationRows = notationFixtures.map((fixture) => ({
    fixture,
    tex: fixtureToAlphaTex(fixture),
    block: fixtureToMaterialBlock(fixture),
  }))

  const tablatureBlock: MaterialBlock = {
    block_type: 'tablature',
    title: tablatureFixture.name,
    content: { text: tablatureFixture.name },
    render_data: { alphaTex: tablatureFixture.alphaTex },
  }

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">AlphaTab Fixtures</h1>
        <p className="text-sm text-text3">
          Oraculo visual dev-only: editor interno, canvas do material e AlphaTex bruto lado a lado.
        </p>
      </div>

      <div className="space-y-8">
        {notationRows.map(({ fixture, tex, block }) => (
          <section key={fixture.name} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-text">{fixture.name}</h2>
              <span className="rounded-full bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                {fixture.mode}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-md border border-border/70 bg-bg p-3">
                <div className="mb-2 text-xs font-semibold uppercase text-text3">Editor</div>
                <AlphaTabViewer
                  tex={tex}
                  purpose="editor-notation-score"
                  staveProfile="score"
                  layout="page"
                  scale={0.9}
                  minHeight={140}
                  showTimeSignature={fixture.mode === 'metered'}
                />
              </div>
              <div className="rounded-md border border-border/70 bg-bg p-3">
                <div className="mb-2 text-xs font-semibold uppercase text-text3">Canvas</div>
                <MaterialPreview blocks={[block]} />
              </div>
              <pre className="max-h-64 overflow-auto rounded-md border border-border/70 bg-bg2 p-3 text-xs text-text2">
                {tex}
              </pre>
            </div>
          </section>
        ))}

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-text">{tablatureFixture.name}</h2>
            <span className="rounded-full bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">tablature</span>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-md border border-border/70 bg-bg p-3">
              <div className="mb-2 text-xs font-semibold uppercase text-text3">Editor</div>
              <AlphaTabViewer
                tex={tablatureFixture.alphaTex}
                purpose="editor-tablature-tab"
                staveProfile="tab"
                layout="page"
                scale={0.8}
                minHeight={140}
                showTimeSignature
              />
            </div>
            <div className="rounded-md border border-border/70 bg-bg p-3">
              <div className="mb-2 text-xs font-semibold uppercase text-text3">Canvas</div>
              <MaterialPreview blocks={[tablatureBlock]} />
            </div>
            <pre className="max-h-64 overflow-auto rounded-md border border-border/70 bg-bg2 p-3 text-xs text-text2">
              {tablatureFixture.alphaTex}
            </pre>
          </div>
        </section>
      </div>
    </div>
  )
}
