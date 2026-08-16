import { fromMp3ToStudy, titleFromAudioFilename, type Mp3Chord } from '@/lib/fromMp3ToStudy'
import { playalongToJson } from '@/lib/playalong'
import { supabase } from '@/lib/supabase'
import {
  createDraftMaterialWithBlocks,
  updateMaterial,
  type GeneratedMaterial,
} from './materialService'
import { removePlayalongObject, uploadPlayalongInbox } from './playalongUpload'

function invokeErrorMessage(error: { message?: string } | null, data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string') {
    return (data as { error: string }).error
  }
  return error?.message || fallback
}

function chordsFromTranscribe(data: unknown): Mp3Chord[] {
  if (!data || typeof data !== 'object') return []
  const raw = (data as { recognizedChords?: unknown }).recognizedChords
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const rec = item as Record<string, unknown>
    const start = Number(rec.start)
    const end = Number(rec.end)
    const chord = typeof rec.chord === 'string' ? rec.chord.trim() : ''
    if (!chord || !Number.isFinite(start) || !Number.isFinite(end)) return []
    return [{ start, end, chord }]
  })
}

export async function createStudyMaterialFromMp3(params: {
  schoolId: string
  file: File
}): Promise<string> {
  const title = titleFromAudioFilename(params.file.name)
  const uploaded = await uploadPlayalongInbox(params.file)
  let created = false
  try {
    const { data, error } = await supabase.functions.invoke('musicai-transcribe', {
      body: { audioUrl: uploaded.url },
    })
    if (error || data?.error) {
      throw new Error(invokeErrorMessage(error, data, 'Não foi possível ler a cifra do MP3'))
    }
    const chords = chordsFromTranscribe(data)
    const study = fromMp3ToStudy({
      audioUrl: uploaded.url,
      chords,
      bpm: typeof data?.recognizedBpm === 'number' ? data.recognizedBpm : null,
      key: typeof data?.recognizedKey === 'string' ? data.recognizedKey : null,
    })
    const materialId = await createDraftMaterialWithBlocks({
      schoolId: params.schoolId,
      title,
      type: 'exercise_sheet',
      blocks: [{
        blockType: 'notation',
        title: title,
        content: {
          notation_data: {
            clef: 'treble',
            keySignature: study.keySignature,
            timeSignature: study.timeSignature,
            bpm: study.bpm,
            barsPerSystem: study.barsPerSystem,
            beats: study.beats,
          },
        },
      }],
    })
    created = true
    await updateMaterial(materialId, {
      page_config: {
        playalong: playalongToJson(study.playalong),
      } as unknown as GeneratedMaterial['page_config'],
    })
    return materialId
  } catch (err) {
    if (!created) await removePlayalongObject(uploaded.path)
    throw err
  }
}
