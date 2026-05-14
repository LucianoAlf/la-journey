import { addIcon } from '@iconify/react'
import type { IconifyIcon } from '@iconify/types'

export interface IconifyElementOption {
  icon: string
  label: string
  collection: 'lucide' | 'tabler' | 'material-symbols'
}

export const ICONIFY_ELEMENT_OPTIONS: IconifyElementOption[] = [
  { icon: 'lucide:music', label: 'Música', collection: 'lucide' },
  { icon: 'lucide:guitar', label: 'Violão', collection: 'lucide' },
  { icon: 'lucide:piano', label: 'Piano', collection: 'lucide' },
  { icon: 'lucide:book-open', label: 'Livro', collection: 'lucide' },
  { icon: 'lucide:lightbulb', label: 'Dica', collection: 'lucide' },
  { icon: 'lucide:sparkles', label: 'Destaque', collection: 'lucide' },
  { icon: 'tabler:school', label: 'Escola', collection: 'tabler' },
  { icon: 'tabler:target-arrow', label: 'Objetivo', collection: 'tabler' },
  { icon: 'tabler:headphones', label: 'Audição', collection: 'tabler' },
  { icon: 'tabler:palette', label: 'Arte', collection: 'tabler' },
  { icon: 'material-symbols:library-music', label: 'Biblioteca', collection: 'material-symbols' },
  { icon: 'material-symbols:school', label: 'Aula', collection: 'material-symbols' },
  { icon: 'material-symbols:piano', label: 'Teclas', collection: 'material-symbols' },
  { icon: 'material-symbols:star', label: 'Estrela', collection: 'material-symbols' },
]

const ICONIFY_ELEMENT_DATA: Record<string, IconifyIcon> = {
  'lucide:music': { body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></g>' },
  'lucide:guitar': { body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m11.9 12.1l4.514-4.514M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4zM6 16l2 2m.23-8.15A3 3 0 0 1 11 8a5 5 0 0 1 5 5a3 3 0 0 1-1.85 2.77l-.92.38A2 2 0 0 0 12 18a4 4 0 0 1-4 4a6 6 0 0 1-6-6a4 4 0 0 1 4-4a2 2 0 0 0 1.85-1.23z"/>' },
  'lucide:piano': { body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8M2 14h20M6 14v4m4-4v4m4-4v4m4-4v4"/>' },
  'lucide:book-open': { body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v14m-9-3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4a4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3a3 3 0 0 0-3-3z"/>' },
  'lucide:lightbulb': { body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 14c.2-1 .7-1.7 1.5-2.5c1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5c.7.7 1.3 1.5 1.5 2.5m0 4h6m-5 4h4"/>' },
  'lucide:sparkles': { body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594zM20 2v4m2-2h-4"/><circle cx="4" cy="20" r="2"/></g>' },
  'tabler:school': { body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M22 9L12 5L2 9l10 4zv6"/><path d="M6 10.6V16a6 3 0 0 0 12 0v-5.4"/></g>' },
  'tabler:target-arrow': { body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/><path d="M12 7a5 5 0 1 0 5 5"/><path d="M13 3.055A9 9 0 1 0 20.941 11"/><path d="M15 6v3h3l3-3h-3V3zm0 3l-3 3"/></g>' },
  'tabler:headphones': { body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M4 15a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm11 0a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2z"/><path d="M4 15v-3a8 8 0 0 1 16 0v3"/></g>' },
  'tabler:palette': { body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 21a9 9 0 0 1 0-18c4.97 0 9 3.582 9 8c0 1.06-.474 2.078-1.318 2.828S17.693 15 16.5 15H14a2 2 0 0 0-1 3.75A1.3 1.3 0 0 1 12 21"/><path d="M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0-2 0m4-3a1 1 0 1 0 2 0a1 1 0 1 0-2 0m4 3a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/></g>' },
  'material-symbols:library-music': { body: '<path fill="currentColor" d="M12.5 15q1.05 0 1.775-.725T15 12.5V7h3V5h-4v5.5q-.325-.25-.7-.375T12.5 10q-1.05 0-1.775.725T10 12.5t.725 1.775T12.5 15M8 18q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm-4 4q-.825 0-1.412-.587T2 20V6h2v14h14v2z"/>' },
  'material-symbols:school': { body: '<path fill="currentColor" d="M21 17v-6.9L12 15L1 9l11-6l11 6v8zm-9 4l-7-3.8v-5l7 3.8l7-3.8v5z"/>' },
  'material-symbols:piano': { body: '<path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h3.25v-4.5H8q-.425 0-.712-.288T7 13.5V5H5zm10.75 0H19V5h-2v8.5q0 .425-.288.713T16 14.5h-.25zm-6 0h4.5v-4.5H14q-.425 0-.712-.288T13 13.5V5h-2v8.5q0 .425-.288.713T10 14.5h-.25z"/>' },
  'material-symbols:star': { body: '<path fill="currentColor" d="m5.825 21l1.625-7.025L2 9.25l7.2-.625L12 2l2.8 6.625l7.2.625l-5.45 4.725L18.175 21L12 17.275z"/>' },
}

let registered = false

export function registerIconifyElementIcons() {
  if (registered) return
  Object.entries(ICONIFY_ELEMENT_DATA).forEach(([name, data]) => addIcon(name, data))
  registered = true
}
