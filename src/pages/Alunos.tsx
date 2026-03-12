import { Plus, DeviceMobile, PaperPlaneTilt } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export function Alunos() {
  const { openModal } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Monitoramento de <em className="not-italic text-accent">Alunos</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Acompanhe o progresso na jornada e envie materiais complementares
          </p>
        </div>
        <Button onClick={() => openModal('modal-aluno')}>
          <Plus size={16} /> Novo Aluno
        </Button>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Buscar aluno</Label>
            <Input placeholder="Nome do aluno" />
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
            <Label>Stage</Label>
            <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="foundation">Foundation</SelectItem><SelectItem value="grow">Grow</SelectItem>
                <SelectItem value="advance">Advance</SelectItem><SelectItem value="master">Master</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ritmo">No ritmo</SelectItem><SelectItem value="adiantado">Adiantado</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem><SelectItem value="estagnado">Estagnado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 py-3.5 px-5 bg-dourado-soft border border-[rgba(245,158,11,0.2)] rounded-[var(--radius)] mb-4">
        <span className="text-lg">⚠️</span>
        <div className="flex-1">
          <div className="font-bold text-dourado">2 alunos precisam de atenção</div>
          <div className="text-sm text-text2">Ana Oliveira atrasada (3 aulas) · João Ferreira estagnado há 2 semanas</div>
        </div>
        <Button size="sm" className="bg-accent hover:bg-accent/90">
          <PaperPlaneTilt size={16} /> Enviar Material
        </Button>
      </div>

      <Tabs defaultValue="todos" className="mb-6">
        <TabsList>
          <TabsTrigger value="todos">Todos (8)</TabsTrigger>
          <TabsTrigger value="ritmo">No ritmo</TabsTrigger>
          <TabsTrigger value="adiantados">Adiantados</TabsTrigger>
          <TabsTrigger value="atrasados">Atrasados</TabsTrigger>
          <TabsTrigger value="estagnados">Estagnados</TabsTrigger>
        </TabsList>

        <TabsContent value="todos">
          <div className="card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Instrumento</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Estação</TableHead>
                  <TableHead>Aula</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-bold">Lucas Silva</TableCell>
                  <TableCell>Violão</TableCell>
                  <TableCell><Badge variant="foundation">Foundation</Badge></TableCell>
                  <TableCell>Est. 3</TableCell>
                  <TableCell className="font-mono">22/44</TableCell>
                  <TableCell><Progress value={50} className="w-20 h-1" /></TableCell>
                  <TableCell><Badge variant="advance">No ritmo</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="sm"><DeviceMobile size={16} /></Button></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-bold text-dourado">Ana Oliveira ⚠️</TableCell>
                  <TableCell>Teclado</TableCell>
                  <TableCell><Badge variant="foundation">Foundation</Badge></TableCell>
                  <TableCell>Est. 1</TableCell>
                  <TableCell className="font-mono">8/44</TableCell>
                  <TableCell><Progress value={18} className="w-20 h-1" /></TableCell>
                  <TableCell><Badge variant="gold">Atrasada</Badge></TableCell>
                  <TableCell><Button size="sm" className="bg-accent hover:bg-accent/90">Enviar</Button></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="ritmo">
          <div className="card p-8 text-center text-text3">Filtro: alunos no ritmo</div>
        </TabsContent>
        <TabsContent value="adiantados">
          <div className="card p-8 text-center text-text3">Filtro: alunos adiantados</div>
        </TabsContent>
        <TabsContent value="atrasados">
          <div className="card p-8 text-center text-text3">Filtro: alunos atrasados</div>
        </TabsContent>
        <TabsContent value="estagnados">
          <div className="card p-8 text-center text-text3">Filtro: alunos estagnados</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
