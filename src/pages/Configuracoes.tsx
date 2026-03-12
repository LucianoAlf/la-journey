import { FloppyDisk, Plus } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";
import { cn } from "../utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export function Configuracoes() {
  const { showToast } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            <em className="not-italic text-accent">Configurações</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Painel administrativo da escola
          </p>
        </div>
      </div>

      <Tabs defaultValue="escola" className="mb-6">
        <TabsList>
          <TabsTrigger value="escola">Escola</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="visual">Identidade Visual</TabsTrigger>
          <TabsTrigger value="plano">Plano</TabsTrigger>
        </TabsList>

        <TabsContent value="escola">
          <div className="card">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome da escola</Label>
                <Input defaultValue="LA Music School" />
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input defaultValue="00.000.000/0001-00" />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input defaultValue="Rio de Janeiro" />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Input defaultValue="RJ" />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input defaultValue="(21) 99999-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input defaultValue="contato@lamusic.com.br" />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => showToast('Configurações salvas!')}>
                <FloppyDisk size={16} /> Salvar
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="usuarios">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="font-serif text-[17px]">Equipe</div>
              <Button size="sm">
                <Plus size={16} /> Novo Usuário
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { name: 'Luciano Alf', role: 'Diretor (Owner)', email: 'alf@lamusic.com.br', initials: 'LA', color: 'bg-gradient-to-br from-azul-escuro to-azul-claro' },
                { name: 'Renan Amorim', role: 'Coordenador (N4)', email: 'renan@lamusic.com.br', initials: 'R', color: 'bg-foundation' },
                { name: 'Kinho', role: 'Professor (N4)', email: 'kinho@lamusic.com.br', initials: 'K', color: 'bg-grow' },
                { name: 'Peterson', role: 'Professor (N4)', email: 'peterson@lamusic.com.br', initials: 'P', color: 'bg-advance' },
                { name: 'Juliana Quintella', role: 'Coordenadora (N4)', email: 'juliana@lamusic.com.br', initials: 'J', color: 'bg-master' },
              ].map((user, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-[var(--radius-sm)]">
                  <div className={cn("w-[30px] h-[30px] rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0", user.color)}>
                    {user.initials}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-[13px]">{user.name}</div>
                    <div className="text-[11px] text-text3">{user.role} · {user.email}</div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-verde" />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="visual">
          <div className="card">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cor primária (hex)</Label>
                <Input defaultValue="#1E3A5F" />
              </div>
              <div className="space-y-1.5">
                <Label>Cor secundária (hex)</Label>
                <Input defaultValue="#FF2D78" />
              </div>
              <div className="space-y-1.5">
                <Label>Template de capa</Label>
                <Select defaultValue="padrao"><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">Padrão LA Journey</SelectItem>
                    <SelectItem value="minimalista">Minimalista</SelectItem>
                    <SelectItem value="moderno">Moderno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipografia</Label>
                <Select defaultValue="playfair"><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="playfair">Playfair Display + DM Sans</SelectItem>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="poppins">Poppins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => showToast('Configurações salvas!')}>
                <FloppyDisk size={16} /> Salvar
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plano">
          <div className="grid grid-cols-2 gap-5">
            <div className="card">
              <Label>Plano atual</Label>
              <div className="font-serif text-[28px] mt-2">Premium</div>
              <div className="text-[32px] font-bold text-accent my-2">
                R$ 147<span className="text-sm font-normal text-text3">/mês</span>
              </div>
              <div className="text-sm text-text2 leading-loose">
                ✓ Todos os instrumentos<br/>
                ✓ Geração ilimitada<br/>
                ✓ Gamificação completa<br/>
                ✓ WhatsApp integrado<br/>
                ✓ Relatórios avançados
              </div>
            </div>
            <div className="card">
              <Label>Uso este mês</Label>
              <div className="mt-4">
                <div className="flex justify-between text-[13px] mb-2">
                  <span>Materiais gerados</span><span>47 / ilimitado</span>
                </div>
                <Progress value={47} className="h-1" />
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[13px] mb-2">
                  <span>Alunos ativos</span><span>1.297</span>
                </div>
                <Progress value={65} className="h-1" />
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[13px] mb-2">
                  <span>Mensagens WhatsApp</span><span>234 / 500</span>
                </div>
                <Progress value={47} className="h-1" />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
