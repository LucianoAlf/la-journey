import { useAsync } from './useAsync'
import { getMessages, getTemplates } from '@/services/whatsappService'

export function useWhatsappMessages(studentId?: string) {
  return useAsync(() => getMessages(studentId), [studentId])
}

export function useWhatsappTemplates() {
  return useAsync(() => getTemplates(), [])
}
