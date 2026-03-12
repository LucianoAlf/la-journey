import { useState } from "react";
import { Plus, PencilSimple, Trash, SpinnerGap, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useJourneys } from "@/hooks/useJourneys";
import { useStages } from "@/hooks/useJourneys";
import { deleteJourney } from "@/services/journeyService";
import { JourneyModal } from "@/components/modals/JourneyModal";
import type { Tables } from "@/lib/database.types";

type Journey = Tables<'journeys'>

const STAGE_STYLES: Record<string, { gradient: string; emoji: string; desc: string }> = {
  Foundation: { gradient: 'from-[#4F46E5] to-foundation', emoji: '🧱', desc: 'Base Técnica' },
  Grow: { gradient: 'from-[#EA580C] to-grow', emoji: '📈', desc: 'Desenvolvimento' },
  Advance: { gradient: 'from-[#16A34A] to-advance', emoji: '✅', desc: 'Fluidez e Expressão' },
  Master: { gradient: 'from-[#DB2777] to-master', emoji: '🏆', desc: 'Identidade' },
}

const audienceLabel: Record<string, string> = {
  adult: 'Adulto', teen: 'Teen', kids: 'Kids', baby: 'Baby',
}

export function Jornadas() {
  const { data: journeys, loading, error, refetch } = useJourneys();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('');

  const selectedJourney = (journeys ?? []).find(j => j.id === selectedJourneyId) ?? (journeys ?? [])[0] ?? null;
  const { data: stages } = useStages(selectedJourney?.id);

  const handleDelete = async (id: string) => {
    try {
      await deleteJourney(id);
      toast.success('Jornada excluída!');
      if (selectedJourneyId === id) setSelectedJourneyId('');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir jornada');
    }
  };

  const handleEdit = (j: Journey) => {
    setEditingJourney(j);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingJourney(null);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-text2">
        <SpinnerGap size={20} className="animate-spin" /> Carregando jornadas...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-red-400">
        <Warning size={20} /> Erro ao carregar jornadas: {error}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Construtor de <em className="not-italic text-accent">Jornada</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            {journeys?.length ?? 0} jornadas cadastradas · Ancoragem de Fundamentos
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus size={16} /> Nova Jornada
        </Button>
      </div>

      {/* Seletor de jornada */}
      {(journeys ?? []).length > 0 && (
        <div className="card mb-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Jornada</Label>
              <Select
                value={selectedJourney?.id ?? ''}
                onValueChange={val => setSelectedJourneyId(val)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione uma jornada" /></SelectTrigger>
                <SelectContent>
                  {(journeys ?? []).map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.name} — {j.instrument}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedJourney && (
              <>
                <div className="flex items-end gap-2">
                  <Badge variant="foundation">{selectedJourney.instrument}</Badge>
                  {selectedJourney.target_audience && (
                    <Badge variant="secondary">{audienceLabel[selectedJourney.target_audience] ?? selectedJourney.target_audience}</Badge>
                  )}
                  {selectedJourney.status && (
                    <Badge variant={selectedJourney.status === 'active' ? 'advance' : 'secondary'}>
                      {selectedJourney.status === 'active' ? 'Ativa' : selectedJourney.status}
                    </Badge>
                  )}
                </div>
                <div className="flex items-end gap-1 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(selectedJourney)}>
                    <PencilSimple size={16} /> Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                        <Trash size={16} /> Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-surface border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir jornada?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir <strong>{selectedJourney.name}</strong>?
                          Todos os stages serão removidos. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => handleDelete(selectedJourney.id)}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stages cards */}
      {selectedJourney && (stages ?? []).length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {(stages ?? []).map(stage => {
            const style = STAGE_STYLES[stage.name] ?? { gradient: 'from-gray-600 to-gray-500', emoji: '📚', desc: '' };
            return (
              <div
                key={stage.id}
                className={`rounded-[var(--radius)] p-5 text-center text-white relative overflow-hidden cursor-pointer transition-all border-2 border-transparent bg-gradient-to-br ${style.gradient} hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]`}
              >
                <div className="text-2xl mb-1.5">{style.emoji}</div>
                <div className="font-bold">{stage.name}</div>
                <div className="text-[11px] opacity-70">{stage.total_lessons ?? 40} aulas · {style.desc}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Estado vazio */}
      {(journeys ?? []).length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🗺️</div>
          <div className="font-serif text-xl mb-2">Nenhuma jornada criada</div>
          <div className="text-text2 text-sm mb-4">Crie sua primeira jornada pedagógica com 4 stages automáticos.</div>
          <Button onClick={handleNew}>
            <Plus size={16} /> Criar Primeira Jornada
          </Button>
        </div>
      )}

      {/* Placeholder para construtor de estações (futuro) */}
      {selectedJourney && (
        <div className="card p-8 text-center text-text3">
          <div className="text-lg mb-2">🚧 Construtor de Estações</div>
          <div className="text-sm">A edição de estações e tópicos por dimensão será conectada na próxima fase.</div>
        </div>
      )}

      <JourneyModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingJourney(null); }}
        onSuccess={refetch}
        journey={editingJourney}
      />
    </div>
  );
}
