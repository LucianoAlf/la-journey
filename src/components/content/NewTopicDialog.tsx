import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from '@phosphor-icons/react'
import { createTopicWithCuration } from '@/services/contentService'
import { toast } from 'sonner'

interface NewTopicDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function NewTopicDialog({ open, onOpenChange, onCreated }: NewTopicDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instrument, setInstrument] = useState('universal')
  const [dimension, setDimension] = useState('theory')
  const [level, setLevel] = useState('foundation')
  const [tags, setTags] = useState('')
  const [minutes, setMinutes] = useState(15)
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setInstrument('universal')
    setDimension('theory')
    setLevel('foundation')
    setTags('')
    setMinutes(15)
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Titulo e obrigatorio')
      return
    }

    setLoading(true)
    try {
      await createTopicWithCuration({
        title: title.trim(),
        description: description.trim() || null,
        instrument,
        dimension,
        difficulty_level: level,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        estimated_minutes: minutes,
        school_id: 'a1b2c3d4-0001-4000-8000-000000000001', // TODO: get from context
      })

      toast.success('Topico criado!')
      resetForm()
      onOpenChange(false)
      onCreated()
    } catch (err) {
      toast.error('Erro ao criar topico')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Plus size={16} className="text-accent" />
            Novo Topico
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Titulo *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Escala Pentatonica"
              className="h-8 text-[12px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Descricao</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descricao do topico..."
              className="text-[12px] min-h-[60px]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Instrumento</Label>
              <Select value={instrument} onValueChange={setInstrument}>
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="universal">Universal</SelectItem>
                  <SelectItem value="Violao">Violao</SelectItem>
                  <SelectItem value="Guitarra">Guitarra</SelectItem>
                  <SelectItem value="Piano">Piano</SelectItem>
                  <SelectItem value="Teclado">Teclado</SelectItem>
                  <SelectItem value="Canto">Canto</SelectItem>
                  <SelectItem value="Bateria">Bateria</SelectItem>
                  <SelectItem value="Baixo">Baixo</SelectItem>
                  <SelectItem value="Ukulele">Ukulele</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Dimensao</Label>
              <Select value={dimension} onValueChange={setDimension}>
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="theory">Teoria</SelectItem>
                  <SelectItem value="technique">Tecnica</SelectItem>
                  <SelectItem value="rhythm">Ritmo</SelectItem>
                  <SelectItem value="repertoire">Repertorio</SelectItem>
                  <SelectItem value="auditory">Auditivo</SelectItem>
                  <SelectItem value="evaluation">Avaliacao</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Nivel</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foundation">Foundation</SelectItem>
                  <SelectItem value="grow">Grow</SelectItem>
                  <SelectItem value="advance">Advance</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Tags (separadas por virgula)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="escala, pentatonica, improvisacao"
              className="h-8 text-[12px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Tempo estimado (minutos)</Label>
            <Input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 15)}
              className="h-8 text-[12px] w-20"
              min={1}
              max={120}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!title.trim() || loading}
            onClick={handleCreate}
          >
            <Plus size={14} className="mr-1" />
            {loading ? 'Criando...' : 'Criar Topico'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
