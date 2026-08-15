import { authenticateDevice, corsHeaders, json, serviceClient } from "../_shared/tv-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await authenticateDevice(req);
  if (!auth) return json({ error: "não autenticado" }, 401);

  const url = new URL(req.url);
  const camerasParam = (url.searchParams.get("cameras") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const gruposParam = (url.searchParams.get("grupos") || "").split(",").map((s) => s.trim()).filter(Boolean);

  const sb = serviceClient();
  let q = sb
    .from("cv_cameras")
    .select("id,nome,filial_id,grupo_id,ativo,estabelecimento_id")
    .eq("ativo", true)
    .order("nome");

  if (camerasParam.length) q = q.in("id", camerasParam);
  else if (gruposParam.length) q = q.in("grupo_id", gruposParam);

  const { data, error } = await q;
  if (error) return json({ error: error.message }, 500);

  const list = (data ?? [])
    .filter((c: any) => !auth.estabelecimentoId || !c.estabelecimento_id || c.estabelecimento_id === auth.estabelecimentoId)
    .map(({ estabelecimento_id: _omit, ...c }: any) => c);

  return json({ cameras: list });
});
