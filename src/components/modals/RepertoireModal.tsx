import { useState, useEffect, useMemo } from 'react'
import { FloppyDisk, MusicNotes, ListBullets, NotePencil } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createSong, updateSong } from '@/services/repertoireService'
import { CifraEditor, extractChordsFromCifra } from '@/components/repertoire/CifraEditor'
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
  cifra_content: '',
}

export function RepertoireModal({ open, onClose, onSuccess, song }: RepertoireModalProps) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const isEditing = !!song

  const [activeTab, setActiveTab] = useState<'dados' | 'cifra'>('dados')

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
        cifra_content: song.cifra_content ?? '',
      })
    } else {
      setForm(emptyForm)
    }
    setActiveTab('dados')
  }, [song, open])

  // Auto-extrair acordes da cifra quando o campo de acordes está vazio
  const cifraChords = useMemo(
    () => extractChordsFromCifra(form.cifra_content),
    [form.cifra_content]
  )

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('Informe o título da música')
      return
    }

    // Se o usuário preencheu acordes manualmente, usa esses; senão, usa os extraídos da cifra
    const manualChords = form.chords
      .split(',')
      .map(c => c.trim())
      .filter(Boolean)
    const chordsArray = manualChords.length > 0 ? manualChords : cifraChords

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
        cifra_content: form.cifra_content || null,
        cifra_source: form.cifra_content ? 'manual' : (isEditing ? (song?.cifra_source ?? null) : null),
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
      <DialogContent className={`bg-surface border-border max-h-[90vh] overflow-hidden flex flex-col ${
        activeTab === 'cifra' ? 'sm:max-w-[900px] h-[85vh]' : 'sm:max-w-[640px]'
      }`}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-serif text-[22px]">
            {isEditing ? 'Editar' : 'Nova'} <span className="text-accent">Música</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="shrink-0 grid w-full grid-cols-2 h-9">
            <TabsTrigger value="dados" className="text-xs gap-1.5">
              <ListBullets size={14} /> Dados
            </TabsTrigger>
            <TabsTrigger value="cifra" className="text-xs gap-1.5">
              <NotePencil size={14} /> Cifra
              {form.cifra_content && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-accent inline-block" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Dados */}
          <TabsContent value="dados" className="mt-3">
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
                    <SelectItem value="Rock">Rock</SelectItem><SelectItem value="Pop Rock">Pop Rock</SelectItem>
                    <SelectItem value="MPB">MPB</SelectItem><SelectItem value="Pop">Pop</SelectItem>
                    <SelectItem value="Reggae">Reggae</SelectItem>
                    <SelectItem value="Sertanejo">Sertanejo</SelectItem><SelectItem value="Blues">Blues</SelectItem>
                    <SelectItem value="Jazz">Jazz</SelectItem><SelectItem value="Bossa Nova">Bossa Nova</SelectItem>
                    <SelectItem value="Forró">Forró</SelectItem><SelectItem value="Pagode">Pagode</SelectItem>
                    <SelectItem value="Samba">Samba</SelectItem><SelectItem value="Gospel">Gospel</SelectItem>
                    <SelectItem value="Country">Country</SelectItem><SelectItem value="Funk">Funk</SelectItem>
                    <SelectItem value="Indie">Indie</SelectItem>
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
                    <SelectItem value="Baixo">Baixo</SelectItem>
                    <SelectItem value="Bateria">Bateria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5 mb-4">
              <Label>
                Acordes (separados por vírgula)
                {cifraChords.length > 0 && !form.chords.trim() && (
                  <span className="ml-2 text-[10px] text-accent font-normal">
                    {cifraChords.length} detectados da cifra
                  </span>
                )}
              </Label>
              <Input
                placeholder={cifraChords.length > 0 ? cifraChords.join(', ') : 'C, G, Am, F'}
                value={form.chords}
                onChange={e => setForm(prev => ({ ...prev, chords: e.target.value }))}
              />
            </div>
          </TabsContent>

          {/* Tab: Cifra */}
          <TabsContent value="cifra" className="flex-1 min-h-0 mt-3 overflow-y-auto">
            <CifraEditor
              value={form.cifra_content}
              onChange={val => setForm(prev => ({ ...prev, cifra_content: val }))}
              minHeight={300}
            />
          </TabsContent>
        </Tabs>

        {/* Footer fixo */}
        <div className="shrink-0 flex justify-end gap-2 pt-3 border-t border-border mt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <FloppyDisk size={16} /> {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
