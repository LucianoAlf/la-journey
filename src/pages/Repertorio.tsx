import { useState, useMemo } from "react";
import { Lightning, Plus, PencilSimple, Trash, SpinnerGap, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useRepertoire } from "@/hooks/useRepertoire";
import { deleteSong } from "@/services/repertoireService";
import { RepertoireModal } from "@/components/modals/RepertoireModal";
import type { Tables } from "@/lib/database.types";

type Repertoire = Tables<'repertoire'>

const difficultyLabel: Record<number, string> = {
  1: '⭐', 2: '⭐⭐', 3: '⭐⭐⭐', 4: '⭐⭐⭐⭐', 5: '⭐⭐⭐⭐⭐',
}

export function Repertorio() {
  const { data: songs, loading, error, refetch } = useRepertoire();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Repertoire | null>(null);
  const [search, setSearch] = useState('');
  const [filterGenre, setFilterGenre] = useState('todos');

  const filtered = useMemo(() => {
    if (!songs) return [];
    return songs.filter(s => {
      const matchesSearch = !search ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        (s.artist ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesGenre = filterGenre === 'todos' ||
        (s.genre ?? '').toLowerCase() === filterGenre.toLowerCase();
      return matchesSearch && matchesGenre;
    });
  }, [songs, search, filterGenre]);

  const handleDelete = async (id: string) => {
    try {
      await deleteSong(id);
      toast.success('Música excluída!');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir música');
    }
  };

  const handleEdit = (song: Repertoire) => {
    setEditingSong(song);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingSong(null);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-text2">
        <SpinnerGap size={20} className="animate-spin" /> Carregando repertório...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-red-400">
        <Warning size={20} /> Erro ao carregar repertório: {error}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            <em className="not-italic text-accent">Repertório</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            {songs?.length ?? 0} músicas cadastradas · Cifra Club API
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <Lightning size={16} /> Importar Cifra Club
          </Button>
          <Button onClick={handleNew}>
            <Plus size={16} /> Nova Música
          </Button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label>Buscar</Label>
            <Input
              placeholder="Nome ou artista"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Gênero</Label>
            <Select value={filterGenre} onValueChange={setFilterGenre}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Rock">Rock</SelectItem><SelectItem value="MPB">MPB</SelectItem>
                <SelectItem value="Pop">Pop</SelectItem><SelectItem value="Reggae">Reggae</SelectItem>
                <SelectItem value="Sertanejo">Sertanejo</SelectItem><SelectItem value="Blues">Blues</SelectItem>
                <SelectItem value="Jazz">Jazz</SelectItem><SelectItem value="Bossa Nova">Bossa Nova</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Badge variant="secondary" className="mb-1">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      <div className="card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Música</TableHead>
              <TableHead>Artista</TableHead>
              <TableHead>Acordes</TableHead>
              <TableHead>Tom</TableHead>
              <TableHead>Gênero</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-text3">
                  {search || filterGenre !== 'todos'
                    ? 'Nenhuma música encontrada com esses filtros.'
                    : 'Nenhuma música cadastrada. Clique em "Nova Música" para começar.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(song => (
                <TableRow key={song.id}>
                  <TableCell className="font-bold">{song.title}</TableCell>
                  <TableCell className="text-text2">{song.artist ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(song.chords ?? []).slice(0, 6).map(chord => (
                        <Badge key={chord} variant="secondary" className="text-[10px]">{chord}</Badge>
                      ))}
                      {(song.chords ?? []).length > 6 && (
                        <Badge variant="secondary" className="text-[10px]">+{(song.chords ?? []).length - 6}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{song.key ?? '—'}</TableCell>
                  <TableCell className="text-text2">{song.genre ?? '—'}</TableCell>
                  <TableCell>{difficultyLabel[song.difficulty ?? 1] ?? '⭐'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(song)}>
                        <PencilSimple size={16} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                            <Trash size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-surface border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir música?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir <strong>{song.title}</strong>?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleDelete(song.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RepertoireModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSong(null); }}
        onSuccess={refetch}
        song={editingSong}
      />
    </div>
  );
}
