// Lista de unidades para o Coletor Desktop exibir num dropdown na primeira abertura.
// Público (verify_jwt=false) — retorna apenas nome/cidade/uf + nome do estabelecimento,
// sem CNPJ ou dados sensíveis.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let estabelecimentoId: string | null = null;
    try {
      const body = await req.json();
      estabelecimentoId = body?.estabelecimento_id ?? null;
    } catch { /* body vazio */ }

    let q = sb
      .from("unidades")
      .select("id, nome, cidade, uf, estabelecimento_id, estabelecimentos(nome)")
      .order("nome");
    if (estabelecimentoId) q = q.eq("estabelecimento_id", estabelecimentoId);

    const { data, error } = await q;
    if (error) throw error;

    const unidades = (data || []).map((u: any) => ({
      id: u.id,
      nome: u.nome,
      cidade: u.cidade,
      uf: u.uf,
      estabelecimento_id: u.estabelecimento_id,
      estabelecimento_nome: u.estabelecimentos?.nome ?? null,
    }));

    return new Response(JSON.stringify({ filiais: unidades, unidades }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
