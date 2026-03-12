import { useState, useEffect } from 'react'
import { FloppyDisk } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createStudent, updateStudent } from '@/services/studentService'
import { useAuth } from '@/contexts/AuthContext'
import type { Tables } from '@/lib/database.types'

type Student = Tables<'students'>

interface StudentModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  student?: Student | null
}

const emptyForm = {
  responsible_name: '',
  responsible_phone: '',
  instruments: [] as string[],
  birth_date: '',
}

export function StudentModal({ open, onClose, onSuccess, student }: StudentModalProps) {
  const { user } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const isEditing = !!student

  useEffect(() => {
    if (student) {
      setForm({
        responsible_name: student.responsible_name ?? '',
        responsible_phone: student.responsible_phone ?? '',
        instruments: student.instruments ?? [],
        birth_date: student.birth_date ?? '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [student, open])

  const handleSubmit = async () => {
    if (!form.responsible_name.trim()) {
      toast.error('Informe o nome do aluno/responsável')
      return
    }

    const schoolId = user?.user_metadata?.school_id
    if (!schoolId) {
      toast.error('Escola não identificada. Faça login novamente.')
      return
    }

    setSaving(true)
    try {
      if (isEditing && student) {
        await updateStudent(student.id, {
          responsible_name: form.responsible_name,
          responsible_phone: form.responsible_phone || null,
          instruments: form.instruments,
          birth_date: form.birth_date || null,
        })
        toast.success('Aluno atualizado!')
      } else {
        await createStudent({
          school_id: schoolId,
          responsible_name: form.responsible_name,
          responsible_phone: form.responsible_phone || null,
          instruments: form.instruments,
          birth_date: form.birth_date || null,
        })
        toast.success('Aluno cadastrado!')
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar aluno')
    } finally {
      setSaving(false)
    }
  }

  const handleInstrumentChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      instruments: prev.instruments.includes(value)
        ? prev.instruments.filter(i => i !== value)
        : [...prev.instruments, value],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[640px] bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px]">
            {isEditing ? 'Editar' : 'Novo'} <span className="text-accent">Aluno</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1.5">
            <Label>Nome completo / Responsável</Label>
            <Input
              placeholder="Nome do aluno ou responsável"
              value={form.responsible_name}
              onChange={e => setForm(prev => ({ ...prev, responsible_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input
              placeholder="(21) 99999-0000"
              value={form.responsible_phone}
              onChange={e => setForm(prev => ({ ...prev, responsible_phone: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Instrumento principal</Label>
            <Select
              value={form.instruments[0] ?? ''}
              onValueChange={val => setForm(prev => ({ ...prev, instruments: [val] }))}
            >
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
            <Label>Data de nascimento</Label>
            <Input
              type="date"
              value={form.birth_date}
              onChange={e => setForm(prev => ({ ...prev, birth_date: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <FloppyDisk size={16} /> {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Cadastrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
