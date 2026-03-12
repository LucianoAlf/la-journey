import { useState, useEffect } from "react";
import { FloppyDisk, SpinnerGap, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "../utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useSchool } from "@/hooks/useSchool";
import { useUsers } from "@/hooks/useUsers";
import { updateSchool } from "@/services/schoolService";

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-gradient-to-br from-azul-escuro to-azul-claro',
  coordinator: 'bg-foundation',
  teacher: 'bg-grow',
  staff: 'bg-advance',
}

export function Configuracoes() {
  const { data: school, loading, error, refetch } = useSchool();
  const { data: users } = useUsers();
  const [form, setForm] = useState({ name: '', cnpj: '', city: '', state: '', primary_color: '', secondary_color: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (school) {
      setForm({
        name: school.name ?? '',
        cnpj: school.cnpj ?? '',
        city: school.city ?? '',
        state: school.state ?? '',
        primary_color: school.primary_color ?? '#1E3A5F',
        secondary_color: school.secondary_color ?? '#FF2D78',
      });
    }
  }, [school]);

  const handleSave = async () => {
    if (!school) return;
    setSaving(true);
    try {
      await updateSchool(school.id, {
        name: form.name,
        cnpj: form.cnpj || null,
        city: form.city || null,
        state: form.state || null,
        primary_color: form.primary_color || null,
        secondary_color: form.secondary_color || null,
      });
      toast.success('Configurações salvas!');
      refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-text2">
        <SpinnerGap size={20} className="animate-spin" /> Carregando configurações...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-red-400">
        <Warning size={20} /> Erro ao carregar: {error}
      </div>
    );
  }

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
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={saving}>
                <FloppyDisk size={16} /> {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="usuarios">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="font-serif text-[17px]">Equipe ({(users ?? []).length} membros)</div>
            </div>
            <div className="flex flex-col gap-2">
              {(users ?? []).length === 0 ? (
                <div className="text-center py-6 text-text3">Nenhum usuário encontrado.</div>
              ) : (
                (users ?? []).map(u => {
                  const initials = (u.name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-3 border border-border rounded-[var(--radius-sm)]">
                      <div className={cn("w-[30px] h-[30px] rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0", ROLE_COLORS[u.role] ?? 'bg-azul-escuro')}>
                        {initials}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-[13px]">{u.name}</div>
                        <div className="text-[11px] text-text3">{u.role} · {u.email}</div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-verde" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="visual">
          <div className="card">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cor primária (hex)</Label>
                <Input value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Cor secundária (hex)</Label>
                <Input value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={saving}>
                <FloppyDisk size={16} /> {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plano">
          <div className="grid grid-cols-2 gap-5">
            <div className="card">
              <Label>Plano atual</Label>
              <div className="font-serif text-[28px] mt-2 capitalize">{school?.plan ?? 'Premium'}</div>
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
                  <span>Alunos ativos</span><span>{(users ?? []).length}</span>
                </div>
                <Progress value={Math.min(100, (users ?? []).length * 10)} className="h-1" />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
