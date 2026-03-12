import { useState, useEffect } from 'react'
import { FloppyDisk } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClass, updateClass } from '@/services/classService'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/hooks/useUsers'
import { useJourneys } from '@/hooks/useJourneys'
import type { Tables } from '@/lib/database.types'

type ClassRow = Tables<'classes'>

interface ClassModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  classData?: ClassRow | null
}

const emptyForm = {
  name: '',
  instrument: '',
  teacher_id: '',
  journey_id: '',
  max_students: 10,
}

export function ClassModal({ open, onClose, onSuccess, classData }: ClassModalProps) {
  const { user } = useAuth()
  const { data: users } = useUsers()
  const { data: journeys } = useJourneys()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const isEditing = !!classData

  const teachers = (users ?? []).filter(u => u.role === 'teacher' || u.role === 'coordinator' || u.role === 'owner')

  useEffect(() => {
    if (classData) {
      setForm({
        name: classData.name ?? '',
        instrument: classData.instrument ?? '',
        teacher_id: classData.teacher_id ?? '',
        journey_id: classData.journey_id ?? '',
        max_students: classData.max_students ?? 10,
      })
    } else {
      setForm(emptyForm)
    }
  }, [classData, open])

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome da turma')
      return
    }
    if (!form.instrument) {
      toast.error('Selecione o instrumento')
      return
    }

    const schoolId = user?.user_metadata?.school_id
    if (!schoolId) {
      toast.error('Escola não identificada.')
      return
    }

    setSaving(true)
    try {
      if (isEditing && classData) {
        await updateClass(classData.id, {
          name: form.name,
          instrument: form.instrument,
          teacher_id: form.teacher_id || null,
          journey_id: form.journey_id || null,
          max_students: form.max_students,
        })
        toast.success('Turma atualizada!')
      } else {
        await createClass({
          school_id: schoolId,
          name: form.name,
          instrument: form.instrument,
          teacher_id: form.teacher_id || null,
          journey_id: form.journey_id || null,
          max_students: form.max_students,
        })
        toast.success('Turma criada!')
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar turma')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[640px] bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px]">
            {isEditing ? 'Editar' : 'Nova'} <span className="text-accent">Turma</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1.5">
            <Label>Nome da turma</Label>
            <Input
              placeholder="Violão Adulto — Seg/Qua 19h"
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
            <Label>Professor</Label>
            <Select value={form.teacher_id} onValueChange={val => setForm(prev => ({ ...prev, teacher_id: val }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {teachers.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Jornada vinculada</Label>
            <Select value={form.journey_id} onValueChange={val => setForm(prev => ({ ...prev, journey_id: val }))}>
              <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
              <SelectContent>
                {(journeys ?? []).map(j => (
                  <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Max. alunos</Label>
            <Input
              type="number"
              value={form.max_students}
              onChange={e => setForm(prev => ({ ...prev, max_students: parseInt(e.target.value) || 10 }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <FloppyDisk size={16} /> {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Turma'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
