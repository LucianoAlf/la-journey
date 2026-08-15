export type EditorBeatDuration = 'w' | 'h' | 'q' | '8' | '16' | '32' | '64'

const ALPHA_TEX_DURATION_TO_EDITOR: Record<string, EditorBeatDuration> = {
  '1': 'w',
  '2': 'h',
  '4': 'q',
  '8': '8',
  '16': '16',
  '32': '32',
  '64': '64',
  w: 'w',
  h: 'h',
  q: 'q',
}

export function editorDurationFromRaw(raw: string): EditorBeatDuration {
  const token = String(raw ?? '').replace(/dd|d|r/g, '')
  return ALPHA_TEX_DURATION_TO_EDITOR[token] ?? 'q'
}
