import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { chave } = await req.json();
    if (!chave) return json({ error: "chave obrigatória" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: registro, error } = await sb
      .from("automacao_app_chaves")
      .select("id, nome, bloqueado, estabelecimento_id")
      .eq("chave", String(chave).trim().toUpperCase())
      .maybeSingle();

    if (error) return json({ error: "falha ao validar a chave" }, 500);
    if (!registro) return json({ error: "chave não encontrada" }, 404);
    if (registro.bloqueado) return json({ error: "chave bloqueada" }, 403);

    const { data: estabelecimento } = await sb
      .from("estabelecimentos")
      .select("nome")
      .eq("id", registro.estabelecimento_id)
      .maybeSingle();

    await sb
      .from("automacao_app_chaves")
      .update({ ultima_comunicacao: new Date().toISOString() })
      .eq("id", registro.id);

    return json({
      chave_id: registro.id,
      chave_nome: registro.nome,
      estabelecimento_id: registro.estabelecimento_id,
      empresa: estabelecimento?.nome ?? "",
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
