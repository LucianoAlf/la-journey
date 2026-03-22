import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  FileText, Lightbulb, Barbell, Notebook, MusicNotes,
  Guitar, ListNumbers, Metronome, Keyboard, FloppyDisk,
} from '@phosphor-icons/react'
import type { ContentBlockWithCuration } from '@/services/contentService'

export const BLOCK_TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  text: { icon: FileText, label: 'Texto', color: 'text-blue-400' },
  tip: { icon: Lightbulb, label: 'Dica', color: 'text-amber-400' },
  exercise: { icon: Barbell, label: 'Exercicio', color: 'text-green-400' },
  example: { icon: Notebook, label: 'Exemplo', color: 'text-purple-400' },
  notation: { icon: MusicNotes, label: 'Notacao', color: 'text-pink-400' },
  chord_diagram: { icon: Guitar, label: 'Acorde', color: 'text-indigo-400' },
  tablature: { icon: ListNumbers, label: 'Tablatura', color: 'text-orange-400' },
  scale_diagram: { icon: MusicNotes, label: 'Escala', color: 'text-teal-400' },
  rhythm_pattern: { icon: Metronome, label: 'Ritmo', color: 'text-red-400' },
  keyboard_diagram: { icon: Keyboard, label: 'Teclado', color: 'text-cyan-400' },
}

// Helper to safely extract text from content JSONB
function extractTextContent(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  const c = content as Record<string, unknown>
  const text = c.text || c.html || ''
  return typeof text === 'string' ? text : JSON.stringify(text)
}

interface BlockEditorProps {
  block: ContentBlockWithCuration
  onSave: (data: { block_type: string; title: string; content: Record<string, any> }) => void
  onCancel: () => void
}

export function BlockEditor({ block, onSave, onCancel }: BlockEditorProps) {
  const [blockType, setBlockType] = useState<string>(block.block_type || 'text')
  const [title, setTitle] = useState(block.title || '')
  const [content, setContent] = useState('')

  useEffect(() => {
    setContent(extractTextContent(block.content))
    setTitle(block.title || '')
    setBlockType(block.block_type || 'text')
  }, [block])

  const isMusicalBlock = ['notation', 'tablature', 'chord_diagram', 'scale_diagram', 'rhythm_pattern', 'keyboard_diagram'].includes(blockType)

  const handleSave = () => {
    onSave({
      block_type: blockType,
      title: title.trim(),
      content: { text: content },
    })
  }

  return (
    <div className="space-y-3 p-3 rounded-lg border border-accent/20 bg-card/50">
      <div className="flex gap-2">
        <Select value={blockType} onValueChange={setBlockType}>
          <SelectTrigger className="w-[130px] h-7 text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(BLOCK_TYPE_CONFIG).map(([type, config]) => {
              const Icon = config.icon
              return (
                <SelectItem key={type} value={type} className="text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Icon size={12} className={config.color} />
                    {config.label}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titulo do bloco (opcional)"
          className="h-7 text-[11px] flex-1"
        />
      </div>

      {isMusicalBlock ? (
        <div className="p-4 text-center bg-background/50 rounded-lg border border-dashed border-border">
          <p className="text-[11px] text-text3 mb-2">
            Blocos musicais sao editados em editores especializados
          </p>
          <Button variant="outline" size="sm" className="h-7 text-[10px]" disabled>
            <MusicNotes size={12} className="mr-1" />
            Abrir Editor (em breve)
          </Button>
        </div>
      ) : (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="text-[12px] min-h-[120px] font-mono"
          placeholder="Conteudo do bloco..."
        />
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px]"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          className="h-7 text-[10px]"
          onClick={handleSave}
          disabled={isMusicalBlock}
        >
          <FloppyDisk size={12} className="mr-1" />
          Salvar Bloco
        </Button>
      </div>
    </div>
  )
}
