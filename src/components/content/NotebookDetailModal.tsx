import { useEffect, useState } from 'react'
import { Books, NotePencil, Plus, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  addItemToCollection,
  getCollectionItems,
  removeItemFromCollection,
  type RepertoireCollection,
} from '@/services/repertoireCollectionService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AddSongModal } from './AddSongModal'

interface NotebookDetailModalProps {
  notebook: RepertoireCollection | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (notebook: RepertoireCollection) => void
  onGenerate: (notebook: RepertoireCollection) => void
  generating?: boolean
  generateDisabled?: boolean
}

type CollectionItemWithSong = Awaited<ReturnType<typeof getCollectionItems>>[number]

const LEVEL_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  grow: 'Grow',
  advance: 'Advance',
  master: 'Master',
}

export function NotebookDetailModal({ notebook, open, onOpenChange, onEdit, onGenerate, generating, generateDisabled }: NotebookDetailModalProps) {
  const [items, setItems] = useState<CollectionItemWithSong[]>([])
  const [loading, setLoading] = useState(false)
  const [addSongOpen, setAddSongOpen] = useState(false)

  const loadItems = async (collectionId: string) => {
    setLoading(true)
    try {
      const data = await getCollectionItems(collectionId)
      setItems(data)
    } catch (err) {
      console.error('Erro ao carregar músicas do caderno:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open || !notebook) return
    loadItems(notebook.id)
  }, [notebook, open])

  useEffect(() => {
    if (open) return
    setItems([])
    setAddSongOpen(false)
  }, [open])

  const handleAddSongs = async (songIds: string[]) => {
    if (!notebook) return
    await Promise.all(songIds.map((songId) => addItemToCollection(notebook.id, songId)))
    toast.success(songIds.length === 1 ? 'Música adicionada ao caderno!' : `${songIds.length} músicas adicionadas ao caderno!`)
    await loadItems(notebook.id)
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!notebook) return
    if (!confirm('Remover esta música do caderno?')) return

    await removeItemFromCollection(itemId)
    toast.success('Música removida do caderno!')
    await loadItems(notebook.id)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] bg-surface border-border overflow-hidden">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="space-y-2 min-w-0">
                <DialogTitle className="flex items-center gap-2 font-serif text-[22px] text-text">
                  <Books size={18} className="text-accent" />
                  <span className="truncate">{notebook?.name}</span>
                </DialogTitle>
                {notebook && (
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/20">
                      {notebook.instrument}
                    </Badge>
                    <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/20">
                      {LEVEL_LABELS[notebook.difficulty_level] || notebook.difficulty_level}
                    </Badge>
                    {notebook.is_template && (
                      <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-yellow-500/15 text-yellow-400 border-yellow-500/20">
                        Template LA
                      </Badge>
                    )}
                  </div>
                )}
                <p className="text-[12px] text-text3">
                  {items.length} música{items.length !== 1 ? 's' : ''}
                  {notebook?.genre ? ` · ${notebook.genre}` : ''}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 px-4 py-3">
            <div className="text-[12px] text-text3">
              Adicione músicas ao caderno a partir do repertório já existente.
            </div>
            <Button size="sm" onClick={() => setAddSongOpen(true)}>
              <Plus size={14} />
              Adicionar
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0 rounded-lg border border-border bg-card/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Música</TableHead>
                  <TableHead>Artista</TableHead>
                  <TableHead>Tom</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-text3">
                      Carregando músicas do caderno...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-text3">
                      Nenhuma música adicionada ainda.
                    </TableCell>
                  </TableRow>
                ) : items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium text-text">{item.repertoire?.title || '—'}</TableCell>
                    <TableCell>{item.repertoire?.artist || '—'}</TableCell>
                    <TableCell>{item.repertoire?.key || '—'}</TableCell>
                    <TableCell>
                      {item.notes ? (
                        <div className="text-[12px] text-text2 whitespace-normal max-w-[260px] line-clamp-2">
                          {item.notes}
                        </div>
                      ) : (
                        <span className="text-[11px] text-text3 flex items-center gap-1">
                          <NotePencil size={12} />
                          Sem nota
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => handleRemoveItem(item.id)}
                        title="Remover música"
                      >
                        <X size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex gap-2">
              {notebook && (
                <Button variant="outline" size="sm" onClick={() => onEdit(notebook)}>
                  <NotePencil size={14} />
                  Editar Caderno
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button
                size="sm"
                disabled={generateDisabled || generating || !notebook}
                onClick={() => notebook && onGenerate(notebook)}
              >
                {generating ? 'Gerando...' : 'Gerar PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddSongModal
        open={addSongOpen}
        onOpenChange={setAddSongOpen}
        existingRepertoireIds={items.map((item) => item.repertoire_id)}
        onAddSongs={handleAddSongs}
      />
    </>
  )
}
