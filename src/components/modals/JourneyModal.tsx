import { useState, useEffect } from 'react'
import { FloppyDisk } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createJourneyWithStages, updateJourney } from '@/services/journeyService'
import { useAuth } from '@/contexts/AuthContext'
import { useSchool } from '@/hooks/useSchool'
import type { Tables } from '@/lib/database.types'

type Journey = Tables<'journeys'>

interface JourneyModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  journey?: Journey | null
}

const emptyForm = {
  name: '',
  instrument: '',
  target_audience: '' as string,
  lessons_per_stage: 40,
}

export function JourneyModal({ open, onClose, onSuccess, journey }: JourneyModalProps) {
  const { user } = useAuth()
  const { data: school } = useSchool()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const isEditing = !!journey

  useEffect(() => {
    if (journey) {
      setForm({
        name: journey.name ?? '',
        instrument: journey.instrument ?? '',
        target_audience: journey.target_audience ?? '',
        lessons_per_stage: 40,
      })
    } else {
      setForm(emptyForm)
    }
  }, [journey, open])

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome da jornada')
      return
    }
    if (!form.instrument) {
      toast.error('Selecione o instrumento')
      return
    }

    const schoolId = school?.id
    if (!schoolId) {
      toast.error('Escola não identificada.')
      return
    }

    setSaving(true)
    try {
      if (isEditing && journey) {
        await updateJourney(journey.id, {
          name: form.name,
          instrument: form.instrument,
          target_audience: (form.target_audience || null) as Journey['target_audience'],
        })
        toast.success('Jornada atualizada!')
      } else {
        await createJourneyWithStages(
          {
            school_id: schoolId,
            name: form.name,
            instrument: form.instrument,
            target_audience: (form.target_audience || null) as Journey['target_audience'],
            created_by: user?.id ?? null,
          },
          form.lessons_per_stage
        )
        toast.success('Jornada criada com 4 stages!')
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar jornada')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[640px] bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px]">
            {isEditing ? 'Editar' : 'Nova'} <span className="text-accent">Jornada</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              placeholder="Jornada Violão Adulto"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Instrumento</Label>
            <Select value={form.instrument} onValueChange={val => setForm(prev => ({ ...prev, instrument: val }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Violão">Violão</SelectItem>
                <SelectItem value="Guitarra">Guitarra</SelectItem>
                <SelectItem value="Teclado">Teclado</SelectItem>
                <SelectItem value="Piano">Piano</SelectItem>
                <SelectItem value="Canto">Canto</SelectItem>
                <SelectItem value="Bateria">Bateria</SelectItem>
                <SelectItem value="Baixo">Baixo</SelectItem>
                <SelectItem value="Ukulele">Ukulele</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Público-alvo</Label>
            <Select value={form.target_audience} onValueChange={val => setForm(prev => ({ ...prev, target_audience: val }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adult">Adulto</SelectItem>
                <SelectItem value="teen">Teen</SelectItem>
                <SelectItem value="kids">Kids</SelectItem>
                <SelectItem value="baby">Baby</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!isEditing && (
            <div className="space-y-1.5">
              <Label>Aulas por Stage</Label>
              <Select
                value={String(form.lessons_per_stage)}
                onValueChange={val => setForm(prev => ({ ...prev, lessons_per_stage: parseInt(val) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="40">40</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {!isEditing && (
          <div className="p-4 bg-azul-soft rounded-[var(--radius-sm)] mb-4">
            <div className="text-[11px] text-text3 mb-2">STAGES CRIADOS AUTOMATICAMENTE</div>
            <div className="text-[13px] text-text2">
              Foundation ({form.lessons_per_stage} aulas) · Grow ({form.lessons_per_stage} aulas) · Advance ({form.lessons_per_stage} aulas) · Master ({form.lessons_per_stage} aulas)
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <FloppyDisk size={16} /> {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Jornada'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
