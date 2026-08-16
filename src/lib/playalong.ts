export interface PlayalongSyncPoint {
  masterBarIndex: number
  masterBarOccurence: number
  syncTime: number
}

export interface PlayalongConfig {
  audioUrl: string
  countInMs: number
  syncPoints: PlayalongSyncPoint[]
}

function asFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export function parsePlayalong(raw: unknown): PlayalongConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  if (typeof rec.audioUrl !== 'string' || rec.audioUrl.trim() === '') return null
  const countIn = asFiniteNumber(rec.countInMs)
  const points = Array.isArray(rec.syncPoints) ? rec.syncPoints : []
  return {
    audioUrl: rec.audioUrl.trim(),
    countInMs: countIn && countIn > 0 ? countIn : 0,
    syncPoints: points.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const p = item as Record<string, unknown>
      const masterBarIndex = asFiniteNumber(p.masterBarIndex)
      const masterBarOccurence = asFiniteNumber(p.masterBarOccurence) ?? 0
      const syncTime = asFiniteNumber(p.syncTime)
      if (masterBarIndex === null || syncTime === null) return []
      return [{ masterBarIndex, masterBarOccurence, syncTime }]
    }),
  }
}

export function playalongToJson(config: PlayalongConfig): PlayalongConfig {
  return {
    audioUrl: config.audioUrl,
    countInMs: config.countInMs,
    syncPoints: config.syncPoints.map((p) => ({ ...p })),
  }
}
