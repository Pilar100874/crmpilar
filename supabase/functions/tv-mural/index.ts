import { authenticateDevice, corsHeaders, json, serviceClient } from "../_shared/tv-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await authenticateDevice(req);
  if (!auth) return json({ error: "não autenticado" }, 401);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "id obrigatório" }, 400);

  const sb = serviceClient();
  const { data, error } = await sb
    .from("tv_murais")
    .select("id,nome,itens,duracao_padrao_imagem,transicao,transicao_ms,loop,embaralhar,ativo,estabelecimento_id")
    .eq("id", id)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Mural não encontrado" }, 404);
  if (data.estabelecimento_id && auth.estabelecimentoId && data.estabelecimento_id !== auth.estabelecimentoId) {
    return json({ error: "Mural não encontrado" }, 404);
  }

  const { estabelecimento_id: _omit, ...mural } = data as any;
  return json({ mural });
});
