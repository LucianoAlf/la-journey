import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

async function isValidPrintToken(databaseUrl: string, materialId: string, token: string) {
  const client = new Client(databaseUrl)
  await client.connect()

  try {
    const result = await client.queryObject<{ is_valid: boolean }>(
      `
        select exists (
          select 1
          from public.pdf_tokens
          where token = $1
            and material_id = $2
            and expires_at > now()
        ) as is_valid
      `,
      [token, materialId],
    )

    return result.rows[0]?.is_valid === true
  } finally {
    await client.end()
  }
}

async function getPrintMaterialRows(databaseUrl: string, materialId: string) {
  const client = new Client(databaseUrl)
  await client.connect()

  try {
    const result = await client.queryObject<Record<string, unknown>>(
      `
        select
          gm.id as material_id,
          gm.title as material_title,
          gm.type::text as material_type,
          gm.status::text as material_status,
          gm.is_draft,
          gm.version,
          j.name as journey_name,
          js.name as stage_name,
          jst.name as station_name,
          s.name as school_name,
          s.logo_url as school_logo_url,
          s.primary_color as school_primary_color,
          s.secondary_color as school_secondary_color,
          gm.generation_config,
          gm.generated_at,
          gm.page_config,
          mb.id as block_id,
          mb.block_type::text as block_type,
          mb.title as block_title,
          mb.content as block_content,
          mb.render_data as block_render_data,
          mb.sort_order as block_sort_order,
          mb.is_edited as block_is_edited,
          mb.original_content as block_original_content
        from public.generated_materials gm
        left join public.schools s on s.id = gm.school_id
        left join public.journeys j on j.id = gm.journey_id
        left join public.journey_stages js on js.id = gm.stage_id
        left join public.journey_stations jst on jst.id = gm.station_id
        left join public.material_blocks mb on mb.material_id = gm.id
        where gm.id = $1
        order by mb.sort_order nulls last
      `,
      [materialId],
    )

    return result.rows
  } finally {
    await client.end()
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const { materialId, token } = await req.json()

    if (!materialId || typeof materialId !== 'string') {
      return jsonResponse({ error: 'materialId is required' }, 400)
    }

    if (!token || typeof token !== 'string') {
      return jsonResponse({ error: 'token is required' }, 400)
    }

    const databaseUrl = Deno.env.get('SUPABASE_DB_URL')

    if (!databaseUrl) {
      return jsonResponse({ error: 'Missing SUPABASE_DB_URL secret' }, 500)
    }

    const isValidToken = await isValidPrintToken(databaseUrl, materialId, token)
    if (!isValidToken) {
      return jsonResponse({ error: 'Invalid or expired print token' }, 401)
    }

    const rows = await getPrintMaterialRows(databaseUrl, materialId)
    return jsonResponse({ rows })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[get-print-material]', error)
    return jsonResponse({ error: message }, 500)
  }
})
