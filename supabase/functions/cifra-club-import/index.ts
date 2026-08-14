import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { parseCifraPage } from "../_shared/cifra-parser.ts"

// Parser: youtube embed/watch, acordes com alteração (Em7(5-)), letra sem linha de cifra.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url || !url.includes("cifraclub.com.br")) {
      return new Response(
        JSON.stringify({ error: "URL inválida. Use uma URL do cifraclub.com.br" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const response = await fetch(url, { headers: FETCH_HEADERS })
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Cifra Club retornou status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const html = await response.text()
    const cifra = parseCifraPage(html, url)

    if (!cifra.title) {
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair dados da página. Verifique a URL." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    return new Response(JSON.stringify(cifra), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
