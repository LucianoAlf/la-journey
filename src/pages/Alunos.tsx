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
import { useStudents } from "@/hooks/useStudents";
import { deleteStudent } from "@/services/studentService";
import { StudentModal } from "@/components/modals/StudentModal";
import type { Tables } from "@/lib/database.types";

type Student = Tables<'students'>

export function Alunos() {
  const { data: students, loading, error, refetch } = useStudents();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [filterInstrument, setFilterInstrument] = useState('todos');

  const filtered = useMemo(() => {
    if (!students) return [];
    return students.filter(s => {
      const name = s.responsible_name ?? '';
      const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase());
      const matchesInstrument = filterInstrument === 'todos' ||
        (s.instruments ?? []).some(i => i.toLowerCase() === filterInstrument.toLowerCase());
      return matchesSearch && matchesInstrument;
    });
  }, [students, search, filterInstrument]);

  const handleDelete = async (id: string) => {
    try {
      await deleteStudent(id);
      toast.success('Aluno excluído!');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir aluno');
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingStudent(null);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-text2">
        <SpinnerGap size={20} className="animate-spin" /> Carregando alunos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-red-400">
        <Warning size={20} /> Erro ao carregar alunos: {error}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Monitoramento de <em className="not-italic text-accent">Alunos</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            {students?.length ?? 0} alunos cadastrados
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus size={16} /> Novo Aluno
        </Button>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label>Buscar aluno</Label>
            <Input
              placeholder="Nome do aluno ou responsável"
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
              <TableHead>Nome / Responsável</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Instrumentos</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-text3">
                  {search || filterInstrument !== 'todos'
                    ? 'Nenhum aluno encontrado com esses filtros.'
                    : 'Nenhum aluno cadastrado. Clique em "Novo Aluno" para começar.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(student => (
                <TableRow key={student.id}>
                  <TableCell className="font-bold">{student.responsible_name ?? '—'}</TableCell>
                  <TableCell className="text-text2 text-sm">{student.responsible_phone ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(student.instruments ?? []).map(inst => (
                        <Badge key={inst} variant="foundation">{inst}</Badge>
                      ))}
                      {(!student.instruments || student.instruments.length === 0) && (
                        <span className="text-text3 text-xs">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-text2">
                    {student.enrollment_date
                      ? new Date(student.enrollment_date + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(student)}>
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
                            <AlertDialogTitle>Excluir aluno?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir <strong>{student.responsible_name}</strong>?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleDelete(student.id)}
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

      <StudentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingStudent(null); }}
        onSuccess={refetch}
        student={editingStudent}
      />
    </div>
  );
}
