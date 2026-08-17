import { parsePlayalong } from './playalong'

export const ESTUDO_TITLE_MAX = 120

export const ESTUDO_DISPLAY_MODES = ['slash-beat', 'slash-rhythm', 'chords', 'score'] as const
export type EstudoDisplayMode = (typeof ESTUDO_DISPLAY_MODES)[number]

export type EstudoConfig = {
  origin: 'from-mp3'
  displayMode: EstudoDisplayMode
  curatorName: string | null
}

function asDisplayMode(value: unknown): EstudoDisplayMode {
  return ESTUDO_DISPLAY_MODES.includes(value as EstudoDisplayMode)
    ? (value as EstudoDisplayMode)
    : 'slash-beat'
}

export function parseEstudo(raw: unknown): EstudoConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  const name = typeof rec.curatorName === 'string' ? rec.curatorName.trim() : ''
  return {
    origin: 'from-mp3',
    displayMode: asDisplayMode(rec.displayMode),
    curatorName: name || null,
  }
}

export function estudoToJson(config: EstudoConfig): EstudoConfig {
  return {
    origin: 'from-mp3',
    displayMode: config.displayMode,
    curatorName: config.curatorName,
  }
}

export function needsEstudoBackfill(row: {
  page_config?: unknown
  journey_id?: string | null
  station_id?: string | null
}): boolean {
  if (row.journey_id || row.station_id) return false
  const rec = row.page_config && typeof row.page_config === 'object'
    ? row.page_config as Record<string, unknown>
    : null
  if (!rec) return false
  if (parseEstudo(rec.estudo)) return false
  return parsePlayalong(rec.playalong) !== null
}

export function sanitizeEstudoTitle(raw: string, previous: string): string | null {
  const next = raw.replace(/\s+/g, ' ').trim().slice(0, ESTUDO_TITLE_MAX)
  if (!next) return null
  return next === previous ? previous : next
}

export function mergeEstudoPageConfig(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(existing ?? {}), ...patch }
}
