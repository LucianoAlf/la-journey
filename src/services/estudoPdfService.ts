import { supabase } from '@/lib/supabase'
import { estudoPdfFilename } from '@/lib/estudoPdf'

export async function downloadEstudoPdfWithEditorEngine(materialId: string, title: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('generate-pdf', {
    body: { materialId },
  })
  if (error) throw error
  const url = (data as { url?: string } | null)?.url
  if (!url) throw new Error('A Edge Function não retornou a URL do PDF.')

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Não deu para baixar o PDF gerado')
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `${estudoPdfFilename(title)}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
