import { useEffect, useRef, useState } from "react";
import {
  FloppyDisk,
  ImageSquare,
  Palette,
  SpinnerGap,
  TextAa,
  Trash,
  UploadSimple,
  Warning,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "../utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { LAFontPicker } from "@/components/ui/LAFontPicker";
import { useSchool } from "@/hooks/useSchool";
import { useUsers } from "@/hooks/useUsers";
import { updateSchool } from "@/services/schoolService";
import { supabase } from "@/lib/supabase";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-gradient-to-br from-azul-escuro to-azul-claro",
  coordinator: "bg-foundation",
  teacher: "bg-grow",
  staff: "bg-advance",
};

export function Configuracoes() {
  const { data: school, loading, error, refetch } = useSchool();
  const { data: users } = useUsers();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    cnpj: "",
    city: "",
    state: "",
    logo_url: "",
    primary_color: "",
    secondary_color: "",
    default_cover_font: "Montserrat",
    default_body_font: "DM Sans",
  });
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    if (school) {
      setForm({
        name: school.name ?? "",
        cnpj: school.cnpj ?? "",
        city: school.city ?? "",
        state: school.state ?? "",
        logo_url: school.logo_url ?? "",
        primary_color: school.primary_color ?? "#1E3A5F",
        secondary_color: school.secondary_color ?? "#FF2D78",
        default_cover_font: school.default_cover_font ?? "Montserrat",
        default_body_font: school.default_body_font ?? "DM Sans",
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
        logo_url: form.logo_url || null,
        primary_color: form.primary_color || null,
        secondary_color: form.secondary_color || null,
        default_cover_font: form.default_cover_font || null,
        default_body_font: form.default_body_font || null,
      });
      toast.success("Configurações salvas!");
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!school) return;

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Logomarca deve ter no máximo 2MB");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG, WebP ou SVG");
      return;
    }

    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const safeName =
        file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-z0-9_-]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase() || "logo";
      const filePath = `${school.id}/logos/${safeName}-${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("school-logos")
        .upload(filePath, file, { contentType: file.type, upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage.from("school-logos").getPublicUrl(uploadData.path);
      setForm(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      await updateSchool(school.id, { logo_url: urlData.publicUrl });
      toast.success("Logomarca da escola atualizada!");
      refetch();
    } catch (e: any) {
      toast.error("Erro ao enviar logomarca: " + (e?.message?.slice(0, 80) ?? ""));
    } finally {
      setLogoUploading(false);
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
          <p className="text-text2 text-[13.5px] mt-1.5">Painel administrativo da escola</p>
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
                <FloppyDisk size={16} /> {saving ? "Salvando..." : "Salvar"}
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
                  const initials = (u.name ?? "?")
                    .split(" ")
                    .map(w => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-3 border border-border rounded-[var(--radius-sm)]">
                      <div
                        className={cn(
                          "w-[30px] h-[30px] rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0",
                          ROLE_COLORS[u.role] ?? "bg-azul-escuro",
                        )}
                      >
                        {initials}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-[13px]">{u.name}</div>
                        <div className="text-[11px] text-text3">
                          {u.role} - {u.email}
                        </div>
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
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
            <div className="card space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-accent text-[11px] font-bold tracking-[0.28em] uppercase">
                    <Palette size={15} weight="bold" /> Brand Kit básico
                  </div>
                  <p className="text-text2 text-[13px] mt-1">
                    Defina a identidade visual padrão da escola para capas, textos e próximos materiais.
                  </p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="shrink-0">
                  <FloppyDisk size={16} /> {saving ? "Salvando..." : "Salvar Brand Kit"}
                </Button>
              </div>

              <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <ImageSquare size={15} /> Logo principal
                  </Label>
                  <div className="rounded-[18px] border border-border bg-paper p-4">
                    <div className="h-[116px] rounded-[14px] bg-background2 border border-border flex items-center justify-center overflow-hidden">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo da escola" className="max-h-full max-w-full object-contain p-3" />
                      ) : (
                        <div className="text-center text-text3 text-[12px] px-6">
                          Envie uma marca para reutilizar em capas e PDFs.
                        </div>
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) void handleLogoUpload(file);
                        e.currentTarget.value = "";
                      }}
                    />
                    <div className="grid grid-cols-[1fr_auto] gap-2 mt-3">
                      <Button type="button" variant="secondary" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                        {logoUploading ? <SpinnerGap size={16} className="animate-spin" /> : <UploadSimple size={16} />}
                        {logoUploading ? "Enviando..." : "Enviar logo"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={!form.logo_url || logoUploading}
                        onClick={() => setForm(p => ({ ...p, logo_url: "" }))}
                        aria-label="Remover logo"
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Palette size={15} /> Paleta principal
                    </Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[16px] border border-border bg-paper p-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-text3 font-bold mb-2">Primária</div>
                        <div className="grid grid-cols-[42px_1fr] gap-2">
                          <input
                            type="color"
                            value={form.primary_color || "#1E3A5F"}
                            onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))}
                            className="w-[42px] h-[42px] rounded-[12px] border border-border bg-transparent p-1"
                          />
                          <Input value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} />
                        </div>
                      </div>
                      <div className="rounded-[16px] border border-border bg-paper p-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-text3 font-bold mb-2">Secundária</div>
                        <div className="grid grid-cols-[42px_1fr] gap-2">
                          <input
                            type="color"
                            value={form.secondary_color || "#FF2D78"}
                            onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))}
                            className="w-[42px] h-[42px] rounded-[12px] border border-border bg-transparent p-1"
                          />
                          <Input value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <TextAa size={16} /> Tipografia padrão
                    </Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <div className="text-[12px] font-semibold text-text2">Capa e títulos</div>
                        <LAFontPicker
                          value={form.default_cover_font}
                          onValueChange={font => setForm(p => ({ ...p, default_cover_font: font }))}
                          context="cover"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-[12px] font-semibold text-text2">Textos corridos</div>
                        <LAFontPicker
                          value={form.default_body_font}
                          onValueChange={font => setForm(p => ({ ...p, default_body_font: font }))}
                          context="body"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card overflow-hidden p-0">
              <div
                className="min-h-[240px] p-5 flex flex-col justify-between"
                style={{
                  background: `linear-gradient(135deg, ${form.primary_color || "#1E3A5F"} 0%, ${form.primary_color || "#1E3A5F"} 55%, ${form.secondary_color || "#FF2D78"} 55%, ${form.secondary_color || "#FF2D78"} 100%)`,
                }}
              >
                <div className="flex justify-end">
                  <div className="bg-white/90 rounded-[12px] px-3 py-2 min-h-[42px] min-w-[96px] flex items-center justify-center">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="" className="max-h-[34px] max-w-[130px] object-contain" />
                    ) : (
                      <span className="text-[11px] font-bold text-slate-500 tracking-[0.18em]">LOGO</span>
                    )}
                  </div>
                </div>
                <div className="text-white drop-shadow-sm">
                  <div className="text-[11px] uppercase tracking-[0.24em] opacity-80 mb-2">Preview da escola</div>
                  <div className="text-[30px] leading-[1.05] font-black" style={{ fontFamily: form.default_cover_font }}>
                    {form.name || "LA Music School"}
                  </div>
                  <div className="mt-3 text-[14px] opacity-90" style={{ fontFamily: form.default_body_font }}>
                    Capa, apostila e PDF mantendo a mesma identidade.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plano">
          <div className="grid grid-cols-2 gap-5">
            <div className="card">
              <Label>Plano atual</Label>
              <div className="font-serif text-[28px] mt-2 capitalize">{school?.plan ?? "Premium"}</div>
              <div className="text-[32px] font-bold text-accent my-2">
                R$ 147<span className="text-sm font-normal text-text3">/mês</span>
              </div>
              <div className="text-sm text-text2 leading-loose">
                Todos os instrumentos
                <br />
                Geração ilimitada
                <br />
                Gamificação completa
                <br />
                WhatsApp integrado
                <br />
                Relatórios avançados
              </div>
            </div>
            <div className="card">
              <Label>Uso este mês</Label>
              <div className="mt-4">
                <div className="flex justify-between text-[13px] mb-2">
                  <span>Materiais gerados</span>
                  <span>47 / ilimitado</span>
                </div>
                <Progress value={47} className="h-1" />
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[13px] mb-2">
                  <span>Alunos ativos</span>
                  <span>{(users ?? []).length}</span>
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
