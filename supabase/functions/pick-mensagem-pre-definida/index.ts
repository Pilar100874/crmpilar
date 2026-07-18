import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Escolhe uma frase do cadastro de "Mensagens pré definidas".
 *
 * body:
 * {
 *   estabelecimentoId: string,
 *   escopo: "qualquer" | "geral" | "grupo",
 *   grupoId?: string,          // quando escopo=grupo
 *   tema?: string,             // opcional: filtra por tema
 *   modoSelecao: "fixa" | "rotacao" | "aleatoria",
 *   fraseId?: string,          // quando modoSelecao=fixa
 *   cursorKey?: string,        // usado por "rotacao" (ex.: `bot:<botId>:<nodeId>`)
 * }
 *
 * response: { frase: { id, frase, tema, grupo_id } | null, exhausted?: boolean }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      estabelecimentoId,
      escopo = "qualquer",
      grupoId,
      tema,
      modoSelecao = "aleatoria",
      fraseId,
      cursorKey,
    } = await req.json();

    if (!estabelecimentoId) {
      return new Response(JSON.stringify({ error: "estabelecimentoId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Modo fixa: retorna a frase específica
    if (modoSelecao === "fixa" && fraseId) {
      const { data, error } = await supabase
        .from("mensagens_grupo_produto")
        .select("id, frase, tema, grupo_id")
        .eq("id", fraseId)
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ frase: data || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Constrói query de elegíveis
    let q = supabase
      .from("mensagens_grupo_produto")
      .select("id, frase, tema, grupo_id")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("ativo", true);
    if (escopo === "geral") q = q.is("grupo_id", null);
    else if (escopo === "grupo" && grupoId) q = q.eq("grupo_id", grupoId);
    if (tema) q = q.eq("tema", tema);

    const { data: elig, error: eErr } = await q;
    if (eErr) throw eErr;

    if (!elig || elig.length === 0) {
      return new Response(JSON.stringify({ frase: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aleatória
    if (modoSelecao === "aleatoria" || !cursorKey) {
      const pick = elig[Math.floor(Math.random() * elig.length)];
      return new Response(JSON.stringify({ frase: pick }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rotação: pega a próxima ainda não usada; ao esgotar, reinicia
    const ids = elig.map((f: any) => f.id);
    const { data: usados, error: uErr } = await supabase
      .from("bot_frase_uso")
      .select("frase_id")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("cursor_key", cursorKey)
      .in("frase_id", ids);
    if (uErr) throw uErr;

    const usadosSet = new Set((usados || []).map((u: any) => u.frase_id));
    let disponiveis = elig.filter((f: any) => !usadosSet.has(f.id));
    let exhausted = false;
    if (disponiveis.length === 0) {
      // Reinicia ciclo
      await supabase
        .from("bot_frase_uso")
        .delete()
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("cursor_key", cursorKey);
      disponiveis = elig;
      exhausted = true;
    }
    const pick = disponiveis[0];
    // Marca como usada
    await supabase.from("bot_frase_uso").insert({
      estabelecimento_id: estabelecimentoId,
      cursor_key: cursorKey,
      frase_id: pick.id,
    });

    return new Response(JSON.stringify({ frase: pick, exhausted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("pick-mensagem-pre-definida error:", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
