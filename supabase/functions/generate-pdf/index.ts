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

async function ensurePdfTokensTable(databaseUrl: string) {
  const client = new Client(databaseUrl)
  await client.connect()

  try {
    await client.queryArray(`
      create table if not exists public.pdf_tokens (
        token uuid primary key,
        material_id uuid not null references public.generated_materials(id) on delete cascade,
        expires_at timestamptz not null,
        created_at timestamptz not null default now()
      );

      alter table public.pdf_tokens enable row level security;

      drop policy if exists "pdf_tokens_public_valid_select" on public.pdf_tokens;
      create policy "pdf_tokens_public_valid_select"
      on public.pdf_tokens
      for select
      using (expires_at > now());

      create index if not exists pdf_tokens_material_id_idx
      on public.pdf_tokens(material_id);

      create index if not exists pdf_tokens_expires_at_idx
      on public.pdf_tokens(expires_at);
    `)
  } finally {
    await client.end()
  }
}

async function insertPdfToken(
  databaseUrl: string,
  token: string,
  materialId: string,
  expiresAt: string,
) {
  const client = new Client(databaseUrl)
  await client.connect()

  try {
    await client.queryArray(
      `
        insert into public.pdf_tokens (token, material_id, expires_at)
        values ($1, $2, $3)
      `,
      [token, materialId, expiresAt],
    )
  } finally {
    await client.end()
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error'
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
    const { materialId } = await req.json()
    if (!materialId || typeof materialId !== 'string') {
      return jsonResponse({ error: 'materialId is required' }, 400)
    }

    const browserlessToken = Deno.env.get('BROWSERLESS_TOKEN')
    const appUrl = Deno.env.get('APP_URL')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SECRET_KEY')
    const databaseUrl = Deno.env.get('SUPABASE_DB_URL')

    if (!browserlessToken) {
      return jsonResponse({ error: 'Missing BROWSERLESS_TOKEN secret' }, 500)
    }
    if (!appUrl) return jsonResponse({ error: 'Missing APP_URL secret' }, 500)
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing Supabase service secrets' }, 500)
    }
    if (!databaseUrl) {
      return jsonResponse({ error: 'Missing SUPABASE_DB_URL secret' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    await ensurePdfTokensTable(databaseUrl)

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    await insertPdfToken(databaseUrl, token, materialId, expiresAt)

    const printUrl = `${appUrl.replace(/\/$/, '')}/print/${materialId}?token=${token}`
    const pdfEndpoint = `https://production-sfo.browserless.io/pdf?token=${browserlessToken}`

    console.info('[generate-pdf] request browserless pdf')
    const pdfResponse = await fetch(pdfEndpoint, {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: printUrl,
        bestAttempt: true,
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 45000,
        },
        setExtraHTTPHeaders: {
          'ngrok-skip-browser-warning': '1',
          'User-Agent': 'Mozilla/5.0 (compatible; PDFGenerator/1.0)',
        },
        waitForSelector: {
          selector: '.print-ready',
          timeout: 60000,
        },
        options: {
          format: 'A4',
          printBackground: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
        },
      }),
    })

    if (!pdfResponse.ok) {
      const body = await pdfResponse.text()
      throw new Error(`Browserless PDF failed (${pdfResponse.status}): ${body.slice(0, 500)}`)
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()

    const fileName = `pdfs/${materialId}/${Date.now()}.pdf`
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })

    console.info('[generate-pdf] upload pdf')
    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('materials').getPublicUrl(fileName)

    return jsonResponse({
      url: data.publicUrl,
      path: fileName,
    })
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('[generate-pdf]', error)
    return jsonResponse({ error: message }, 500)
  }
})
