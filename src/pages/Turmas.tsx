import { useState, useMemo } from "react";
import { Plus, PencilSimple, Trash, SpinnerGap, Warning } from "@phosphor-icons/react";
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
import { useClasses } from "@/hooks/useClasses";
import { useUsers } from "@/hooks/useUsers";
import { deleteClass } from "@/services/classService";
import { ClassModal } from "@/components/modals/ClassModal";
import type { Tables } from "@/lib/database.types";

type ClassRow = Tables<'classes'>

export function Turmas() {
  const { data: classes, loading, error, refetch } = useClasses();
  const { data: users } = useUsers();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [search, setSearch] = useState('');
  const [filterInstrument, setFilterInstrument] = useState('todos');

  const teacherMap = useMemo(() => {
    const map: Record<string, string> = {};
    (users ?? []).forEach(u => { map[u.id] = u.name ?? ''; });
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    if (!classes) return [];
    return classes.filter(c => {
      const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
      const matchesInstrument = filterInstrument === 'todos' ||
        c.instrument.toLowerCase() === filterInstrument.toLowerCase();
      return matchesSearch && matchesInstrument;
    });
  }, [classes, search, filterInstrument]);

  const handleDelete = async (id: string) => {
    try {
      await deleteClass(id);
      toast.success('Turma excluída!');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir turma');
    }
  };

  const handleEdit = (c: ClassRow) => {
    setEditingClass(c);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingClass(null);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-text2">
        <SpinnerGap size={20} className="animate-spin" /> Carregando turmas...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-red-400">
        <Warning size={20} /> Erro ao carregar turmas: {error}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Gestão de <em className="not-italic text-accent">Turmas</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            {classes?.length ?? 0} turmas cadastradas
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus size={16} /> Nova Turma
        </Button>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label>Buscar</Label>
            <Input
              placeholder="Nome da turma"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Instrumento</Label>
            <Select value={filterInstrument} onValueChange={setFilterInstrument}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Violão">Violão</SelectItem>
                <SelectItem value="Guitarra">Guitarra</SelectItem>
                <SelectItem value="Teclado">Teclado</SelectItem>
                <SelectItem value="Piano">Piano</SelectItem>
                <SelectItem value="Canto">Canto</SelectItem>
                <SelectItem value="Bateria">Bateria</SelectItem>
                <SelectItem value="Baixo">Baixo</SelectItem>
                <SelectItem value="Ukulele">Ukulele</SelectItem>
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
              <TableHead>Turma</TableHead>
              <TableHead>Instrumento</TableHead>
              <TableHead>Professor</TableHead>
              <TableHead>Max. alunos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-text3">
                  {search || filterInstrument !== 'todos'
                    ? 'Nenhuma turma encontrada com esses filtros.'
                    : 'Nenhuma turma cadastrada. Clique em "Nova Turma" para começar.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold">{c.name}</TableCell>
                  <TableCell><Badge variant="foundation">{c.instrument}</Badge></TableCell>
                  <TableCell className="text-text2">{c.teacher_id ? teacherMap[c.teacher_id] || '—' : '—'}</TableCell>
                  <TableCell className="font-mono text-sm">{c.max_students ?? 10}</TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? 'advance' : 'secondary'}>
                      {c.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}>
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
                            <AlertDialogTitle>Excluir turma?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir <strong>{c.name}</strong>?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleDelete(c.id)}
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

      <ClassModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingClass(null); }}
        onSuccess={refetch}
        classData={editingClass}
      />
    </div>
  );
}
