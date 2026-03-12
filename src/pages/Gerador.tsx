import { Sparkle, FilePdf, WhatsappLogo, Eye, Printer, DownloadSimple, Hourglass } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function Gerador() {
  const { showToast } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Gerador de <em className="not-italic text-accent">Material</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Gere apostilas profissionais com a identidade da sua escola
          </p>
        </div>
        <Button className="bg-accent hover:bg-accent/90" onClick={() => showToast('Iniciando geração de material...')}>
          <Sparkle size={16} /> Gerar Material
        </Button>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Jornada</Label>
            <Select defaultValue="violao-adulto"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="violao-adulto">Violão Adulto</SelectItem>
                <SelectItem value="guitarra-rock">Guitarra Rock</SelectItem>
                <SelectItem value="canto-popular">Canto Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Stage</Label>
            <Select defaultValue="foundation"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="foundation">Foundation</SelectItem><SelectItem value="grow">Grow</SelectItem>
                <SelectItem value="advance">Advance</SelectItem><SelectItem value="master">Master</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estação</Label>
            <Select defaultValue="fund1"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fund1">Fundamentos 1 (10 aulas)</SelectItem>
                <SelectItem value="fund2">Fundamentos 2 (10 aulas)</SelectItem>
                <SelectItem value="revisao">Revisão (2 aulas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Escopo</Label>
            <Select defaultValue="modulo"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="modulo">Módulo completo</SelectItem>
                <SelectItem value="aula">Aula individual</SelectItem>
                <SelectItem value="ficha">Ficha de repertório</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="font-serif mb-3 text-[17px]">Identidade Visual</div>
            <div className="flex gap-4 items-center">
              <div className="w-[72px] h-[72px] rounded-[14px] bg-gradient-to-br from-azul-escuro to-azul flex items-center justify-center text-white text-[22px] font-extrabold shrink-0">
                LA
              </div>
              <div>
                <div className="font-bold">LA Music School</div>
                <div className="text-[11px] text-text3 mt-1">Logo, cores e nome aplicados automaticamente</div>
                <div className="flex gap-2 mt-3">
                  <div className="w-6 h-6 rounded-md bg-[#1E3A5F] border border-border" />
                  <div className="w-6 h-6 rounded-md bg-[#FF2D78] border border-border" />
                  <div className="w-6 h-6 rounded-md bg-[#F1F5F9] border border-border" />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="font-serif mb-3 text-[17px]">Sumário do material</div>
            <div className="flex flex-col gap-1.5">
              <div className="px-3 py-2 rounded-md border border-border text-xs text-text2">
                📖 Teoria: Anatomia, Postura, Propriedades do som, Tablatura
              </div>
              <div className="px-3 py-2 rounded-md border border-border text-xs text-text2">
                🎯 Técnica: Exercícios 1234, Acordes G/C/E/A/D, Coordenação
              </div>
              <div className="px-3 py-2 rounded-md border border-border text-xs text-text2">
                🥁 Ritmo: Pulso e Andamento, Exercícios Rítmicos, Percepção
              </div>
              <div className="px-3 py-2 rounded-md border border-border text-xs text-text2">
                🎵 Repertório: W Brasil, Twist and Shout, Love Me Do, Trem Bala
              </div>
              <div className="px-3 py-2 rounded-md border border-border text-xs text-text2">
                🏆 Gamificação: 3 selos desbloqueáveis, 2 QR codes interativos
              </div>
            </div>
          </div>
        </div>

        <div className="card text-center">
          <div className="font-serif mb-4 text-[17px]">Pré-visualização</div>
          <div className="aspect-[210/297] rounded-xl bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] text-center max-w-[260px] mx-auto relative">
            <div className="w-9 h-9 rounded-lg bg-[#1E3A5F] mx-auto mb-2 flex items-center justify-center text-white text-xs font-extrabold">
              LA
            </div>
            <div className="text-[8px] text-[#333] font-semibold">LA Music School</div>
            <div className="text-[13px] font-extrabold text-[#1E293B] my-3">Fundamentos 1</div>
            <div className="text-[7px] text-[#94A3B8]">Violão · Foundation · 10 Aulas</div>
            <div className="border-t border-[#E2E8F0] mt-3 pt-2.5 text-left">
              <div className="text-[6px] text-[#64748B] py-0.5"><span className="text-[#FF2D78]">●</span> Anatomia do instrumento</div>
              <div className="text-[6px] text-[#64748B] py-0.5"><span className="text-[#FF2D78]">●</span> Postura e posição</div>
              <div className="text-[6px] text-[#64748B] py-0.5"><span className="text-[#FF2D78]">●</span> Propriedades do som</div>
              <div className="text-[6px] text-[#64748B] py-0.5"><span className="text-[#FF2D78]">●</span> Exercícios mãos D e E</div>
              <div className="text-[6px] text-[#64748B] py-0.5"><span className="text-[#FF2D78]">●</span> Acordes G, C, E, A, D</div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-center">
            <Button variant="ghost" size="sm"><FilePdf size={16} /> PDF</Button>
            <Button variant="ghost" size="sm"><WhatsappLogo size={16} /> WhatsApp</Button>
            <Button variant="ghost" size="sm"><Eye size={16} /> HTML</Button>
            <Button variant="ghost" size="sm"><Printer size={16} /> Imprimir</Button>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="font-serif text-[17px]">Histórico de materiais</div>
          <Badge variant="secondary">6 materiais</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Páginas</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Downloads</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-bold">Violão Foundation — Fund. 1</TableCell>
              <TableCell className="text-xs">Módulo</TableCell>
              <TableCell>32</TableCell>
              <TableCell className="font-mono text-xs">10/03</TableCell>
              <TableCell>45</TableCell>
              <TableCell><Badge variant="advance">Pronto</Badge></TableCell>
              <TableCell><Button variant="ghost" size="sm"><DownloadSimple size={16} /></Button></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Guitarra Foundation — Fund. 2</TableCell>
              <TableCell className="text-xs">Módulo</TableCell>
              <TableCell>28</TableCell>
              <TableCell className="font-mono text-xs">09/03</TableCell>
              <TableCell>23</TableCell>
              <TableCell><Badge variant="advance">Pronto</Badge></TableCell>
              <TableCell><Button variant="ghost" size="sm"><DownloadSimple size={16} /></Button></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Repertório Violão — Nível 1</TableCell>
              <TableCell className="text-xs">Repertório</TableCell>
              <TableCell>12</TableCell>
              <TableCell className="font-mono text-xs">11/03</TableCell>
              <TableCell>—</TableCell>
              <TableCell><Badge variant="gold">Gerando</Badge></TableCell>
              <TableCell><Button variant="ghost" size="sm"><Hourglass size={16} /></Button></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
