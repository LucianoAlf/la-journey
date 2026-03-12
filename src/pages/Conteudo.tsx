import { UploadSimple, Plus, PencilSimple } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function Conteudo() {
  const { openModal } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Base de Conteúdo <em className="not-italic text-accent">Curado</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Repositório pedagógico musical · Curadoria N4 · Versionamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <UploadSimple size={16} /> Importar
          </Button>
          <Button onClick={() => openModal('modal-conteudo')}>
            <Plus size={16} /> Novo Bloco
          </Button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4">
          <div className="space-y-1.5">
            <Label>Buscar conteúdo</Label>
            <Input placeholder="Título ou tag..." />
          </div>
          <div className="space-y-1.5">
            <Label>Instrumento</Label>
            <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="universal">Universal (Teoria)</SelectItem>
                <SelectItem value="violao">Violão</SelectItem><SelectItem value="guitarra">Guitarra</SelectItem>
                <SelectItem value="teclado">Teclado</SelectItem><SelectItem value="canto">Canto</SelectItem>
                <SelectItem value="bateria">Bateria</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Pilar</Label>
            <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="fund-teoricos">Fund. Teóricos</SelectItem>
                <SelectItem value="pratica">Prática Instrumento</SelectItem>
                <SelectItem value="repertorio">Repertório</SelectItem>
                <SelectItem value="improv">Improv. e Composição</SelectItem>
                <SelectItem value="auditivo">Desenv. Auditivo</SelectItem>
                <SelectItem value="avaliacoes">Avaliações</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nível</Label>
            <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="foundation">Foundation</SelectItem><SelectItem value="grow">Grow</SelectItem>
                <SelectItem value="advance">Advance</SelectItem><SelectItem value="master">Master</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="texto">Texto explicativo</SelectItem><SelectItem value="exercicio">Exercício</SelectItem>
                <SelectItem value="diagrama">Diagrama</SelectItem><SelectItem value="partitura">Partitura</SelectItem>
                <SelectItem value="imagem">Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem><SelectItem value="revisao">Em revisão</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem><SelectItem value="publicado">Publicado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="lista" className="mb-6">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="topicos">Por Tópico</TabsTrigger>
          <TabsTrigger value="curadoria">Fila de Curadoria</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <div className="card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bloco de Conteúdo</TableHead>
                  <TableHead>Instrumento</TableHead>
                  <TableHead>Pilar</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Curador</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="font-bold">Anatomia do Violão</div>
                    <div className="text-[11px] text-text3">Partes do instrumento, cordas, trastes, braço</div>
                  </TableCell>
                  <TableCell>Violão</TableCell>
                  <TableCell>Fund. Teóricos</TableCell>
                  <TableCell><Badge variant="foundation">Foundation</Badge></TableCell>
                  <TableCell><Badge variant="secondary">Texto + Imagem</Badge></TableCell>
                  <TableCell>Renan</TableCell>
                  <TableCell className="font-mono text-xs">v3</TableCell>
                  <TableCell><Badge variant="advance">Publicado</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="sm"><PencilSimple size={16} /></Button></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-bold">Escala Maior — Construção e Aplicação</div>
                    <div className="text-[11px] text-text3">T T ST T T T ST · Todas as tonalidades</div>
                  </TableCell>
                  <TableCell>Universal</TableCell>
                  <TableCell>Fund. Teóricos</TableCell>
                  <TableCell><Badge variant="grow">Grow</Badge></TableCell>
                  <TableCell><Badge variant="secondary">Texto + Diagrama</Badge></TableCell>
                  <TableCell>Kinho</TableCell>
                  <TableCell className="font-mono text-xs">v2</TableCell>
                  <TableCell><Badge variant="advance">Publicado</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="sm"><PencilSimple size={16} /></Button></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-bold">Formação de Acordes Tríades</div>
                    <div className="text-[11px] text-text3">Maior, menor, diminuto, aumentado</div>
                  </TableCell>
                  <TableCell>Universal</TableCell>
                  <TableCell>Fund. Teóricos</TableCell>
                  <TableCell><Badge variant="grow">Grow</Badge></TableCell>
                  <TableCell><Badge variant="secondary">Texto + Notação</Badge></TableCell>
                  <TableCell>Peterson</TableCell>
                  <TableCell className="font-mono text-xs">v1</TableCell>
                  <TableCell><Badge variant="gold">Em revisão</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="sm"><PencilSimple size={16} /></Button></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="topicos">
          <div className="grid grid-cols-2 gap-5">
            <div className="card">
              <div className="font-serif mb-3 text-[17px]">Foundation — Violão</div>
              <div className="flex flex-col gap-1.5">
                <div className="p-2.5 border border-border rounded-[var(--radius-sm)]">
                  <div className="font-bold text-sm">Anatomia do instrumento</div>
                  <div className="text-[11px] text-text3 mt-1">3 blocos · Texto + Imagem · <span className="text-verde">Publicado</span></div>
                </div>
                <div className="p-2.5 border border-border rounded-[var(--radius-sm)]">
                  <div className="font-bold text-sm">Postura e posição das mãos</div>
                  <div className="text-[11px] text-text3 mt-1">2 blocos · Texto + Imagem IA · <span className="text-verde">Publicado</span></div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="font-serif mb-3 text-[17px]">Grow — Universal (Teoria)</div>
              <div className="flex flex-col gap-1.5">
                <div className="p-2.5 border border-border rounded-[var(--radius-sm)]">
                  <div className="font-bold text-sm">Escala Maior</div>
                  <div className="text-[11px] text-text3 mt-1">4 blocos · VexFlow + Diagrama · <span className="text-verde">Publicado</span></div>
                </div>
                <div className="p-2.5 border border-border rounded-[var(--radius-sm)]">
                  <div className="font-bold text-sm">Escala Menor Natural / Harmônica / Melódica</div>
                  <div className="text-[11px] text-text3 mt-1">6 blocos · VexFlow + Diagrama · <span className="text-dourado">Em revisão</span></div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="curadoria">
          <div>
            <div className="flex items-center gap-2.5 py-3.5 px-5 bg-dourado-soft border border-[rgba(245,158,11,0.2)] rounded-[var(--radius)] mb-4">
              <span className="text-lg">📋</span>
              <div className="flex-1">
                <div className="font-bold text-dourado">5 blocos aguardando curadoria</div>
                <div className="text-sm text-text2">Professores N4 precisam revisar e aprovar antes da publicação</div>
              </div>
            </div>
            <div className="card">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3 p-3.5 border border-border rounded-[var(--radius-sm)] border-l-[3px] border-l-dourado">
                  <div className="flex-1">
                    <div className="font-bold text-sm">Formação de Acordes Tríades <Badge variant="gold" className="ml-1.5">Em revisão</Badge></div>
                    <div className="text-[11px] text-text3 mt-1">Peterson · v1 · Enviado há 2 dias</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-verde">✓ Aprovar</Button>
                    <Button variant="ghost" size="sm" className="text-vermelho">✕ Devolver</Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 border border-border rounded-[var(--radius-sm)] border-l-[3px] border-l-accent">
                  <div className="flex-1">
                    <div className="font-bold text-sm">Modos Gregos — Visão Geral <Badge variant="accent" className="ml-1.5">Rascunho</Badge></div>
                    <div className="text-[11px] text-text3 mt-1">Kinho · v1 · Criado há 5 dias</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">👁️ Revisar</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
