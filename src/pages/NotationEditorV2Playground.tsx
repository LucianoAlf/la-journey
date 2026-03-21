import { useState } from 'react'
import { NotationEditorV2 } from '@/components/music/NotationEditorV2'
import { Button } from '@/components/ui/button'
import { PencilSimple } from '@phosphor-icons/react'

export default function NotationEditorV2Playground() {
  const [editorOpen, setEditorOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">NotationEditorV2 Playground</h1>
        <p className="text-muted-foreground">
          Teste do novo editor de notação musical com SVG interativo + AlphaTab preview.
        </p>

        <div className="flex gap-4">
          <Button onClick={() => setEditorOpen(true)}>
            <PencilSimple className="h-4 w-4 mr-2" />
            Abrir Editor (Nova Notação)
          </Button>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg">
          <h2 className="font-semibold mb-2">Atalhos de Teclado</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div><kbd className="px-1 bg-muted rounded">A-G</kbd> = inserir nota</div>
            <div><kbd className="px-1 bg-muted rounded">Shift+A-G</kbd> = acorde</div>
            <div><kbd className="px-1 bg-muted rounded">1-7</kbd> = duração</div>
            <div><kbd className="px-1 bg-muted rounded">0</kbd> = pausa</div>
            <div><kbd className="px-1 bg-muted rounded">↑↓</kbd> = semitom</div>
            <div><kbd className="px-1 bg-muted rounded">Ctrl+↑↓</kbd> = oitava</div>
            <div><kbd className="px-1 bg-muted rounded">←→</kbd> = navegar</div>
            <div><kbd className="px-1 bg-muted rounded">.</kbd> = ponto</div>
            <div><kbd className="px-1 bg-muted rounded">T</kbd> = ligadura</div>
            <div><kbd className="px-1 bg-muted rounded">R</kbd> = repetir</div>
            <div><kbd className="px-1 bg-muted rounded">Del</kbd> = apagar</div>
            <div><kbd className="px-1 bg-muted rounded">Backspace</kbd> = apagar e recuar</div>
            <div><kbd className="px-1 bg-muted rounded">Espaço</kbd> = play/stop</div>
            <div><kbd className="px-1 bg-muted rounded">Ctrl+Z</kbd> = desfazer</div>
            <div><kbd className="px-1 bg-muted rounded">Ctrl+Y</kbd> = refazer</div>
            <div><kbd className="px-1 bg-muted rounded">#</kbd> = sustenido</div>
            <div><kbd className="px-1 bg-muted rounded">Shift+B</kbd> = bemol</div>
            <div><kbd className="px-1 bg-muted rounded">=</kbd> = bequadro</div>
          </div>
        </div>

        <NotationEditorV2
          open={editorOpen}
          onOpenChange={setEditorOpen}
          onSave={(notation) => {
            console.log('Notação salva:', notation)
          }}
        />
      </div>
    </div>
  )
}
