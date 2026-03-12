import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

export type Journey = Tables<'journeys'>
export type JourneyStage = Tables<'journey_stages'>

export async function getJourneys() {
  const { data, error } = await supabase
    .from('journeys')
    .select('*')
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
