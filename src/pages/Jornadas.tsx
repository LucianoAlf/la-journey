import { Copy, Plus, FloppyDisk } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Jornadas() {
  const { openModal } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Construtor de <em className="not-italic text-accent">Jornada</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Configure a trilha pedagógica da sua escola · Ancoragem de Fundamentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <Copy size={16} /> Duplicar
          </Button>
          <Button onClick={() => openModal('modal-jornada')}>
            <Plus size={16} /> Nova Jornada
          </Button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Instrumento</Label>
            <Select defaultValue="violao"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="violao">Violão</SelectItem><SelectItem value="guitarra">Guitarra</SelectItem>
                <SelectItem value="teclado">Teclado</SelectItem><SelectItem value="piano">Piano</SelectItem>
                <SelectItem value="canto">Canto</SelectItem><SelectItem value="bateria">Bateria</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem><SelectItem value="ukulele">Ukulele</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Público-alvo</Label>
            <Select defaultValue="adult"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adult">Adulto</SelectItem><SelectItem value="teen">Teen (12-17)</SelectItem>
                <SelectItem value="kids">Kids (5-11)</SelectItem><SelectItem value="baby">Baby (0-5)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Aulas por Stage</Label>
            <Select defaultValue="40"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="40">40 aulas</SelectItem><SelectItem value="30">30 aulas</SelectItem>
                <SelectItem value="20">20 aulas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select defaultValue="violao-adulto"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="violao-adulto">Violão Adulto Padrão</SelectItem>
                <SelectItem value="guitarra-rock">Guitarra Rock</SelectItem>
                <SelectItem value="canto-popular">Canto Popular</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="rounded-[var(--radius)] p-5 text-center text-white relative overflow-hidden cursor-pointer transition-all border-2 border-[rgba(255,255,255,0.4)] bg-gradient-to-br from-[#4F46E5] to-foundation hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
          <div className="text-2xl mb-1.5">🧱</div>
          <div className="font-bold">Foundation</div>
          <div className="text-[11px] opacity-70">40 aulas · Base Técnica</div>
        </div>
        <div className="rounded-[var(--radius)] p-5 text-center text-white relative overflow-hidden cursor-pointer transition-all border-2 border-transparent bg-gradient-to-br from-[#EA580C] to-grow hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
          <div className="text-2xl mb-1.5">📈</div>
          <div className="font-bold">Grow</div>
          <div className="text-[11px] opacity-70">40 aulas · Desenvolvimento</div>
        </div>
        <div className="rounded-[var(--radius)] p-5 text-center text-white relative overflow-hidden cursor-pointer transition-all border-2 border-transparent bg-gradient-to-br from-[#16A34A] to-advance hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
          <div className="text-2xl mb-1.5">✅</div>
          <div className="font-bold">Advance</div>
          <div className="text-[11px] opacity-70">40 aulas · Fluidez e Expressão</div>
        </div>
        <div className="rounded-[var(--radius)] p-5 text-center text-white relative overflow-hidden cursor-pointer transition-all border-2 border-transparent bg-gradient-to-br from-[#DB2777] to-master hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
          <div className="text-2xl mb-1.5">🏆</div>
          <div className="font-bold">Master</div>
          <div className="text-[11px] opacity-70">40 aulas · Identidade</div>
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-5">
        <div className="card p-4">
          <div className="form-label mb-3 text-accent">Estações — Foundation</div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-[rgba(255,45,120,0.25)] bg-accent-soft cursor-pointer transition-all">
              <div className="w-7 h-7 rounded-md bg-accent-soft flex items-center justify-center text-xs text-accent font-bold shrink-0">1</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] truncate">Fundamentos 1</div>
                <div className="text-[11px] text-text3">Aulas 1-10 · 10 aulas</div>
              </div>
              <Badge variant="accent" className="text-[9px] px-1.5 py-0.5">START</Badge>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-border cursor-pointer transition-all hover:bg-azul-soft hover:border-[rgba(30,58,95,0.2)]">
              <div className="w-7 h-7 rounded-md bg-azul-soft flex items-center justify-center text-xs text-azul-claro font-bold shrink-0">2</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] truncate">Fundamentos 2</div>
                <div className="text-[11px] text-text3">Aulas 11-20 · 10 aulas</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-border cursor-pointer transition-all hover:bg-azul-soft hover:border-[rgba(30,58,95,0.2)]">
              <div className="w-7 h-7 rounded-md bg-foundation-soft flex items-center justify-center text-xs text-foundation font-bold shrink-0">3</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] truncate">Revisão 1+2</div>
                <div className="text-[11px] text-text3">Aulas 21-22 · 2 aulas</div>
              </div>
              <Badge variant="foundation" className="text-[9px] px-1.5 py-0.5">CORE</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-border cursor-pointer transition-all hover:bg-azul-soft hover:border-[rgba(30,58,95,0.2)]">
              <div className="w-7 h-7 rounded-md bg-azul-soft flex items-center justify-center text-xs text-azul-claro font-bold shrink-0">4</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] truncate">Desenvolvimento 1</div>
                <div className="text-[11px] text-text3">Aulas 23-32 · 10 aulas</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-border cursor-pointer transition-all hover:bg-azul-soft hover:border-[rgba(30,58,95,0.2)]">
              <div className="w-7 h-7 rounded-md bg-azul-soft flex items-center justify-center text-xs text-azul-claro font-bold shrink-0">5</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] truncate">Desenvolvimento 2</div>
                <div className="text-[11px] text-text3">Aulas 33-42 · 10 aulas</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-border cursor-pointer transition-all hover:bg-azul-soft hover:border-[rgba(30,58,95,0.2)]">
              <div className="w-7 h-7 rounded-md bg-verde-soft flex items-center justify-center text-xs text-verde font-bold shrink-0">6</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] truncate">Consolidação</div>
                <div className="text-[11px] text-text3">Aulas 43-44 · 2 aulas</div>
              </div>
              <Badge variant="advance" className="text-[9px] px-1.5 py-0.5">CHECK</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-3 justify-center">
            <Plus size={16} /> Adicionar Estação
          </Button>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="form-label text-accent mb-1">Estação 1</div>
              <div className="font-serif text-[20px]">Fundamentos 1</div>
              <div className="text-[11px] text-text3 mt-2">Selecione e reordene os tópicos por dimensão</div>
            </div>
            <Button size="sm">
              <FloppyDisk size={16} /> Salvar
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-[var(--radius-sm)] border border-border p-4 bg-bg">
              <div className="font-bold text-[13px] mb-3 text-[#818CF8]">📖 Teoria e Conceitos</div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Anatomia do instrumento</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Postura (indicação dedos, posição mãos)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Propriedades do som (Altura, Intensidade, Timbre, Duração)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Leitura — Tablatura</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-text3 flex items-center justify-center text-[9px] shrink-0 cursor-pointer"></div>
                <span className="text-text3">Tom e semitom</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-border p-4 bg-bg">
              <div className="font-bold text-[13px] mb-3 text-grow">🎯 Técnica</div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Exercícios Psicomotor 1234 e variações</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Acordes G, C, E (1 dedo) · A (2 dedos) · D (3 dedos)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Coordenação na troca dos acordes</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-border p-4 bg-bg">
              <div className="font-bold text-[13px] mb-3 text-advance">🥁 Ritmo</div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Pulso e Andamento (metrônomo)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Exercícios Rítmicos motores</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Percepção Rítmica (auditiva → prática)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-border p-4 bg-bg">
              <div className="font-bold text-[13px] mb-3 text-master">🎵 Repertório</div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Músicas 1-2 dedos (W Brasil, Twist and Shout, Golden)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Músicas 2-3 dedos (Love Me Do, Trem Bala, Viva La Vida)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
