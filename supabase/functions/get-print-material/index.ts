import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SECRET_KEY')
    const databaseUrl = Deno.env.get('SUPABASE_DB_URL')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing Supabase service secrets' }, 500)
    }
    if (!databaseUrl) {
      return jsonResponse({ error: 'Missing SUPABASE_DB_URL secret' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const isValidToken = await isValidPrintToken(databaseUrl, materialId, token)
    if (!isValidToken) {
      return jsonResponse({ error: 'Invalid or expired print token' }, 401)
    }

    const { data, error } = await supabase.rpc('get_material_with_blocks', {
      p_material_id: materialId,
    })

    if (error) throw error

    return jsonResponse({ rows: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[get-print-material]', error)
    return jsonResponse({ error: message }, 500)
  }
})
