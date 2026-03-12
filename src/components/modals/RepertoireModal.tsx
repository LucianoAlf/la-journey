import { useState, useEffect } from 'react'
import { FloppyDisk } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createSong, updateSong } from '@/services/repertoireService'
import type { Tables } from '@/lib/database.types'

type Repertoire = Tables<'repertoire'>

interface RepertoireModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  song?: Repertoire | null
}

const emptyForm = {
  title: '',
  artist: '',
  genre: '',
  key: '',
  difficulty: 1,
  chords: '',
  instruments: [] as string[],
}

export function RepertoireModal({ open, onClose, onSuccess, song }: RepertoireModalProps) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const isEditing = !!song

  useEffect(() => {
    if (song) {
      setForm({
        title: song.title ?? '',
        artist: song.artist ?? '',
        genre: song.genre ?? '',
        key: song.key ?? '',
        difficulty: song.difficulty ?? 1,
        chords: (song.chords ?? []).join(', '),
        instruments: song.instruments ?? [],
      })
    } else {
      setForm(emptyForm)
    }
  }, [song, open])

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('Informe o título da música')
      return
    }

    const chordsArray = form.chords
      .split(',')
      .map(c => c.trim())
      .filter(Boolean)

    setSaving(true)
    try {
      const payload = {
        title: form.title,
        artist: form.artist || null,
        genre: form.genre || null,
        key: form.key || null,
        difficulty: form.difficulty,
        chords: chordsArray,
        instruments: form.instruments.length > 0 ? form.instruments : null,
      }

      if (isEditing && song) {
        await updateSong(song.id, payload)
        toast.success('Música atualizada!')
      } else {
        await createSong(payload)
        toast.success('Música adicionada!')
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar música')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[640px] bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px]">
            {isEditing ? 'Editar' : 'Nova'} <span className="text-accent">Música</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input
              placeholder="Nome da música"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Artista</Label>
            <Input
              placeholder="Nome do artista"
              value={form.artist}
              onChange={e => setForm(prev => ({ ...prev, artist: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tonalidade</Label>
            <Select value={form.key} onValueChange={val => setForm(prev => ({ ...prev, key: val }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                <SelectItem value="E">E</SelectItem><SelectItem value="F">F</SelectItem>
                <SelectItem value="G">G</SelectItem><SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="Am">Am</SelectItem><SelectItem value="Em">Em</SelectItem>
                <SelectItem value="Dm">Dm</SelectItem><SelectItem value="Bm">Bm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Gênero</Label>
            <Select value={form.genre} onValueChange={val => setForm(prev => ({ ...prev, genre: val }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Rock">Rock</SelectItem><SelectItem value="MPB">MPB</SelectItem>
                <SelectItem value="Pop">Pop</SelectItem><SelectItem value="Reggae">Reggae</SelectItem>
                <SelectItem value="Sertanejo">Sertanejo</SelectItem><SelectItem value="Blues">Blues</SelectItem>
                <SelectItem value="Jazz">Jazz</SelectItem><SelectItem value="Bossa Nova">Bossa Nova</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Dificuldade (1-5)</Label>
            <Select
              value={String(form.difficulty)}
              onValueChange={val => setForm(prev => ({ ...prev, difficulty: parseInt(val) }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Iniciante</SelectItem>
                <SelectItem value="2">2 - Fácil</SelectItem>
                <SelectItem value="3">3 - Médio</SelectItem>
                <SelectItem value="4">4 - Avançado</SelectItem>
                <SelectItem value="5">5 - Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Instrumento</Label>
            <Select
              value={form.instruments[0] ?? ''}
              onValueChange={val => setForm(prev => ({ ...prev, instruments: [val] }))}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Violão">Violão</SelectItem>
                <SelectItem value="Guitarra">Guitarra</SelectItem>
                <SelectItem value="Teclado">Teclado</SelectItem>
                <SelectItem value="Canto">Canto</SelectItem>
                <SelectItem value="Ukulele">Ukulele</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5 mb-4">
          <Label>Acordes (separados por vírgula)</Label>
          <Input
            placeholder="C, G, Am, F"
            value={form.chords}
            onChange={e => setForm(prev => ({ ...prev, chords: e.target.value }))}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <FloppyDisk size={16} /> {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
