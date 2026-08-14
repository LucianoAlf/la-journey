import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { parseCifraPage } from "../_shared/cifra-parser.ts"

// Mesmo parser do cifra-club-import (youtube, Em7(5-), letra limpa).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

interface BatchRequest {
  urls: string[]
  instruments?: string[]
}

interface BatchResult {
  url: string
  status: "success" | "error" | "duplicate"
  title?: string
  artist?: string
  error?: string
  id?: string
}

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "pt-BR,pt;q=0.9",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação necessária" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const { data: userData } = await supabase
      .from("users")
      .select("school_id")
      .eq("id", user.id)
      .single()
    const schoolId = userData?.school_id || null

    const body: BatchRequest = await req.json()
    const { urls, instruments = [] } = body

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "Informe um array de URLs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const urlsToProcess = urls.slice(0, 20)
    const { data: existing } = await supabase
      .from("repertoire")
      .select("source_url")
      .in("source_url", urlsToProcess)
    const existingUrls = new Set((existing || []).map((e) => e.source_url))

    const results: BatchResult[] = []

    for (const url of urlsToProcess) {
      if (existingUrls.has(url)) {
        results.push({ url, status: "duplicate", title: "", artist: "" })
        continue
      }

      try {
        const response = await fetch(url, { headers: FETCH_HEADERS })
        if (!response.ok) {
          results.push({ url, status: "error", error: `HTTP ${response.status}` })
          continue
        }

        const html = await response.text()
        const cifra = parseCifraPage(html, url)

        if (!cifra.title) {
          results.push({ url, status: "error", error: "Não foi possível extrair dados" })
          continue
        }

        const { data: inserted, error: insertError } = await supabase
          .from("repertoire")
          .insert({
            school_id: schoolId,
            title: cifra.title,
            artist: cifra.artist,
            chords: cifra.chords,
            key: cifra.key,
            genre: cifra.genre,
            difficulty: cifra.difficulty,
            instruments,
            chord_structure: cifra.chord_structure,
            cifra_source: "cifra_club",
            cifra_content: cifra.cifra_content,
            lyrics: cifra.lyrics,
            source_url: cifra.source_url,
            youtube_url: cifra.youtube_url,
            is_public_domain: false,
            curation_status: "draft",
          })
          .select("id, title, artist")
          .single()

        if (insertError) {
          results.push({
            url,
            status: "error",
            error: insertError.message,
            title: cifra.title,
            artist: cifra.artist,
          })
        } else {
          results.push({
            url,
            status: "success",
            title: inserted.title,
            artist: inserted.artist,
            id: inserted.id,
          })
        }

        await new Promise((r) => setTimeout(r, 300))
      } catch (err) {
        results.push({
          url,
          status: "error",
          error: err instanceof Error ? err.message : "Erro desconhecido",
        })
      }
    }

    const summary = {
      total: results.length,
      success: results.filter((r) => r.status === "success").length,
      duplicates: results.filter((r) => r.status === "duplicate").length,
      errors: results.filter((r) => r.status === "error").length,
    }

    return new Response(JSON.stringify({ results, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
