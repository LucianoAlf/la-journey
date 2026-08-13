import { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlass, MusicNotes, Plus } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface RepertoireSongRow {
  id: string
  title: string
  artist: string | null
  key: string | null
  genre: string | null
}

interface AddSongModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingRepertoireIds: string[]
  onAddSongs: (songIds: string[]) => Promise<void>
  onImportRequest: () => void
}

async function fetchSongs(search: string) {
  let query = supabase
    .from('repertoire')
    .select('id, title, artist, key, genre')
    .order('title')
    .range(0, 49)

  const trimmed = search.trim()
  if (trimmed) {
    query = query.or(`title.ilike.%${trimmed}%,artist.ilike.%${trimmed}%`)
  }

  const { data, error } = await query
  if (error) handleError(error)
  return (data ?? []) as unknown as RepertoireSongRow[]
}

export function AddSongModal({ open, onOpenChange, existingRepertoireIds, onAddSongs, onImportRequest }: AddSongModalProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [songs, setSongs] = useState<RepertoireSongRow[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350)
    return () => window.clearTimeout(timer)
  }, [open, search])

  useEffect(() => {
    if (!open) return

    const loadSongs = async () => {
      setLoading(true)
      try {
        const data = await fetchSongs(debouncedSearch)
        setSongs(data)
      } catch (err) {
        console.error('Erro ao buscar músicas do repertório:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSongs()
  }, [debouncedSearch, open])

  useEffect(() => {
    if (open) return
    setSearch('')
    setDebouncedSearch('')
    setSelectedIds([])
    setSongs([])
  }, [open])

  const existingIdsSet = useMemo(() => new Set(existingRepertoireIds), [existingRepertoireIds])

  const toggleSong = (songId: string, checked: boolean) => {
    setSelectedIds((prev) => checked ? [...prev, songId] : prev.filter((id) => id !== songId))
  }

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return
    setSaving(true)
    try {
      await onAddSongs(selectedIds)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-[20px]">
            <Plus size={18} className="text-accent" />
            Adicionar Música ao Caderno
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1">
              <MagnifyingGlass size={12} /> Buscar por título ou artista
            </label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ex: Asa Branca, Bob Dylan..."
              className="h-9 text-[13px]"
            />
          </div>

          <ScrollArea className="max-h-[50vh] rounded-lg border border-border bg-card/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Música</TableHead>
                  <TableHead>Artista</TableHead>
                  <TableHead>Gênero</TableHead>
                  <TableHead>Tom</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-text3 py-8">
                      Carregando músicas...
                    </TableCell>
                  </TableRow>
                ) : songs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-text3 py-8">
                      Nenhuma música encontrada.
                    </TableCell>
                  </TableRow>
                ) : songs.map((song) => {
                  const alreadyAdded = existingIdsSet.has(song.id)
                  const checked = selectedIds.includes(song.id)

                  return (
                    <TableRow key={song.id} className={alreadyAdded ? 'opacity-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={checked}
                          disabled={alreadyAdded}
                          onCheckedChange={(value) => toggleSong(song.id, value === true)}
                          aria-label={`Selecionar ${song.title}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-text flex items-center gap-2">
                          <MusicNotes size={14} className="text-accent" />
                          {song.title}
                        </div>
                      </TableCell>
                      <TableCell>{song.artist || '—'}</TableCell>
                      <TableCell>{song.genre || '—'}</TableCell>
                      <TableCell>{song.key || '—'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <DialogFooter className="items-center justify-between gap-3 sm:justify-between">
          <div className="text-[12px] text-text3">
            {songs.length} resultado(s) · {selectedIds.length} selecionada(s)
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onImportRequest()} disabled={saving}>
              Não está no catálogo? Importar
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={selectedIds.length === 0 || saving}>
              <Plus size={14} />
              {saving ? 'Adicionando...' : `Adicionar ${selectedIds.length}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
