import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

export type Journey = Tables<'journeys'>
export type JourneyStage = Tables<'journey_stages'>

export async function getJourneys() {
  const { data, error } = await supabase
    .from('journeys')
    .select('*')
    .eq('status', 'active')
    .order('name')

  if (error) handleError(error)
  return data
}

export async function getJourneyById(id: string) {
  const { data, error } = await supabase
    .from('journeys')
    .select('*')
    .eq('id', id)
    .single()

  if (error) handleError(error)
  return data
}

export async function createJourney(journey: TablesInsert<'journeys'>) {
  const { data, error } = await supabase
    .from('journeys')
    .insert(journey)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateJourney(id: string, updates: TablesUpdate<'journeys'>) {
  const { data, error } = await supabase
    .from('journeys')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

const DEFAULT_STAGES = [
  { stage_number: 1, name: 'Foundation', total_lessons: 40, description: 'Fundamentos e primeiros passos' },
  { stage_number: 2, name: 'Grow', total_lessons: 40, description: 'Expansão de repertório e técnica' },
  { stage_number: 3, name: 'Advance', total_lessons: 40, description: 'Técnicas avançadas e improvisação' },
  { stage_number: 4, name: 'Master', total_lessons: 40, description: 'Domínio e performance' },
]

export async function createJourneyWithStages(journey: TablesInsert<'journeys'>, lessonsPerStage = 40) {
  const created = await createJourney(journey)
  if (!created) throw new Error('Falha ao criar jornada')

  const stages = DEFAULT_STAGES.map(s => ({
    journey_id: created.id,
    stage_number: s.stage_number,
    name: s.name,
    total_lessons: lessonsPerStage,
    description: s.description,
  }))

  const { error } = await supabase.from('journey_stages').insert(stages)
  if (error) handleError(error)

  return created
}

export async function deleteJourney(id: string) {
  // Stages são deletados em cascata pelo FK
  const { error } = await supabase
    .from('journeys')
    .delete()
    .eq('id', id)

  if (error) handleError(error)
}

export async function getStages(journeyId: string) {
  const { data, error } = await supabase
    .from('journey_stages')
    .select('*')
    .eq('journey_id', journeyId)
    .order('stage_number')

  if (error) handleError(error)
  return data
}

export async function getJourneyWithStages(journeyId: string) {
  const journey = await getJourneyById(journeyId)
  const stages = await getStages(journeyId)
  return { ...journey, stages: stages ?? [] }
}

// --- Estações e blocos (RPCs) ---

export interface StageStation {
  station_id: string
  station_name: string
  station_number: number
  station_type: string
  lesson_start: number
  lesson_end: number
  topic_count: number
  block_count: number
}

export interface StationBlock {
  topic_order: number
  topic_title: string
  topic_slug: string
  block_id: string
  block_order: number
  block_type: string
  block_title: string
  block_content: any
  block_render_data: any
}

export async function getStageStations(stageId: string): Promise<StageStation[]> {
  const { data, error } = await (supabase.rpc as any)('get_stage_stations', {
    p_stage_id: stageId,
  })
  if (error) handleError(error)
  return (data ?? []) as StageStation[]
}

export async function getStationBlocks(stationId: string): Promise<StationBlock[]> {
  const { data, error } = await (supabase.rpc as any)('get_station_blocks', {
    p_station_id: stationId,
  })
  if (error) handleError(error)
  return (data ?? []) as StationBlock[]
}
