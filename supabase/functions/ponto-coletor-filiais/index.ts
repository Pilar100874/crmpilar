// Lista de filiais para o Coletor Desktop exibir num dropdown na primeira abertura.
// Público (verify_jwt=false) — retorna apenas nome/cidade/uf, sem CNPJ ou dados sensíveis.
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
    const { data, error } = await sb
      .from("ponto_filiais")
      .select("id, nome, cidade, uf")
      .eq("ativo", true)
      .order("nome");
    if (error) throw error;
    return new Response(JSON.stringify({ filiais: data || [] }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
