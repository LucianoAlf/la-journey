import { Plus, PencilSimple } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function Turmas() {
  const { openModal } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Gestão de <em className="not-italic text-accent">Turmas</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Turmas, horários, professores e jornadas vinculadas
          </p>
        </div>
        <Button onClick={() => openModal('modal-turma')}>
          <Plus size={16} /> Nova Turma
        </Button>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Buscar</Label>
            <Input placeholder="Nome da turma" />
          </div>
          <div className="space-y-1.5">
            <Label>Instrumento</Label>
            <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="violao">Violão</SelectItem><SelectItem value="guitarra">Guitarra</SelectItem>
                <SelectItem value="teclado">Teclado</SelectItem><SelectItem value="canto">Canto</SelectItem>
                <SelectItem value="bateria">Bateria</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Professor</Label>
            <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="renan">Renan</SelectItem><SelectItem value="kinho">Kinho</SelectItem>
                <SelectItem value="peterson">Peterson</SelectItem><SelectItem value="jeyson">Jeyson</SelectItem>
                <SelectItem value="juliana">Juliana</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Unidade</Label>
            <Select defaultValue="todas"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="campo-grande">Campo Grande</SelectItem>
                <SelectItem value="recreio">Recreio</SelectItem><SelectItem value="barra">Barra</SelectItem>
              </SelectContent>
            </Select>
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
              <TableHead>Horário</TableHead>
              <TableHead>Alunos</TableHead>
              <TableHead>Jornada</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-bold">Violão Adulto — Seg/Qua 19h</TableCell>
              <TableCell>Violão</TableCell>
              <TableCell>Renan</TableCell>
              <TableCell className="font-mono text-xs">Seg/Qua 19:00</TableCell>
              <TableCell>8/10</TableCell>
              <TableCell><Badge variant="foundation">Violão Adulto Padrão</Badge></TableCell>
              <TableCell>Campo Grande</TableCell>
              <TableCell><Button variant="ghost" size="sm"><PencilSimple size={16} /></Button></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Guitarra Rock — Ter/Qui 20h</TableCell>
              <TableCell>Guitarra</TableCell>
              <TableCell>Kinho</TableCell>
              <TableCell className="font-mono text-xs">Ter/Qui 20:00</TableCell>
              <TableCell>6/8</TableCell>
              <TableCell><Badge variant="foundation">Guitarra Rock</Badge></TableCell>
              <TableCell>Campo Grande</TableCell>
              <TableCell><Button variant="ghost" size="sm"><PencilSimple size={16} /></Button></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
