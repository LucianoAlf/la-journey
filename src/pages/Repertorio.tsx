import { Lightning, Plus, FileText } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function Repertorio() {
  const { openModal } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            <em className="not-italic text-accent">Repertório</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Banco de músicas por instrumento, dificuldade e gênero · Cifra Club API
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <Lightning size={16} /> Importar Cifra Club
          </Button>
          <Button onClick={() => openModal('modal-musica')}>
            <Plus size={16} /> Nova Música
          </Button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-4">
          <div className="space-y-1.5">
            <Label>Buscar</Label>
            <Input placeholder="Nome ou artista" />
          </div>
          <div className="space-y-1.5">
            <Label>Instrumento</Label>
            <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="violao">Violão</SelectItem><SelectItem value="guitarra">Guitarra</SelectItem>
                <SelectItem value="teclado">Teclado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Dificuldade</Label>
            <Select defaultValue="todas"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="1">1 - Iniciante</SelectItem><SelectItem value="2">2 - Fácil</SelectItem>
                <SelectItem value="3">3 - Médio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Gênero</Label>
            <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="rock">Rock</SelectItem><SelectItem value="mpb">MPB</SelectItem>
                <SelectItem value="pop">Pop</SelectItem><SelectItem value="reggae">Reggae</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Curadoria</Label>
            <Select defaultValue="aprovado"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="revisao">Em revisão</SelectItem><SelectItem value="rascunho">Rascunho</SelectItem>
              </SelectContent>
            </Select>
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
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-bold">Love Me Do</TableCell>
              <TableCell>Beatles</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Badge variant="secondary" className="text-[10px]">G</Badge>
                  <Badge variant="secondary" className="text-[10px]">C</Badge>
                  <Badge variant="secondary" className="text-[10px]">D</Badge>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs">G</TableCell>
              <TableCell>Rock</TableCell>
              <TableCell>⭐</TableCell>
              <TableCell><Button variant="ghost" size="sm"><FileText size={16} /></Button></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Trem Bala</TableCell>
              <TableCell>Ana Vilela</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Badge variant="secondary" className="text-[10px]">C</Badge>
                  <Badge variant="secondary" className="text-[10px]">G</Badge>
                  <Badge variant="secondary" className="text-[10px]">Am</Badge>
                  <Badge variant="secondary" className="text-[10px]">F</Badge>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs">C</TableCell>
              <TableCell>MPB</TableCell>
              <TableCell>⭐⭐</TableCell>
              <TableCell><Button variant="ghost" size="sm"><FileText size={16} /></Button></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
