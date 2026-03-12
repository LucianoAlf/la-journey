---
name: la-journey-supabase
description: "Pattern library for writing Supabase services, hooks, and queries in the LA Journey project. Use this skill whenever creating a new service file, a new React hook that fetches data, any CRUD operation against the Supabase database, or when connecting a page/component to real data. Also use when dealing with RLS, multi-tenant queries, auth context, or when the user says 'connect this page to Supabase', 'make this data real', 'create a service for X', or 'fetch X from the database'. This skill ensures consistent typing, error handling, and multi-tenant patterns across the entire codebase."
---

# LA Journey — Supabase Service & Hook Patterns

## Context

LA Journey is a multi-tenant SaaS (schools as tenants). Every query is automatically filtered by `school_id` via RLS policies in Supabase. The authenticated user's JWT contains their `school_id`, so no manual filtering is needed in most queries.

- **Supabase Project:** `rkfszavfqplhorvfpkcq`
- **Region:** `sa-east-1`
- **Auth:** Email/password, user in `auth.users` linked to `public.users` by matching UUID
- **Types:** Auto-generated in `src/lib/database.types.ts`

## Type Aliases

Always define type aliases at the top of each service file for readability:

```typescript
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

// Row types (what you GET from the database)
type Journey = Database['public']['Tables']['journeys']['Row']
type JourneyInsert = Database['public']['Tables']['journeys']['Insert']
type JourneyUpdate = Database['public']['Tables']['journeys']['Update']
```

## Service Pattern

Every service is a plain object with async methods. No classes, no singletons.

```typescript
// src/services/journeyService.ts
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Journey = Database['public']['Tables']['journeys']['Row']
type JourneyInsert = Database['public']['Tables']['journeys']['Insert']
type JourneyUpdate = Database['public']['Tables']['journeys']['Update']

export const journeyService = {
  // LIST with nested relations
  async getAll() {
    const { data, error } = await supabase
      .from('journeys')
      .select(`
        *,
        journey_stages (
          *,
          journey_stations (*)
        )
      `)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // GET by ID with deep nesting
  async getById(id: string) {
    const { data, error } = await supabase
      .from('journeys')
      .select(`
        *,
        journey_stages (
          *,
          journey_stations (
            *,
            journey_station_topics (
              *,
              content_topics (*)
            )
          )
        )
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  // CREATE — pass typed insert, return the created row
  async create(journey: JourneyInsert) {
    const { data, error } = await supabase
      .from('journeys')
      .insert(journey)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // UPDATE — partial update, only send changed fields
  async update(id: string, updates: JourneyUpdate) {
    const { data, error } = await supabase
      .from('journeys')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // DELETE
  async remove(id: string) {
    const { error } = await supabase
      .from('journeys')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
```

## Hook Pattern

Every hook returns `{ data, loading, error, refetch }`. Uses `useEffect` for initial fetch.

```typescript
// src/hooks/useJourneys.ts
import { useState, useEffect, useCallback } from 'react'
import { journeyService } from '@/services/journeyService'
import type { Database } from '@/lib/database.types'

type Journey = Database['public']['Tables']['journeys']['Row']

export function useJourneys() {
  const [data, setData] = useState<Journey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await journeyService.getAll()
      setData(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
```

## Hook with Parameter (for detail pages)

```typescript
// src/hooks/useJourney.ts
export function useJourney(id: string | undefined) {
  const [data, setData] = useState<JourneyWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const result = await journeyService.getById(id)
      setData(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
```

## Multi-tenant Rules

1. **NEVER manually filter by school_id** — RLS does this automatically via the JWT
2. **Content tables with nullable school_id** (`content_blocks`, `repertoire`): RLS returns both global (NULL) and school-private rows. No extra filter needed.
3. **Global tables** (`achievements`, `chord_library`, `scale_library`, `content_topics`): readable by all authenticated users. Write restricted to owner/coordinator roles.
4. **Auth is required** — all queries will return empty arrays if the user is not authenticated.

## Nested Select Patterns

The database has deep hierarchies. Use Supabase's nested select syntax:

```
Journey → Stages → Stations → Station Topics → Content Topics
Material → Material Blocks
Student → Student Progress → Journey/Stage/Station
Class → Class Students → Students
```

## Pagination (for lists that will grow)

```typescript
async getStudentsPaginated(page: number = 0, pageSize: number = 20) {
  const from = page * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await supabase
    .from('students')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order('enrollment_date', { ascending: false })
  if (error) throw error
  return { data, count }
}
```

## Error Handling Utility

```typescript
// src/lib/handleError.ts
export function handleSupabaseError(error: any): string {
  if (error?.code === 'PGRST116') return 'Registro não encontrado'
  if (error?.code === '23505') return 'Registro duplicado'
  if (error?.code === '23503') return 'Referência inválida (FK)'
  if (error?.code === '42501') return 'Sem permissão (RLS)'
  return error?.message || 'Erro desconhecido'
}
```

## Auth Context Usage

```typescript
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const { user, session, loading } = useAuth()
  
  if (loading) return <Skeleton />
  if (!user) return <Navigate to="/login" />
  
  // user.id matches public.users.id
  // user.user_metadata.school_id = the school
  // user.user_metadata.role = owner/coordinator/teacher/student
}
```

## 22 Tables Reference

| Domain | Tables |
|--------|--------|
| School | schools, users, students, classes, class_students, achievements |
| Journey | journeys, journey_stages, journey_stations, journey_station_topics |
| Content | content_topics, content_blocks, chord_library, scale_library, repertoire |
| Materials | generated_materials, material_blocks |
| Monitoring | student_progress, lesson_logs, student_achievements |
| WhatsApp | whatsapp_messages, whatsapp_templates |
